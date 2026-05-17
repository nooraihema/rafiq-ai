/**
 * @file src/layers/ffn.ts
 * @project rafiq-ai-core
 * @description Feed-Forward Network (FFN) layer implementing two linear layers with SwiGLU / ReLU activation.
 */

import { BaseLayer } from './baseLayer';
import { Tensor } from '../core/tensor';
import { ParameterManager } from '../core/parameters';
import { MathUtils } from '../utils/math';

export class FeedForward extends BaseLayer {
  // أوزان الطبقة الأولى (التوسيع) والطبقة الثانية (التقليص)
  public w1: Tensor;
  public w2: Tensor;

  private hiddenDim: number;
  private intermediateDim: number;

  constructor(
    hiddenDim: number,
    paramManager: ParameterManager,
    layerName: string = 'ffn',
    expansionFactor: number = 4
  ) {
    super(layerName);
    this.hiddenDim = hiddenDim;
    
    // البُعد الوسيط للطبقة المخفية (عادة يكون 4 أضعاف البُعد الأصلي للنموذج)
    this.intermediateDim = hiddenDim * expansionFactor;

    // تهيئة مصفوفة أوزان التوسيع [HiddenDim x IntermediateDim]
    const w1Size = this.hiddenDim * this.intermediateDim;
    const stdDev1 = Math.sqrt(2.0 / this.hiddenDim);
    const w1Data = new Float32Array(w1Size);
    for (let i = 0; i < w1Size; i++) w1Data[i] = MathUtils.randomNormal(0, stdDev1);
    this.w1 = new Tensor([this.hiddenDim, this.intermediateDim], w1Data, true);

    // تهيئة مصفوفة أوزان التقليص [IntermediateDim x HiddenDim]
    const w2Size = this.intermediateDim * this.hiddenDim;
    const stdDev2 = Math.sqrt(2.0 / this.intermediateDim);
    const w2Data = new Float32Array(w2Size);
    for (let i = 0; i < w2Size; i++) w2Data[i] = MathUtils.randomNormal(0, stdDev2);
    this.w2 = new Tensor([this.intermediateDim, this.hiddenDim], w2Data, true);

    // تسجيل المعاملات في المدير المركزي للتدريب
    paramManager.register(`${layerName}.w1.weight`, this.w1);
    paramManager.register(`${layerName}.w2.weight`, this.w2);
  }

  /**
   * التمرير الأمامي للشبكة العصبية الأمامية: Out = ReLU(X x W1) x W2
   * @param x المصفوفة القادمة من طبقة الانتباه بعد المعايرة بأبعاد [1, HiddenDim]
   * @param outFinal مصفوفة المخرجات النهائية المحجوزة مسبقاً بنفس أبعاد المدخل [1, HiddenDim]
   */
  public forward(x: Tensor, outFinal: Tensor): Tensor {
    const xData = x.buffer.data as Float32Array;
    const w1Data = this.w1.buffer.data as Float32Array;
    const w2Data = this.w2.buffer.data as Float32Array;
    const finalData = outFinal.buffer.data as Float32Array;

    // مصفوفة وسيطة لتخزين ناتج التوسيع والتنشيط بأبعاد [IntermediateDim]
    const intermediateOut = new Float32Array(this.intermediateDim);

    // 1. الطبقة الأولى: الضرب الخطي + دالة التنشيط ReLU (X x W1)
    for (let j = 0; j < this.intermediateDim; j++) {
      let sum = 0;
      for (let i = 0; i < this.hiddenDim; i++) {
        sum += xData[i] * w1Data[i * this.intermediateDim + j];
      }
      // تطبيق دالة التنشيط الفورية من مكتبة الـ Math لمنع الأرقام السالبة وتفعيل الخصائص غير الخطية
      intermediateOut[j] = MathUtils.relu(sum);
    }

    // 2. الطبقة الثانية: التقليص وإعادة البيانات للأبعاد الأصلية (IntermediateOut x W2)
    finalData.fill(0); // تصفير بافر المخرجات
    for (let j = 0; j < this.hiddenDim; j++) {
      let sum = 0;
      for (let i = 0; i < this.intermediateDim; i++) {
        sum += intermediateOut[i] * w2Data[i * this.hiddenDim + j];
      }
      finalData[j] = sum;
    }

    // ربط العملية بالـ Autograd للتفاضل التلقائي العكسي
    if (x.requiresGrad || this.w1.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'feed_forward', inputs: [x, this.w1, this.w2] };
    }

    return outFinal;
  }
}
