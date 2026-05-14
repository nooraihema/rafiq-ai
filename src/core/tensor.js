/**
 * src/core/tensor.js
 * الحالة: تطوير شامل للعمليات الرياضية.
 */

export class Tensor {
    constructor(data, options = {}) {
        this.data = data instanceof Float32Array ? data : new Float32Array(data);
        this.shape = options.shape || [this.data.length];
        this.id = options.id || `t_${Math.random().toString(36).substr(2, 6)}`;
        this.op = options.op || 'const';
        this.inputs = options.inputs || [];
        this.isComputed = options.isComputed !== undefined ? options.isComputed : true;
    }

    // دالة مساعدة لإنشاء تنسور جديد من عملية
    static createOp(opType, inputs, shape) {
        return new Tensor(null, {
            op: opType,
            inputs: inputs,
            shape: shape,
            isComputed: false
        });
    }

    // ➕ الجمع
    add(other) {
        return Tensor.createOp('add', [this, this._toTensor(other)], this.shape);
    }

    // ➖ الطرح
    sub(other) {
        return Tensor.createOp('sub', [this, this._toTensor(other)], this.shape);
    }

    // ✖️ الضرب (Element-wise)
    mul(other) {
        return Tensor.createOp('mul', [this, this._toTensor(other)], this.shape);
    }

    // ➗ القسمة
    div(other) {
        return Tensor.createOp('div', [this, this._toTensor(other)], this.shape);
    }

    // 📉 الضرب المصفوفي (Matrix Multiplication) - أساس الـ AI
    matmul(other) {
        const targetShape = [this.shape[0], other.shape[1]];
        return Tensor.createOp('matmul', [this, other], targetShape);
    }

    // تحويل الأرقام العادية لتنسور تلقائياً
    _toTensor(other) {
        if (other instanceof Tensor) return other;
        return new Tensor(new Float32Array([other]), { shape: [1] });
    }
}
