/**
 * @file src/layers/residual.ts
 * @project rafiq-ai-core
 * @description Residual Connection (Skip Connection) layer to add inputs directly to outputs, preventing vanishing gradients.
 */

import { BaseLayer } from './baseLayer';
import { Tensor } from '../core/tensor';

export class Residual extends BaseLayer {

  constructor(layerName: string = 'residual') {
    super(layerName);
  }

  /**
   * التمرير الأمامي للاتصال الالتفافي: Out = Input + SubLayerOutput
   * @param input المصفوفة الأصلية قبل دخول الطبقة الفرعية (Skip Connection)
   * @param subLayerOutput مصفوفة مخرجات الطبقة الفرعية (مثل الـ Attention أو FFN)
   * @param outFinal مصفوفة المخرجات النهائية المحجوزة مسبقاً لدمج الطرفين
   */
  public forward(input: Tensor, subLayerOutput: Tensor, outFinal: Tensor): Tensor {
    const inData = input.buffer.data as Float32Array;
    const subData = subLayerOutput.buffer.data as Float32Array;
    const outData = outFinal.buffer.data as Float32Array;

    // التأكد من تطابق الأحجام لمنع انهيار الذاكرة أثناء الجمع المباشر
    if (inData.length !== subData.length || inData.length !== outData.length) {
      throw new Error(
        `[Residual Error] Dimension mismatch. Input size (${inData.length}), ` +
        `SubLayer size (${subData.length}), and Output size (${outData.length}) must be identical.`
      );
    }

    // عنصر زائد عنصر: جمع المدخلات الأصلية مع المخرجات المعالجة مباشرة
    for (let i = 0; i < inData.length; i++) {
      outData[i] = inData[i] + subData[i];
    }

    // ربط العملية بـ Autograd للتفاوض التلقائي العكسي (Backpropagation)
    // ميزة الاتصال الالتفافي هنا أنها تمرر التدرج (Gradient) للخلف بدون عوائق
    if (input.requiresGrad || subLayerOutput.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'residual', inputs: [input, subLayerOutput] };
    }

    return outFinal;
  }
}
