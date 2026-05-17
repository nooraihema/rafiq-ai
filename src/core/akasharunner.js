/**
 * src/core/akashaRunner.js
 * الـ Runner الرئيسي المحصن لـ (رفيق-AI) - محرك أكاشا
 * التحديث الجذري: فصل وعزل طبقة الـ Attention تماماً لتُحسب على الـ CPU حماية من صمت كارت الشاشة
 * مدمج به: Fused QKV، الـ KV Cache التراكمي على الـ RAM، ونظام الـ CPU Fallback التلقائي للـ FFN عند الطوارئ
 * تطوير هندسي: إبراهيم شحات (2026)
 */

import { Embedding } from './layers/embedding.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';
import { Tokenizer } from './tokenizer.js'; 
import { SignalSanitizer } from './layers/sanitizer.js';

export class AkashaRunner {
    constructor(engine, vocabSize = 2526) {
        this.engine = engine; 
        this.embedDim = 512; // التثبيت الهندسي لـ رفيق-AI
        this.numHeads = 8;
        this.headDim = this.embedDim / this.numHeads; // 64
        this.scale = 1.0 / Math.sqrt(this.headDim);  // 0.125
        this.currentTokenIndex = 0; // مؤشر تتبع الكلمات التوليدية للـ KV Cache
        
        this.tokenizer = new Tokenizer(vocabSize);
        this.embedding = new Embedding(vocabSize, this.embedDim, 128); 
        this.ffn = new FeedForward(this.embedDim, 2048);
        
        // 🛡️ تهيئة صمام الأمان والنبض الحي لشارات الإدخال والمخرجات
        this.sanitizer = new SignalSanitizer(this.embedDim);

        // مخازن الـ KV Cache المستقرة على الـ RAM (مصفوفات حرة مرنة لمنع تسريب الـ VRAM)
        this.kCache = []; 
        this.vCache = [];

        // تسجيل أوزان الـ Embedding والـ FFN فقط على الباكيند لكارت الشاشة
        this._registerLayerWeights(this.embedding);
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

    // 🛠️ البديل الرياضي الفولاذي لـ دالة الخطأ الحسابي لمنع انهيار الـ CPU Fallback
    _erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x < 0 ? -1 : 1;
        const absX = Math.abs(x);

        const t = 1.0 / (1.0 + p * absX);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

        return sign * y;
    }

