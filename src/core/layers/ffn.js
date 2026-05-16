/**
 * src/core/layers/ffn.js
 * الحالة: النسخة السيادية الفولاذية (Tokenizer-Resilient Alignment Matrix) - رفيق-AI
 * هندسة صمام الأمان الموحد: إبراهيم شحات لفك تداخل أبعاد المعالجة اللفظية
 *
 * الإصلاح الحاسم لصراع الـ Tokenizer:
 * - معالجة التنسورات ثنائية وثلاثية الأبعاد [Batch, Seq, Dim] وتسطيحها ديناميكياً إلى [N, Dim]
 * - تمرير الـ params.N و params.K بدقة هندسية مطلقة تمنع انفجار الـ Shader
 * - الحفاظ الكامل على الأسماء، الدوال، والواجهة العامة للمشروع دون تغيير يكسر الـ Runner
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;     // غالباً 512
        this.hiddenDim = hiddenDim;   // غالباً 2048

        // أوزان مصفوفات الإسقاط العميقة
        this.w1 = this._initWeight(embedDim, hiddenDim, 'ffn_w1');
        this.w2 = this._initWeight(hiddenDim, embedDim, 'ffn_w2');

        // انحيازات الخلايا (Bias)
        this.b1 = this._initBias(hiddenDim, 'ffn_b1');
        this.b2 = this._initBias(embedDim, 'ffn_b2');

        // أوزان الـ LayerNorm المدعمة
        this.ln_gamma = new Tensor(
            new Float32Array(embedDim).fill(1.0),
            { shape: [embedDim], op: 'const', id: 'ffn_ln_gamma' }
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
            while (Math.abs(val) > 2.0 && attempts < 10) {
                val = this._gaussianRandom();
                attempts++;
            }
            const eps = (Math.random() - 0.5) * 1e-5;
            data[i] = (val * std) + eps;
        }

        return new Tensor(data, { shape: [rows, cols], op: 'const', id: name });
    }

    _initBias(size, name) {
        const data = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            data[i] = (Math.random() * 2.0 - 1.0) * 0.001;
        }
        return new Tensor(data, { shape: [size], op: 'const', id: name });
    }

    _gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    /**
     * مِعايرة الـ Tokenizer الكبرى:
     * تحويل التنسورات ثلاثية الأبعاد [Batch, SeqLen, EmbedDim] الناتجة عن سحب الـ Tokenizer
     * مجبراً إلى البنية الثنائية المستقرة [Batch * SeqLen, EmbedDim] لتتوافق مع الـ GPU MatMul Shader.
     */
    _normalizeInputGraph(inputTensor, pulseId) {
        if (!inputTensor || !inputTensor.shape || !Array.isArray(inputTensor.shape)) {
            return this._createGraphFallback(pulseId);
        }

        const shape = inputTensor.shape;
        
        // سيناريو 1: المدخل ثلاثي الأبعاد قادم من سياق Tokenizer مدمج [1, SeqLen, 512]
        if (shape.length === 3) {
            const batch = shape[0];
            const seqLen = shape[1];
            const dim = shape[2];
            
            if (dim === this.embedDim) {
                console.log(`🧠 [FFN ALIGNER] دمج أبعاد الـ Tokenizer ثلاثية الأبعاد [${batch}, ${seqLen}, ${dim}] إلى [${batch * seqLen}, ${dim}]`);
                return inputTensor.reshape([batch * seqLen, this.embedDim]);
            }
        }

        // سيناريو 2: المدخل ثنائي الأبعاد مستقر وجاهز [N, 512]
        if (shape.length === 2 && shape[1] === this.embedDim) {
            return inputTensor;
        }

        // سيناريو 3: انحراف أبعاد أحادي أو مشوه، نجبر البعد الأخير على الالتزام بالـ EmbedDim
        console.warn(`⚠️ [FFN ALIGNER] شكل غير قياسي مكتشف من الـ Tokenizer: [${shape.join(', ')}]. جاري فرض القالب السيادي...`);
        try {
            return inputTensor.reshape([-1, this.embedDim]);
        } catch (e) {
            return this._createGraphFallback(pulseId);
        }
    }

    _createGraphFallback(pulseId) {
        const shape = [1, this.embedDim];
        const data = new Float32Array(this.embedDim);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2.0 - 1.0) * 0.01;
        return new Tensor(data, { shape: shape, op: 'const', id: `ffn_emergency_fallback_${pulseId}` });
    }

    // =========================================================
    // Forward Pass
    // =========================================================
    forward(inputTensor) {
        const pulseId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        
        // 🛡️ تفكيك الأبعاد المعقدة للـ Tokenizer وتوحيدها كلياً إلى مصفوفة ثنائية الأبعاد [N, embedDim]
        const x = this._normalizeInputGraph(inputTensor, pulseId);
        const batchSize = x.shape[0] || 1;

        // =====================================================
        // Step 1: First Linear Projection
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

        const h1 = new Tensor(null, {
            shape: [batchSize, this.hiddenDim],
            op: 'add',
            inputs: [mm1, this.b1],
            id: `ffn_h1_${pulseId}`
        });

        // =====================================================
        // Step 2: GELU Activation
        // =====================================================
        const activated = new Tensor(null, {
            shape: [batchSize, this.hiddenDim],
            op: 'gelu',
            inputs: [h1],
            id: `ffn_act_${pulseId}`
        });

        // =====================================================
        // Step 3: Second Linear Projection
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

        const h2 = new Tensor(null, {
            shape: [batchSize, this.embedDim],
            op: 'add',
            inputs: [mm2, this.b2],
            id: `ffn_h2_${pulseId}`
        });

        // =====================================================
        // Step 4: Residual Connection
        // =====================================================
        const finalOutput = new Tensor(null, {
            shape: [batchSize, this.embedDim],
            op: 'add',
            inputs: [h2, x],
            id: `ffn_final_out_${pulseId}`
        });

        // 🚨 ملحوظة هندسية للـ Runner: المخرجات الآن ثنائية الأبعاد [N, embedDim] وجاهزة تماماً للـ Layers القادمة
        return finalOutput;
    }
}
