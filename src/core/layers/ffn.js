/**
 * src/core/layers/ffn.js
 * الحالة: المفرمة المنطقية (Clean Architecture)
 * الوظيفة: تضخيم المعاني مع الحفاظ على تسلسل الـ Pipeline للمحرك.
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;   // 512
        this.hiddenDim = hiddenDim; // 2048
        
        this.weights = {
            w1: this._initWeight(this.embedDim, this.hiddenDim),
            w2: this._initWeight(this.hiddenDim, this.embedDim)
        };

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
         * 2. التنشيط (Leaky ReLU)
         * هنا بننادي العملية من الـ Tensor مباشرة عشان الـ Graph ميتكسرش
         * لو كلاس Tensor مفيهوش leakyRelu، استخدم relu() مؤقتاً لحد ما نصلح التنسور
         */
        let activated = x.relu(); 

        /**
         * 3. مرحلة الضغط (Contraction)
         */
        let output = activated.matmul(this.weights.w2).add(this.biases.b2);

        /**
         * 4. الكوبري (Residual)
         */
        return output.add(inputTensor);
    }
}
