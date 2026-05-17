/**
 * @file src/core/backend.interface.ts
 * @project rafiq-ai-core
 * @description Hardware-agnostic interface enforcing strict execution contracts for all backends.
 */

import { TensorShape, TensorBuffer } from './types';

export interface IHardwareBackend {
  // Element-wise Operations
  add(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void;
  sub(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void;
  mul(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void;
  div(a: TensorBuffer, b: TensorBuffer, out: TensorBuffer): void;

  // Matrix Operations
  matmul(
    a: TensorBuffer, aShape: TensorShape, 
    b: TensorBuffer, bShape: TensorShape, 
    out: TensorBuffer
  ): void;

  // Shape & Dimension Mutations
  reshape(shape: TensorShape, strides: TensorShape): TensorShape;
  transpose(shape: TensorShape, strides: TensorShape, axes: number[]): { shape: TensorShape, strides: TensorShape };

  // Advanced Neural Network Activations
  softmax(input: TensorBuffer, shape: TensorShape, axis: number, out: TensorBuffer): void;
  gelu(input: TensorBuffer, out: TensorBuffer): void;

  // Memory Management Utilities
  copyBuffer(source: TensorBuffer, destination: TensorBuffer): void;
  freeBuffer(buffer: TensorBuffer): void;
}
