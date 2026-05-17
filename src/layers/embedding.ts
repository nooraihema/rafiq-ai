/**
 * @file src/layers/embedding.ts
 * @project rafiq-ai-core
 * @description Embedding layer to map token IDs to continuous vector spaces (Lookup Table).
 */

import { Tensor } from '../core/tensor';
import { ParameterManager } from '../core/parameters';
import { MathUtils } from '../utils/math';

export class Embedding {
  public weight: Tensor;
  private vocabSize: number;
  private embeddingDim: number;

  constructor(
    vocabSize: number,
    embeddingDim: number,
    paramManager: ParameterManager,
    layerName: string = 'embedding'
  ) {
    this.vocabSize = vocabSize;
    this.embeddingDim = embeddingDim;

    // تهيئة مصفوفة القاموس بالكامل (Lookup Table)
    // نستخدم توزيع طبيعي قياسي لتوزيع الكلمات بشكل متوازن في الفراغ العشري
    const totalElements = vocabSize * embeddingDim;
    const weightData = new Float32Array(totalElements);
    
    for (let i = 0; i < totalElements; i++) {
      weightData[i] = MathUtils.randomNormal(0, 1.0);
    }

    // المصفوفة هنا تأخذ شكل جدول: [عدد الكلمات في القاموس، أبعاد الكلمة الواحدة]
    this.weight = new Tensor([vocabSize, embeddingDim], weightData, true);

    // تسجيل الأوزان في المدير المركزي ليتعلم المحرك معاني الكلمات أثناء التدريب
    paramManager.register(`${layerName}.weight`, this.weight);
  }

  /**
   * التمرير الأمامي: سحب المتجهات المقابلة لمعرفات الكلمات (Token IDs)
   * @param tokenIds مصفوفة أحادية تحتوي على أرقام الكلمات المدخلة [SeqLen]
   * @param outFinal مصفوفة المخرجات المحجوزة مسبقاً بأبعاد [SeqLen, EmbeddingDim]
   */
  public forward(tokenIds: Int8Array, outFinal: Tensor): Tensor {
    const weightData = this.weight.buffer.data as Float32Array;
    const outData = outFinal.buffer.data as Float32Array;

    // عملية الـ Lookup: نمر على كل التوكنز المدخلة ونسحب سطرها بالكامل من جدول الأوزان
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];

      // حماية ضد التوكنز الخاطئة أو الخارجة عن نطاق القاموس
      if (tokenId < 0 || tokenId >= this.vocabSize) {
        throw new Error(`[Embedding Error] Token ID ${tokenId} is out of vocabulary bounds (0 - ${this.vocabSize - 1}).`);
      }

      const sourceOffset = tokenId * this.embeddingDim;
      const targetOffset = i * this.embeddingDim;

      // نسخ أبعاد الكلمة المحددة مباشرة إلى مصفوفة المخرجات
      for (let d = 0; d < this.embeddingDim; d++) {
        outData[targetOffset + d] = weightData[sourceOffset + d];
      }
    }

    // ربط العملية بالـ Autograd
    if (this.weight.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'embedding', inputs: [this.weight], meta: { tokenIds } };
    }

    return outFinal;
  }
}
