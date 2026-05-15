/**
 * src/core/layers/attention.js
 * النسخة السيادية (Causal & Normalized)
 * تم الإصلاح والتأمين الشامل ضد فراغ البفرات وعيوب الـ Data Flow
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

        // 1. Projections مع حسم الهوية برمجياً للـ Plan Builder
        const Q = new Tensor(null, { op: 'matmul', inputs: [x, this.queryWeights], shape: [...x.shape], id: `attn_q_${pulseId}` });
        const K = new Tensor(null, { op: 'matmul', inputs: [x, this.keyWeights], shape: [...x.shape], id: `attn_k_${pulseId}` });
        const V = new Tensor(null, { op: 'matmul', inputs: [x, this.valueWeights], shape: [...x.shape], id: `attn_v_${pulseId}` });

        // 2. Attention Core مع تفجير الـ Mask والـ Scale
        const attentionContext = new Tensor(null, {
            op: 'attention_core',
            inputs: [Q, K, V],
            shape: [...x.shape],
            id: `attn_core_ctx_${pulseId}`,
            params: { 
                numHeads: this.numHeads, 
                headDim: this.headDim,
                scale: this.scale,
                causal: true 
            }
        });

        // 3. Output Projection
        const attentionOut = new Tensor(null, {
            op: 'matmul',
            inputs: [attentionContext, this.outputWeights],
            shape: [...x.shape],
            id: `attn_out_proj_${pulseId}`
        });

        // 4. Residual Connection
        const residual = new Tensor(null, {
            op: 'add',
            inputs: [x, attentionOut],
            shape: [...x.shape],
            id: `attn_residual_${pulseId}`
        });

        // 5. Layer Normalization الضامنة لمرور الإشارة للأمعاء الدليلة (FFN)
        const finalAttnOut = new Tensor(null, {
            op: 'layer_norm',
            inputs: [residual, this.ln_gamma, this.ln_beta],
            shape: [...x.shape],
            id: `attn_final_ln_${pulseId}`
        });

        // حماية أمنية: لو المحرك شغال بنظام الـ Dynamic Allocation، بنأكد حجز الـ Data والـ ArrayReferences
        if (!finalAttnOut.data) {
            // كسر حلقة الـ Empty Buffer الافتراضية عبر تجهيز وعاء الاستقبال
            finalAttnOut.data = new Float32Array(x.shape[0] * x.shape[1]);
        }

        return finalAttnOut;
    }
}
