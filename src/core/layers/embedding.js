/**
 * src/core/layers/embedding.js
 * الحالة: نظام التتبع (Tracing Compatible)
 * الوظيفة: إنشاء "نود" في الرسم البياني لعملية الـ Embedding لتنفيذها على الـ GPU.
 */

import { Tensor } from '../tensor.js';

export class Embedding {
    constructor(vocabSize, embedDim) {
        this.vocabSize = vocabSize;
        this.embedDim = embedDim;
        
        // الأوزان: مصفوفة [القاموس × الأبعاد]
        this.weights = this._initWeights();
    }

    _initWeights() {
        const size = this.vocabSize * this.embedDim;
        const data = new Float32Array(size);
        const scale = Math.sqrt(2.0 / this.embedDim);
        
        // تعبئة الأوزان مبدئياً بقيم عشوائية منظمة (Xavier Initialization)
        for (let i = 0; i < size; i++) {
            data[i] = (Math.random() - 0.5) * scale;
        }
        // نحدد العملية كـ 'const' لأنها بيانات ثابتة (الأوزان)
        return new Tensor(data, { shape: [this.vocabSize, this.embedDim], op: 'const' });
    }

    /**
     * @param {Uint32Array | Tensor} tokenIds - المعرفات
     */
    forward(tokenIds) {
        // إذا كانت المدخلات مصفوفة عادية، نحولها لتنسور أولاً
        const inputTensor = (tokenIds instanceof Tensor) ? tokenIds : 
            new Tensor(new Float32Array(tokenIds), { shape: [tokenIds.length], op: 'input' });

        // بدلاً من الحساب هنا، نرجع تنسور جديد يمثل "وعداً" بالعملية
        // هذا هو الـ Tracing الذي تكلمنا عنه في الـ Runner
        return new Tensor(null, { 
            shape: [inputTensor.shape[0], this.embedDim], 
            op: 'embedding', 
            inputs: [inputTensor, this.weights] // نربط المدخلات بالأوزان
        });
    }
}
