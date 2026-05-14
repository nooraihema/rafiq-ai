/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (Clean Pipeline)
 * الوظيفة: إدارة تدفق البيانات من التوكنز وحتى مخرج الـ GPU.
 */

import { MultiHeadAttention } from './layers/attention.js'; 
import { Embedding } from './layers/embedding.js'; // تعديل الاسم ليتوافق مع الملف الجديد
import { FeedForward } from './layers/ffn.js';

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        
        // 1. طبقة المعاني (قاموس 5000 كلمة، 512 بُعد)
        // تأكد أن vocabSize هنا يطابق الـ Tokenizer في index.html
        this.embedding = new Embedding(5000, 512);
        
        // 2. طبقة الانتباه (8 رؤوس)
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });

        // 3. طبقة التفكير (توسيع لـ 2048)
        this.ffn = new FeedForward(512, 2048);
    }

    /**
     * @param {Uint32Array} tokenIds - مصفوفة المعرفات القادمة من الـ Tokenizer
     */
    async run(tokenIds) {
        // الخطوة 1: استخراج المتجهات من الـ Embedding
        // الـ x هنا شايل هوية الكلمات الحقيقية
        const x = this.embedding.forward(tokenIds);

        /**
         * الخطوة 2: بلوك الانتباه
         * الكوبري (Residual) موجود بالفعل جوه attention.forward
         */
        const xAfterAttention = this.attention.forward(x);

        /**
         * الخطوة 3: بلوك التفكير (FFN)
         * الكوبري (Residual) موجود بالفعل جوه ffn.forward
         */
        const xFinal = this.ffn.forward(xAfterAttention);

        // الخطوة 4: بناء خطة التنفيذ (الرسم البياني للعمليات)
        const plan = this._buildPlan(xFinal);

        // الخطوة 5: التنفيذ على الـ GPU/CPU Backend
        try {
            const resultData = await this.backend.execute(plan);
            return resultData; 
        } catch (err) {
            console.error("[RUNNER ERROR]: Pipeline execution failed", err);
            throw err;
        }
    }

    /**
     * ترتيب العمليات للتنفيذ (Topological Sort)
     * بيحول شجرة التنسورات لخطة عمل واضحة للـ WebGPU
     */
    _buildPlan(tensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;
            
            // زيارة المدخلات (الاعتمادات) أولاً
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            // إضافة العملية للخطة
            if (t.op && t.op !== 'const') {
                plan.push({
                    op: t.op,
                    id: t.id,
                    shape: t.shape,
                    data: t.data, // البيانات الثابتة (مثل الأوزان)
                    inputs: t.inputs // التنسورات المعتمدة عليها
                });
                visited.add(t.id);
            }
        };

        traverse(tensor);
        return plan;
    }
}
