/**
 * src/core/layers/ffn.js
 * النسخة: المفرمة المنطقية المحدثة (GELU & Pre-Norm Architecture)
 * الوظيفة: معالجة المعلومات العميقة مع ضمان الاستقرار الرياضي.
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;
        this.hiddenDim = hiddenDim;

        // 1. أوزان ثابتة الهوية (Deterministic IDs) لسهولة الحفظ والتحميل
        this.w1 = this._initWeight(embedDim, hiddenDim, 'ffn_w1');
        this.w2 = this._initWeight(hiddenDim, embedDim, 'ffn_w2');

        // 2. انحيازات (Biases) تبدأ من الصفر لعدم تشويه التوزيع في البداية
        this.b1 = new Tensor(new Float32Array(hiddenDim).fill(0.0), { 
            shape: [hiddenDim], 
            op: 'const', 
            id: 'ffn_b1' 
        });
        this.b2 = new Tensor(new Float32Array(embedDim).fill(0.0), { 
            shape: [embedDim], 
            op: 'const', 
            id: 'ffn_b2' 
        });

        // 3. طبقة Layer Normalization خاصة بالـ FFN (Pre-Norm logic)
        this.ln_gamma = new Tensor(new Float32Array(embedDim).fill(1.0), { shape: [embedDim], op: 'const', id: 'ffn_ln_gamma' });
        this.ln_beta = new Tensor(new Float32Array(embedDim).fill(0.0), { shape: [embedDim], op: 'const', id: 'ffn_ln_beta' });
    }

    _initWeight(rows, cols, name) {
        const data = new Float32Array(rows * cols);
        // استخدام Xavier/Glorot Initialization محسّن
        const std = Math.sqrt(2.0 / (rows + cols));
        for (let i = 0; i < data.length; i++) {
            let val = this._gaussianRandom();
            // Truncated Normal (Clamping at 2 std)
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
        /**
         * نظام الـ Pre-Norm: بنعمل Norm قبل العمليات مش بعدها
         * ده بيخلي التدريب أسرع بكتير وأكثر استقراراً
         */

        // 1. Layer Norm (المدخلات لازم تتفلتر الأول)
        const normalizedInput = new Tensor(null, {
            op: 'layer_norm',
            inputs: [inputTensor, this.ln_gamma, this.ln_beta],
            shape: inputTensor.shape
        });

        // 2. التوسع الأول (Linear 1: 512 -> 2048)
        const h1 = new Tensor(null, {
            shape: [inputTensor.shape[0], this.hiddenDim],
            op: 'matmul_add',
            inputs: [normalizedInput, this.w1, this.b1]
        });

        // 3. التنشيط باستخدام GELU (Gaussian Error Linear Unit)
        // أذكى بكتير من ReLU لأنها بتسمح بمرور قيم سالبة بسيطة، مما يمنع "موت النيورونات"
        const activated = new Tensor(null, {
            shape: h1.shape,
            op: 'gelu',
            inputs: [h1]
        });

        // 4. الانكماش الثاني (Linear 2: 2048 -> 512)
        const h2 = new Tensor(null, {
            shape: [inputTensor.shape[0], this.embedDim],
            op: 'matmul_add',
            inputs: [activated, this.w2, this.b2]
        });

        // 5. الكوبري (Residual Connection)
        // بنجمع المخرج مع "المدخل الأصلي" (قبل الـ Norm) لضمان تدفق المعلومات
        return new Tensor(null, {
            shape: inputTensor.shape,
            op: 'add',
            inputs: [h2, inputTensor]
        });
    }
}
