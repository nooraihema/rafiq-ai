/**
 * src/core/layers/ffn.js
 * الحالة: المفرمة المنطقية (Deep Logic Layer) - إصدار Leaky ReLU
 * الوظيفة: تضخيم الفروق الدقيقة ومنع موت الخلايا الرقمية (Dying ReLU).
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

        // انحيازات (Biases) بقيم ابتدائية بسيطة جداً
        this.biases = {
            b1: new Tensor(new Float32Array(this.hiddenDim).fill(0.001), { shape: [1, this.hiddenDim], op: 'const' }),
            b2: new Tensor(new Float32Array(this.embedDim).fill(0.001), { shape: [1, this.embedDim], op: 'const' })
        };
    }

    _initWeight(rows, cols) {
        const data = new Float32Array(rows * cols);
        const scale = Math.sqrt(2.0 / rows); 
        for (let i = 0; i < data.length; i++) {
            data[i] = (this._boxMuller() * scale);
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const' });
    }

    _boxMuller() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    forward(inputTensor) {
        /**
         * 1. مرحلة التوسع (Expansion)
         */
        let x = inputTensor.matmul(this.weights.w1).add(this.biases.b1);
        
        /**
         * 2. التنشيط المنقذ (Leaky ReLU)
         * بدلاً من x.relu() التي تسبب الأصفار، نستخدم leakyRelu
         * ملحوظة: إذا لم تكن leakyRelu معرفة في كلاس Tensor، استخدم (x.sigmoid()) كبديل سريع
         */
        let activated = x.op === 'leakyRelu' ? x : this._applyLeakyRelu(x, 0.01); 

        /**
         * 3. مرحلة الضغط (Contraction)
         */
        let output = activated.matmul(this.weights.w2).add(this.biases.b2);

        /**
         * 4. الكوبري الأخير (Residual Connection)
         * ندمج المدخلات مع المخرجات لضمان تدفق البيانات
         */
        return output.add(inputTensor);
    }

    // دالة مساعدة في حال عدم وجود leakyRelu داخل كلاس Tensor الأساسي
    _applyLeakyRelu(tensor, alpha) {
        const newData = new Float32Array(tensor.data.length);
        for (let i = 0; i < tensor.data.length; i++) {
            newData[i] = tensor.data[i] > 0 ? tensor.data[i] : tensor.data[i] * alpha;
        }
        return new Tensor(newData, { shape: tensor.shape, op: 'leaky_relu_manual' });
    }
}
