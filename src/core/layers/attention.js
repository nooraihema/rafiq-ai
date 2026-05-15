/**
 * src/core/layers/attention.js
 * النسخة السيادية (Causal & Normalized)
 * تم الإصلاح بناءً على تقييم "إبراهيم شحات"
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor({ embedDim, numHeads }) {
        this.embedDim = embedDim;
        this.numHeads = numHeads;
        this.headDim = embedDim / numHeads;
        this.scale = 1.0 / Math.sqrt(this.headDim);

        // 1. تثبيت الأسماء (Fixed IDs) لحل مشكلة الحفظ والتحميل
        this.queryWeights = this._initWeight(embedDim, embedDim, 'query');
        this.keyWeights = this._initWeight(embedDim, embedDim, 'key');
        this.valueWeights = this._initWeight(embedDim, embedDim, 'value');
        this.outputWeights = this._initWeight(embedDim, embedDim, 'out_proj');
        
        // أوزان الـ LayerNorm (Gamma & Beta)
        this.ln_gamma = new Tensor(new Float32Array(embedDim).fill(1.0), { shape: [embedDim], op: 'const', id: 'attn_ln_gamma' });
        this.ln_beta = new Tensor(new Float32Array(embedDim).fill(0.0), { shape: [embedDim], op: 'const', id: 'attn_ln_beta' });
    }

    _initWeight(rows, cols, name) {
        const data = new Float32Array(rows * cols);
        const std = Math.sqrt(2.0 / (rows + cols));
        for (let i = 0; i < data.length; i++) {
            // تنفيذ Truncated Normal حقيقي (قص القيم أبعد من 2 انحراف معياري)
            let val = this._gaussianRandom();
            while (Math.abs(val) > 2) val = this._gaussianRandom(); 
            data[i] = val * std;
        }
        return new Tensor(data, { 
            shape: [rows, cols], 
            op: 'const',
            id: `weight_attn_${name}` // اسم ثابت
        });
    }

    _gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(x) {
        // 1. Projections
        const Q = new Tensor(null, { op: 'matmul', inputs: [x, this.queryWeights], shape: x.shape });
        const K = new Tensor(null, { op: 'matmul', inputs: [x, this.keyWeights], shape: x.shape });
        const V = new Tensor(null, { op: 'matmul', inputs: [x, this.valueWeights], shape: x.shape });

        // 2. Attention Core مع إضافة الـ Mask والـ Scale
        const attentionContext = new Tensor(null, {
            op: 'attention_core',
            inputs: [Q, K, V],
            shape: x.shape,
            params: { 
                numHeads: this.numHeads, 
                headDim: this.headDim,
                scale: this.scale,
                causal: true // منع رؤية المستقبل
            }
        });

        // 3. Output Projection
        const attentionOut = new Tensor(null, {
            op: 'matmul',
            inputs: [attentionContext, this.outputWeights],
            shape: x.shape
        });

        // 4. Residual Connection
        const residual = new Tensor(null, {
            op: 'add',
            inputs: [x, attentionOut],
            shape: x.shape
        });

        // 5. Layer Normalization (إضافة فعلية مش مجرد تعليق)
        return new Tensor(null, {
            op: 'layer_norm',
            inputs: [residual, this.ln_gamma, this.ln_beta],
            shape: x.shape
        });
    }
}
