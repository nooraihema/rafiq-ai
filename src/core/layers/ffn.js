/**
 * src/core/layers/ffn.js
 * الحالة: المفرمة المنطقية (Tracing Version)
 * الوظيفة: تضخيم المعاني وتسجيل العمليات للـ GPU
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;   // 512
        this.hiddenDim = hiddenDim; // 2048
        
        // أوزان الطبقة الأولى والثانية
        this.w1 = this._initWeight(this.embedDim, this.hiddenDim);
        this.w2 = this._initWeight(this.hiddenDim, this.embedDim);

        // انحيازات (Biases) بسيطة
        this.b1 = new Tensor(new Float32Array(this.hiddenDim).fill(0.01), { shape: [1, this.hiddenDim], op: 'const' });
        this.b2 = new Tensor(new Float32Array(this.embedDim).fill(0.01), { shape: [1, this.embedDim], op: 'const' });
    }

    _initWeight(rows, cols) {
        const data = new Float32Array(rows * cols);
        const scale = Math.sqrt(2.0 / rows); 
        for (let i = 0; i < data.length; i++) {
            // استخدام توزيع طبيعي (Box-Muller) لتهيئة أوزان مستقرة
            data[i] = this._boxMuller() * scale;
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
        // 1. التوسع (MatMul + Add) - بنسجل العملية بس
        const h1 = new Tensor(null, {
            shape: [inputTensor.shape[0], this.hiddenDim],
            op: 'matmul_add',
            inputs: [inputTensor, this.w1, this.b1]
        });

        // 2. التنشيط (ReLU)
        const activated = new Tensor(null, {
            shape: h1.shape,
            op: 'relu',
            inputs: [h1]
        });

        // 3. الضغط (MatMul + Add) والعودة لـ 512 بعد
        const h2 = new Tensor(null, {
            shape: [inputTensor.shape[0], this.embedDim],
            op: 'matmul_add',
            inputs: [activated, this.w2, this.b2]
        });

        // 4. الكوبري (Residual Connection)
        // بنجمع المدخل الأصلي مع المخرج عشان نحافظ على تدفق البيانات (Gradient Flow)
        return new Tensor(null, {
            shape: h2.shape,
            op: 'add',
            inputs: [h2, inputTensor]
        });
    }
}
