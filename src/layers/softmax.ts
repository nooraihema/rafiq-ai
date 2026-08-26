/**
 * @file src/layers/softmax.ts
 * @project rafiq-ai-core
 * @description Softmax activation layer with numerical stability guards for probability distribution.
 */

import { Tensor } from '../core/tensor';

export class Softmax {

  /**
   * التمرير الأمامي للدالة الأسية المقننة (Safe Softmax)
   * الحساب الرياضي: Out = exp(x - max(x)) / sum(exp(x - max(x)))
   * @param input المصفوفة المدخلة (القيم الخام/Logits) بأبعاد [BatchSize, SeqLen, VocabSize] أو أبعاد ثنائية
   * @param outFinal مصفوفة المخرجات المحجوزة مسبقاً للاحتمالات بنفس أبعاد المدخلات
   */
  public forward(input: Tensor, outFinal: Tensor): Tensor {
    const inData = input.buffer.data as Float32Array;
    const outData = outFinal.buffer.data as Float32Array;
    
    // سنفترض التسطيح الخطي للحساب على آخر بُعد (الأبعاد الأخيرة للمصفوفة)
    // لتسهيل الشرح والحساب السريع، سنقوم بالعملية لكل سطر (Row-by-Row)
    const rowLength = input.shape[input.shape.length - 1]; 
    const numRows = inData.length / rowLength;

    for (let r = 0; r < numRows; r++) {
      const rowOffset = r * rowLength;

      // 1. إيجاد القيمة العظمى في السطر (Max Trick) لحماية الحسابات من الانفجار العددي Infinity
      let maxVal = inData[rowOffset];
      for (let i = 1; i < rowLength; i++) {
        if (inData[rowOffset + i] > maxVal) {
          maxVal = inData[rowOffset + i];
        }
      }

      // 2. حساب القيم الأسية ومجموعها في نفس الوقت (Exponential & Sum)
      let sumExp = 0;
      for (let i = 0; i < rowLength; i++) {
        const expVal = Math.exp(inData[rowOffset + i] - maxVal); // طرح القيمة العظمى هو سر الأمان الرياضي
        outData[rowOffset + i] = expVal;
        sumExp += expVal;
      }

      // 3. القسمة على المجموع لتحويل القيم إلى احتمالات مجموعها صحيح تماماً (1.0)
      for (let i = 0; i < rowLength; i++) {
        outData[rowOffset + i] /= sumExp;
      }
    }

    // ربط العملية بالرسم البياني للتفاضل التلقائي
    if (input.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'softmax', inputs: [input] };
    }

    return outFinal;
  }
}
