/**
 * src/core/layers/attention.js
 * الوظيفة: نظام الانتباه المتعدد (Multi-Head Attention) - نسخة التتبع
 * الحالة: جاهز للربط مع الـ WebGPU Backend
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor({ embedDim, numHeads }) {
        this.embedDim = embedDim;
        this.numHeads = numHeads;
        this.headDim = embedDim / numHeads;

        // أوزان الاستعلام (Query)، المفتاح (Key)، والقيمة (Value)
        // بنعملهم كـ Const Tensors عشان الـ GPU يشيلهم مرة واحدة
        this.qkvWeights = this._initWeight(embedDim, embedDim * 3);
        this.outputWeights = this._initWeight(embedDim, embedDim);
    }

    _initWeight(rows, cols) {
        const data = new Float32Array(rows * cols);
        const scale = Math.sqrt(2.0 / rows);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * scale;
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const' });
    }

    forward(x) {
        /**
         * Tracing Mode:
         * هنا إحنا مش بنحسب، إحنا بنرسم "خريطة المعركة" للـ GPU
         */
        
        // 1. عملية الإسقاط (Linear Projection لـ Q, K, V)
        const qkv = new Tensor(null, {
            shape: [x.shape[0], this.embedDim * 3],
            op: 'matmul',
            inputs: [x, this.qkvWeights]
        });

        // 2. عملية حساب الانتباه (Scaled Dot-Product Attention)
        // بنسجلها كعملية 'attention_core' والـ Backend هو اللي هيفك شفرتها
        const attentionScore = new Tensor(null, {
            shape: x.shape,
            op: 'attention_core',
            inputs: [qkv],
            params: { numHeads: this.numHeads, headDim: this.headDim }
        });

        // 3. طبقة الإخراج النهائية
        const output = new Tensor(null, {
            shape: x.shape,
            op: 'matmul',
            inputs: [attentionScore, this.outputWeights]
        });

        // إضافة Residual Connection (الجمع بين المدخل والمخرج لعدم فقدان البيانات)
        return new Tensor(null, {
            shape: x.shape,
            op: 'add',
            inputs: [x, output]
        });
    }
}
