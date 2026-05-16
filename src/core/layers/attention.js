/**
 * src/core/layers/attention.js
 * الحالة: النسخة السيادية الفولاذية والمجنونة (Quantum Resilient & Anti-NaN Armour) - رفيق-AI
 * الحماية والمعايرة الصارمة: إبراهيم شحات لضبط مسارات الحساب التفاعلي ومنع موت الإشارة الحركية
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor({ embedDim, numHeads }) {
        this.embedDim = embedDim;
        this.numHeads = numHeads;
        this.headDim = embedDim / numHeads;
        
        // 🚨 تفادي الـ NaN بالجنون الرياضي: لو الـ headDim حسابياً طلع صفر أو مكسور، نثبت له حد أدنى آمن
        const safeHeadDim = this.headDim || 1;
        this.scale = 1.0 / Math.sqrt(safeHeadDim);

        // 1. تثبيت الأسماء (Fixed IDs) مع التوليد المعاير الفولاذي للأوزان
        this.queryWeights = this._initWeight(embedDim, embedDim, 'query');
        this.keyWeights = this._initWeight(embedDim, embedDim, 'key');
        this.valueWeights = this._initWeight(embedDim, embedDim, 'value');
        this.outputWeights = this._initWeight(embedDim, embedDim, 'out_proj');

        // أوزان الـ LayerNorm (مؤمنة ومحصنة كلياً ضد تلاشي التدفق)
        this.ln_gamma = new Tensor(
            new Float32Array(embedDim).fill(1.0),
            {
                shape: [embedDim],
                op: 'const',
                id: 'attn_ln_gamma'
            }
        );

        this.ln_beta = this._initBias(embedDim, 'attn_ln_beta');
    }

    /**
     * مُولد الأوزان الفولاذي المحمي ضد تشوهات التوزيع (Truncated Xavier Initialization)
     */
    _initWeight(rows, cols, name) {
        const size = rows * cols;
        const data = new Float32Array(size);
        const std = Math.sqrt(2.0 / (rows + cols));

        for (let i = 0; i < size; i++) {
            let val = this._gaussianRandom();
            
            // 🛡️ صمام أمان صارم: بتر التوزيع العشوائي لو تخطى الحدود الآمنة لحماية الـ Embeddings من الانفجار
            let attempts = 0;
            while (Math.abs(val) > 2.0 && attempts < 10) {
                val = this._gaussianRandom();
                attempts++;
            }
            
            // إضافة نبضة متناهية الصغر (Epsilon) لمنع حدوث أوزان صفرية ميتة بالكامل في البداية
            const eps = (Math.random() - 0.5) * 1e-5;
            data[i] = (val * std) + eps;
        }

        return new Tensor(data, {
            shape: [rows, cols],
            op: 'const',
            id: `weight_attn_${name}`
        });
    }

    _initBias(size, name) {
        const data = new Float32Array(size);

        for (let i = 0; i < size; i++) {
            // نبض عشوائي متناهي الصغر ومحمي لضمان تدفق مستمر عبر البوابات
            data[i] = (Math.random() * 2.0 - 1.0) * 0.001;
        }

        return new Tensor(data, {
            shape: [size],
            op: 'const',
            id: name
        });
    }

    _gaussianRandom() {
        let u = 0, v = 0;
        // حماية الرياضية لمنع لوغاريتم الصفر Ln(0) المسبب للـ NaN القاتل
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    /**
     * معاملات قياسية موحدة لعمليات matmul:
     * يمرر بدقة للـ Backend ليعرف الـ GPU حدود الـ Grid والـ Threads بحسابات الكومبايلر
     * تم الإصلاح بواسطة إبراهيم لتضمين البعد الحركي الأول M (طول النص) منعاً لتصفير الحسابات
     */
    _matmulParams(seqLen) {
        return {
            M: seqLen || 1, // البعد الحرج المفقود سابقاً
            N: this.embedDim,
            K: this.embedDim
        };
    }

    forward(x) {
        // توليد معرف نبضي فريد ديناميكي لربط مسارات التتبع وحسابات الـ Backpropagation بدون تداخل للذاكرة
        const pulseId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

        // 🧠 استخراج طول النبضة الحالية (seqLen) ديناميكياً بدلاً من فرضه كـ [1] لحل انقطاع التدفق اللفظي
        const seqLen = x.shape && x.shape.length > 0 ? x.shape[0] : 1;
        
        // تشكيل قالب الأبعاد الديناميكي الحامي للإشارة عبر قنوات المعالجة للـ GPU
        const dynamicShape = [seqLen, this.embedDim];

        // ------------------------------------------------------------------
        // 1. Query Projection [seqLen, embedDim] x [embedDim, embedDim] = [seqLen, embedDim]
        // ------------------------------------------------------------------
        const Q = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.queryWeights],
            shape: [...dynamicShape],
            id: `attn_q_${pulseId}`,
            params: this._matmulParams(seqLen)
        });

        // ------------------------------------------------------------------
        // 2. Key Projection [seqLen, embedDim] x [embedDim, embedDim] = [seqLen, embedDim]
        // ------------------------------------------------------------------
        const K = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.keyWeights],
            shape: [...dynamicShape],
            id: `attn_k_${pulseId}`,
            params: this._matmulParams(seqLen)
        });

        // ------------------------------------------------------------------
        // 3. Value Projection [seqLen, embedDim] x [embedDim, embedDim] = [seqLen, embedDim]
        // ------------------------------------------------------------------
        const V = new Tensor(null, {
            op: 'matmul',
            inputs: [x, this.valueWeights],
            shape: [...dynamicShape],
            id: `attn_v_${pulseId}`,
            params: this._matmulParams(seqLen)
        });

        // ------------------------------------------------------------------
        // 4. Attention Core (البوابة السحرية لحساب احتمالات الارتباط المشترك وعزل المستقبل والماضي عاطفياً)
        // ------------------------------------------------------------------
        const attentionContext = new Tensor(null, {
            op: 'attention_core',
            inputs: [Q, K, V],
            shape: [...dynamicShape],
            id: `attn_core_ctx_${pulseId}`,
            params: {
                numHeads: this.numHeads,
                headDim: this.headDim,
                scale: this.scale,
                causal: true, // تفعيل التسبب النصي لمنع قراءة المستقبل
                seqLen: seqLen,
                embedDim: this.embedDim
            }
        });

        // ------------------------------------------------------------------
        // 5. Output Projection (إسقاط سياق الـ Attention وإعادته لأبعاد النموذج الأصلية)
        // ------------------------------------------------------------------
        const attentionOut = new Tensor(null, {
            op: 'matmul',
            inputs: [attentionContext, this.outputWeights],
            shape: [...dynamicShape],
            id: `attn_out_proj_${pulseId}`,
            params: this._matmulParams(seqLen)
        });

        // ------------------------------------------------------------------
        // 6. Residual Connection (الاتصال الارتجاعي الفولاذي - حامي الذاكرة الممتدة من التلاشي)
        // ------------------------------------------------------------------
        const residual = new Tensor(null, {
            op: 'add',
            inputs: [x, attentionOut],
            shape: [...dynamicShape],
            id: `attn_residual_${pulseId}`
        });

        // ------------------------------------------------------------------
        // 7. LayerNorm Bypass المؤمن كلياً (دمج انحياز البيتا المطهر)
        // ------------------------------------------------------------------
        const finalAttnOut = new Tensor(null, {
            op: 'add',
            inputs: [residual, this.ln_beta],
            shape: [...dynamicShape],
            id: `attn_final_ln_${pulseId}`
        });

        // الكود المساعد يراقب النتيجة: لو الـ ID ده استدعى حسابات خاملة، يتم تنشيط المخرجات فوراً
        return finalAttnOut;
    }
}
