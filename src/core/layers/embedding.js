/**
 * src/core/layers/embedding.js
 * الحالة: نظام المعرفات الثابتة (Fixed Token Mapping)
 * الوظيفة: تحويل الكلمة (Token ID) لمتجه كثيف (Dense Vector) بدون فقدان الهوية.
 */

import { Tensor } from '../tensor.js';

export class Embedding {
    constructor(vocabSize, embedDim) {
        this.vocabSize = vocabSize;
        this.embedDim = embedDim;
        
        // الأوزان: مصفوفة ضخمة [القاموس × الأبعاد]
        this.weights = this._initWeights();
    }

    _initWeights() {
        const size = this.vocabSize * this.embedDim;
        const data = new Float32Array(size);
        const scale = Math.sqrt(2.0 / this.embedDim);
        
        for (let i = 0; i < size; i++) {
            data[i] = (Math.random() - 0.5) * scale;
        }
        return new Tensor(data, { shape: [this.vocabSize, this.embedDim], op: 'const' });
    }

    /**
     * @param {Uint32Array} tokenIds - مصفوفة أرقام صحيحة حقيقية صادر من Tokenizer
     */
    forward(tokenIds) {
        const seqLen = tokenIds.length;
        const outputData = new Float32Array(seqLen * this.embedDim);

        for (let i = 0; i < seqLen; i++) {
            const tokenId = tokenIds[i];
            
            // حماية القاموس: التأكد أن المعرف داخل النطاق
            if (tokenId >= this.vocabSize) {
                console.warn(`Token ID ${tokenId} خارج نطاق القاموس!`);
                continue; 
            }

            const startIdx = tokenId * this.embedDim;
            
            // بدلاً من slice() المكلفة، نستخدم subarray() أو نسخ مباشر سريع
            const vector = this.weights.data.subarray(startIdx, startIdx + this.embedDim);
            outputData.set(vector, i * this.embedDim);
        }

        return new Tensor(outputData, { shape: [seqLen, this.embedDim], op: 'embedding_out' });
    }
}
