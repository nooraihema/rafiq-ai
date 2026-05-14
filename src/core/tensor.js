/**
 * src/core/tensor.js
 * الحالة: النسخة الفولاذية المحدثة (Residual Support)
 * الوظيفة: الهيكل الرياضي الأساسي الذي يدعم "الكباري" (Residual Connections) والعمليات المتقاطعة.
 */

export class Tensor {
    constructor(data, options = {}) {
        // 1. معالجة البيانات الأولية (Float32 لضمان التوافق مع الـ GPU)
        this.data = this._processData(data);
        
        // 2. إدارة الأبعاد (Shape Management)
        this.shape = options.shape || (this.data ? [this.data.length] : [0]);
        
        // 3. الهوية والرسم البياني (Graph Identity)
        // أضفنا "المدخلات" لتمثيل شجرة الحسابات
        this.id = options.id || `t_${Math.random().toString(36).substr(2, 6)}`;
        this.op = options.op || 'const'; 
        this.inputs = options.inputs || []; 
        
        // 4. إدارة الحالة والمكان
        this.isComputed = options.isComputed !== undefined ? options.isComputed : (this.data !== null);
        this.device = options.device || 'cpu'; 
        this.dtype = options.dtype || 'float32';
    }

    _processData(data) {
        if (data === null) return null;
        if (data instanceof Float32Array) return data;
        if (Array.isArray(data)) return new Float32Array(data);
        if (typeof data === 'number') return new Float32Array([data]);
        return null;
    }

    get size() {
        return this.shape.reduce((a, b) => a * b, 1);
    }

    // --- العمليات الحسابية المحدثة ---

    /**
     * عملية الجمع (أساس الـ Residual Connections)
     * هنا نجمع Tensor مع آخر لضمان عدم ضياع المعلومات الأصلية
     */
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
            throw new Error(`MatMul Error: Inner dimensions must match. Found ${n1} and ${n2}`);
        }

        return new Tensor(null, {
            op: 'matmul',
            inputs: [this, otherTensor],
            shape: [m, p],
            isComputed: false
        });
    }

    /**
     * تحويل الأبعاد (ضروري لحسابات الـ Keys في الـ Attention)
     */
    transpose() {
        const newShape = this.shape.length === 2 ? [this.shape[1], this.shape[0]] : [...this.shape].reverse();
        return new Tensor(null, {
            op: 'transpose',
            inputs: [this],
            shape: newShape,
            isComputed: false
        });
    }

    /**
     * دالة التنشيط (ReLU) لكسر الخطية في الـ FeedForward
     */
    relu() {
        return new Tensor(null, {
            op: 'relu',
            inputs: [this],
            shape: this.shape,
            isComputed: false
        });
    }

    /**
     * توزيع الاحتمالات (Softmax)
     */
    softmax() {
        return new Tensor(null, {
            op: 'softmax',
            inputs: [this],
            shape: this.shape,
            isComputed: false
        });
    }

    // --- أدوات المساعدة لبناء الرسم البياني ---

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
        const newSize = newShape.reduce((a, b) => a * b, 1);
        if (newSize !== this.size) throw new Error("Reshape Error: Size mismatch");
        return new Tensor(this.data, { shape: newShape, id: this.id });
    }

    /**
     * توليد الصيغة الرياضية للـ Backend (JIT)
     * تدعم الآن الـ ReLU والـ Add للـ Residual
     */
    generateFormula(inputVars) {
        switch (this.op) {
            case 'add': return `${inputVars[0]} + ${inputVars[1]}`;
            case 'mul': return `${inputVars[0]} * ${inputVars[1]}`;
            case 'relu': return `max(0.0, ${inputVars[0]})`;
            case 'matmul': return `matmul_op`; 
            case 'softmax': return `softmax_op`;
            default: return inputVars[0];
        }
    }
}
