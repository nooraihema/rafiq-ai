/**
 * @file src/optimizers/baseOptimizer.ts
 * @project rafiq-ai-core
 * @description Abstract Base Class for all mathematical weight optimizers in the system.
 */

import { Parameter } from '../core/parameters';

export abstract class BaseOptimizer {
  protected params: Parameter[];
  protected lr: number;

  constructor(params: Parameter[], lr: number = 0.001) {
    this.params = params;
    this.lr = lr;
  }

  /**
   * تصفير المصفوفات الاشتقاقية (Gradients) قبل بدء دورة الـ Backward Pass الجديدة
   */
  public zeroGrad(): void {
    for (const p of this.params) {
      if (p.grad) {
        p.grad.data.fill(0);
      }
    }
  }

  /**
   * الخطوة الحسابية لتحديث الأوزان - يتم كتابتها داخل الكلاس المشتق
   */
  public abstract step(): void;

  /**
   * تحديث معدل التعلم (Learning Rate) ديناميكياً عبر الـ Scheduler
   */
  public setLearningRate(newLr: number): void {
    this.lr = newLr;
  }

  public getLearningRate(): number {
    return this.lr;
  }
}
