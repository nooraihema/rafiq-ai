/**
 * @file src/core/memoryPool.ts
 * @project rafiq-ai-core
 * @description Smart memory recycling pool to prevent Garbage Collection spikes on mobile devices.
 */

import { TensorBuffer, DataType } from './types';

export class MemoryPool {
  private static instance: MemoryPool;
  // خريطة لتخزين البافرات غير المستخدمة بناءً على حجمها بالبايت ونوع البيانات
  private pool: Map<string, TensorBuffer[]> = new Map();

  private constructor() {}

  public static getInstance(): MemoryPool {
    if (!MemoryPool.instance) {
      MemoryPool.instance = new MemoryPool();
    }
    return MemoryPool.instance;
  }

  /**
   * توليد مفتاح فريد لخلية التخزين بناءً على الحجم والدقة
   */
  private createKey(size: number, dataType: DataType): string {
    return `${size}_${dataType}`;
  }

  /**
   * جلب بافر جاهز من المخزن أو إنشاء بافر جديد إذا كان المخزن فارغاً
   */
  public acquire(size: number, dataType: DataType): TensorBuffer {
    const key = this.createKey(size, dataType);
    const availableBuffers = this.pool.get(key);

    // إذا كان هناك بافر متاح ومحرر مسبقاً، أعد استخدامه فوراً
    if (availableBuffers && availableBuffers.length > 0) {
      return availableBuffers.pop()!;
    }

    // إذا لم يتوفر، قم بإنشاء حاوية ذاكرة جديدة تماماً
    const data = dataType === 'float32' ? new Float32Array(size) : new Int8Array(size);
    
    return {
      id: Math.random().toString(36).substring(7),
      data: data,
      dataType: dataType,
      byteLength: data.byteLength
    };
  }

  /**
   * إعادة البافر إلى المخزن بدلاً من تركه للمتصفح ليقوم بحذفه
   */
  public release(buffer: TensorBuffer): void {
    const size = buffer.data.length;
    const key = this.createKey(size, buffer.dataType);

    if (!this.pool.has(key)) {
      this.pool.set(key, []);
    }

    // تنظيف البيانات (اختياري، لتجنب تسريب أرقام قديمة، لكنه سريع)
    buffer.data.fill(0);
    
    this.pool.get(key)!.push(buffer);
  }

  /**
   * تفريغ المخزن بالكامل من الذاكرة الحية (RAM)
   */
  public clear(): void {
    this.pool.clear();
  }
}
