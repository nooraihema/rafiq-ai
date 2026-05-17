/**
 * @file src/core/ops.ts
 * @project rafiq-ai-core
 * @description The Central Operation Dispatcher (The Hub). Converts tensor calls into hardware execution.
 */

import { DeviceManager } from './deviceManager';
import { TensorShape, TensorBuffer } from './types';

export class Ops {
  // جلب المحرك الفعلي النشط حالياً عبر المايسترو
  private static get backend() {
    return DeviceManager.getInstance().getActiveBackend();
  }

  /**
   * Element-wise Addition: C = A + B
   */
  public static add(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    this.backend.add(a, b, out);
  }

  /**
   * Element-wise Subtraction: C = A - B
   */
  public static sub(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    this.backend.sub(a, b, out);
  }

  /**
   * Element-wise Multiplication: C = A * B
   */
  public static mul(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    this.backend.mul(a, b, out);
  }

  /**
   * Element-wise Division: C = A / B
   */
  public static div(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    this.backend.div(a, b, out);
  }

  /**
   * Matrix Multiplication: C = A x B
   */
  public static matmul(
    a: TensorBuffer, aShape: TensorShape,
    b: TensorBuffer, bShape: TensorShape,
    out: TensorBuffer
  ): void {
    // هنا تكمن قوة الموجه؛ يمكننا مستقبلاً وضع فحص الأبعاد (Shape Validation) مركزي هنا قبل الإرسال للعتاد
    if (aShape[aShape.length - 1] !== bShape[0]) {
      throw new Error(`Matrix Multiplication Dimension Mismatch: ${aShape[aShape.length - 1]} !== ${bShape[0]}`);
    }
    this.backend.matmul(a, aShape, b, bShape, out);
  }

  /**
   * Softmax Activation
   */
  public static softmax(input: TensorBuffer, shape: TensorShape, axis: number, out: TensorBuffer): void {
    this.backend.softmax(input, shape, axis, out);
  }

  /**
   * GELU Activation
   */
  public static gelu(input: TensorBuffer, out: TensorBuffer): void {
    this.backend.gelu(input, out);
  }
}
