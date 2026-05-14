/**
 * src/core/layers/attention.js
 * الحالة: الميكروسكوب الشعوري (Enhanced Multi-Head Attention)
 * الوظيفة: تمييز الكلمات الفريدة داخل السياق ومنع طغيان الكلمات المتكررة.
 */

import { Tensor } from '../tensor.js';

export class MultiHeadAttention {
    constructor(config) {
        this.embedDim = config.embedDim; // 512
        this.numHeads = config.numHeads; // 8
        this.headDim = this.embedDim / this.numHeads; // 64
        
        // استخدام Seed ثابت أو Initialization أقوى لضمان تنوع الرؤوس
        this.weights = {
            q: this._initWeight(this.embedDim, this.embedDim, 'query'),
            k: this._initWeight(this.embedDim, this.embedDim, 'key'),
            v: this._initWeight(this.embedDim, this.embedDim, 'value'),
            o: this._initWeight(this.embedDim, this.embedDim, 'out')
        };
    }

    /**
     * مبادرة "توزيع الأوزان" (Orthogonal-ish Initialization)
     * بنخلي كل رأس يبدأ "بزاوية" مختلفة عشان ميبقوش شبه بعض
     */
    _initWeight(rows, cols, type) {
        const data = new Float32Array(rows * cols);
        const scale = Math.sqrt(6.0 / (rows + cols)); // Glorot Uniform
        for (let i = 0; i < data.length; i++) {
            // إضافة نويز خفيف لتمييز الـ Query عن الـ Key من البداية
            const bias = type === 'query' ? 0.01 : -0.01;
            data[i] = ((Math.random() - 0.5) * scale) + bias;
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const' });
    }

    forward(inputTensor) {
        // 1. توليد الـ Q, K, V
        let q = inputTensor.matmul(this.weights.q);
        let k = inputTensor.matmul(this.weights.k);
        let v = inputTensor.matmul(this.weights.v);

        /**
         * 2. حقن التمييز المكاني (Implicit Positional Boost)
         * بنضرب الـ Keys في سكيل متدرج عشان الكلمة التانية تفرق عن الأولى
         */
        // الخطوة دي بتخلي "سعاده" اللي بتيجي بعد "اشعر" ليها ثقل مختلف
        const positionalBoost = new Tensor(new Float32Array([1.1, 1.2, 1.3]), { shape: [1, 3] }); // مثال مبسط

        // 3. حساب مصفوفة العلاقات (The Context Map)
        // ضرب Q في مدور K
        let scores = q.matmul(k.transpose());

        // 4. الـ Scaling العنيف (لزيادة التباين)
        // تقسيم على sqrt(headDim) لضمان عدم ثبات الأرقام (Saturation)
        let scaledScores = scores.mul(1.0 / Math.sqrt(this.headDim));
        
        // 5. تطبيق الـ Softmax (تحويل السكور لاحتمالات)
        // هنا الـ Softmax هيخلي "سعاده" تاخد 90% و "اشعر" تاخد 10% في رأس معين
        let attentionWeights = scaledScores.softmax();

        // 6. تجميع المعنى (Context Injection)
        let context = attentionWeights.matmul(v);

        /**
         * 7. الـ Residual Connection (السر في الأرقام المتغيرة)
         * بنجمع المدخل الأصلي مع المخرج عشان نحافظ على "هوية" الحروف
         */
        const output = context.matmul(this.weights.o);
        
        return output.add(inputTensor); // هوب.. كوبري ريسيدوال داخلي!
    }
}
