/**
 * @file src/models/baseModel.ts
 * @project rafiq-ai-core
 * @description Abstract base class for all neural network models to enforce lifecycle, parameter tracking, and weight loading.
 */

import { Tensor } from '../core/tensor';
import { ParameterManager } from '../core/parameters';
import { LogContext } from '../core/types';

export abstract class BaseModel {
  protected modelName: string;
  public paramManager: ParameterManager;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.paramManager = new ParameterManager();
  }

  /**
   * سياق الـ Logging الموحد للنماذج لتسهيل تتبع عمليات التدريب والاستدعاء
   */
  protected getContext(action: string, file: string): LogContext {
    return {
      component: 'MODEL',
      file: file,
      action: action
    };
  }

  /**
   * تحميل الأوزان الجاهزة داخل النموذج (Weights/Checkpoints Loading)
   * دالة أساسية لتشغيل أوزان ممررة أو مدربة مسبقاً من ملفات JSON أو باينري חיצוני
   */
  public loadWeights(weights: { [key: string]: Float32Array }): void {
    for (const [name, data] of Object.entries(weights)) {
      const tensor = this.paramManager.get(name);
      if (tensor) {
        if (tensor.buffer.data.length !== data.length) {
          throw new Error(
            `[BaseModel Error] Weight shape mismatch for parameter: ${name}. ` +
            `Expected size ${tensor.buffer.data.length}, but got ${data.length}.`
          );
        }
        // نسخ بيانات الأوزان الحية مباشرة إلى بافر التنسور المستهدف
        (tensor.buffer.data as Float32Array).set(data);
      }
    }
  }

  /**
   * التمرير الأمامي الإجباري للموديل بالكامل
   */
  public abstract forward(inputs: any, outputs: any): any;
}
