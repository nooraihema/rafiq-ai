/**
 * src/core/tensor.js
 * الوظيفة: الهيكل الرياضي الأساسي للبيانات (The Core Data Structure).
 */

export class Tensor {
    constructor(data, options = {}) {
        // تحويل البيانات لـ Float32Array لو مش كدة
        this.data = data instanceof Float32Array ? data : new Float32Array(data);
        
        // تحديد الأبعاد (Default: 1D array)
        this.shape = options.shape || [this.data.length];
        this.id = options.id || `t_${Math.random().toString(36).substr(2, 6)}`;
        
        // تتبع العمليات لبناء الـ Graph
        this.op = options.op || 'const'; // العملية اللي انتجت التنسور
        this.inputs = options.inputs || []; // التنسورات اللي شاركت في العملية
        
        this.isComputed = options.isComputed !== undefined ? options.isComputed : true;
        this.dtype = 'float32';
    }

    // دالة لجمع تنسورين مع التأكد من الأبعاد
    add(other) {
        if (!(other instanceof Tensor)) {
            other = new Tensor([other], { shape: [1] });
        }
        
        // التحقق من توافق الأبعاد (Fixing Shape Mismatch)
        if (JSON.stringify(this.shape) !== JSON.stringify(other.shape)) {
            // هنا ممكن نضيف خاصية الـ Broadcasting لاحقاً
            throw new Error(`Graph Error: Shape mismatch in 'add' between ${this.shape} and ${other.shape}`);
        }

        return new Tensor(null, {
            op: 'add',
            inputs: [this, other],
            shape: this.shape,
            isComputed: false,
            id: `t_add_${Math.random().toString(36).substr(2, 4)}`
        });
    }

    // دالة لتغيير الشكل (Reshape) - مهمة جداً للـ Neural Networks
    reshape(newShape) {
        const newSize = newShape.reduce((a, b) => a * b, 1);
        if (newSize !== this.data.length) {
            throw new Error(`Cannot reshape tensor of size ${this.data.length} to ${newShape}`);
        }
        this.shape = newShape;
        return this;
    }
}
