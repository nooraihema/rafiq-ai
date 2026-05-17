/**
 * @file src/core/types.ts
 * @project rafiq-ai-core
 * @description Core tensor types and system structures for rafiq-ai engine.
 */

export type TensorShape = number[];
export type TensorStrides = number[];
export type DeviceType = 'cpu' | 'webgpu';
export type DataType = 'float32' | 'int8' | 'int4';

export interface TensorBuffer {
  readonly id: string;
  data: Float32Array | Int8Array;
  dataType: DataType;
  byteLength: number;
}

export interface LogContext {
  component: 'Core' | 'Runtime' | 'Layers' | 'Models' | 'Optimizer' | 'Quantization';
  file: string;
  action: string;
}
