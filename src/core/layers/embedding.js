/**
 * src/core/layers/embedding.js
 * الحالة: طبقة المعاني (Semantic Layer)
 * الوظيفة: تحويل الـ Tokens إلى ناقلات أبعاد (Vectors) غنية بالبيانات.
 */

import { Tensor } from '../tensor.js';

export class EmbeddingLayer {
    constructor(vocabSize, embedDim) {
        this.vocabSize = vocabSize; // عدد الحروف/الكلمات اللي المحرك بيعرفها
        this.embedDim = embedDim;   // عدد الأبعاد لكل حرف (مثلاً 512)
        
        // إنشاء مصفوفة الأوزان (Weights)
        // في البداية بتكون عشوائية، ومع التدريب "رفيق" بيتعلم القيم الصح
        this.weights = this._initWeights(vocabSize, embedDim);
    }

    /**
     * توليد أوزان أولية متوازنة (Xavier/Glorot Initialization)
     */
    _initWeights(rows, cols) {
        const data = new Float32Array(rows * cols);
        for (let i = 0; i < data.length; i++) {
            // أرقام صغيرة عشوائية بين -0.1 و 0.1 لضمان استقرار البداية
            data[i] = (Math.random() - 0.5) * 0.2;
        }
        return new Tensor(data, { shape: [rows, cols] });
    }

    /**
     * عملية الـ Lookup: سحب المتجه الخاص بكل حرف
     */
    forward(inputTokens) {
        // inputTokens هي الأرقام اللي جاية من الـ Tokenizer
        const batchSize = 1;
        const seqLen = inputTokens.length;
        const outputData = new Float32Array(seqLen * this.embedDim);

        for (let i = 0; i < seqLen; i++) {
            const tokenId = Math.floor(inputTokens[i] * 1000); // استرجاع الكود الأصلي
            const startIdx = (tokenId % this.vocabSize) * this.embedDim;
            
            // سحب الـ Vector الخاص بالحرف من المصفوفة الكبيرة
            const vector = this.weights.data.slice(startIdx, startIdx + this.embedDim);
            outputData.set(vector, i * this.embedDim);
        }

        return new Tensor(outputData, { 
            shape: [seqLen, this.embedDim],
            op: 'embedding' 
        });
    }
}
