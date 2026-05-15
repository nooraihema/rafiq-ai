/**
 * src/core/akasharunner.js
 * الحالة: المايسترو الموحد والمصحح (Unified Pipeline) - إصدار التطهير اللغوي لـ رفيق-AI
 * الإصلاح: دمج الـ Tokenizer ديناميكياً داخل الـ Runner لمنع خداع الأصفار وحماية الإشارة.
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';
import { Tokenizer } from './tokenizer.js'; // 🔥 استدعاء التوكنمايزر هنا لحمايته

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
     * استدعيها فوراً في ملف الـ UI أو الـ Setup الخارجي بعد تحميل الـ dataset.txt بنجاح
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
     * تعديل دالة الـ run لتصبح ذكية: تقبل مصفوفة الأرقام أو النص البشري مباشرة!
     */
    async run(input) {
        try {
            let tokenIds = [];

            // 🛡️ صمام أمان مطور: لو المدخل نص بشري حر، الـ Runner هيعمله Tokenization بنفسه بالقاموس الحقيقي!
            if (typeof input === 'string') {
                console.log(`%c📝 [Runner Processing] جاري معالجة نص بشري حر مباشرة: "${input}"`, "color: #ffff00;");
                tokenIds = Array.from(this.tokenizer.encode(input));
            } else if (input instanceof Uint32Array || Array.isArray(input)) {
                tokenIds = Array.from(input);
            }

            if (tokenIds.length === 0) return new Float32Array(this.engine.backend._calculateSize([2526])).fill(0);

            // 1. تحويل التوكنز لـ Tensor مدخلات
            const inputTensor = new Tensor(new Float32Array(tokenIds), { 
                shape: [tokenIds.length], 
                op: 'input',
                id: 'input_ids'
            });

            // تسجيل الـ Input يدوياً في الـ Backend الموحد
            this.engine.backend._getOrCreateBuffer(inputTensor.id, inputTensor.data.length);
            this.engine.device.queue.writeBuffer(
                this.engine.backend.tensorBuffers.get(inputTensor.id), 
                0, 
                inputTensor.data
            );

            // 2. تتبع العمليات وبناء الـ Graph الحقيقي على الـ Engine
            let x = this.embedding.forward(inputTensor);
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 3. اللحظة الحاسمة: نخلي الـ Engine يحسب الـ Tensor النهائي!
            const finalData = await this.engine.compute(x);

            return finalData;
        } catch (err) {
            console.error("[Akasha Runner Critical Error]:", err);
            throw err;
        }
    }
}
