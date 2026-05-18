/**
 * @file src/engine/trainer.ts
 * @description Core Trainer managing the forward/backward loops, loss calculation, and weight updates.
 */

import { GPTModel } from '../models/gptModel';
import { BaseOptimizer } from '../optimizers/baseOptimizer';
import { BaseLoss } from '../loss/baseLoss';
import { DataLoader } from '../data/dataloader';
import { Tensor } from '../core/tensor';

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  gradientClipping?: number;
}

export class Trainer {
  private model: GPTModel;
  private optimizer: BaseOptimizer;
  private lossFn: BaseLoss;
  private config: TrainingConfig;

  constructor(model: GPTModel, optimizer: BaseOptimizer, lossFn: BaseLoss, config: TrainingConfig) {
    this.model = model;
    this.optimizer = optimizer;
    this.lossFn = lossFn;
    this.config = config;
  }

  /**
   * تشغيل حلقة التدريب الكاملة
   */
  public async train(dataLoader: DataLoader, onEpochEnd?: (epoch: number, avgLoss: number) => void): Promise<void> {
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      let totalLoss = 0;
      let batchCount = 0;

      dataLoader.reset();

      while (dataLoader.hasNext()) {
        const { inputs, targets } = dataLoader.nextBatch(this.config.batchSize);

        // 1. التمرير الأمامي (Forward Pass)
        const logits = this.model.forward(inputs);

        // 2. حساب الـ Loss
        const lossTensor = this.lossFn.forward(logits, targets);
        totalLoss += lossTensor.item();
        batchCount++;

        // 3. تصفير الـ Gradients السابقة
        this.optimizer.zeroGrad();

        // 4. التمرير الخلفي (Backward Pass / Autograd)
        lossTensor.backward();

        // 5. Clipping للـ Gradients لو محدد في الكونفيج لمنع الانفجار الرياضي
        if (this.config.gradientClipping) {
          this.clipGradients(this.config.gradientClipping);
        }

        // 6. تحديث الأوزان
        this.optimizer.step();
      }

      const avgLoss = totalLoss / batchCount;
      if (onEpochEnd) onEpochEnd(epoch + 1, avgLoss);
    }
  }

  /**
   * قص الـ Gradients لحماية الأمعاء العصبية من الـ Explosion
   */
  private clipGradients(maxNorm: number): void {
    const params = this.model.getParameters();
    let totalNorm = 0;

    for (const p of params) {
      if (p.grad) {
        for (let i = 0; i < p.grad.data.length; i++) {
          totalNorm += p.grad.data[i] * p.grad.data[i];
        }
      }
    }
    totalNorm = Math.sqrt(totalNorm);

    if (totalNorm > maxNorm) {
      const scale = maxNorm / (totalNorm + 1e-6);
      for (const p of params) {
        if (p.grad) {
          for (let i = 0; i < p.grad.data.length; i++) {
            p.grad.data[i] *= scale;
          }
        }
      }
    }
  }
}
