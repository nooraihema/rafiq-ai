/**
 * src/core/akasharunner.js
 * الحالة: المايسترو الموحد والمصحح (Unified Pipeline)
 * الإصلاح: دمج الـ Runner مع الـ Engine لضمان تحديث الذاكرة ومنع الأصفار
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(engine, vocabSize = 2526) {
        // نربط الـ Runner بالـ Engine الموحد اللي جاي من بره ومبنعملش Backend جديد!
        this.engine = engine; 
        
        console.log(`%c[Akasha Runner] Hooked to Unified Engine. Vocab Size: ${vocabSize}`, "color: #00ff41; font-weight: bold;");

        // تهيئة الطبقات
        this.embedding = new Embedding(vocabSize, 512, 128); 
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);

        // تسجيل أوزان الطبقات جوه الـ Backend الموحد فوراً عشان ميتعملهاش overwrite بأصفار
        this._registerLayerWeights(this.embedding);
        this._registerLayerWeights(this.attention);
        this._registerLayerWeights(this.ffn);
    }

    /**
     * دالة لتسجيل أوزان الطبقات الحية جوه الـ Backend الموحد للـ Engine
     */
    _registerLayerWeights(layer) {
        for (let key in layer) {
            if (layer[key] && layer[key] instanceof Tensor && layer[key].op === 'const') {
                const tensor = layer[key];
                // نكتب الأوزان اللي اتولدت في الـ Embedding جوه الـ Backend الموحد فوراً
                this.engine.backend._getOrCreateBuffer(tensor.id, tensor.data.length);
                this.engine.device.queue.writeBuffer(
                    this.engine.backend.tensorBuffers.get(tensor.id), 
                    0, 
                    tensor.data
                );
                console.log(`[Engine Matrix] Registered weight: ${tensor.id} into Unified Backend.`);
            }
        }
    }

    async run(tokenIds) {
        try {
            if (tokenIds.length === 0) return new Float32Array(this.engine.backend._calculateSize([2526])).fill(0);

            // 1. تحويل التوكنز لـ Tensor مدخلات
            const inputTensor = new Tensor(new Float32Array(tokenIds), { 
                shape: [tokenIds.length], 
                op: 'input',
                id: 'input_ids'
            });

            // تسجيل الـ Input يدوياً في الـ Backend الموحد
            this.engine.backend._getOrCreateBuffer(inputTensor.id, inputTensor.data.length);
            this.engine.device.queue.writeBuffer(
                this.engine.backend.tensorBuffers.get(inputTensor.id), 
                0, 
                inputTensor.data
            );

            // 2. تتبع العمليات وبناء الـ Graph الحقيقي على الـ Engine
            let x = this.embedding.forward(inputTensor);
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 3. اللحظة الحاسمة: نخلي الـ Engine يحسب الـ Tensor النهائي!
            // دالة compute هتعمل trace وتحسب الداتا وتحدث الـ Tensor وترجع مصفوفة حية
            const finalData = await this.engine.compute(x);

            return finalData;
        } catch (err) {
            console.error("[Akasha Runner Critical Error]:", err);
            throw err;
        }
    }
}
