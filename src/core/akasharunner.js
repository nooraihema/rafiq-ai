/**
 * src/core/akashaRunner.js
 * الـ Runner الرئيسي المحصن والمحدث ديناميكياً لمحرك أكاشا (رفيق-AI)
 * تم سحق القيمة الثابتة (6) وإجبار النظام على الطول الفعلي للتوكنز لمنع الـ DEAD_EMPTY_BUFFER
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';
import { Tokenizer } from './tokenizer.js'; 
import { SignalSanitizer } from './layers/sanitizer.js';

export class AkashaRunner {
    constructor(engine, vocabSize = 2526) {
        this.engine = engine; 
        this.embedDim = 512; // التثبيت الهندسي لـ رفيق-AI
        
        this.tokenizer = new Tokenizer(vocabSize);
        this.embedding = new Embedding(vocabSize, this.embedDim, 128); 
        this.attention = new MultiHeadAttention({ embedDim: this.embedDim, numHeads: 8 });
        this.ffn = new FeedForward(this.embedDim, 2048);
        
        // 🛡️ تهيئة صمام الأمان والنبض الحي
        this.sanitizer = new SignalSanitizer(this.embedDim);

        this._registerLayerWeights(this.embedding);
        this._registerLayerWeights(this.attention);
        this._registerLayerWeights(this.ffn);
    }

    _registerLayerWeights(layer) {
        for (let key in layer) {
            if (layer[key] && layer[key] instanceof Tensor && layer[key].op === 'const') {
                const tensor = layer[key];
                
                // تأمين البفر في الـ VRAM بمحاذاة 16 بايت صريحة لضمان سلامة كارت الشاشة
                const alignedLength = Math.ceil(tensor.data.length / 4) * 4;
                this.engine.backend._getOrCreateBuffer(tensor.id, alignedLength);
                
                this.engine.device.queue.writeBuffer(
                    this.engine.backend.tensorBuffers.get(tensor.id), 0, tensor.data
                );
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

            const seqLen = tokenIds.length;
            if (seqLen === 0) return new Float32Array(this.embedDim).fill(0);

            // 🎯 تأمين الـ Tensor بأبعاد ديناميكية حقيقية [seqLen, 512] في المراحل اللاحقة
            // تحويل القيم إلى Float32Array لأن بعض كروت الشاشة القديمة ترفض عمل Embedding Lookup بـ Int32 مباشر في الـ Storage Buffers
            const floatTokens = new Float32Array(tokenIds);
            const inputTensor = new Tensor(floatTokens, { 
                shape: [seqLen, 1], 
                op: 'input',
                id: 'input_ids'
            });

            // 1. معالجة الـ Embedding - وإجبار المصفوفة الناتجة على أخذ أبعاد [seqLen, 512]
            let x = this.embedding.forward(inputTensor);
            x.shape = [seqLen, this.embedDim]; 

            // 2. معالجة الـ Attention مع تمرير البارامترات الديناميكية لتحديث الـ Workgroups
            x = this.attention.forward(x);
            x.shape = [seqLen, this.embedDim];

            // 🔥 [منطقة الحقن الإشعاعي الحرج]: تطهير مخرج الـ Attention بالأبعاد الحقيقية الجديدة
            x = this.sanitizer.sanitize(x, "attn_to_ffn_gate");
            x.shape = [seqLen, this.embedDim];

            // 3. معالجة الـ FFN (المفرمة المنطقية)
            x = this.ffn.forward(x);
            x.shape = [seqLen, this.embedDim];

            // بناء خطة التنفيذ الحسابي (Plan) وإرسالها للـ الـ WebGPUBackend
            // تأكيد تدمير المتغير الثابت القديم (6)
            const finalData = await this.engine.compute(x);
            
            return finalData;

        } catch (err) {
            console.error("🚨 انهيار أثناء تشغيل بايبلاين أكاشا:", err);
            throw err;
        }
    }
}
