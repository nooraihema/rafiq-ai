import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';
import { Tokenizer } from './tokenizer.js'; 

export class AkashaRunner {
    constructor(engine, vocabSize = 2526) {
        this.engine = engine; 
        console.log(`%c[Akasha Runner] Hooked to Unified Engine. Vocab Size: ${vocabSize}`, "color: #00ff41; font-weight: bold;");
        this.tokenizer = new Tokenizer(vocabSize);
        this.embedding = new Embedding(vocabSize, 512, 128); 
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);
        this._registerLayerWeights(this.embedding);
        this._registerLayerWeights(this.attention);
        this._registerLayerWeights(this.ffn);
    }

    _registerLayerWeights(layer) {
        for (let key in layer) {
            if (layer[key] && layer[key] instanceof Tensor && layer[key].op === 'const') {
                const tensor = layer[key];
                // تأكد أن القيم ليست أصفاراً عند التسجيل
                if (tensor.data.every(v => v === 0)) {
                    console.warn(`⚠️ [Matrix Warning] ${tensor.id} مسجلة كأصفار! قد تحتاج لإعادة تهيئة الوزن.`);
                }
                this.engine.backend._getOrCreateBuffer(tensor.id, tensor.data.length);
                this.engine.device.queue.writeBuffer(
                    this.engine.backend.tensorBuffers.get(tensor.id), 0, tensor.data
                );
                console.log(`[Engine Matrix] Registered weight: ${tensor.id} into Unified Backend.`);
            }
        }
    }

    async run(input) {
        try {
            let tokenIds = [];
            if (typeof input === 'string') {
                tokenIds = Array.from(this.tokenizer.encode(input));
            } else if (input.data) {
                tokenIds = Array.from(input.data);
            }

            if (tokenIds.length === 0) return new Float32Array(512).fill(0);

            // 🎯 الإصلاح الجذري: لا تحول الـ IDs إلى Float32 لأن الـ Embedding يحتاج أرقام صحيحة (Indices)
            // احتفظ بـ Int32Array للـ inputTensor
            const inputTensor = new Tensor(new Int32Array(tokenIds), { 
                shape: [1, tokenIds.length], 
                op: 'input',
                id: 'input_ids'
            });

            // ⚡ تمرير مباشر للـ Embedding
            // نمرر الـ Tensor كما هو، والـ Embedding.forward يجب أن يتعامل مع الـ Int32Array
            let x = this.embedding.forward(inputTensor);
            
            // تحقق من الـ Embedding: إذا كان الناتج صفراً، هناك مشكلة في اتصاله بأوزان الـ Embedding
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            const finalData = await this.engine.compute(x);
            return finalData;
        } catch (err) {
            console.error("[Akasha Runner Critical Error]:", err);
            throw err;
        }
    }
}
