/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (Residual Transformer Block)
 * الوظيفة: الربط التسلسلي مع استخدام "الكباري" (Add) لضمان استقرار الإشارة الرقمية.
 */

import { MultiHeadAttention } from './layers/attention.js'; 
import { EmbeddingLayer } from './layers/embedding.js';
import { FeedForward } from './layers/ffn.js';

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        
        // 1. طبقة المعاني (1000 حرف، 512 بُعد)
        this.embedding = new EmbeddingLayer(1000, 512);
        
        // 2. طبقة الانتباه (8 رؤوس)
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });

        // 3. طبقة التفكير (توسيع لـ 2048)
        this.ffn = new FeedForward(512, 2048);
    }

    async run(inputString) {
        // الخطوة 1: تحويل النص لـ Tokens
        const tokens = this._tokenize(inputString);
        
        // الخطوة 2: المعالجة الأولية (X)
        const x = this.embedding.forward(tokens);

        /**
         * الخطوة 3: بلوك الانتباه مع كوبري Residual
         * المنطق: x = x + Attention(x)
         */
        const attentionOutput = this.attention.forward(x);
        const xAfterAttention = x.add(attentionOutput); 

        /**
         * الخطوة 4: بلوك التفكير مع كوبري Residual
         * المنطق: x = x + FFN(x)
         */
        const ffnOutput = this.ffn.forward(xAfterAttention);
        const xFinal = xAfterAttention.add(ffnOutput); 

        // الخطوة 5: بناء خطة التنفيذ من الرسم البياني النهائي (xFinal)
        const plan = this._buildPlan(xFinal);

        // الخطوة 6: حقن بيانات الـ Embedding الأصلية كبداية للمواسير
        if (plan.length > 0) {
            plan[0].inputTensorData = x.data;
        }

        // الخطوة 7: التنفيذ على الـ GPU
        try {
            const resultData = await this.backend.execute(plan);
            return resultData; 
        } catch (err) {
            console.error("[RUNNER ERROR]: Residual pipeline failed", err);
            throw err;
        }
    }

    /**
     * تحويل النص لـ Normalized ASCII
     */
    _tokenize(text) {
        const tokens = new Float32Array(512).fill(0);
        for (let i = 0; i < Math.min(text.length, 512); i++) {
            tokens[i] = text.charCodeAt(i) / 1000.0; 
        }
        return tokens;
    }

    /**
     * ترتيب العمليات للتنفيذ (Topological Sort)
     */
    _buildPlan(tensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;
            
            // زيارة المدخلات أولاً لضمان الترتيب الصحيح
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            // إضافة العملية للخطة إذا لم تكن ثابتة (Constant)
            if (t.op && t.op !== 'const') {
                plan.push({
                    op: t.op,
                    id: t.id,
                    opNode: t,
                    inputTensorData: null 
                });
                visited.add(t.id);
            }
        };

        traverse(tensor);
        return plan;
    }
}
