/**
 * src/core/layers/attention.js
 * النسخة السيادية المصححة (Causal & Normalized) - رفيق-AI
 * تم الإصلاح والتأمين الشامل ضد عيوب تداخل خلايا الذاكرة وانفجار الـ NaN
 * صمام الأمان: إبراهيم شحات لضبط زوايا ضرب المصفوفات الموحدة
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
            let val = this._gaussianRandom();
            while (Math.abs(val) > 2) val = this._gaussianRandom(); 
            data[i] = val * std;
        }
        return new Tensor(data, { 
            shape: [rows, cols], 
            op: 'const',
            id: `weight_attn_${name}` 
        });
    }

    _gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(x) {
        // توليد رقم فريد للنبضة الحالية لمنع تداخل بفرات العُقد (Node ID Collision)
        const pulseId = Date.now() + '_' + Math.floor(Math.random() * 1000);

        // تأمين قراءة الـ Shape بشكل صارم وديناميكي
        const batchSize = x.shape.length === 3 ? x.shape[0] : 1;
        const seqLen = x.shape.length === 3 ? x.shape[1] : x.shape[0];
        const embedDim = x.shape.length === 3 ? x.shape[2] : x.shape[1];

        // 1. Projections مع حسم الهوية برمجياً وتمرير بارامتر الأبعاد للـ Plan Builder والـ Shaders
        const Q = new Tensor(null, { 
            op: 'matmul', 
            inputs: [x, this.queryWeights], 
            shape: [seqLen, this.embedDim], 
            id: `attn_q_${pulseId}`,
            params: { rows: seqLen, cols: this.embedDim }
        });

        const K = new Tensor(null, { 
            op: 'matmul', 
            inputs: [x, this.keyWeights], 
            shape: [seqLen, this.embedDim], 
            id: `attn_k_${pulseId}`,
            params: { rows: seqLen, cols: this.embedDim }
        });

        const V = new Tensor(null, { 
            op: 'matmul', 
            inputs: [x, this.valueWeights], 
            shape: [seqLen, this.embedDim], 
            id: `attn_v_${pulseId}`,
            params: { rows: seqLen, cols: this.embedDim }
        });

        // 2. Attention Core مع تفجير الـ Mask والـ Scale وتوجيه الخيوط الحسابية في الـ GPU
        const attentionContext = new Tensor(null, {
            op: 'attention_core',
            inputs: [Q, K, V],
            shape: [seqLen, this.embedDim],
            id: `attn_core_ctx_${pulseId}`,
            params: { 
                numHeads: this.numHeads, 
                headDim: this.headDim,
                scale: this.scale,
                causal: true,
                seqLen: seqLen,
                embedDim: this.embedDim
            }
        });

        // 3. Output Projection
        const attentionOut = new Tensor(null, {
            op: 'matmul',
            inputs: [attentionContext, this.outputWeights],
            shape: [seqLen, this.embedDim],
            id: `attn_out_proj_${pulseId}`,
            params: { rows: seqLen, cols: this.embedDim }
        });

        // 4. Residual Connection
        const residual = new Tensor(null, {
            op: 'add',
            inputs: [x, attentionOut],
            shape: [seqLen, this.embedDim],
            id: `attn_residual_${pulseId}`
        });

        // 5. Layer Normalization الضامنة لمرور الإشارة للأمعاء الدليلة (FFN)
        const finalAttnOut = new Tensor(null, {
            op: 'layer_norm',
            inputs: [residual, this.ln_gamma, this.ln_beta],
            shape: [seqLen, this.embedDim],
            id: `attn_final_ln_${pulseId}`,
            params: { scope: this.embedDim }
        });

        // حماية أمنية: كسر حلقة الـ Empty Buffer الافتراضية عبر تجهيز وعاء الاستقبال الموحد
        if (!finalAttnOut.data) {
            finalAttnOut.data = new Float32Array(seqLen * this.embedDim);
        }

        return finalAttnOut;
    }
}
