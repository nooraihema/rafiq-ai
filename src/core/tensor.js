/**
 * src/core/tensor.js
 * الحالة: النسخة السيادية الفولاذية (Computational Graph + Advanced Broadcasting + Auto-Regressive Ready)
 * الوظيفة: النواة الرياضية لمحرك "أكاشا" لـ رفيق-AI. إدارة الرسوم البيانية الحسابية وحل مشاكل التنسورات الخاملة.
 */

export class Tensor {
    constructor(data, options = {}) {
        // 1. معالجة وتثبيت البيانات الأولية (تحصين الـ VRAM/CPU Memory)
        this.data = this._processData(data);
        
        // 2. هندسة الأبعاد المتقدمة (Strict N-Dimensional Shape Management)
        this.shape = this._inferShape(options.shape);
        
        // 3. الهوية والرسم البياني الحسابي (DAG Architecture)
        this.op = options.op || 'const'; 
        this.id = options.id || `t_${this.op}_${Math.random().toString(36).substring(2, 8)}_${Date.now()}`;
        this.inputs = options.inputs || []; 
        
        // 4. إدارة الحالة والموقع الفيزيائي
        this.isComputed = options.isComputed !== undefined ? options.isComputed : (this.data !== null);
        this.device = options.device || 'cpu'; 
        this.dtype = options.dtype || 'float32';

        // 5. محرك التتبع العكسي والذاكرة الحركية (Autograd & Memory Hooks)
        this.requiresGrad = options.requiresGrad || false;
        this.grad = null;
    }

    /**
     * معالج نوع البيانات لضمان السرعة الفائقة والأداء الرياضي الصارم
     */
    _processData(data) {
        if (data === null || data === undefined) return null;
        if (data instanceof Float32Array) return data;
        if (Array.isArray(data)) return new Float32Array(data.flat(Infinity));
        if (typeof data === 'number') return new Float32Array([data]);
        if (data.buffer && data.buffer instanceof ArrayBuffer) return new Float32Array(data.buffer);
        return null;
    }

    /**
     * مُستنتج الأبعاد الذكي - حل فخ الأبعاد الأحادية ودعم التنسورات ثلاثية الأبعاد [Batch, Seq, Hidden]
     */
    _inferShape(explicitShape) {
        if (explicitShape && Array.isArray(explicitShape)) return [...explicitShape];
        if (this.data) {
            // صمام الأمان: تحويل البيانات أحادية البعد تلقائياً إلى مصفوفة ثنائية [1, Length] لحماية Transformer Layers
            return [1, this.data.length];
        }
        return [0];
    }

    get size() {
        if (!this.shape || this.shape.length === 0 || this.shape[0] === 0) return 0;
        return this.shape.reduce((a, b) => a * b, 1);
    }

    get rank() {
        return this.shape.length;
    }

    // --- محرك الـ Broadcasting والعمليات الثنائية المتقدمة ---

    /**
     * آلية الـ Broadcasting الذكي لمطابقة أبعاد المصفوفات المختلفة تلقائياً (مثل إضافة الـ Biases)
     */
    _checkBroadcasting(otherTensor) {
        const shapeA = [...this.shape];
        const shapeB = [...otherTensor.shape];
        
        // مطابقة مراتب التنسورات عبر حشو الأبعاد اليسرى بـ 1
        while (shapeA.length < shapeB.length) shapeA.unshift(1);
        while (shapeB.length < shapeA.length) shapeB.unshift(1);

        const outShape = [];
        for (let i = 0; i < shapeA.length; i++) {
            if (shapeA[i] === shapeB[i]) {
                outShape.push(shapeA[i]);
            } else if (shapeA[i] === 1 || shapeB[i] === 1) {
                outShape.push(Math.max(shapeA[i], shapeB[i]));
            } else {
                throw new Error(`Broadcasting Error: Incompatible shapes [${this.shape}] and [${otherTensor.shape}]`);
            }
        }
        return outShape;
    }

    _binaryOp(type, other) {
        const otherTensor = this._toTensor(other);
        const targetShape = this._checkBroadcasting(otherTensor);
        return new Tensor(null, {
            op: type,
            inputs: [this, otherTensor],
            shape: targetShape,
            isComputed: false,
            device: this.device
        });
    }

    add(other) { return this._binaryOp('add', other); }
    sub(other) { return this._binaryOp('sub', other); }
    mul(other) { return this._binaryOp('mul', other); }
    div(other) { return this._binaryOp('div', other); }

    // --- العمليات المصفوفيّة الأساسية للمحرك النفسي (Transformer Core) ---

