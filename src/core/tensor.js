/**
 * src/core/tensor.js
 * الحالة: النسخة الاحترافية (Production-Grade)
 * الوظيفة: الهيكل الرياضي الأساسي الذي يدعم الحسابات المؤجلة (Lazy Evaluation)
 */

export class Tensor {
    constructor(data, options = {}) {
        // 1. معالجة البيانات الأولية
        this.data = this._processData(data);
        
        // 2. إدارة الأبعاد (Shape Management)
        this.shape = options.shape || (this.data ? [this.data.length] : [0]);
        
        // 3. الهوية والرسم البياني (Graph Identity)
        this.id = options.id || `t_${Math.random().toString(36).substr(2, 6)}`;
        this.op = options.op || 'const'; // العملية: ثابت، جمع، ضرب، إلخ
        this.inputs = options.inputs || []; // المدخلات التي أنتجت هذا التنسور
        
        // 4. إدارة الحالة والمكان
        this.isComputed = options.isComputed !== undefined ? options.isComputed : (this.data !== null);
        this.device = options.device || 'cpu'; // المكان: cpu أو gpu
        this.dtype = options.dtype || 'float32';
    }

    /**
     * معالجة وتحويل أنواع البيانات المختلفة إلى Float32Array
     */
    _processData(data) {
        if (data === null) return null;
        if (data instanceof Float32Array) return data;
        if (Array.isArray(data)) return new Float32Array(data);
        if (typeof data === 'number') return new Float32Array([data]);
        if (data instanceof ArrayBuffer) return new Float32Array(data);
        return null;
    }

    /**
     * الحصول على الحجم الكلي (عدد العناصر)
     */
    get size() {
        return this.shape.reduce((a, b) => a * b, 1);
    }

    // --- العمليات الحسابية الأساسية (Element-wise) ---

    add(other) { return this._binaryOp('add', other); }
    sub(other) { return this._binaryOp('sub', other); }
    mul(other) { return this._binaryOp('mul', other); }
    div(other) { return this._binaryOp('div', other); }

    /**
     * الضرب المصفوفي (العملية الأهم في الذكاء الاصطناعي)
     */
    matmul(other) {
        const otherTensor = this._toTensor(other);
        
        // التحقق من توافق المصفوفات (M1 columns must equal M2 rows)
        if (this.shape[1] !== otherTensor.shape[0]) {
            throw new Error(`MatMul Error: Incompatible shapes [${this.shape}] and [${otherTensor.shape}]`);
        }

        const targetShape = [this.shape[0], otherTensor.shape[1]];
        return new Tensor(null, {
            op: 'matmul',
            inputs: [this, otherTensor],
            shape: targetShape,
            isComputed: false
        });
    }

    /**
     * دالة داخلية لبناء عقد العمليات الثنائية
     */
    _binaryOp(type, other) {
        const otherTensor = this._toTensor(other);
        
        // التحقق من توافق الأبعاد (Broadcasting Check)
        this._checkBroadcast(this.shape, otherTensor.shape);

        return new Tensor(null, {
            op: type,
            inputs: [this, otherTensor],
            shape: this.shape, // نفترض حالياً الحفاظ على شكل الطرف الأول
            isComputed: false
        });
    }

    /**
     * تحويل أي مدخل إلى كائن Tensor لضمان استقرار العمليات
     */
    _toTensor(other) {
        if (other instanceof Tensor) return other;
        return new Tensor(other);
    }

    /**
     * التحقق الرياضي من إمكانية دمج المصفوفات
     */
    _checkBroadcast(s1, s2) {
        // إذا كانت الأبعاد متطابقة تماماً، فالعملية سليمة
        if (JSON.stringify(s1) === JSON.stringify(s2)) return true;
        
        // إذا كان أحدهما رقماً فريداً (Scalar)، فالعملية سليمة (Broadcasting)
        if (s2.length === 1 && s2[0] === 1) return true;
        if (s1.length === 1 && s1[0] === 1) return true;

        throw new Error(`Shape Mismatch: Cannot operate on ${s1} and ${s2}`);
    }

    /**
     * إعادة تشكيل المصفوفة دون تغيير بياناتها
     */
    reshape(newShape) {
        const newSize = newShape.reduce((a, b) => a * b, 1);
        if (newSize !== this.size) {
            throw new Error(`Reshape Error: Total size must remain ${this.size}. Attempted ${newShape}`);
        }
        return new Tensor(this.data, {
            shape: newShape,
            id: this.id,
            device: this.device
        });
    }
}
