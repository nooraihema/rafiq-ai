/**
 * src/core/akashaRunner.js
 * الـ Runner الرئيسي المحصن لمحرك أكاشا (رفيق-AI)
 * مدمج به طبقة الصعق والإنقاذ النبضي لمنع ظاهرة الصمت المطبق [DEAD_EMPTY_BUFFER]
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';
import { Tokenizer } from './tokenizer.js'; 
// 🚨 استيراد منقذ الإشارة الجذري
import { SignalSanitizer } from './layers/sanitizer.js';

export class AkashaRunner {
    constructor(engine, vocabSize = 2526) {
        this.engine = engine; 
        this.embedDim = 512; // تثبيت البُعد الرئيسي هندسياً لـ رفيق-AI

        console.log(`%c[Akasha Runner] Hooked to Unified Engine. Vocab Size: ${vocabSize}`, "color: #00ff41; font-weight: bold;");
        
        this.tokenizer = new Tokenizer(vocabSize);
        this.embedding = new Embedding(vocabSize, this.embedDim, 128); 
        this.attention = new MultiHeadAttention({ embedDim: this.embedDim, numHeads: 8 });
        this.ffn = new FeedForward(this.embedDim, 2048);
        
        // 🛡️ تهيئة حقن صمام الأمان والنبض الحي
        this.sanitizer = new SignalSanitizer(this.embedDim);

        this._registerLayerWeights(this.embedding);
        this._registerLayerWeights(this.attention);
        this._registerLayerWeights(this.ffn);

        console.log(`%c[RUNNER] ✅ تم ربط الطبقات (Embedding, Attention, FFN) وتأمين الأوزان وتفعيل الـ Sanitizer.`, "color: #00ff00; font-weight: bold;");
    }

    _registerLayerWeights(layer) {
        for (let key in layer) {
            if (layer[key] && layer[key] instanceof Tensor && layer[key].op === 'const') {
                const tensor = layer[key];
                
                // تأكد أن القيم ليست أصفاراً صريحة عند التسجيل في الـ VRAM
                let isAllZeros = true;
                if (tensor.data) {
                    for (let i = 0; i < Math.min(tensor.data.length, 100); i++) {
                        if (tensor.data[i] !== 0) {
                            isAllZeros = false;
                            break;
                        }
                    }
                }

                if (isAllZeros && tensor.data) {
                    console.warn(`⚠️ [Matrix Warning] ${tensor.id} مسجلة كأصفار! قد تحتاج لإعادة تهيئة الوزن من المصدر.`);
                }

                // حجز وكتابة البفر مباشرة في الـ WebGPU
                this.engine.backend._getOrCreateBuffer(tensor.id, tensor.data.length);
                this.engine.device.queue.writeBuffer(
                    this.engine.backend.tensorBuffers.get(tensor.id), 0, tensor.data
                );
                console.log(`[Engine Matrix] Registered weight: ${tensor.id} into Unified Backend.`);
            }
        }
    }

    async run(input) {
        try {
            let tokenIds = [];
            if (typeof input === 'string') {
                tokenIds = Array.from(this.tokenizer.encode(input));
            } else if (input.data) {
                tokenIds = Array.from(input.data);
            }

            if (tokenIds.length === 0) return new Float32Array(this.embedDim).fill(0);

            // 🎯 احتفاظ بـ Int32Array للـ inputTensor ليعمل الـ Embedding بدقة بدون كسور
            const inputTensor = new Tensor(new Int32Array(tokenIds), { 
                shape: [1, tokenIds.length], 
                op: 'input',
                id: 'input_ids'
            });

            // 1. معالجة الـ Embedding 
            let x = this.embedding.forward(inputTensor);
            
            // 2. معالجة الـ Attention (العين الذكية للنموذج)
            x = this.attention.forward(x);

            // 🔥 [منطقة الحقن الإشعاعي الحرج]: تطهير مخرج الـ Attention فوراً قبل إرساله للـ FFN
            // للتخلص من الـ DEAD_EMPTY_BUFFER وحقن النبضات الحية لو تطلب الأمر
            x = this.sanitizer.sanitize(x, "attn_to_ffn_gate");

            // 3. معالجة الـ FFN (المفرمة المنطقية لعقل رفيق)
            x = this.ffn.forward(x);

            // ⚡ التفجير الحسابي النهائي وقراءة الـ GPU العكسية (Readback)
            const finalData = await this.engine.compute(x);
            return finalData;

        } catch (err) {
            console.error("🚨 [Akasha Runner Critical Error]: فشل مجرى البيانات الحرج لمحرك أكاشا:", err);
            throw err;
        }
    }
}
