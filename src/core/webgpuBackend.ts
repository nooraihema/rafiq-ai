/**
 * @file src/core/webgpuBackend.ts
 * @project rafiq-ai-core
 * @description Future WebGPU acceleration kernel. Currently acts as a baseline placeholder.
 */

import { IHardwareBackend } from './backend.interface';
import { TensorShape, TensorBuffer } from './types';

export class WebgpuBackend implements IHardwareBackend {
  
  add(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    throw new Error('WebGPU primitive [add] not implemented yet.');
  }

  sub(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    throw new Error('WebGPU primitive [sub] not implemented yet.');
  }

  mul(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    throw new Error('WebGPU primitive [mul] not implemented yet.');
  }

  div(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void {
    throw new Error('WebGPU primitive [div] not implemented yet.');
  }

  matmul(
    a: TensorBuffer, aShape: TensorShape, 
    b: TensorBuffer, bShape: TensorShape, 
    out: TensorBuffer
  ): void {
    throw new Error('WebGPU primitive [matmul] not implemented yet.');
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
    throw new Error('WebGPU primitive [softmax] not implemented yet.');
  }

  gelu(input: TensorBuffer, out: TensorBuffer): void {
    throw new Error('WebGPU primitive [gelu] not implemented yet.');
  }

  copyBuffer(source: TensorBuffer, destination: TensorBuffer): void {
    throw new Error('WebGPU Cross-buffer copy not implemented yet.');
  }

  freeBuffer(buffer: TensorBuffer): void {
    buffer.data = new Float32Array(0);
  }
}
