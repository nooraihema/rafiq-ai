/**
 * src/core/akasharunner.js
 * الحالة: المايسترو الموحد والمصحح (Unified Pipeline) - إصدار التطهير اللغوي لـ رفيق-AI
 * الإصلاح: ضبط أبعاد التنسور لـ [1, N] وتأمين تدفق الإشارة الحية لمنع فخ الأصفار.
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';
import { Tokenizer } from './tokenizer.js'; 

export class AkashaRunner {
    constructor(engine, vocabSize = 2526) {
        this.engine = engine; 
        
        console.log(`%c[Akasha Runner] Hooked to Unified Engine. Vocab Size: ${vocabSize}`, "color: #00ff41; font-weight: bold;");

        // 1. تهيئة الـ Tokenizer مدمجاً جوه الـ Runner لحمايته من الهلوسة اللغوية
        this.tokenizer = new Tokenizer(vocabSize);

        // تهيئة الطبقات
        this.embedding = new Embedding(vocabSize, 512, 128); 
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);

        // تسجيل أوزان الطبقات جوه الـ Backend الموحد فوراً عشان ميتعملهاش overwrite بأصفار
        this._registerLayerWeights(this.embedding);
        this._registerLayerWeights(this.attention);
        this._registerLayerWeights(this.ffn);
    }

    /**
     * 🔥 دالة حقن الـ Dataset الحقيقية لبناء القاموس الديناميكي الأصلي ومنع الأصفار
     */
    injectDatasetVocabulary(datasetText) {
        if (this.tokenizer && typeof this.tokenizer.loadVocabularyFromDataset === 'function') {
            this.tokenizer.loadVocabularyFromDataset(datasetText);
            console.log("%c🔮 [Runner Integrity] تم ربط الـ Tokenizer بالـ Dataset الأصلية الحية بنجاح.", "color: #ff00ff; font-weight: bold;");
        } else {
            console.warn("⚠️ [Runner Warning] دالة loadVocabularyFromDataset غير موجودة في التوكنمايزر الحالي.");
        }
    }

    _registerLayerWeights(layer) {
        for (let key in layer) {
            if (layer[key] && layer[key] instanceof Tensor && layer[key].op === 'const') {
                const tensor = layer[key];
                this.engine.backend._getOrCreateBuffer(tensor.id, tensor.data.length);
                this.engine.device.queue.writeBuffer(
                    this.engine.backend.tensorBuffers.get(tensor.id), 
                    0, 
                    tensor.data
                );
                console.log(`[Engine Matrix] Registered weight: ${tensor.id} into Unified Backend.`);
            }
        }
    }

    /**
     * دالة الـ run الذكية والمصححة هندسياً
     */
    async run(input) {
        try {
            let tokenIds = [];

            // 🛡️ صمام أمان مطور: معالجة النص البشري الحر
            if (typeof input === 'string') {
                console.log(`%c📝 [Runner Processing] جاري معالجة نص بشري حر مباشرة: "${input}"`, "color: #ffff00;");
                tokenIds = Array.from(this.tokenizer.encode(input));
            } else if (input instanceof Uint32Array || Array.isArray(input)) {
                tokenIds = Array.from(input);
            }

            if (tokenIds.length === 0) {
                return new Float32Array(this.engine.backend._calculateSize([2526])).fill(0);
            }

            // 🎯 الإصلاح الأول: تحويل الأبعاد إلى ثنائية [1, Sequence_Length] لمنع انهيار الـ MatMul
            const inputTensor = new Tensor(new Float32Array(tokenIds), { 
                shape: [1, tokenIds.length], // 🔥 تم التعديل من [N] إلى [1, N]
                op: 'input',
                id: 'input_ids'
            });

            // تسجيل الـ Input في الـ Backend وتحديث بفر الذاكرة بالبيانات الحية
            this.engine.backend._getOrCreateBuffer(inputTensor.id, inputTensor.data.length);
            this.engine.device.queue.writeBuffer(
                this.engine.backend.tensorBuffers.get(inputTensor.id), 
                0, 
                inputTensor.data
            );

            // ⚡ بناء الـ Computational Graph خطوة بخطوة بالترتيب الصحيح
            let x = this.embedding.forward(inputTensor);
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 🎯 الإصلاح الثاني: إعلام المحرك بالمدخل الرئيسي (inputTensor) بجانب العقدة الأخيرة (x) 
            // لضمان أن الـ Tracing يربط السلسلة كاملة من الـ Embedding للـ FFN
            if (typeof this.engine.setInput === 'function') {
                this.engine.setInput(inputTensor); 
            }

            // اللحظة الحاسمة: تشغيل التفجير الحسابي الحقيقي على الـ Graph المتصل
            const finalData = await this.engine.compute(x);

            return finalData;
        } catch (err) {
            console.error("[Akasha Runner Critical Error]:", err);
            throw err;
        }
    }
}