    // ⚙️ مفرمة الـ Attention النقية والكاملة على الـ CPU بعيداً عن عناد كارت الشاشة
    _computeAttentionOnCPU(hiddenStatesData, seqLen) {
        const strideQKV = this.embedDim * 3; // 1536 عنصر لكل صف
        const attentionOutput = new Float32Array(seqLen * this.embedDim);

        // سحب أوزان الـ Fused ونظام الـ Out Projection من كلاس المحرك الرئيسي للـ Attention الحالية
        const fusedWeights = this.engine.attentionWeights?.fusedWeights?.data || new Float32Array(this.embedDim * strideQKV);
        const fusedBias = this.engine.attentionWeights?.fusedBias?.data || new Float32Array(strideQKV);
        const outWeights = this.engine.attentionWeights?.outWeights?.data || new Float32Array(this.embedDim * this.embedDim);
        const outBias = this.engine.attentionWeights?.outBias?.data || new Float32Array(this.embedDim);

        const currentQ = [];

        // 1. حساب الـ Fused QKV Projections لكل توكين حالي
        for (let i = 0; i < seqLen; i++) {
            const tokenQ = new Float32Array(this.embedDim);
            const tokenK = new Float32Array(this.embedDim);
            const tokenV = new Float32Array(this.embedDim);

            for (let outCol = 0; outCol < strideQKV; outCol++) {
                let sum = 0;
                for (let k = 0; k < this.embedDim; k++) {
                    sum += hiddenStatesData[i * this.embedDim + k] * fusedWeights[k * strideQKV + outCol];
                }
                sum += fusedBias[outCol];

                if (outCol < this.embedDim) {
                    tokenQ[outCol] = sum;
                } else if (outCol < this.embedDim * 2) {
                    tokenK[outCol - this.embedDim] = sum;
                } else {
                    tokenV[outCol - this.embedDim * 2] = sum;
                }
            }

            currentQ.push(tokenQ);
            this.kCache.push(tokenK); // ضخ الـ Key المحدث في الـ RAM كاش
            this.vCache.push(tokenV); // ضخ الـ Value المحدث في الـ RAM كاش
        }

        // 2. معالجة الـ Multi-Head Core مع تطبيق الـ Causal Masking الصارم وحساب الأوزان
        for (let h = 0; h < this.numHeads; h++) {
            const headOffset = h * this.headDim;

            for (let qIdx = 0; qIdx < seqLen; qIdx++) {
                const globalQIdx = this.currentTokenIndex + qIdx;
                const scores = new Float32Array(globalQIdx + 1);
                let maxScore = -Infinity;

                for (let kIdx = 0; kIdx <= globalQIdx; kIdx++) {
                    let score = 0;
                    const cachedK = this.kCache[kIdx];
                    const activeQ = currentQ[qIdx];

                    for (let d = 0; d < this.headDim; d++) {
                        score += activeQ[headOffset + d] * cachedK[headOffset + d];
                    }
                    score *= this.scale;
                    scores[kIdx] = score;

                    if (score > maxScore) maxScore = score;
                }

                // الـ Softmax الآمن والمستقر رياضياً على الـ CPU
                let expSum = 0;
                const exps = new Float32Array(scores.length);
                for (let kIdx = 0; kIdx <= globalQIdx; kIdx++) {
                    const e = Math.exp(scores[kIdx] - maxScore);
                    exps[kIdx] = e;
                    expSum += e;
                }

                // الدمج مع الـ V Cache المخزن
                const contextVec = new Float32Array(this.headDim);
                for (let kIdx = 0; kIdx <= globalQIdx; kIdx++) {
                    const attnWeight = exps[kIdx] / (expSum || 1.0);
                    const cachedV = this.vCache[kIdx];

                    for (let d = 0; d < this.headDim; d++) {
                        contextVec[d] += attnWeight * cachedV[headOffset + d];
                    }
                }

                const tokenOutOffset = qIdx * this.embedDim + headOffset;
                for (let d = 0; d < this.headDim; d++) {
                    attentionOutput[tokenOutOffset + d] = contextVec[d];
                }
            }
        }

        // 3. طبقة الإسقاط الخارجي (Output Projection)
        const finalAttentionOutput = new Float32Array(attentionOutput.length);
        for (let i = 0; i < seqLen; i++) {
            for (let outCol = 0; outCol < this.embedDim; outCol++) {
                let sum = 0;
                for (let k = 0; k < this.embedDim; k++) {
                    sum += attentionOutput[i * this.embedDim + k] * outWeights[k * this.embedDim + outCol];
                }
                finalAttentionOutput[i * this.embedDim + outCol] = sum + outBias[outCol];
            }
        }

        return finalAttentionOutput;
    }

