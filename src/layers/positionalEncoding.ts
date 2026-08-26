/**
 * @file src/layers/positionalEncoding.ts
 * @project rafiq-ai-core
 * @description Sinusoidal Positional Encoding layer to inject sequence order into word embeddings.
 */

import { BaseLayer } from './baseLayer';
import { Tensor } from '../core/tensor';

export class PositionalEncoding extends BaseLayer {
  private maxSeqLen: number;
  private hiddenDim: number;
  private encodingMatrix: Float32Array;

  constructor(maxSeqLen: number, hiddenDim: number, layerName: string = 'positional_encoding') {
    super(layerName);
    this.maxSeqLen = maxSeqLen;
    this.hiddenDim = hiddenDim;
    
    // حجز مصفوفة ثابتة في الذاكرة لتخزين ترميز المواقع بالكامل مسبقاً
    this.encodingMatrix = new Float32Array(maxSeqLen * hiddenDim);
    this.precomputeEncodings();
  }

  /**
   * الحساب المسبق لقيم الجيب وجيب التمام (Sine and Cosine) لجميع المواقع المتاحة
   * المعادلة: 
   * PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
   * PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
   */
  private precomputeEncodings(): void {
    for (let pos = 0; pos < this.maxSeqLen; pos++) {
      const rowOffset = pos * this.hiddenDim;
      
      for (let i = 0; i < this.hiddenDim; i += 2) {
        // حساب القاسم المشترك بناءً على البعد الحالي
        const exponent = i / this.hiddenDim;
        const divTerm = Math.pow(10000, exponent);

        // تطبيق دالة الجيب على الأبعاد الزوجية وجيب التمام على الأبعاد الفردية
        if (i < this.hiddenDim) {
          this.encodingMatrix[rowOffset + i] = Math.sin(pos / divTerm);
        }
        if (i + 1 < this.hiddenDim) {
          this.encodingMatrix[rowOffset + i + 1] = Math.cos(pos / divTerm);
        }
      }
    }
  }

  /**
   * التمرير الأمامي: دمج ترميز المواقع مع مصفوفة الكلمات عبر الجمع المباشر
   * @param input مصفوفة متجهات الكلمات القادمة من الـ Embedding بأبعاد [SeqLen, HiddenDim]
   * @param outFinal مصفوفة المخرجات المحجوزة مسبقاً بنفس الأبعاد
   */
  public forward(input: Tensor, outFinal: Tensor): Tensor {
    const inData = input.buffer.data as Float32Array;
    const outData = outFinal.buffer.data as Float32Array;
    const seqLen = input.shape[0]; // طول الجملة الفعلية الحالية

    if (seqLen > this.maxSeqLen) {
      throw new Error(
        `[PositionalEncoding Error] Sequence length ${seqLen} exceeds precomputed max length ${this.maxSeqLen}`
      );
    }

    // عملية الجمع المباشر: Embedding Vector + Positional Encoding Vector
    for (let i = 0; i < inData.length; i++) {
      outData[i] = inData[i] + this.encodingMatrix[i];
    }

    // ربط العملية بالـ Autograd للتفاوض التلقائي
    if (input.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'positional_encoding', inputs: [input] };
    }

    return outFinal;
  }
}
