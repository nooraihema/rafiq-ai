/**
 * src/core/layers/attention.js
 *
 * 🧠 AKASHA Multi-Head Attention v2.0
 *
 * الوظيفة:
 * - إنشاء Query / Key / Value projections
 * - حساب Attention Scores
 * - تطبيق Scaling
 * - تطبيق Softmax
 * - تجميع السياق
 * - Projection نهائي
 * - Residual Connection
 *
 * الملاحظات:
 * - هذا الإصدار مبسط (بدون Split فعلي للرؤوس)
 * - لكنه يحافظ على البنية الرياضية الصحيحة
 * - مناسب جدًا كبداية مستقرة قبل إضافة Multi-Head الحقيقي
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor(config) {
        this.embedDim = config.embedDim;   // مثال: 512
        this.numHeads = config.numHeads;   // مثال: 8

        if (this.embedDim % this.numHeads !== 0) {
            throw new Error(
                `embedDim (${this.embedDim}) must be divisible by numHeads (${this.numHeads})`
            );
        }

        this.headDim = this.embedDim / this.numHeads;

        // Projection matrices
        this.weights = {
            q: this._initWeight(this.embedDim, this.embedDim),
            k: this._initWeight(this.embedDim, this.embedDim),
            v: this._initWeight(this.embedDim, this.embedDim),
            o: this._initWeight(this.embedDim, this.embedDim)
        };
    }

    /**
     * Xavier/Glorot Uniform Initialization
     */
    _initWeight(rows, cols) {
        const data = new Float32Array(rows * cols);
        const limit = Math.sqrt(6.0 / (rows + cols));

        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * limit;
        }

        return new Tensor(data, {
            shape: [rows, cols],
            op: 'const',
            requiresGrad: true,
            isParameter: true
        });
    }

    /**
     * Forward Pass
     *
     * inputTensor shape: [seqLen, embedDim]
     *
     * returns: [seqLen, embedDim]
     */
    forward(inputTensor) {
        // =====================================================
        // 1. Linear Projections
        // =====================================================
        const q = inputTensor.matmul(this.weights.q); // [seqLen, embedDim]
        const k = inputTensor.matmul(this.weights.k); // [seqLen, embedDim]
        const v = inputTensor.matmul(this.weights.v); // [seqLen, embedDim]

        // =====================================================
        // 2. Attention Scores = Q × Kᵀ
        // =====================================================
        const scores = q.matmul(k.transpose()); // [seqLen, seqLen]

        // =====================================================
        // 3. Scaling
        // =====================================================
        const scale = 1.0 / Math.sqrt(this.headDim);
        const scaledScores = scores.mul(scale);

        // =====================================================
        // 4. Softmax
        // =====================================================
        const attentionWeights = scaledScores.softmax();

        // =====================================================
        // 5. Context = Attention × V
        // =====================================================
        const context = attentionWeights.matmul(v); // [seqLen, embedDim]

        // =====================================================
        // 6. Output Projection
        // =====================================================
        const projected = context.matmul(this.weights.o);

        // =====================================================
        // 7. Residual Connection
        // =====================================================
        const output = projected.add(inputTensor);

        return output;
    }

    /**
     * إرجاع جميع البارامترات للتدريب
     */
    parameters() {
        return [
            this.weights.q,
            this.weights.k,
            this.weights.v,
            this.weights.o
        ];
    }

    /**
     * تنظيف الموارد
     */
    dispose() {
        for (const param of this.parameters()) {
            if (typeof param.dispose === 'function') {
                param.dispose();
            }
        }
    }
}
