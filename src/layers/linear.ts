/**
 * @file src/layers/linear.ts
 * @project rafiq-ai-core
 * @description Linear (Fully Connected) Layer implementing Wx + b with autograd registration.
 */

import { Tensor } from '../core/tensor';
import { ParameterManager } from '../core/parameters';
import { MathUtils } from '../utils/math';

export class Linear {
  public weight: Tensor;
  public bias: Tensor;
  private inFeatures: number;
  private outFeatures: number;

  constructor(
    inFeatures: number, 
    outFeatures: number, 
    paramManager: ParameterManager,
    layerName: string = 'linear'
  ) {
    this.inFeatures = inFeatures;
    this.outFeatures = outFeatures;

    // 1. تهيئة مصفوفة الأوزان بتوزيع عشوائي طبيعي (Kaiming / Xavier Initialization مبسط)
    const weightSize = inFeatures * outFeatures;
    const weightData = new Float32Array(weightSize);
    const stdDev = Math.sqrt(2.0 / inFeatures); // معيار حاسم لاستقرار التدرجات
    
    for (let i = 0; i < weightSize; i++) {
      weightData[i] = MathUtils.randomNormal(0, stdDev);
    }
    this.weight = new Tensor([inFeatures, outFeatures], weightData, true);

    // 2. تهيئة مصفوفة الانحياز (Bias) بأصفار
    const biasData = new Float32Array(outFeatures).fill(0);
    this.bias = new Tensor([outFeatures], biasData, true);

    // 3. تسجيل الأوزان في مدير المعلمات المركزي ليتمكن الـ Optimizer من تحديثها لاحقاً
    paramManager.register(`${layerName}.weight`, this.weight);
    paramManager.register(`${layerName}.bias`, this.bias);
  }

  /**
   * التمرير الأمامي للطبقة الخطية: Out = (In x W) + b
   * @param input مصفوفة المدخلات بأبعاد [BatchSize, InFeatures]
   * @param outMatmul مصفوفة وسيطة محجوزة مسبقاً لناتج الضرب بأبعاد [BatchSize, OutFeatures]
   * @param outFinal مصفوفة مخرجات الطبقة النهائية محجوزة مسبقاً بأبعاد [BatchSize, OutFeatures]
   */
  public forward(input: Tensor, outMatmul: Tensor, outFinal: Tensor): Tensor {
    // خطوة الضرب: In x W
    input.matmul(this.weight, outMatmul);
    
    // خطوة جمع الانحياز: + b (تمثيل برامجي لعملية الـ Broadcasting)
    outMatmul.add(this.bias, outFinal);

    return outFinal;
  }
}
