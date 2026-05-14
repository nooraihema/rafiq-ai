/**
 * src/core/layers/ffn.js
 * الوظيفة: معالجة البيانات بعمق (Position-wise Feed-Forward Network)
 * الحالة: طبقة التفكير المنطقي
 */

import { Tensor } from '../tensor.js';

export class FeedForward {
    constructor(embedDim, hiddenDim) {
        this.embedDim = embedDim;   // 512
        this.hiddenDim = hiddenDim; // غالباً 2048 (لتوسيع أفق التفكير)
        
        // الأوزان: من 512 لـ 2048 ثم العودة لـ 512
        this.weights = {
            w1: this._initWeight(embedDim, hiddenDim),
            w2: this._initWeight(hiddenDim, embedDim)
        };
    }

    _initWeight(rows, cols) {
        const data = new Float32Array(rows * cols);
        const scale = Math.sqrt(2.0 / rows); // He Initialization
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * scale;
        }
        return new Tensor(data, { shape: [rows, cols], op: 'const' });
    }

    forward(inputTensor) {
        // 1. التوسع (Expansion): تكبير الرؤية لـ 2048 بُعد
        const x = inputTensor.matmul(this.weights.w1);
        
        // 2. دالة التنشيط (ReLU): كسر الخطية واتخاذ قرار
        // ده الجزء اللي بيخلي المحرك يقول "دي سعادة مش وحدة"
        const activated = x.relu(); 

        // 3. الضغط (Contraction): العودة للأبعاد الأصلية
        return activated.matmul(this.weights.w2);
    }
}
