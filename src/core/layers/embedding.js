/**
 * src/core/layers/embedding.js
 * الحالة: طبقة المعاني (Semantic Layer) - النسخة "المشحونة"
 * الوظيفة: تحويل الحروف لمتجهات معاني (Vectors) قوية لمنع تلاشي الأرقام (Zero-Gradient Fix).
 */

import { Tensor } from '../tensor.js';

export class EmbeddingLayer {
    constructor(vocabSize, embedDim) {
        this.vocabSize = vocabSize; // عدد الرموز (غالباً 1000 حرف)
        this.embedDim = embedDim;   // أبعاد كل حرف (512)
        
        // توليد مصفوفة المعاني الأولية
        this.weights = this._initWeights(vocabSize, embedDim);
    }

    /**
     * توليد أوزان مشحونة (High-Variance Initialization)
     * ملاحظة: رفعنا القوة من 0.2 لـ 1.0 لضمان ظهور قيم واضحة في مخرجات الـ GPU
     */
    _initWeights(rows, cols) {
        const data = new Float32Array(rows * cols);
        for (let i = 0; i < data.length; i++) {
            // توليد أرقام عشوائية قوية لمنع ظهور الأصفار (Underflow)
            data[i] = (Math.random() - 0.5) * 1.0; 
        }
        return new Tensor(data, { shape: [rows, cols] });
    }

    /**
     * تحويل الـ Tokens لمتجهات 512 بُعد
     */
    forward(inputTokens) {
        const seqLen = inputTokens.length; // طول الجملة (512)
        const outputData = new Float32Array(seqLen * this.embedDim);

        for (let i = 0; i < seqLen; i++) {
            // استعادة الكود الأصلي للحرف
            const tokenId = Math.round(inputTokens[i] * 1000); 
            
            // التأكد من أن الـ Index داخل نطاق القاموس
            const safeTokenId = Math.abs(tokenId) % this.vocabSize;
            const startIdx = safeTokenId * this.embedDim;
            
            // سحب الـ Vector الخاص بالحرف (512 رقم يمثلون معناه التقني)
            const vector = this.weights.data.slice(startIdx, startIdx + this.embedDim);
            
            // دمج المتجه في المصفوفة الكبيرة الخارجة للـ GPU
            outputData.set(vector, i * this.embedDim);
        }

        return new Tensor(outputData, { 
            shape: [seqLen, this.embedDim],
            op: 'embedding' 
        });
    }
}
