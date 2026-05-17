/**
 * @file src/core/tensor.ts
 * @project rafiq-ai-core
 * @description The user-facing Tensor object encapsulating data buffers, shapes, strides, and graph links.
 */

import { Ops } from './ops';
import { TensorShape, TensorStrides, TensorBuffer, DataType } from './types';

export class Tensor {
  public id: string;
  public shape: TensorShape;
  public strides: TensorStrides;
  public buffer: TensorBuffer;
  
  // الخصائص الخاصة بمحرك التفاضل التلقائي (Autograd)
  public grad: Tensor | null = null;
  public creator: any = null; // سيتم ربطه بملف graph.ts لاحقاً
  public requiresGrad: boolean;

  constructor(
    shape: TensorShape,
    data: Float32Array | Int8Array,
    requiresGrad: boolean = false,
    dataType: DataType = 'float32'
  ) {
    this.id = Math.random().toString(36).substring(7);
    this.shape = shape;
    this.requiresGrad = requiresGrad;
    this.strides = this.computeStrides(shape);
    
    this.buffer = {
      id: this.id,
      data: data,
      dataType: dataType,
      byteLength: data.byteLength
    };

    if (this.requiresGrad) {
      this.grad = new Tensor(shape, new Float32Array(data.length).fill(0), false, dataType);
    }
  }

  // حساب الـ Strides تلقائياً بناءً على الأبعاد لضمان التسطيح الصحيح في الذاكرة
  private computeStrides(shape: TensorShape): TensorStrides {
    const strides = new Array(shape.length);
    let currentStride = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
      strides[i] = currentStride;
      currentStride *= shape[i];
    }
    return strides;
  }

  /**
   * Forward Operation: Matrix Multiplication
   */
  public matmul(other: Tensor, out: Tensor): Tensor {
    Ops.matmul(this.buffer, this.shape, other.buffer, other.shape, out.buffer);
    
    // ربط العلاقات في الـ Graph سيتم تفعيله هنا في مرحلة الـ Autograd
    if (this.requiresGrad || other.requiresGrad) {
      out.requiresGrad = true;
      out.creator = { op: 'matmul', inputs: [this, other] };
    }
    
    return out;
  }

  /**
   * Forward Operation: Element-wise Addition
   */
  public add(other: Tensor, out: Tensor): Tensor {
    Ops.add(this.buffer, other.buffer, out.buffer);
    
    if (this.requiresGrad || other.requiresGrad) {
      out.requiresGrad = true;
      out.creator = { op: 'add', inputs: [this, other] };
    }
    
    return out;
  }
}
