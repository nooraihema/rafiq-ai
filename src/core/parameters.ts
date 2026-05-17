/**
 * @file src/core/parameters.ts
 * @project rafiq-ai-core
 * @description Parameter tracker to manage, register, and slice trainable weights for optimizers.
 */

import { Tensor } from './tensor';

export class ParameterManager {
  private parameters: Map<string, Tensor> = new Map();
  private names: Map<string, string> = new Map(); // ربط معرف المصفوفة باسمها البرمجي

  /**
   * تسجيل معامل (وزن أو انحياز) داخل مدير المعلمات
   */
  public register(name: string, tensor: Tensor): void {
    if (!tensor.requiresGrad) {
      tensor.requiresGrad = true; // إجبار الأوزان على تفعيل التدرج تلقائياً
    }
    this.parameters.set(tensor.id, tensor);
    this.names.set(tensor.id, name);
  }

  /**
   * جلب كافة المصفوفات القابلة للتدريب في النموذج حالياً
   */
  public getParameters(): Tensor[] {
    return Array.from(this.parameters.values());
  }

  /**
   * جلب اسم المعامل بواسطة الـ ID الخاص به (مفيدة جداً للـ الـ Logging والتشخيص)
   */
  public getName(tensorId: string): string {
    return this.names.get(tensorId) || 'unknown_param';
  }

  /**
   * تصفير كافة التدرجات (Zero Grad)
   * يتم استدعاؤها في بداية كل خطوة تدريبية لمنع تراكم تدرجات الخطوات السابقة
   */
  public zeroGradients(): void {
    for (const tensor of this.parameters.values()) {
      if (tensor.grad) {
        (tensor.grad.buffer.data as Float32Array).fill(0);
      }
    }
  }

  /**
   * تفريغ وإلغاء تسجيل المعلمات لتوفير الذاكرة
   */
  public clear(): void {
    this.parameters.clear();
    this.names.clear();
  }
}
