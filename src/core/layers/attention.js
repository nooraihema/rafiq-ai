/**
 * src/core/layers/attention.js
 * الوظيفة: حساب أوزان الانتباه (Scaled Dot-Product Attention)
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor(config) {
        this.embedDim = config.embedDim;
        this.numHeads = config.numHeads;
        this.headDim = this.embedDim / this.numHeads;
        
        // في المستقبل، هنا هنحمل أوزان الـ Weights (Wq, Wk, Wv)
    }

    forward(inputTensor) {
        // 1. تقسيم المدخلات لـ Query, Key, Value
        // حالياً هنخليهم نفس التنسور للتجربة (Self-Attention)
        const q = inputTensor;
        const k = inputTensor;
        const v = inputTensor;

        // 2. قانون الانتباه: Attention(Q, K, V) = softmax(QK^T / sqrt(dk)) * V
        // إحنا هنا بنبني الـ Graph اللي الـ Runner هينفذه
        const scores = q.matmul(k.transpose()); // ضرب المصفوفات
        const scaledScores = scores.mul(1 / Math.sqrt(this.headDim)); // التنسيق (Scaling)
        
        // الـ Softmax هو اللي بيحدد "رفيق" هيركز على أنهي كلمة أكتر
        const weights = scaledScores.softmax(); 

        return weights.matmul(v); // النتيجة النهائية "المركزة"
    }
}
