/**
 * src/core/tensor.js
 * الحالة: النسخة الاحترافية (محرك أكاشا - المرحلة الثالثة)
 * الوظيفة: الهيكل الرياضي الأساسي الذي يدعم الحسابات المؤجلة ويدير علاقات الـ Attention.
 */

export class Tensor {
    constructor(data, options = {}) {
        // 1. معالجة البيانات الأولية
        this.data = this._processData(data);
        
        // 2. إدارة الأبعاد (Shape Management)
        this.shape = options.shape || (this.data ? [this.data.length] : [0]);
        
        // 3. الهوية والرسم البياني (Graph Identity)
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

    // --- العمليات الحسابية الأساسية ---

    add(other) { return this._binaryOp('add', other); }
    sub(other) { return this._binaryOp('sub', other); }
    mul(other) { return this._binaryOp('mul', other); }
    div(other) { return this._binaryOp('div', other); }

    /**
     * الضرب المصفوفي (Q * K^T)
     */
    matmul(other) {
        const otherTensor = this._toTensor(other);
        
        // التحقق من توافق المصفوفات: (M x N) * (N x P) = (M x P)
        const [m, n1] = this.shape.length === 1 ? [1, this.shape[0]] : this.shape;
        const [n2, p] = otherTensor.shape.length === 1 ? [otherTensor.shape[0], 1] : otherTensor.shape;

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
     * تحويل الصفوف إلى أعمدة والعكس (ضروري للـ Key في الـ Attention)
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
     * توزيع الاحتمالات (Softmax) لتحويل سكور الانتباه لنظام الـ 100%
     */
    softmax() {
        return new Tensor(null, {
            op: 'softmax',
            inputs: [this],
            shape: this.shape,
            isComputed: false
        });
    }

    // --- أدوات المساعدة ---

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
     */
    generateFormula(inputVars) {
        switch (this.op) {
            case 'add': return `${inputVars[0]} + ${inputVars[1]}`;
            case 'mul': return `${inputVars[0]} * ${inputVars[1]}`;
            case 'sub': return `${inputVars[0]} - ${inputVars[1]}`;
            case 'div': return `${inputVars[0]} / ${inputVars[1]}`;
            case 'matmul': return `matmul_op`; // سيتم معالجتها كـ Kernel خاص في الـ Backend
            default: return inputVars[0];
        }
    }
}