    /**
     * ضرب مصفوفي متطور يدعم الـ Batch Matrix Multiplication (BMM) لطبقات الـ Attention
     */
    matmul(other) {
        const otherTensor = this._toTensor(other);
        
        if (this.rank < 2 || otherTensor.rank < 2) {
            throw new Error(`MatMul Error: Both tensors must have at least rank 2. Found ranks: ${this.rank} and ${otherTensor.rank}`);
        }

        const shapeA = this.shape;
        const shapeB = otherTensor.shape;

        // استخراج أبعاد المصفوفة الداخلية
        const m = shapeA[shapeA.length - 2];
        const n1 = shapeA[shapeA.length - 1];
        const n2 = shapeB[shapeB.length - 2];
        const p = shapeB[shapeB.length - 1];

        if (n1 !== n2) {
            throw new Error(`MatMul Dimension Mismatch: Cannot multiply [${shapeA}] x [${shapeB}]. Inner dimensions ${n1} and ${n2} must match.`);
        }

        // دعم الـ Batching في حال وجود أبعاد إضافية (مثل متعدد الرؤوس Multi-Head Attention)
        const batchDimsA = shapeA.slice(0, -2);
        const batchDimsB = shapeB.slice(0, -2);
        
        // التحقق من توافق الـ Batch Dimensions
        const outShape = [...batchDimsA, m, p]; // الافتراض الأساسي، يمكن توسيعه بالـ Broadcasting للـ Batches

        return new Tensor(null, {
            op: 'matmul',
            inputs: [this, otherTensor],
            shape: outShape,
            isComputed: false,
            device: this.device
        });
    }

    transpose(dim0 = -2, dim1 = -1) {
        const newShape = [...this.shape];
        // معالجة الاندكسات السالبة
        const d0 = dim0 < 0 ? this.rank + dim0 : dim0;
        const d1 = dim1 < 0 ? this.rank + dim1 : dim1;

        // تبديل الأبعاد في الـ Shape
        const temp = newShape[d0];
        newShape[d0] = newShape[d1];
        newShape[d1] = temp;

        return new Tensor(null, {
            op: 'transpose',
            inputs: [this],
            shape: newShape,
            isComputed: false,
            device: this.device,
            options: { transposeDims: [d0, d1] }
        });
    }

    // --- طبقات التنشيط والـ Normalization الذكية ---

    relu() {
        return new Tensor(null, { op: 'relu', inputs: [this], shape: this.shape, isComputed: false, device: this.device });
    }

    softmax(dim = -1) {
        const targetDim = dim < 0 ? this.rank + dim : dim;
        return new Tensor(null, { 
            op: 'softmax', 
            inputs: [this], 
            shape: this.shape, 
            isComputed: false, 
            device: this.device,
            options: { softmaxDim: targetDim }
        });
    }

    rmsNorm(weights) {
        // طبقة RMSNorm المستخدمة في نماذج LLaMA المتقدمة لثبات الحسابات من الأصفار
        return new Tensor(null, {
            op: 'rmsnorm',
            inputs: [this, this._toTensor(weights)],
            shape: this.shape,
            isComputed: false,
            device: this.device
        });
    }

    // --- هندسة الـ Graph التتبعي والتنفيذ المؤجل (Lazy Evaluation Core) ---

    _toTensor(other) {
        if (other instanceof Tensor) return other;
        return new Tensor(other);
    }

    reshape(newShape) {
        if (!newShape || !Array.isArray(newShape)) throw new Error("Reshape Error: Invalid shape");
        
        // دعم تمرير -1 لتحديد البُعد تلقائياً بناءً على الحجم الكلي
        const computedShape = [...newShape];
        const inferIndex = computedShape.indexOf(-1);
        
        if (inferIndex !== -1) {
            const currentProduct = computedShape.reduce((a, b) => b === -1 ? a : a * b, 1);
            computedShape[inferIndex] = this.size / currentProduct;
        }

        const newSize = computedShape.reduce((a, b) => a * b, 1);
        if (newSize !== this.size) {
            throw new Error(`Reshape Error: Size mismatch. Cannot reshape ${this.shape} (${this.size}) to ${computedShape} (${newSize})`);
        }

        return new Tensor(this.data, { 
            op: 'reshape',
            inputs: [this],
            shape: computedShape, 
            id: this.id,
            isComputed: this.isComputed,
            device: this.device
        });
    }

    /**
     * استخراج الترتيب الطوبولوجي (Topological Sort) للرسم البياني لتنفيذ العمليات بترتيب رياضي مثالي
     */
    backwardTrace() {
        const order = [];
        const visited = new Set();

        const buildOrder = (node) => {
            if (visited.has(node.id)) return;
            visited.add(node.id);
            for (const input of node.inputs) {
                buildOrder(input);
            }
            order.push(node);
        };

        buildOrder(this);
        return order; // مسار خطة التنفيذ الصارمة الجاهزة للـ Engine Compiler
    }
}
