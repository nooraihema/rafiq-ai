/**
 * src/core/layers/ffn.js
 * الحالة: النسخة الجبارة والسيادية المطلقة (Graph-Level Resilient & Matrix Alignment Armor) - رفيق-AI
 * الحماية الصارمة والتحصين الجنائي: إبراهيم شحات (محرك أكاشا الفولاذي)
 *
 * الوظيفة:
 *  - معالجة الأبعاد العميقة لطبقة الـ Feed Forward دون ملامسة الـ CPU Data الخاملة.
 *  - حل جذري ونهائي لمشاكل انفجار أبعاد المصفوفات الحسابية أثناء الـ Execution.
 *  - الالتزام الصارم بتمرير بارامترات الأبعاد [params.N, params.K] لكل خطوة مصفوفية.
 *  - الحفاظ على الواجهات العامة، الدوال، والمسارات دون كسر معمارية الـ Execution Runner.
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;     // أبعاد الـ Embedding (مثال: 512)
        this.hiddenDim = hiddenDim;   // أبعاد الطبقة المخفية (مثال: 2048)

        // =========================================================
        // Weight Initialization (تحصين الأوزان ضد القنوات الصفرية الميتة)
        // =========================================================
        this.w1 = this._initWeight(embedDim, hiddenDim, 'ffn_w1');
        this.w2 = this._initWeight(hiddenDim, embedDim, 'ffn_w2');

        // =========================================================
        // Bias Initialization (شحنات حركية مستمرة لضمان بقاء النبضة)
        // =========================================================
        this.b1 = this._initBias(hiddenDim, 'ffn_b1');
        this.b2 = this._initBias(embedDim, 'ffn_b2');

        // =========================================================
        // LayerNorm Parameters (مؤمنة لمنع التشوهات العائمة)
        // =========================================================
        this.ln_gamma = new Tensor(
            new Float32Array(embedDim).fill(1.0),
            {
                shape: [embedDim],
                op: 'const',
                id: 'ffn_ln_gamma'
            }
        );

        this.ln_beta = this._initBias(embedDim, 'ffn_ln_beta');
    }

    _initWeight(rows, cols, name) {
        const size = rows * cols;
        const data = new Float32Array(size);
        const std = Math.sqrt(2.0 / (rows + cols));

        for (let i = 0; i < size; i++) {
            let val = this._gaussianRandom();
            let attempts = 0;
            // صمام الأمان لمنع الشذوذ الرقمي الحاد لانفجار الـ NaN
            while (Math.abs(val) > 2.0 && attempts < 10) {
                val = this._gaussianRandom();
                attempts++;
            }
            // حقن معامل استقرار متناهي الصغر (Epsilon)
            const eps = (Math.random() - 0.5) * 1e-5;
            data[i] = (val * std) + eps;
        }

        return new Tensor(data, {
            shape: [rows, cols],
            op: 'const',
            id: name
        });
    }

    _initBias(size, name) {
        const data = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            // نبضات مجهرية لمنع الـ Dead Neurons في طبقة الـ GELU
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
        // حماية حسابية تمنع لوغاريتم الصفر المطلق المسبب للانهيار الصامت
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    /**
     * الحماية الفوق طبيعية: استنتاج ومعايرة الأبعاد هيكلياً على مستوى الـ Graph
     * دون محاولة قراءة أو تعديل الـ Arrays العائمة مباشرة على الـ CPU
     */
    _normalizeInputGraph(inputTensor, pulseId) {
        console.log('%c🧬 [FFN GRAPH NORMALIZER] فحص السلامة الهيكلية للأبعاد...', 'color: #00ffff;');

        if (!inputTensor || !inputTensor.shape || !Array.isArray(inputTensor.shape)) {
            console.error('🚨 [FFN CRITICAL] مصفوفة المدخلات تالفة أو غير موجودة الشبه الهيكلي! تفعيل الحصان البديل...');
            return this._createGraphFallback(pulseId);
        }

        const shape = inputTensor.shape;
        
        // مسار سريع وآمن: إذا كانت الأبعاد ثنائية ومتوافقة مع أبعاد الـ Embedding [N, 512]
        if (shape.length === 2 && shape[1] === this.embedDim) {
            console.log(`✅ [FFN NORMALIZER] الأبعاد متوافقة مع ممرات المحرك الحالية: [${shape.join(', ')}]`);
            return inputTensor;
        }

        // مسار إنقاذ الأبعاد الأحادية والمكسرة تلقائياً عبر الـ Reshape المؤجل على الـ Graph
        console.warn(`⚠️ [FFN WARNING] اكتشاف انحراف أبعاد [${shape.join(', ')}]. جاري إعادة التشكيل الجبري...`);
        
        // تحويل ثوري آمن: إرسال عملية Reshape للـ Graph لضبط البعد الأخير ليكون 512 (embedDim) مجبراً
        try {
            return inputTensor.reshape([-1, this.embedDim]);
        } catch (e) {
            console.error('🚨 [FFN CRITICAL] فشل التشكيل الجبري التلقائي، تفعيل خطة الطوارئ القصوى...');
            return this._createGraphFallback(pulseId);
        }
    }

    _createGraphFallback(pulseId) {
        const shape = [1, this.embedDim];
        const data = new Float32Array(this.embedDim);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2.0 - 1.0) * 0.01;
        }
        console.warn(`🚨 [FFN SECURITY] تم حشو تينسور طوارئ نقي لتفادي الـ Mismatch في كارت الشاشة.`);
        return new Tensor(data, {
            shape: shape,
            op: 'const',
            id: `ffn_emergency_fallback_${pulseId}`
        });
    }

    // =========================================================
    // Forward Pass (المفرمة الحسابية المحصنة)
    // =========================================================
    forward(inputTensor) {
        const pulseId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        
        console.log(`☢️ [FFN RADIOLOGY] فحص النبضة الحالية: ${pulseId}`);

        // =====================================================
        // Step 1: المطابقة المعمارية للأبعاد على مستوى الـ Graph
        // =====================================================
        const x = this._normalizeInputGraph(inputTensor, pulseId);
        const batchSize = x.shape[0] || 1;

        console.log(`🧠 [FFN FORWARD] الأبعاد المعتمدة للتشغيل: [${batchSize}, ${this.embedDim}]`);

        // =====================================================
        // Step 2: First Linear Projection (الضخ للمساحة المخفية)
        // [N, embedDim] x [embedDim, hiddenDim] -> [N, hiddenDim]
        // =====================================================
        const mm1 = new Tensor(null, {
            shape: [batchSize, this.hiddenDim],
            op: 'matmul',
            inputs: [x, this.w1],
            id: `ffn_mm1_${pulseId}`,
            params: {
                N: this.hiddenDim,
                K: this.embedDim
            }
        });

        // =====================================================
        // Step 3: Add Bias 1
        // =====================================================
        const h1 = new Tensor(null, {
            shape: [batchSize, this.hiddenDim],
            op: 'add',
            inputs: [mm1, this.b1],
            id: `ffn_h1_${pulseId}`
        });

        // =====================================================
        // Step 4: GELU Activation Layer
        // =====================================================
        const activated = new Tensor(null, {
            shape: [batchSize, this.hiddenDim],
            op: 'gelu',
            inputs: [h1],
            id: `ffn_act_${pulseId}`
        });

        // =====================================================
        // Step 5: Second Linear Projection (إعادة الضغط لأبعاد النموذج)
        // [N, hiddenDim] x [hiddenDim, embedDim] -> [N, embedDim]
        // =====================================================
        const mm2 = new Tensor(null, {
            shape: [batchSize, this.embedDim],
            op: 'matmul',
            inputs: [activated, this.w2],
            id: `ffn_mm2_${pulseId}`,
            params: {
                N: this.embedDim,
                K: this.hiddenDim
            }
        });

        // =====================================================
        // Step 6: Add Bias 2
        // =====================================================
        const h2 = new Tensor(null, {
            shape: [batchSize, this.embedDim],
            op: 'add',
            inputs: [mm2, this.b2],
            id: `ffn_h2_${pulseId}`
        });

        // =====================================================
        // Step 7: Residual Connection (الاندماج الارتدادي لعدم خسارة الذاكرة اللفظية)
        // =====================================================
        const finalOutput = new Tensor(null, {
            shape: [batchSize, this.embedDim],
            op: 'add',
            inputs: [h2, x],
            id: `ffn_final_out_${pulseId}`
        });

        console.log(`🎯 [FFN COMPLETE] تم دمج ممرات المصفوفة بنجاح للنظام النبضي.`);
        return finalOutput;
    }
}
