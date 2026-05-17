/**
 * @file src/layers/kvCache.ts
 * @project rafiq-ai-core
 * @description Key-Value Cache manager to store past token states and accelerate autoregressive inference.
 */

import { Tensor } from '../core/tensor';

export class KVCache {
  public keyCache: Float32Array;
  public valueCache: Float32Array;
  private maxSeqLen: number;
  private hiddenDim: number;
  private currentSize: number = 0; // يشير إلى عدد التوكنز المخزنة حالياً في الذاكرة

  constructor(maxSeqLen: number, hiddenDim: number) {
    this.maxSeqLen = maxSeqLen;
    this.hiddenDim = hiddenDim;

    // حجز مساحة ذاكرة ثابتة ومسطحة للـ Key والـ Value مسبقاً لمنع الـ Garbage Collection أثناء التوليد
    this.keyCache = new Float32Array(maxSeqLen * hiddenDim);
    this.valueCache = new Float32Array(maxSeqLen * hiddenDim);
  }

  /**
   * دفع المتجهات الجديدة الخاصة بالتوكن الحالي داخل الذاكرة المخبئية
   * @param newKey مصفوفة الـ Key للتوكن الحالي بأبعاد [1, HiddenDim]
   * @param newValue مصفوفة الـ Value للتوكن الحالي بأبعاد [1, HiddenDim]
   */
  public update(newKey: Tensor, newValue: Tensor): void {
    const kData = newKey.buffer.data as Float32Array;
    const vData = newValue.buffer.data as Float32Array;

    if (this.currentSize >= this.maxSeqLen) {
      throw new Error(
        `[KVCache Error] Cache overflow. Current size (${this.currentSize}) ` +
        `exceeds max sequence length allocation (${this.maxSeqLen}).`
      );
    }

    const offset = this.currentSize * this.hiddenDim;

    // نسخ البيانات الحية مباشرة إلى الموقع المحجوز لها في الذاكرة المخبئية الثابتة
    this.keyCache.set(kData, offset);
    this.valueCache.set(vData, offset);

    // زيادة مؤشر التوكنز المخزنة بمقدار 1
    this.currentSize++;
  }

  /**
   * جلب كامل متجهات الـ Keys المخزنة حتى الآن كـ Float32Array مسطحة
   */
  public getKeyData(): Float32Array {
    return this.keyCache.subarray(0, this.currentSize * this.hiddenDim);
  }

  /**
   * جلب كامل متجهات الـ Values المخزنة حتى الآن كـ Float32Array مسطحة
   */
  public getValueData(): Float32Array {
    return this.valueCache.subarray(0, this.currentSize * this.hiddenDim);
  }

  /**
   * تفريغ الذاكرة المخبئية تماماً وإعادة المؤشر للصفر لتبدأ محادثة أو جملة جديدة
   */
  public reset(): void {
    this.currentSize = 0;
    this.keyCache.fill(0);
    this.valueCache.fill(0);
  }

  /**
   * الحصول على عدد التوكنز المخزنة حالياً
   */
  public get length(): number {
    return this.currentSize;
  }
}
