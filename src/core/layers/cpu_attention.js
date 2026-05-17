/**
 * src/core/layers/cpu_attention.js
 * طبقة الـ Attention الفولاذية المستقلة تماماً على الـ CPU
 * أحدث نظام: Fused QKV + KV Cache + Causal Masking
 * رفيق-AI | تطوير هندسي: إبراهيم شحات (2026)
 */

export class CPUAttention {
    constructor(config = {}) {
        this.embedDim = config.embedDim || 512;
        this.numHeads = config.numHeads || 8;
        this.headDim = this.embedDim / this.numHeads; // 64
        this.scale = 1.0 / Math.sqrt(this.headDim); // 0.125

        // الأوزان المدمجة (Fused QKV Projection)
        // الوزن عبارة عن مصفوفة مسطحة أبعادها [InputDim, 3 * EmbedDim]
        this.fusedWeights = null; 
        this.fusedBias = null;

        // أوزان الإسقاط الخارجي (Output Projection)
        this.outWeights = null;
        this.outBias = null;

        // مخازن الـ KV Cache على الـ RAM (مصفوفات حرة مرنة لكل طبقة)
        this.kCache = []; // ستخزن مصفوفات فرعية لكل توكين [numHeads, headDim]
        this.vCache = []; // ستخزن مصفوفات فرعية لكل توكين [numHeads, headDim]
    }

    /**
     * شحن الأوزان من التنسورات الحالية إلى الطبقة
     */
    setWeights(fusedW, fusedB, outW, outB) {
        this.fusedWeights = fusedW; // Float32Array
        this.fusedBias = fusedB;       // Float32Array
        this.outWeights = outW;     // Float32Array
        this.outBias = outB;         // Float32Array
    }

    /**
     * تفريغ الكاش تماماً عند بدء جملة جديدة
     */
    resetCache() {
        this.kCache = [];
        this.vCache = [];
    }

