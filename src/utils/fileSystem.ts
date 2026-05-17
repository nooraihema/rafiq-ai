/**
 * @file src/utils/fileSystem.ts
 * @project rafiq-ai-core
 * @description Cross-platform file persistence layer for saving and loading raw tensor weights.
 */

export class FileSystemUtils {
  
  /**
   * تحويل بافر الأوزان الثنائية (ArrayBuffer) إلى نظام تشفير Base64 لتخزينه كـ String
   * (مثالي للبيئات الهجينة ومخازن المتصفح مثل LocalStorage أو IndexedDB)
   */
  public static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * إعادة تحويل كود الـ Base64 إلى بافر ثنائي أصلي (ArrayBuffer) عند تحميل الأوزان
   */
  public static base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * محاكاة حفظ ملف الأوزان بصيغة ثنائية خفيفة
   */
  public static saveWeightsMock(filename: string, weightsData: ArrayBuffer): boolean {
    // هنا سيتم ربط البيئة الفعلية لاحقاً (مثال: استخدام File System للـ Node أو IndexedDB للمتصفح)
    console.log(`💾 [FileSystem] Weights successfully saved to simulated file: ${filename} (${weightsData.byteLength} bytes)`);
    return true;
  }
}
