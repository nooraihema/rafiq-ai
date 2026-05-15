/**
 * src/core/layers/attention.js
 * النسخة المحدثة: محرك الانتباه الفولاذي (Optimized Multi-Head)
 * الحالة: ترقية شاملة لنظام الـ Tracing والـ Projections
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor({ embedDim, numHeads }) {
        if (embedDim % numHeads !== 0) {
            throw new Error("Dimension Error: embedDim must be divisible by numHeads");
        }

        this.embedDim = embedDim;
        this.numHeads = numHeads;
        this.headDim = embedDim / numHeads;
        this.scale = 1.0 / Math.sqrt(this.headDim); // عامل الاستقرار الرياضي

        // أوزان منفصلة لتعلم أدق (Xavier Initialization)
        this.queryWeights = this._initWeight(embedDim, embedDim, 'Wq');
        this.keyWeights = this._initWeight(embedDim, embedDim, 'Wk');
        this.valueWeights = this._initWeight(embedDim, embedDim, 'Wv');
        this.outputWeights = this._initWeight(embedDim, embedDim, 'Wo');
    }

    _initWeight(rows, cols, name) {
        const data = new Float32Array(rows * cols);
        // Kaiming/Xavier Initialization لمنع تلاشي الأرقام
        const std = Math.sqrt(2.0 / (rows + cols));
        for (let i = 0; i < data.length; i++) {
            data[i] = this._truncatedNormal() * std;
        }
        return new Tensor(data, { 
            shape: [rows, cols], 
            op: 'const',
            id: `weight_${name}_${Math.random().toString(36).substr(2, 4)}` 
        });
    }

    // لتوليد أرقام عشوائية أكثر استقراراً من Math.random العادي
    _truncatedNormal() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(x) {
        /**
         * بناء خريطة الـ Attention:
         * x: [SeqLen, EmbedDim]
         */

        // 1. Projections: تحويل المدخلات لثلاث فضاءات (Q, K, V)
        const Q = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.queryWeights],
            shape: x.shape
        });

        const K = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.keyWeights],
            shape: x.shape
        });

        const V = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.valueWeights],
            shape: x.shape
        });

        // 2. Attention Core: العملية اللي بتخلي الموديل "يركز"
        // إرسال الـ scale كبارامتر أساسي لضمان عدم انفجار الأرقام
        const attentionContext = new Tensor(null, {
            op: 'attention_core',
            inputs: [Q, K, V],
            shape: x.shape,
            params: { 
                numHeads: this.numHeads, 
                headDim: this.headDim,
                scale: this.scale 
            }
        });

        // 3. Output Projection: دمج نتائج الرؤوس المتعددة
        const attentionOut = new Tensor(null, {
            op: 'matmul',
            inputs: [attentionContext, this.outputWeights],
            shape: x.shape
        });

        // 4. Residual Connection & Layer Norm (السر في ثبات الموديل)
        // بنجمع المخرج مع المدخل الأصلي عشان الموديل ميفقدش سياق الجملة
        return new Tensor(null, {
            op: 'add',
            inputs: [x, attentionOut],
            shape: x.shape
        });
    }
}
