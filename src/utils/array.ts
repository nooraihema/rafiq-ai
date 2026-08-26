/**
 * @file src/utils/array.ts
 * @project rafiq-ai-core
 * @description Advanced TypedArray utilities for flattening, reshaping, and raw memory coping.
 */

export class ArrayUtils {
  
  /**
   * تسطيح مصفوفة متعددة الأبعاد إلى مصفوفة أحادية مسطحة (Flat Float32Array)
   */
  public static flattenToFloat32(nestedArray: any[]): Float32Array {
    const flat: number[] = [];
    
    function recurse(arr: any[]) {
      for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i])) {
          recurse(arr[i]);
        } else {
          flat.push(arr[i]);
        }
      }
    }
    
    recurse(nestedArray);
    return new Float32Array(flat);
  }

  /**
   * نسخ جزء محدد من الذاكرة الحية بسرعة وكفاءة عالية دون مروق عبر الحلقات المعتادة
   */
  public static blit(
    source: Float32Array | Int8Array, sourceOffset: number,
    target: Float32Array | Int8Array, targetOffset: number,
    length: number
  ): void {
    const subArray = source.subarray(sourceOffset, sourceOffset + length);
    target.set(subArray, targetOffset);
  }
}
