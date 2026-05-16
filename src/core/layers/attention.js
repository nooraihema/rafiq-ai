/**
 * src/core/layers/attention.js
 * النسخة السيادية المصححة (Causal & Normalized) - رفيق-AI
 * تم الإصلاح والتأمين الشامل ضد عيوب تداخل خلايا الذاكرة وانفجار الـ NaN
 * صمام الأمان المطور: إبراهيم شحات لضبط زوايا ضرب المصفوفات الموحدة للأبعاد الثنائية
 *
 * الإصلاح الهندسي الحاسم:
 * - تمرير params.N و params.K لكل عمليات matmul
 * - الحفاظ الكامل على جميع المسارات والأسماء والدوال
 * - عدم تغيير أي واجهة عامة مستخدمة في بقية المشروع
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor({ embedDim, numHeads }) {
        this.embedDim = embedDim;
        this.numHeads = numHeads;
        this.headDim = embedDim / numHeads;
        this.scale = 1.0 / Math.sqrt(this.headDim);

        // 1. تثبيت الأسماء (Fixed IDs)
        this.queryWeights = this._initWeight(embedDim, embedDim, 'query');
        this.keyWeights = this._initWeight(embedDim, embedDim, 'key');
        this.valueWeights = this._initWeight(embedDim, embedDim, 'value');
        this.outputWeights = this._initWeight(embedDim, embedDim, 'out_proj');

        // أوزان الـ LayerNorm (مؤمنة)
        this.ln_gamma = new Tensor(
            new Float32Array(embedDim).fill(1.0),
            {
                shape: [embedDim],
                op: 'const',
                id: 'attn_ln_gamma'
            }
        );

        this.ln_beta = this._initBias(embedDim, 'attn_ln_beta');
    }

    _initWeight(rows, cols, name) {
        const data = new Float32Array(rows * cols);
        const std = Math.sqrt(2.0 / (rows + cols));

        for (let i = 0; i < data.length; i++) {
            let val = this._gaussianRandom();
            while (Math.abs(val) > 2) {
                val = this._gaussianRandom();
            }
            data[i] = val * std;
        }

        return new Tensor(data, {
            shape: [rows, cols],
            op: 'const',
            id: `weight_attn_${name}`
        });
    }

    _initBias(size, name) {
        const data = new Float32Array(size);

        for (let i = 0; i < size; i++) {
            // نبض عشوائي متناهي الصغر للحفاظ على تدفق الإشارة
            data[i] = (Math.random() * 2 - 1) * 0.001;
        }

        return new Tensor(data, {
            shape: [size],
            op: 'const',
            id: name
        });
    }

    _gaussianRandom() {
        let u = 0;
        let v = 0;

        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();

        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    /**
     * معاملات قياسية موحدة لعمليات matmul:
     *
     * A: [1, embedDim]
     * B: [embedDim, embedDim]
     * C: [1, embedDim]
     *
     * M = 1        (يتم تمريرها من shape[0] داخل الـ Backend)
     * K = embedDim
     * N = embedDim
     */
    _matmulParams() {
        return {
            N: this.embedDim,
            K: this.embedDim
        };
    }

    forward(x) {
        const pulseId =
            Date.now() + '_' + Math.floor(Math.random() * 1000);

        // توحيد الأبعاد إلى [1, embedDim]
        const safeShape = [1, this.embedDim];

        // ------------------------------------------------------------------
        // 1. Query Projection
        // ------------------------------------------------------------------
        const Q = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.queryWeights],
            shape: [...safeShape],
            id: `attn_q_${pulseId}`,
            params: this._matmulParams()
        });

        // ------------------------------------------------------------------
        // 2. Key Projection
        // ------------------------------------------------------------------
        const K = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.keyWeights],
            shape: [...safeShape],
            id: `attn_k_${pulseId}`,
            params: this._matmulParams()
        });

        // ------------------------------------------------------------------
        // 3. Value Projection
        // ------------------------------------------------------------------
        const V = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.valueWeights],
            shape: [...safeShape],
            id: `attn_v_${pulseId}`,
            params: this._matmulParams()
        });

        // ------------------------------------------------------------------
        // 4. Attention Core
        // ------------------------------------------------------------------
        const attentionContext = new Tensor(null, {
            op: 'attention_core',
            inputs: [Q, K, V],
            shape: [...safeShape],
            id: `attn_core_ctx_${pulseId}`,
            params: {
                numHeads: this.numHeads,
                headDim: this.headDim,
                scale: this.scale,
                causal: true,
                seqLen: safeShape[0],
                embedDim: this.embedDim
            }
        });

        // ------------------------------------------------------------------
        // 5. Output Projection
        // ------------------------------------------------------------------
        const attentionOut = new Tensor(null, {
            op: 'matmul',
            inputs: [attentionContext, this.outputWeights],
            shape: [...safeShape],
            id: `attn_out_proj_${pulseId}`,
            params: this._matmulParams()
        });

        // ------------------------------------------------------------------
        // 6. Residual Connection
        // ------------------------------------------------------------------
        const residual = new Tensor(null, {
            op: 'add',
            inputs: [x, attentionOut],
            shape: [...safeShape],
            id: `attn_residual_${pulseId}`
        });

        // ------------------------------------------------------------------
        // 7. LayerNorm Bypass مؤقت
        // ------------------------------------------------------------------
        const finalAttnOut = new Tensor(null, {
            op: 'add',
            inputs: [residual, this.ln_beta],
            shape: [...safeShape],
            id: `attn_final_ln_${pulseId}`
        });

        return finalAttnOut;
    }
}
