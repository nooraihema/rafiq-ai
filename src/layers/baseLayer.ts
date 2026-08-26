/**
 * @file src/layers/baseLayer.ts
 * @project rafiq-ai-core
 * @description Abstract base class for all neural network layers to enforce unified lifecycle and tracing.
 */

import { Tensor } from '../core/tensor';
import { LogContext } from '../core/types';

export abstract class BaseLayer {
  protected layerName: string;

  constructor(layerName: string) {
    this.layerName = layerName;
  }

  /**
   * سياق الـ Logging الخاص بالطبقة لتتبع العمليات تلقائياً
   */
  protected getContext(action: string, file: string): LogContext {
    return {
      component: 'LAYER',
      file: file,
      action: action
    };
  }

  /**
   * التمرير الأمامي الإجباري لكل طبقة
   * @param inputs مصفوفة أو مجموعة مصفوفات الإدخال
   * @param outputs مصفوفة أو مجموعة مصفوفات محجوزة مسبقاً للمخرجات
   */
  public abstract forward(inputs: any, outputs: any): any;
}
