/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (Tracing Pipeline) - النسخة المصححة
 * الإصلاح: ضمان إدراج الأوزان والثوابت داخل خطة التنفيذ.
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js'; // تأكد من استيراد التنسور

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        
        // تعريف الطبقات
        this.embedding = new Embedding(5000, 512);
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);
    }

    async run(tokenIds) {
        try {
            // 1. تحويل الـ Token IDs لتنسور أولي (Input Entry Point)
            const inputTensor = new Tensor(new Float32Array(tokenIds), { 
                shape: [tokenIds.length], 
                op: 'const' 
            });

            // 2. تسجيل العمليات (Tracing)
            let x = this.embedding.forward(inputTensor);
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 3. بناء خطة التنفيذ الشاملة
            const plan = this._buildPlan(x);

            // 4. التنفيذ على الـ Backend
            return await this.backend.execute(plan);
        } catch (err) {
            console.error("[RUNNER ERROR]:", err);
            throw err;
        }
    }

    /**
     * بناء الخطة مع ضمان سحب كل الأوزان المرتبطة بالعمليات
     */
    _buildPlan(lastTensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;

            // زيارة المدخلات أولاً (البيانات أو الأوزان)
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            // إضافة العقدة للخطة مع التأكد من وجود البيانات للعمليات الثابتة
            plan.push({
                op: t.op,
                id: t.id,
                shape: t.shape,
                data: t.data, // دي اللي بتشيل الأوزان الفعلية
                inputIds: t.inputs ? t.inputs.map(i => i.id) : []
            });
            
            visited.add(t.id);
        };

        traverse(lastTensor);
        return plan;
    }
}
