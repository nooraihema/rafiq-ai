/**
 * @file src/engine/evaluator.ts
 * @description Evaluation Engine to compute validation loss and Perplexity metrics without tracking gradients.
 */

import { GPTModel } from '../models/gptModel';
import { BaseLoss } from '../loss/baseLoss';
import { DataLoader } from '../data/dataloader';

export class Evaluator {
  private model: GPTModel;
  private lossFn: BaseLoss;

  constructor(model: GPTModel, lossFn: BaseLoss) {
    this.model = model;
    this.lossFn = lossFn;
  }

  /**
   * تقييم الحجم الحالي للموديل وحساب الـ Perplexity
   */
  public async evaluate(dataLoader: DataLoader): Promise<{ validationLoss: number; perplexity: number }> {
    let totalLoss = 0;
    let batchCount = 0;

    dataLoader.reset();

    // نقوم بالتقييم في وضع الـ Inference (تعطيل الـ Dropout إن وجد)
    const previousState = this.model.isTraining();
    this.model.setTraining(false);

    while (dataLoader.hasNext()) {
      const { inputs, targets } = dataLoader.nextBatch(inputs.shape[0]);

      // Forward Pass فقط بدون حساب Gradients للسرعة وحفظ الذاكرة
      const logits = this.model.forward(inputs);
      const lossTensor = this.lossFn.forward(logits, targets);

      totalLoss += lossTensor.item();
      batchCount++;
    }

    // إعادة الموديل لوضعه الأصلي
    this.model.setTraining(previousState);

    const avgLoss = totalLoss / batchCount;
    // Perplexity = e^(Cross Entropy Loss)
    const perplexity = Math.exp(avgLoss);

    return {
      validationLoss: avgLoss,
      perplexity: perplexity
    };
  }
}