    /**
     * المعالجة الأمامية الفولاذية على الـ CPU
     * @param {Float32Array} hiddenStates - مصفوفة الدخل مسطحة بأبعاد [seqLen, embedDim]
     * @param {number} currentTokenIndex - مؤشر التوكين الحالي في السياق
     */
    forward(hiddenStates, currentTokenIndex = 0) {
        const seqLen = hiddenStates.length / this.embedDim;
        const strideQKV = this.embedDim * 3; // 1532 عنصر لكل صف
        
        // مصفوفة المخرجات النهائية للـ Attention بنفس حجم الدخل
        const attentionOutput = new Float32Array(seqLen * this.embedDim);

        // إذا كنا في بداية جملة جديدة والـ Cache فارغ، نقوم بتهيئة الكاش بناءً على التاريخ
        if (currentTokenIndex === 0 && this.kCache.length > 0) {
            this.resetCache();
        }

        // --- الخطوة 1: الـ Fused QKV Projection ---
        // نقوم بحساب الـ Q والـ K والـ V لكل توكين في الدخل الحالي
        const currentQ = []; // سنخزن فيه الـ Q لهذا الاستدعاء
        
        for (let i = 0; i < seqLen; i++) {
            const tokenQ = new Float32Array(this.embedDim);
            const tokenK = new Float32Array(this.embedDim);
            const tokenV = new Float32Array(this.embedDim);

            // ضرب مصفوفة الدخل في أوزان الـ Fused العملاقة
            for (let outCol = 0; outCol < strideQKV; outCol++) {
                let sum = 0;
                for (let k = 0; k < this.embedDim; k++) {
                    sum += hiddenStates[i * this.embedDim + k] * this.fusedWeights[k * strideQKV + outCol];
                }
                sum += this.fusedBias[outCol];

                // تقسيم الناتج المدمج إلى Q و K و V بناءً على العمود
                if (outCol < this.embedDim) {
                    tokenQ[outCol] = sum;
                } else if (outCol < this.embedDim * 2) {
                    tokenK[outCol - this.embedDim] = sum;
                } else {
                    tokenV[outCol - this.embedDim * 2] = sum;
                }
            }

            currentQ.push(tokenQ);
            // ضخ الـ K والـ V فوراً داخل الـ KV Cache المستقر في الـ RAM
            this.kCache.push(tokenK);
            this.vCache.push(tokenV);
        }

        // الحجم الكلي للتاريخ المتاح الآن في الكاش
        const totalHistory = this.kCache.length; 

        // --- الخطوة 2: حساب الـ Attention لكل رأس (Multi-Head Core) ---
        for (let h = 0; h < this.numHeads; h++) {
            const headOffset = h * this.headDim;

            // معالجة كل توكين في المدخل الحالي (Query)
            for (let qIdx = 0; qIdx < seqLen; qIdx++) {
                // الفهرس الحقيقي للتوكين الحالي في السياق الكلي للنص
                const globalQIdx = currentTokenIndex + qIdx; 
                
                // مصفوفة لتخزين الـ Scores (الأوزان قبل الـ Softmax)
                // حجمها يساوي عدد التوكينات المتاحة في الكاش حتى التوكين الحالي
                const scores = new Float32Array(globalQIdx + 1); 
                let maxScore = -Infinity;

                // جيش الـ Keys: مقارنة الـ Query الحالي مع كل الـ Keys السابقة والمخزنة في الكاش
                for (let kIdx = 0; kIdx <= globalQIdx; kIdx++) {
                    // [Masking المتقدم الصارم]: حماية السببية يدوياً لمنع استبصار الغيب النصي
                    if (kIdx > globalQIdx) continue; 

                    let score = 0;
                    const cachedK = this.kCache[kIdx];
                    const activeQ = currentQ[qIdx];

                    // ضرب قيم الـ Head الحالية (Q * K)
                    for (let d = 0; d < this.headDim; d++) {
                        score += activeQ[headOffset + d] * cachedK[headOffset + d];
                    }
                    score *= this.scale;
                    scores[kIdx] = score;

                    if (score > maxScore) maxScore = score;
                }

                // حساب الـ Softmax المستقر (Online/Safe Softmax على الـ CPU)
                let expSum = 0;
                const exps = new Float32Array(scores.length);
                for (let kIdx = 0; kIdx <= globalQIdx; kIdx++) {
                    const e = Math.exp(scores[kIdx] - maxScore);
                    exps[kIdx] = e;
                    expSum += e;
                }

                // ضرب الأوزان الناتجة في مصفوفات الـ Values المخزنة في الكاش
                const contextVec = new Float32Array(this.headDim);
                for (let kIdx = 0; kIdx <= globalQIdx; kIdx++) {
                    const attnWeight = exps[kIdx] / (expSum || 1.0);
                    const cachedV = this.vCache[kIdx];

                    for (let d = 0; d < this.headDim; d++) {
                        contextVec[d] += attnWeight * cachedV[headOffset + d];
                    }
                }

                // زرع الـ Context Vector في مصفوفة المخرجات المؤقتة لهذا الرأس
                const tokenOutOffset = qIdx * this.embedDim + headOffset;
                for (let d = 0; d < this.headDim; d++) {
                    attentionOutput[tokenOutOffset + d] = contextVec[d];
                }
            }
        }

        // --- الخطوة 3: الـ Output Projection ---
        // إسقاط نهائي للمخرجات المجمعة عبر أوزان الطبقة الخارجية
        const finalOutput = new Float32Array(attentionOutput.length);
        for (let i = 0; i < seqLen; i++) {
            for (let outCol = 0; outCol < this.embedDim; outCol++) {
                let sum = 0;
                for (let k = 0; k < this.embedDim; k++) {
                    sum += attentionOutput[i * this.embedDim + k] * this.outWeights[k * this.embedDim + outCol];
                }
                finalOutput[i * this.embedDim + outCol] = sum + this.outBias[outCol];
            }
        }

        return finalOutput;
    }
}
