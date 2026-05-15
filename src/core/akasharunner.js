/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (Tracing Pipeline) - نسخة الإصلاح
 */

// --- المفقود كان هنا: الـ Imports ---
import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        
        // دلوقت المحرك هيعرف يعني إيه Embedding و MultiHeadAttention
        this.embedding = new Embedding(5000, 512);
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);
    }

    /**
     * بناء خريطة العمليات (Computation Graph)
     */
    async run(tokenIds) {
        try {
            // 1. تسجيل عملية الـ Embedding
            let x = this.embedding.forward(tokenIds);

            // 2. تسجيل عمليات الـ Attention والـ FFN
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 3. بناء خطة التنفيذ من آخر Tensor (x)
            const plan = this._buildPlan(x);

            // 4. إرسال الخطة للـ WebGPU Backend
            return await this.backend.execute(plan);
        } catch (err) {
            console.error("[RUNNER ERROR]:", err);
            throw err;
        }
    }

    _buildPlan(tensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            // حماية من التكرار أو التنسورات الفارغة
            if (!t || visited.has(t.id)) return;
            
            // معالجة المدخلات (Dependencies) أولاً لضمان الترتيب الصحيح
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            // إضافة العقدة للخطة
            plan.push({
                op: t.op,
                id: t.id,
                shape: t.shape,
                data: t.data,
                inputIds: t.inputs ? t.inputs.map(i => i.id) : []
            });
            
            visited.add(t.id);
        };

        traverse(tensor);
        return plan;
    }
}
