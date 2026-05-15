/**
 * src/core/layers/embedding.js
 * النسخة: الوعي المكاني المصحح (Safe Slicing Version)
 * الإصلاحات: تمرير الـ IDs بدلاً من الـ Objects لضمان قراءة الـ GPU للـ Buffers
 */

import { Tensor } from '../tensor.js';

export class Embedding {
    constructor(vocabSize, embedDim, maxSeqLen = 512) {
        this.vocabSize = vocabSize;
        this.embedDim = embedDim;
        this.maxSeqLen = maxSeqLen;
        
        // 1. أوزان الكلمات (Word Embeddings)
        this.weights = this._initWeights(vocabSize, embedDim, 'word_embeddings');

        // 2. مصفوفة الترميز الموضعي (Positional Encoding)
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
        // تأكد أن الـ Tensor يأخذ ID فريد ليتم تخزينه في الـ GPU Backend
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
        // تأكد أن inputIds هو Tensor وله ID
        const seqLen = inputIds.shape[0];

        // 1. التحقق من الحدود (Safety Check)
        if (seqLen > this.maxSeqLen) {
            throw new Error(`[Akasha Error] Sequence length ${seqLen} exceeds max limit ${this.maxSeqLen}`);
        }

        // 2. Embedding Lookup 
        // التعديل الجوهري: نمرر IDs المدخلات والأوزان
        const embedded = new Tensor(null, {
            shape: [seqLen, this.embedDim],
            op: 'embedding_lookup',
            inputIds: [inputIds.id, this.weights.id], 
            params: { 
                seqLen: seqLen, 
                embedDim: this.embedDim,
                vocabSize: this.vocabSize 
            }
        });

        // 3. Scaling (لتقوية الإشارة قبل الجمع مع الـ Positional)
        const scaledEmbedded = new Tensor(null, {
            shape: embedded.shape,
            op: 'mul_scalar',
            inputIds: [embedded.id],
            params: { factor: Math.sqrt(this.embedDim), size: seqLen * this.embedDim }
        });

        // 4. دمج المكان (Positional Encoding Addition)
        // بنبعت للـ Backend الـ IDs والبارامترات اللازمة للـ Shader
        return new Tensor(null, {
            shape: scaledEmbedded.shape,
            op: 'add_pos_encoding', 
            inputIds: [scaledEmbedded.id, this.posWeights.id],
            params: { 
                seqLen: seqLen,
                embedDim: this.embedDim,
                offset: 0 
            }
        });
    }
}
