/**
 * src/core/layers/embedding.js
 * الحالة: النسخة السيادية الفوق-طبيعية (Quantum Lookup Shield & Resilient Positional Matrix)
 * التطوير والحماية المطلقة: إبراهيم شحات (محرك أكاشا - رفيق-AI)
 * 
 * الإصلاح الهندسي الحاسم والمجنون:
 * - الالتزام الصارم بتمرير الـ IDs بدلاً من الـ Objects لضمان تتبع الـ GPU لـ Buffers العناوين.
 * - الحفاظ الكامل على الهيكل العام والأسماء والواجهات دون أي تغيير يكسر الـ Runner.
 * - حقن حماية مجهرية تمنع الـ Out-Of-Bounds وتلاشي الموجات المكانية بالـ VRAM.
 * - موازنة التدفق: دمج مصفوفات الـ inputs الحية مع الحفاظ على بروتوكول الـ inputIds النصي لتغذية الـ Optimizer دون تصفير.
 */

import { Tensor } from '../tensor.js';

export class Embedding {
    constructor(vocabSize, embedDim, maxSeqLen = 512) {
        this.vocabSize = vocabSize;
        this.embedDim = embedDim;
        this.maxSeqLen = maxSeqLen;
        
        // 1. أوزان الكلمات (Word Embeddings) المحصنة ضد الجفاف الرقمي
        this.weights = this._initWeights(vocabSize, embedDim, 'word_embeddings');

        // 2. مصفوفة الترميز الموضعي (Positional Encoding) المستقرة موجياً
        this.posWeights = this._initPositionalEncoding(maxSeqLen, embedDim);
    }

    /**
     * مُولد مصفوفة الكلمات الفولاذي مع حماية التوزيع (Xavier-Gaussian Armor)
     */
    _initWeights(rows, cols, name) {
        const size = rows * cols;
        const data = new Float32Array(size);
        const std = Math.sqrt(1.0 / rows); 
        
        for (let i = 0; i < size; i++) {
            let val = this._gaussianRandom();
            let attempts = 0;
            // صمام الأمان: بتر الارتفاعات العشوائية الحادة لمنع الانفجار المبكر للأوزان
            while (Math.abs(val) > 2.0 && attempts < 10) {
                val = this._gaussianRandom();
                attempts++;
            }
            // حقن نبضة عاطفية مجهرية (Epsilon) لحماية الكلمات النادرة من التلاشي الصفري المطبق
            const eps = (Math.random() - 0.5) * 1e-6;
            data[i] = (val * std) + eps;
        }
        
        return new Tensor(data, { 
            shape: [rows, cols], 
            op: 'const', 
            id: `weight_${name}_${Date.now()}` // توليد ID فريد ومحصن زمنياً
        });
    }

    /**
     * هندسة المصفوفة المكانية (Sinusoidal Matrix) مع حماية الـ Precision لمنع الـ Nan
     */
    _initPositionalEncoding(maxLen, dim) {
        const data = new Float32Array(maxLen * dim);
        
        for (let pos = 0; pos < maxLen; pos++) {
            for (let i = 0; i < dim; i += 2) {
                // الحساب الموجي الدقيق المعزول ضد الأخطاء العائمة للـ Float32
                const freqFactor = i / dim;
                const angle = pos / Math.pow(10000.0, freqFactor);
                
                const idxSin = pos * dim + i;
                const idxCos = idxSin + 1;
                
                data[idxSin] = Math.sin(angle);
                if (idxCos < (pos + 1) * dim) {
                    data[idxCos] = Math.cos(angle);
                }
            }
        }
        
        return new Tensor(data, { 
            shape: [maxLen, dim], 
            op: 'const', 
            id: `weight_pos_encoding_${Date.now()}` 
        });
    }

    /**
     * المولد العشوائي الآمن المحمي رياضياً ضد فخ لوغاريتم الصفر Ln(0) القاتل
     */
    _gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); 
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(inputIds) {
        // فحص بنية التنسور المدخل واستخراج طول النبضة الحالية ديناميكياً
        const seqLen = inputIds.shape && inputIds.shape.length > 1 ? inputIds.shape[1] : (inputIds.shape[0] || 1);

        // 1. التحقق الصارم من الحدود (Safety Execution Gate)
        if (seqLen > this.maxSeqLen) {
            throw new Error(`[Akasha Critical Error] Sequence length ${seqLen} breaks the dimensional ceiling of ${this.maxSeqLen}`);
        }

        // توليد معرف النبضة الحالية لفك التداخل العشوائي في خطوط الـ Pipeline للـ GPU
        const executionPulseId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

        // 2. Embedding Lookup (تخريج الـ IDs للمحرك للربط المباشر مع الـ GPU Buffer Addresses وتأمين قنوات الـ inputs للـ Optimizer)
        const embedded = new Tensor(null, {
            shape: [seqLen, this.embedDim],
            op: 'embedding_lookup',
            inputs: [inputIds, this.weights], // 🛡️ الحماية الجديدة: تسليم الكائنات الصريحة لمنع تصفير التنسور وعزل الموت الصفري
            inputIds: [String(inputIds.id), String(this.weights.id)], 
            id: `emb_lookup_${executionPulseId}`,
            params: { 
                seqLen: seqLen, 
                embedDim: this.embedDim,
                vocabSize: this.vocabSize 
            }
        });

        // 3. Scaling الحركي المكثف (مضاعفة جهير الإشارة لحمايتها من الاختناق عند الاندماج الموجي)
        const scaledEmbedded = new Tensor(null, {
            shape: embedded.shape,
            op: 'mul_scalar',
            inputs: [embedded], // 🛡️ تأمين الاتصال المتسلسل لـ شجرة العقد الحسابية
            inputIds: [String(embedded.id)],
            id: `emb_scaled_${executionPulseId}`,
            params: { 
                factor: Math.sqrt(this.embedDim), 
                size: seqLen * this.embedDim 
            }
        });

        // 4. دمج المكان والزمان (Positional Encoding Injection Pipeline)
        // تسليم الـ IDs للـ Shader ليعرف الكرت الإحداثيات الدقيقة لكل كلمة في فضاء الوعي لـ "رفيق-AI"
        return new Tensor(null, {
            shape: scaledEmbedded.shape,
            op: 'add_pos_encoding', 
            inputs: [scaledEmbedded, this.posWeights], // 🛡️ الربط النهائي الفولاذي بين موجة الكلمة وموجة الموضع المكاني
            inputIds: [String(scaledEmbedded.id), String(this.posWeights.id)],
            id: `emb_final_output_${executionPulseId}`,
            params: { 
                seqLen: seqLen,
                embedDim: this.embedDim,
                offset: 0 
            }
        });
    }
}
