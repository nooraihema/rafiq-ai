/**
 * src/core/layers/embedding.js
 * النسخة: الوعي المكاني المصحح (Safe Slicing Version)
 * الإصلاحات: تم معالجة تطابق الأبعاد والتحقق من الحدود بناءً على ملاحظات إبراهيم.
 */

import { Tensor } from '../tensor.js';

export class Embedding {
    constructor(vocabSize, embedDim, maxSeqLen = 512) {
        this.vocabSize = vocabSize;
        this.embedDim = embedDim;
        this.maxSeqLen = maxSeqLen;
        
        // أوزان الكلمات
        this.weights = this._initWeights(vocabSize, embedDim, 'word_embeddings');

        // مصفوفة الترميز الموضعي (الثابتة)
        this.posWeights = this._initPositionalEncoding(maxSeqLen, embedDim);
    }

    _initWeights(rows, cols, name) {
        const data = new Float32Array(rows * cols);
        const std = Math.sqrt(1.0 / rows); 
        for (let i = 0; i < data.length; i++) {
            let val = this._gaussianRandom();
            while (Math.abs(val) > 2) val = this._gaussianRandom(); 
            data[i] = val * std;
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const', id: `weight_${name}` });
    }

    _initPositionalEncoding(maxLen, dim) {
        const data = new Float32Array(maxLen * dim);
        for (let pos = 0; pos < maxLen; pos++) {
            for (let i = 0; i < dim; i += 2) {
                const angle = pos / Math.pow(10000, i / dim);
                data[pos * dim + i] = Math.sin(angle);
                if (i + 1 < dim) data[pos * dim + i + 1] = Math.cos(angle);
            }
        }
        return new Tensor(data, { shape: [maxLen, dim], op: 'const', id: 'weight_pos_encoding' });
    }

    _gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(inputIds) {
        const seqLen = inputIds.shape[0];

        // 1. التحقق من الحدود (Safety Check)
        if (seqLen > this.maxSeqLen) {
            throw new Error(`[Akasha Error] Sequence length ${seqLen} exceeds max limit ${this.maxSeqLen}`);
        }

        // 2. Embedding Lookup
        const embedded = new Tensor(null, {
            shape: [seqLen, this.embedDim],
            op: 'embedding_lookup',
            inputs: [inputIds, this.weights]
        });

        // 3. Scaling الـ Embeddings (تحسين إضافي لتقوية الإشارة)
        // بنضرب في جذر أبعاد المدخلات عشان نحافظ على توازن القيم قبل الجمع
        const scaledEmbedded = new Tensor(null, {
            shape: embedded.shape,
            op: 'mul_scalar',
            inputs: [embedded],
            params: { factor: Math.sqrt(this.embedDim) }
        });

        // 4. دمج المكان مع عمل Slice داخلي (Logical Slice)
        // بنبعت للـ Backend بارامتر offset عشان يعرف ياخد أول seqLen بس من posWeights
        return new Tensor(null, {
            shape: scaledEmbedded.shape,
            op: 'add_pos_encoding', 
            inputs: [scaledEmbedded, this.posWeights],
            params: { 
                seqLen: seqLen,
                offset: 0 
            }
        });
    }
}
