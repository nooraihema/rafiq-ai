/**
 * src/core/layers/ffn.js
 * النسخة: المفرمة المنطقية المحصنة بالإشعاع (GELU & Pre-Norm Architecture)
 * الوظيفة: معالجة المعلومات العميقة مع ضمان الاستقرار الرياضي وتأمين الـ Data Flow.
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;
        this.hiddenDim = hiddenDim;

        this.w1 = this._initWeight(embedDim, hiddenDim, 'ffn_w1');
        this.w2 = this._initWeight(hiddenDim, embedDim, 'ffn_w2');

        this.b1 = new Tensor(new Float32Array(hiddenDim).fill(0.0), { shape: [hiddenDim], op: 'const', id: 'ffn_b1' });
        this.b2 = new Tensor(new Float32Array(embedDim).fill(0.0), { shape: [embedDim], op: 'const', id: 'ffn_b2' });

        this.ln_gamma = new Tensor(new Float32Array(embedDim).fill(1.0), { shape: [embedDim], op: 'const', id: 'ffn_ln_gamma' });
        this.ln_beta = new Tensor(new Float32Array(embedDim).fill(0.0), { shape: [embedDim], op: 'const', id: 'ffn_ln_beta' });
    }

    _initWeight(rows, cols, name) {
        const data = new Float32Array(rows * cols);
        const std = Math.sqrt(2.0 / (rows + cols));
        for (let i = 0; i < data.length; i++) {
            let val = this._gaussianRandom();
            while (Math.abs(val) > 2) val = this._gaussianRandom();
            data[i] = val * std;
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const', id: name });
    }

    _gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(inputTensor) {
        // ☢️ [رادار الفحص الإشعاعي - محطة الدخول للـ FFN]
        console.log("☢️ [FFN RADIOLOGY] فحص المدخل النبضي الحرج:");
        console.log("-> Tensor Object:", inputTensor);
        console.log("-> Shape Info:", inputTensor ? inputTensor.shape : "UNDEFINED! THE TENSOR IS DEAD");

        // صمام أمان حديدي: لو المدخل باظ من الـ Attention، بننقذه بأبعاد افتراضية عشان الكود ما ينهارش صامت
        const safeShape = (inputTensor && inputTensor.shape) ? [...inputTensor.shape] : [2, 512];
        
        if (!inputTensor || !inputTensor.shape) {
            console.error("🚨 [FFN CRITICAL] تحذير إشعاعي: الـ inputTensor جاي من غير أبعاد أو ممسوح! تم التفعيل التلقائي لصمام الأمان.");
            inputTensor = new Tensor(new Float32Array(safeShape[0] * safeShape[1]).fill(0.0), { 
                shape: safeShape, 
                op: 'const', 
                id: 'ffn_fallback_input' 
            });
        }

        // 1. Layer Norm (Pre-Norm)
        const normalizedInput = new Tensor(null, {
            op: 'layer_norm',
            inputs: [inputTensor, this.ln_gamma, this.ln_beta],
            shape: [...safeShape],
            id: `ffn_ln_${Date.now()}`
        });

        // 2. التوسع الأول: تفكيك الـ matmul_add لخطوتين شرعيتين يفهمهم الـ OpNode والـ Engine
        const mm1 = new Tensor(null, {
            shape: [safeShape[0], this.hiddenDim],
            op: 'matmul',
            inputs: [normalizedInput, this.w1],
            id: `ffn_mm1_${Date.now()}`
        });

        const h1 = new Tensor(null, {
            shape: [safeShape[0], this.hiddenDim],
            op: 'add',
            inputs: [mm1, this.b1],
            id: `ffn_h1_${Date.now()}`
        });

        // 3. التنشيط باستخدام GELU
        const activated = new Tensor(null, {
            shape: [...h1.shape],
            op: 'gelu',
            inputs: [h1],
            id: `ffn_act_${Date.now()}`
        });

        // 4. الانكماش الثاني: تفكيك الـ matmul_add لـ خطوات صريحة
        const mm2 = new Tensor(null, {
            shape: [safeShape[0], this.embedDim],
            op: 'matmul',
            inputs: [activated, this.w2],
            id: `ffn_mm2_${Date.now()}`
        });

        const h2 = new Tensor(null, {
            shape: [safeShape[0], this.embedDim],
            op: 'add',
            inputs: [mm2, this.b2],
            id: `ffn_h2_${Date.now()}`
        });

        // 5. Residual Connection
        const finalOutput = new Tensor(null, {
            shape: [...safeShape],
            op: 'add',
            inputs: [h2, inputTensor],
            id: `ffn_final_out_${Date.now()}`
        });

        return finalOutput;
    }
}
