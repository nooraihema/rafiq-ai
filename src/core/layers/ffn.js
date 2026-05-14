/**
 * src/core/layers/ffn.js
 * الحالة: المفرمة المنطقية (Deep Logic Layer)
 * الوظيفة: تضخيم الفروق الدقيقة بين المعاني وإعادة دمجها.
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;   // 512
        this.hiddenDim = hiddenDim; // 2048
        
        // الأوزان مع Initialization محسّن (He Initialization)
        this.weights = {
            w1: this._initWeight(this.embedDim, this.hiddenDim),
            w2: this._initWeight(this.hiddenDim, this.embedDim)
        };

        // إضافة انحيازات (Biases) عشان ندي مرونة أكبر في اتخاذ القرار الرقمي
        this.biases = {
            b1: new Tensor(new Float32Array(this.hiddenDim).fill(0.01), { shape: [1, this.hiddenDim], op: 'const' }),
            b2: new Tensor(new Float32Array(this.embedDim).fill(0.01), { shape: [1, this.embedDim], op: 'const' })
        };
    }

    _initWeight(rows, cols) {
        const data = new Float32Array(rows * cols);
        const scale = Math.sqrt(2.0 / rows); 
        for (let i = 0; i < data.length; i++) {
            // توزيع "نورمال" لضمان عدم تكتل الأرقام في البداية
            data[i] = (this._boxMuller() * scale);
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const' });
    }

    // دالة لتوليد عشوائية أكثر ذكاءً من Math.random العادي
    _boxMuller() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(inputTensor) {
        /**
         * 1. مرحلة التوسع (Expansion)
         * بنضرب في W1 ونجمع الـ Bias عشان نفتح مساحة للـ GPU يحلل 2048 نمط
         */
        let x = inputTensor.matmul(this.weights.w1);
        x = x.add(this.biases.b1);
        
        /**
         * 2. التنشيط (Activation - ReLU)
         * هنا بنرمي أي قيم سالبة (الأفكار غير المنطقية) ونحتفظ بالموجب
         */
        let activated = x.relu(); 

        /**
         * 3. مرحلة الضغط (Contraction)
         * العودة لـ 512 بعد ما حددنا إيه المهم في الـ 2048
         */
        let output = activated.matmul(this.weights.w2);
        output = output.add(this.biases.b2);

        /**
         * 4. الكوبري الأخير (Global Residual Connection)
         * بنجمع المدخل اللي جاي من الـ Attention مع مخرج الـ FFN
         * ده اللي هيخلي "سعاده" تغير الأرقام فعلاً مقارنة بـ "وحده"
         */
        return output.add(inputTensor);
    }
}
