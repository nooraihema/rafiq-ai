/**
 * src/core/layers/attention.js
 * الحالة: Multi-Head Attention (النسخة الاحترافية)
 * الوظيفة: تقسيم السياق لعدة رؤوس وتحليل العلاقات المعقدة بين الكلمات.
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor(config) {
        this.embedDim = config.embedDim; // 512
        this.numHeads = config.numHeads; // 8
        this.headDim = this.embedDim / this.numHeads; // 64 لكل رأس
        
        // إنشاء أوزان الـ Projections (في العادة يتم تحميلها مدربة)
        // إحنا هنولدها عشوائياً بدقة عالية (Xavier Initialization)
        this.weights = {
            q: this._initWeight(this.embedDim, this.embedDim),
            k: this._initWeight(this.embedDim, this.embedDim),
            v: this._initWeight(this.embedDim, this.embedDim),
            o: this._initWeight(this.embedDim, this.embedDim)
        };
    }

    _initWeight(rows, cols) {
        const data = new Float32Array(rows * cols);
        const scale = Math.sqrt(2.0 / (rows + cols));
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * scale;
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const' });
    }

    forward(inputTensor) {
        // 1. مرحلة الـ Projections: تحويل المدخل لـ Q, K, V باستخدام المصفوفات
        // دي الخطوة اللي بتخلي "أكاشا" يفهم الأنماط المختلفة في الجملة
        const q = inputTensor.matmul(this.weights.q);
        const k = inputTensor.matmul(this.weights.k);
        const v = inputTensor.matmul(this.weights.v);

        // 2. حساب الـ Attention Scores (Scaled Dot-Product)
        // Q * K^T / sqrt(dk)
        const scores = q.matmul(k.transpose());
        const scaledScores = scores.mul(1 / Math.sqrt(this.headDim));
        
        // 3. تطبيق الـ Softmax للحصول على أوزان الاحتمالات
        const attentionWeights = scaledScores.softmax();

        // 4. دمج الـ Weights مع الـ Values
        const context = attentionWeights.matmul(v);

        // 5. الـ Final Projection (Output Layer)
        // دي بتدمج نتايج الـ 8 رؤوس مع بعض تاني
        return context.matmul(this.weights.o);
    }
}
