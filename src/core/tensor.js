/**
 * src/core/tensor.js
 * الحالة: النسخة الفولاذية المحدثة والمطهرة (Auto-Sizing + Residual Support + Unique Tracing)
 * الوظيفة: الهيكل الرياضي الأساسي لـ رفيق-AI. تم إصلاح فخ الأبعاد الأحادية تلقائياً.
 */

export class Tensor {
    constructor(data, options = {}) {
        // 1. معالجة البيانات الأولية (Float32 لضمان التوافق مع الـ GPU)
        this.data = this._processData(data);
        
        // 2. إدارة الأبعاد الذكية (Smart Shape Management) 
        // 🛡️ صمام أمان: لو مفيش Shape، بنبني بعد ثنائي تلقائي [1, Length] بدل أحادي لحماية الـ Transformer
        if (options.shape) {
            this.shape = options.shape;
        } else if (this.data) {
            this.shape = [1, this.data.length]; // 🔥 تصحيح فوري: تحويل التوكنز تلقائياً لـ [1, N] لمنع الانهيار
        } else {
            this.shape = [0];
        }

        if (!Array.isArray(this.shape)) {
            this.shape = typeof this.shape === 'number' ? [this.shape] : [0];
        }
        
        // 3. الهوية والرسم البياني (Graph Identity)
        const randomId = Math.random().toString(36).substr(2, 6);
        this.op = options.op || 'const'; 
        this.id = options.id || `t_${this.op}_${randomId}_${Date.now()}`;
        this.inputs = options.inputs || []; 
        
        // 4. إدارة الحالة والمكان
        this.isComputed = options.isComputed !== undefined ? options.isComputed : (this.data !== null);
        this.device = options.device || 'cpu'; 
        this.dtype = options.dtype || 'float32';
    }

    _processData(data) {
        if (data === null || data === undefined) return null;
        if (data instanceof Float32Array) return data;
        if (Array.isArray(data)) return new Float32Array(data);
        if (typeof data === 'number') return new Float32Array([data]);
        return null;
    }

    get size() {
        if (!this.shape || !Array.isArray(this.shape) || this.shape.length === 0) return 0;
        return this.shape.reduce((a, b) => {
            const val = typeof b === 'number' ? b : 1;
            return a * (val === 0 ? 1 : val);
        }, 1);
    }

    // --- العمليات الحسابية المحدثة ---

    add(other) { 
        const otherTensor = this._toTensor(other);
        return new Tensor(null, {
            op: 'add',
            inputs: [this, otherTensor],
            shape: this.shape,
            isComputed: false
        });
    }

    sub(other) { return this._binaryOp('sub', other); }
    mul(other) { return this._binaryOp('mul', other); }
    div(other) { return this._binaryOp('div', other); }

    /**
     * الضرب المصفوفي المطور (Self-Attention Core)
     */
    matmul(other) {
        const otherTensor = this._toTensor(other);
        
        // حساب الأبعاد الناتجة (M x N) * (N x P) = (M x P)
        const m = this.shape.length === 1 ? 1 : this.shape[0];
        const n1 = this.shape.length === 1 ? this.shape[0] : this.shape[1];
        const n2 = otherTensor.shape.length === 1 ? otherTensor.shape[0] : otherTensor.shape[0];
        const p = otherTensor.shape.length === 1 ? 1 : otherTensor.shape[1];

        if (n1 !== n2) {
            console.error(`Dimension mismatch: [${this.shape}] x [${otherTensor.shape}]`);
            throw new Error(`MatMul Error: Inner dimensions must match. Found ${n1} and ${n2}`);
        }

        return new Tensor(null, {
            op: 'matmul',
            inputs: [this, otherTensor],
            shape: [m, p],
            isComputed: false
        });
    }

    transpose() {
        const newShape = this.shape.length === 2 ? [this.shape[1], this.shape[0]] : [...this.shape].reverse();
        return new Tensor(null, {
            op: 'transpose',
            inputs: [this],
            shape: newShape,
            isComputed: false
        });
    }

    relu() {
        return new Tensor(null, {
            op: 'relu',
            inputs: [this],
            shape: this.shape,
            isComputed: false
        });
    }

    softmax() {
        return new Tensor(null, {
            op: 'softmax',
            inputs: [this],
            shape: this.shape,
            isComputed: false
        });
    }

    _binaryOp(type, other) {
        const otherTensor = this._toTensor(other);
        return new Tensor(null, {
            op: type,
            inputs: [this, otherTensor],
            shape: this.shape,
            isComputed: false
        });
    }

    _toTensor(other) {
        if (other instanceof Tensor) return other;
        return new Tensor(other);
    }

    reshape(newShape) {
        if (!newShape || !Array.isArray(newShape)) throw new Error("Reshape Error: Invalid shape");
        const newSize = newShape.reduce((a, b) => a * b, 1);
        if (newSize !== this.size) throw new Error("Reshape Error: Size mismatch");
        return new Tensor(this.data, { shape: newShape, id: this.id });
    }
}