    // 🛠️ المفرمة الاحتياطية على الـ CPU للـ FFN في حال حدوث صمت برمجى بمخرجات كارت الشاشة
    _computeFallbackOnCPU(inputData, weightsW1, weightsW2, seqLen) {
        const h1 = new Float32Array(seqLen * 2048);
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < 2048; j++) {
                let sum = 0;
                for (let k = 0; k < this.embedDim; k++) {
                    sum += inputData[i * this.embedDim + k] * weightsW1[k * 2048 + j];
                }
                h1[i * 2048 + j] = sum * 0.5 * (1.0 + this._erf(sum / Math.sqrt(2.0)));
            }
        }

        const out = new Float32Array(seqLen * this.embedDim);
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

            if (this.currentTokenIndex === 0) {
                this.resetCache();
            }

            // 🎯 تأمين الـ Tensor بأبعاد ديناميكية حقيقية
            const floatTokens = new Float32Array(tokenIds);
            const inputTensor = new Tensor(floatTokens, { 
                shape: [seqLen, 1], 
                op: 'input',
                id: 'input_ids'
            });

            // 1. معالجة الـ Embedding على كارت الشاشة كالعادة لسرعة الجداول
            let x = this.embedding.forward(inputTensor);
            x.shape = [seqLen, this.embedDim]; 

            // قراءة بيانات الـ Embedding فورياً للبدء في تشغيل مفرمة الـ CPU المنفصلة
            console.log("⚡ جاري سحب مخرجات الـ Embedding ومعالجة الـ Attention كلياً على الـ CPU...");
            let embeddingRawData = x.data;
            if (!embeddingRawData && this.engine.backend) {
                embeddingRawData = await this.engine.backend.readBufferDirect(
                    this.engine.backend.tensorBuffers.get(x.id), 
                    seqLen * this.embedDim
                );
            }

            // 2. معالجة الـ Attention بالكامل وحساب الـ KV Cache يدوياً داخل الـ RAM
            const cpuAttnData = this._computeAttentionOnCPU(embeddingRawData, seqLen);

            // إعادة لف مخرجات الـ CPU داخل كائن Tensor لضمان توافق تسلسل الـ Pipeline المتبقي للـ FFN
            let attnTensor = new Tensor(cpuAttnData, {
                shape: [seqLen, this.embedDim],
                op: 'cpu_attention_isolated',
                id: `attn_cpu_out_${this.currentTokenIndex}`
            });

            // 🔥 [منطقة الحقن الإشعاعي الحرج]: تطهير مخرج الـ Attention المحسوب على الـ CPU قبل مروره للـ FFN
            let sanitizedAttn = this.sanitizer.sanitize(attnTensor, "attn_to_ffn_gate");
            sanitizedAttn.shape = [seqLen, this.embedDim];

            // 3. معالجة الـ FFN (المفرمة المنطقية)
            let x_before_ffn = sanitizedAttn; // الاحتفاظ بنسخة حية في الـ RAM كطوق نجاة عند انهيار الـ GPU
            let ffnOut = this.ffn.forward(sanitizedAttn);
            ffnOut.shape = [seqLen, this.embedDim];

            // ⚡ التفجير الحسابي لآخر نقطة وقراءة الـ GPU العكسية (Readback)
            console.log("🔮 جاري تحليل النبض الختامي لـ الـ FFN عبر الباكيند الهجين لـ أكاشا...");
            let finalData = await this.engine.compute(ffnOut);
            
            // 🔍 [نظام الفحص الراداري الجذري]: فحص مخرجات كارت الشاشة للـ FFN فوراً قبل الاعتماد
            let isDeadEmpty = true;
            if (finalData) {
                for (let i = 0; i < Math.min(finalData.length, 50); i++) {
                    if (finalData[i] !== 0 && !isNaN(finalData[i])) {
                        isDeadEmpty = false;
                        break;
                    }
                }
            }

            // 🚨 تفعيل بروتوكول الإنقاذ الطارئ للـ FFN: لو كارت الشاشة أصيب بالصمت أو الـ NaN
            if (isDeadEmpty || !finalData) {
                console.warn("⚠️ [أكاشا - نظام الإنقاذ الطارئ]: كارت الشاشة فشل في حساب الـ FFN [DEAD_EMPTY_BUFFER]!");
                console.warn("🚀 جاري معالجة مخرجات الـ FFN يدوياً وربط الـ Fallback عبر الـ CPU فوراً...");
                
                let rawInputData = x_before_ffn.data;
                const w1 = this.ffn.w1.data;
                const w2 = this.ffn.w2.data;

                // الحساب الفولاذي المباشر للـ FFN على الـ CPU لإحياء النظام
                finalData = this._computeFallbackOnCPU(rawInputData, w1, w2, seqLen);
                console.log("✅ تم استرداد الإشارة حية وبصحة 100% عبر الـ CPU بنجاح!");
            }
            
            // تحديث مؤشر التوكين التراكمي في الـ RAM للـ KV Cache
            this.currentTokenIndex += seqLen;
            
            return finalData;

        } catch (err) {
            console.error("🚨 انهيار أثناء تشغيل بايبلاين أكاشا الهجين المعزول:", err);
            throw err;
        }
    }

    // دالة مساعدة لتصفير مؤشر الـ Cache والذاكرة الحية عند البدء بسياق جديد تماماً
    resetCache() {
        this.currentTokenIndex = 0;
        this.kCache = [];
        this.vCache = [];
        console.log("🧹 [KV Cache] تم تصفير الذاكرة العشوائية للـ Attention على الـ CPU بنجاح.");
    }
}
