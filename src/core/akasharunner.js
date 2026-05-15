/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (Tracing & Params Pipeline)
 * الوظيفة: تجميع الرسم البياني (Graph) وضمان وصول الأوزان والبارامترات للـ GPU.
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        
        // إعداد الطبقات (الأبعاد دي لازم تطابق اللي في الـ Backend)
        this.embedding = new Embedding(5000, 512, 128); // maxSeqLen = 128 للتوافق مع الـ Shader
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);
    }

    async run(tokenIds) {
        try {
            // 1. نقطة الدخول: تحويل التوكنز لتنسور مدخلات
            // الـ ID هنا ثابت 'input_ids' عشان الـ Backend ميتوهش
            const inputTensor = new Tensor(new Float32Array(tokenIds), { 
                shape: [tokenIds.length], 
                op: 'input',
                id: 'input_ids'
            });

            // 2. تسجيل العمليات (Tracing Mode)
            // العمليات دي مش بتنفذ حسابات، هي بتبني شجرة (Graph)
            let x = this.embedding.forward(inputTensor);
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 3. بناء خطة التنفيذ (Linearizing the Graph)
            const plan = this._buildPlan(x);

            // 4. إرسال الخطة للـ Backend (اللحظة الحاسمة)
            const result = await this.backend.execute(plan);

            // 5. Softmax نهائي أو Argmax لو عايز تطلع التوكن فوراً
            return result;
        } catch (err) {
            console.error("[Akasha Runner Error]:", err);
            throw err;
        }
    }

    /**
     * بناء الخطة مع دعم الـ Metadata والـ Params
     */
    _buildPlan(lastTensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;

            // البدء بالمدخلات (Depth-First Search) لضمان ترتيب الـ Buffers
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            // تجهيز العقدة بكل تفاصيلها
            const step = {
                op: t.op,
                id: t.id,
                shape: t.shape,
                data: t.data,      // الأوزان الفعلية (في حالة الـ const)
                params: t.params || {}, // البارامترات (Scale, Causal Mask, etc.)
                inputIds: t.inputs ? t.inputs.map(i => i.id) : []
            };

            plan.push(step);
            visited.add(t.id);
        };

        traverse(lastTensor);
        return plan;
    }
}
