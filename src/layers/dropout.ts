/**
 * @file src/layers/dropout.ts
 * @project rafiq-ai-core
 * @description Dropout layer for regularization during training, bypassing during inference.
 */

import { BaseLayer } from './baseLayer';
import { Tensor } from '../core/tensor';

export class Dropout extends BaseLayer {
  private dropRatio: number;
  private isTraining: boolean = false;

  constructor(dropRatio: number = 0.1, layerName: string = 'dropout') {
    super(layerName);
    this.dropRatio = dropRatio;
  }

  /**
   * تبديل وضعية الطبقة بين التدريب والاستدعاء
   */
  public setTrainingMode(mode: boolean): void {
    this.isTraining = mode;
  }

  /**
   * التمرير الأمامي: إسقاط عشوائي لعقد الشبكة بنسبة محددة أثناء التدريب فقط
   * @param input المصفوفة المدخلة المراد تطبيق الإسقاط عليها
   * @param outFinal مصفوفة المخرجات المحجوزة مسبقاً بنفس الأبعاد
   */
  public forward(input: Tensor, outFinal: Tensor): Tensor {
    const inData = input.buffer.data as Float32Array;
    const outData = outFinal.buffer.data as Float32Array;

    // صمام أمان للأداء: إذا كنا في وضع الاستدعاء (Inference/Generation)
    // نقوم بنسخ البيانات مباشرة للمخرجات دون إضاعة طاقة المعالج في الإسقاط العشوائي
    if (!this.isTraining || this.dropRatio === 0) {
      outData.set(inData);
      
      if (input.requiresGrad) {
        outFinal.requiresGrad = true;
        outFinal.creator = { op: 'dropout_passthrough', inputs: [input] };
      }
      return outFinal;
    }

    // معامل القياس الرياضي لتكبير القيم المتبقية لتعويض العقد الميتة (Inverted Dropout)
    const scale = 1.0 / (1.0 - this.dropRatio);

    for (let i = 0; i < inData.length; i++) {
      // إذا كان الرقم العشوائي أقل من النسبة المحددة، نقوم بإطفاء الخلية تماماً (صفر)
      if (Math.random() < this.dropRatio) {
        outData[i] = 0;
      } else {
        // إذا نَجَتْ الخلية، نقوم بضرب قيمتها في الـ scale للمحافظة على توازن الطاقة الإجمالية للشبكة
        outData[i] = inData[i] * scale;
      }
    }

    // ربط العملية بالـ Autograd
    if (input.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'dropout', inputs: [input] };
    }

    return outFinal;
  }
}
