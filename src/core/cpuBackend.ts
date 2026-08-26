/**
 * @file src/core/cpuBackend.ts
 * @project rafiq-ai-core
 * @description Pure TypeScript/JavaScript execution kernel for CPU operations using TypedArrays.
 */

import { IHardwareBackend } from './backend.interface';
import { TensorShape, TensorBuffer } from './types';

export class CpuBackend implements IHardwareBackend {
  
  add(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    const aData = a.data as Float32Array;
    const bData = b.data as Float32Array;
    const outData = out.data as Float32Array;
    
    for (let i = 0; i < outData.length; i++) {
      outData[i] = aData[i] + bData[i];
    }
  }

  sub(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    const aData = a.data as Float32Array;
    const bData = b.data as Float32Array;
    const outData = out.data as Float32Array;

    for (let i = 0; i < outData.length; i++) {
      outData[i] = aData[i] - bData[i];
    }
  }

  mul(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    const aData = a.data as Float32Array;
    const bData = b.data as Float32Array;
    const outData = out.data as Float32Array;

    for (let i = 0; i < outData.length; i++) {
      outData[i] = aData[i] * bData[i];
    }
  }

  div(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    const aData = a.data as Float32Array;
    const bData = b.data as Float32Array;
    const outData = out.data as Float32Array;

    for (let i = 0; i < outData.length; i++) {
      outData[i] = aData[i] / bData[i];
    }
  }

  matmul(
    a: TensorBuffer, aShape: TensorShape, 
    b: TensorBuffer, bShape: TensorShape, 
    out: TensorBuffer
  ): void {
    const aData = a.data as Float32Array;
    const bData = b.data as Float32Array;
    const outData = out.data as Float32Array;

    // كود مبدئي لضرب مصفوفات ثنائي الأبعاد 2D [M, K] x [K, N] = [M, N]
    const M = aShape[0];
    const K = aShape[1];
    const N = bShape[1];

    outData.fill(0);

    for (let i = 0; i < M; i++) {
      for (let k = 0; k < K; k++) {
        const aVal = aData[i * K + k];
        for (let j = 0; j < N; j++) {
          outData[i * N + j] += aVal * bData[k * N + j];
        }
      }
    }
  }

  reshape(shape: TensorShape, strides: TensorShape): TensorShape {
    return [...shape];
  }

  transpose(shape: TensorShape, strides: TensorShape, axes: number[]): { shape: TensorShape, strides: TensorShape } {
    const n = shape.length;
    const nextShape = new Array(n);
    const nextStrides = new Array(n);
    
    for (let i = 0; i < n; i++) {
      nextShape[i] = shape[axes[i]];
      nextStrides[i] = strides[axes[i]];
    }
    
    return { shape: nextShape, strides: nextStrides };
  }

  softmax(input: TensorBuffer, shape: TensorShape, axis: number, out: TensorBuffer): void {
    const inpData = input.data as Float32Array;
    const outData = out.data as Float32Array;
    
    // كود مبدئي مستقر عددياً لحساب الـ Softmax على مصفوفة مسطحة بالكامل
    let maxVal = inpData[0];
    for (let i = 1; i < inpData.length; i++) {
      if (inpData[i] > maxVal) maxVal = inpData[i];
    }

    let sum = 0;
    for (let i = 0; i < inpData.length; i++) {
      outData[i] = Math.exp(inpData[i] - maxVal);
      sum += outData[i];
    }

    for (let i = 0; i < outData.length; i++) {
      outData[i] /= sum;
    }
  }

  gelu(input: TensorBuffer, out: TensorBuffer): void {
    const inpData = input.data as Float32Array;
    const outData = out.data as Float32Array;

    // تقريب كلاسيكي سريع لدالة GELU المناسبة للـ CPU
    for (let i = 0; i < inpData.length; i++) {
      const x = inpData[i];
      outData[i] = 0.5 * x * (1.0 + Math.tanh(Math.sqrt(2.0 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
    }
  }

  copyBuffer(source: TensorBuffer, destination: TensorBuffer): void {
    destination.data.set(source.data);
  }

  freeBuffer(buffer: TensorBuffer): void {
    // تصفير البيانات لتركها للـ Garbage Collector أو إعادة الاستخدام
    buffer.data = new Float32Array(0);
  }
}
