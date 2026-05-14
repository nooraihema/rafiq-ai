/**
 * src/core/tensor.js
 * 
 * الوظيفة: حجر الأساس للنظام (The Graph Tracer).
 * هذا الملف مسؤول عن إدارة البيانات وتتبع العمليات حسابياً دون تنفيذها فوراً،
 * مما يمهد الطريق للـ Compiler لعمل الـ Optimization والـ Fusion.
 */

export class Tensor {
    /**
     * @param {Array|TypedArray} data - البيانات العددية
     * @param {Object} options - إعدادات إضافية (shape, dtype, requiresGrad)
     */
    constructor(data, options = {}) {
        // تعريف الهوية الفريدة للـ Tensor داخل الـ Graph
        this.id = options.id || `t_${Math.random().toString(36).substring(7)}`;
        
        // إدارة الأبعاد (Shape) ونوع البيانات (DType)
        this.shape = options.shape || (data.length ? [data.length] : [0]);
        this.dtype = options.dtype || 'float32';
        this.size = this.shape.reduce((a, b) => a * b, 1);
        
        // تخزين البيانات فعلياً في ذاكرة متصلة (Buffer)
        // ملاحظة: إذا كان الـ Tensor ناتجاً عن عملية (Op)، قد تكون البيانات فارغة مبدئياً
        this.data = data.length > 0 ? this._ensureTypedArray(data, this.dtype) : null;
        
        // إدارة التدرجات (Gradients) للدعم اللاحق للـ Backpropagation
        this.requiresGrad = options.requiresGrad || false;
        this.grad = null; 
        
        // --- حقول الـ Graph Compiler ---
        
        // العملية (Operation) التي أنتجت هذا الـ Tensor
        this.op = options.op || null; 
        
        // المدخلات (الـ Tensors) التي شاركت في إنتاج هذا الـ Tensor
        this.inputs = options.inputs || []; 
        
        // رقم الإصدار لتتبع التغييرات (Versioning)
        this.version = 0;

        // حالة التنفيذ: هل تم حساب هذا الـ Tensor أم أنه لا يزال "وعداً" (Promise)؟
        this.isComputed = this.op === null;
    }

    /**
     * ضمان تخزين البيانات في مصفوفات محددة النوع (TypedArrays)
     */
    _ensureTypedArray(data, dtype) {
        if (data instanceof Float32Array || data instanceof Float64Array) return data;
        return dtype === 'float64' ? new Float64Array(data) : new Float32Array(data);
    }

    /**
     * تسجيل عملية في الـ Graph بدلاً من تنفيذها (Lazy Tracking)
     */
    _attachOp(opName, inputs) {
        return new Tensor([], {
            op: opName,
            inputs: [this, ...inputs],
            shape: this._inferShape(opName, inputs),
            requiresGrad: this.requiresGrad || inputs.some(i => i.requiresGrad)
        });
    }

    /**
     * استنتاج شكل المصفوفة الناتجة بناءً على نوع العملية
     */
    _inferShape(op, inputs) {
        return this.shape; 
    }

    // --- واجهة العمليات الرياضية (Operations API) ---
    // هذه الدوال تبني الـ Graph فقط ولا تستهلك CPU حالياً

    add(other) {
        return this._attachOp('add', [other]);
    }

    sub(other) {
        return this._attachOp('sub', [other]);
    }

    mul(other) {
        return this._attachOp('mul', [other]);
    }

    matmul(other) {
        return this._attachOp('matmul', [other]);
    }

    /**
     * المزامنة (Sync): النقطة التي يتدخل فيها الـ Compiler لتحويل الـ Graph لكود تنفيذي
     */
    async syncData() {
        if (!this.isComputed) {
            // سيتم ربطه لاحقاً بـ AkashaEngine.compileAndRun(this)
            console.log(`[Graph Trace] Resolving: ${this.op} for Tensor ${this.id}`);
            this.isComputed = true;
        }
        return this.data;
    }
}
