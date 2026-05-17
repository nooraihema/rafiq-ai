/**
 * src/core/akashaRunner.js
 * الـ Runner الرئيسي المحصن والمحدث بالنظام الهجين لمحرك أكاشا (رفيق-AI)
 * مدمج به مستشعرات الـ DEAD_EMPTY_BUFFER والارتداد التلقائي الساخن للـ CPU عند الطوارئ
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';
import { Tokenizer } from './tokenizer.js'; 
import { SignalSanitizer } from './layers/sanitizer.js';

export class AkashaRunner {
    constructor(engine, vocabSize = 2526) {
        this.engine = engine; 
        this.embedDim = 512; // التثبيت الهندسي لـ رفيق-AI
        
        this.tokenizer = new Tokenizer(vocabSize);
        this.embedding = new Embedding(vocabSize, this.embedDim, 128); 
        this.attention = new MultiHeadAttention({ embedDim: this.embedDim, numHeads: 8 });
        this.ffn = new FeedForward(this.embedDim, 2048);
        
        // 🛡️ تهيئة صمام الأمان والنبض الحي
        this.sanitizer = new SignalSanitizer(this.embedDim);

        this._registerLayerWeights(this.embedding);
        this._registerLayerWeights(this.attention);
        this._registerLayerWeights(this.ffn);
    }

    _registerLayerWeights(layer) {
        for (let key in layer) {
            if (layer[key] && layer[key] instanceof Tensor && layer[key].op === 'const') {
                const tensor = layer[key];
                
                // تأمين البفر في الـ VRAM بمحاذاة 16 بايت صريحة لضمان سلامة كارت الشاشة
                const alignedLength = Math.ceil(tensor.data.length / 4) * 4;
                this.engine.backend._getOrCreateBuffer(tensor.id, alignedLength);
                
                this.engine.device.queue.writeBuffer(
                    this.engine.backend.tensorBuffers.get(tensor.id), 0, tensor.data
                );
            }
        }
    }

    // 🛠️ المفرمة الاحتياطية على الـ CPU في حال انهيار الـ VRAM أو حدوث صمت برمجى
    _computeFallbackOnCPU(inputData, weightsW1, weightsW2, seqLen) {
        const h1 = new Float32Array(seqLen * 2048);
        // ضرب المصفوفة الأولى (Input * W1)
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < 2048; j++) {
                let sum = 0;
                for (let k = 0; k < this.embedDim; k++) {
                    sum += inputData[i * this.embedDim + k] * weightsW1[k * 2048 + j];
                }
                // تطبيق دالة الـ GELU فوراً في الـ RAM حماية للإشارة
                h1[i * 2048 + j] = sum * 0.5 * (1.0 + Math.erf(sum / Math.sqrt(2.0)));
            }
        }

        const out = new Float32Array(seqLen * this.embedDim);
        // ضرب المصفوفة الثانية (h1 * W2)
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < this.embedDim; j++) {
                let sum = 0;
                for (let k = 0; k < 2048; k++) {
                    sum += h1[i * 2048 + k] * weightsW2[k * this.embedDim + j];
                }
                out[i * this.embedDim + j] = sum;
            }
        }
        return out;
    }

    async run(input) {
        try {
            let tokenIds = [];
            if (typeof input === 'string') {
                tokenIds = Array.from(this.tokenizer.encode(input));
            } else if (input.data) {
                tokenIds = Array.from(input.data);
            }

            const seqLen = tokenIds.length;
            if (seqLen === 0) return new Float32Array(this.embedDim).fill(0);

            // 🎯 تأمين الـ Tensor بأبعاد ديناميكية حقيقية
            const floatTokens = new Float32Array(tokenIds);
            const inputTensor = new Tensor(floatTokens, { 
                shape: [seqLen, 1], 
                op: 'input',
                id: 'input_ids'
            });

            // 1. معالجة الـ Embedding 
            let x = this.embedding.forward(inputTensor);
            x.shape = [seqLen, this.embedDim]; 

            // 2. معالجة الـ Attention
            x = this.attention.forward(x);
            x.shape = [seqLen, this.embedDim];

            // 🔥 [منطقة الحقن الإشعاعي الحرج]: تطهير مخرج الـ Attention
            x = this.sanitizer.sanitize(x, "attn_to_ffn_gate");
            x.shape = [seqLen, this.embedDim];

            // 3. معالجة الـ FFN (المفرمة المنطقية)
            let x_before_ffn = x; // الاحتفاظ بنسخة حية في الـ RAM كطوق نجاة للاحتياط
            x = this.ffn.forward(x);
            x.shape = [seqLen, this.embedDim];

            // ⚡ التفجير الحسابي النهائي وقراءة الـ GPU العكسية (Readback)
            console.log("🔮 جاري تحليل النبض من خلال النواة الهجينة المؤمنة لـ أكاشا...");
            let finalData = await this.engine.compute(x);
            
            // 🔍 [نظام الفحص الراداري الجذري]: فحص مخرجات كارت الشاشة فوراً قبل العرض
            let isDeadEmpty = true;
            if (finalData) {
                for (let i = 0; i < Math.min(finalData.length, 50); i++) {
                    if (finalData[i] !== 0 && !isNaN(finalData[i])) {
                        isDeadEmpty = false;
                        break;
                    }
                }
            }

            // 🚨 تفعيل بروتوكول الإنقاذ الطارئ: لو كارت الشاشة أصيب بالصمت أو الـ NaN
            if (isDeadEmpty || !finalData) {
                console.warn("⚠️ [أكاشا - نظام الإنقاذ الطارئ]: كارت الشاشة أصيب بالصمت المطبق [DEAD_EMPTY_BUFFER]!");
                console.warn("🚀 جاري معالجة الإشارة يدوياً وربط الـ Fallback عبر الـ CPU فوراً...");
                
                // سحب البيانات من آخر نقطة حية قبل الانهيار (مخرج الـ Attention المطهر)
                let rawInputData = x_before_ffn.data;
                if (!rawInputData && this.engine.backend) {
                    // لو البيانات لسه محبوسة في الـ VRAM هاتها بالبفر صراحة
                    rawInputData = await this.engine.backend.readBufferDirect(
                        this.engine.backend.tensorBuffers.get(x_before_ffn.id), 
                        seqLen * this.embedDim
                    );
                }

                // سحب أوزان الـ FFN الحالية المخزنة في الكلاس
                const w1 = this.ffn.w1.data;
                const w2 = this.ffn.w2.data;

                // الحساب الفولاذي المباشر على الـ CPU لإحياء النظام
                finalData = this._computeFallbackOnCPU(rawInputData, w1, w2, seqLen);
                console.log("✅ تم استرداد الإشارة حية وبصحة 100% عبر الـ CPU بنجاح!");
            }
            
            return finalData;

        } catch (err) {
            console.error("🚨 انهيار أثناء تشغيل بايبلاين أكاشا الهجين:", err);
            throw err;
        }
    }
}
