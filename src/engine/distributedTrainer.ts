/**
 * @file src/engine/distributedTrainer.ts
 * @description Distributed training manager coordinating multi-worker orchestration and gradient synchronization (All-Reduce).
 */

import { Trainer, TrainingConfig } from './trainer';
import { GPTModel } from '../models/gptModel';

export interface WorkerNode {
  id: number;
  isLocal: boolean;
  weightPayload: Float32Array;
}

export class DistributedTrainer {
  private localTrainer: Trainer;
  private model: GPTModel;
  private workerNodes: WorkerNode[] = [];
  private rankId: number;

  constructor(model: GPTModel, localTrainer: Trainer, rankId: number = 0) {
    this.model = model;
    this.localTrainer = localTrainer;
    this.rankId = rankId;
  }

  /**
   * تسجيل العقد الشغالة بالتوازي في شبكة التدريب
   */
  public registerNode(node: WorkerNode): void {
    this.workerNodes.push(node);
  }

  /**
   * مزامنة الـ Gradients بين كافة العقد (Simulated Ring All-Reduce)
   * تجمع الأوزان من العقد وتأخذ المتوسط ثم تعيد حقنها لضمان عدم تشتت عقول النموذج الموزع
   */
  public async synchronizeGradients(): Promise<void> {
    if (this.workerNodes.length === 0) return;

    const params = this.model.getParameters();

    for (const p of params) {
      if (!p.grad) continue;

      // 1. جمع الـ Gradients من نفس المعامل في العقد الأخرى
      const gradLength = p.grad.data.length;
      const aggregatedGrad = new Float32Array(gradLength);

      // نسخ جراد العقدة المحلية أولاً
      aggregatedGrad.set(p.grad.data);

      // دمج تجميعي من باقي الـ Workers
      for (const node of this.workerNodes) {
        if (node.id !== this.rankId) {
          for (let i = 0; i < gradLength; i++) {
            aggregatedGrad[i] += node.weightPayload[i] || 0; 
          }
        }
      }

      // 2. حساب المتوسط (Average) عبر الـ World Size
      const worldSize = this.workerNodes.length + 1;
      for (let i = 0; i < gradLength; i++) {
        p.grad.data[i] = aggregatedGrad[i] / worldSize;
      }
    }
  }
}
