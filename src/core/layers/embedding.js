/**
 * src/core/layers/embedding.js
 * الحالة: طبقة المعاني المكانية (Spatio-Semantic Layer)
 * الوظيفة: تحويل الحروف لمتجهات مع دمج "بوصلة" رياضية لتحديد ترتيب الكلمات.
 */

import { Tensor } from '../tensor.js';

export class EmbeddingLayer {
    constructor(vocabSize, embedDim) {
        this.vocabSize = vocabSize; 
        this.embedDim = embedDim;   
        
        // 1. توليد مصفوفة المعاني (المعجم)
        this.weights = this._initWeights(vocabSize, embedDim);
    }

    /**
     * توليد أوزان أولية قوية لضمان تدفق البيانات
     */
    _initWeights(rows, cols) {
        const data = new Float32Array(rows * cols);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * 1.0; 
        }
        return new Tensor(data, { shape: [rows, cols] });
    }

    /**
     * 🚀 حقن الترميز المكاني (Positional Encoding)
     * تستخدم معادلات الجيب والتمام (Sin/Cos) لإعطاء كل موقع "تردد" فريد
     */
    _applyPositionalEncoding(data, seqLen, embedDim) {
        for (let pos = 0; pos < seqLen; pos++) {
            for (let i = 0; i < embedDim; i++) {
                // حساب الزاوية بناءً على الموقع والبعد (Formula: pos / 10000^(2i/d_model))
                const angle = pos / Math.pow(10000, (2 * i) / embedDim);
                const offset = pos * embedDim + i;
                
                if (i % 2 === 0) {
                    data[offset] += Math.sin(angle); // الأبعاد الزوجية
                } else {
                    data[offset] += Math.cos(angle); // الأبعاد الفردية
                }
            }
        }
        return data;
    }

    /**
     * معالجة المدخلات: تحويل Tokens -> Embeddings -> Positional Encoding
     */
    forward(inputTokens) {
        const seqLen = inputTokens.length; 
        let outputData = new Float32Array(seqLen * this.embedDim);

        // أ- عملية الـ Lookup (استخراج المتجهات)
        for (let i = 0; i < seqLen; i++) {
            const tokenId = Math.round(inputTokens[i] * 1000); 
            const safeTokenId = Math.abs(tokenId) % this.vocabSize;
            const startIdx = safeTokenId * this.embedDim;
            
            const vector = this.weights.data.slice(startIdx, startIdx + this.embedDim);
            outputData.set(vector, i * this.embedDim);
        }

        // ب- إضافة "البصمة المكانية" (السر الذي يكسر تشابه النتائج)
        outputData = this._applyPositionalEncoding(outputData, seqLen, this.embedDim);

        return new Tensor(outputData, { 
            shape: [seqLen, this.embedDim],
            op: 'embedding_with_pos' 
        });
    }
}
