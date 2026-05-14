/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المتكامل (Full Semantic Orchestrator)
 * الوظيفة: الربط بين الـ Embedding (المعاني) والـ Attention (السياق) والتنفيذ الفولاذي.
 */

import { Tensor } from './tensor.js';
import { MultiHeadAttention } from './layers/attention.js'; 
import { EmbeddingLayer } from './layers/embedding.js'; // استيراد طبقة المعاني الجديدة

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        
        // 1. تعريف طبقة المعاني (قاموس يضم 1000 حرف، وكل حرف له 512 بُعد)
        this.embedding = new EmbeddingLayer(1000, 512);
        
        // 2. تعريف طبقة الانتباه (تستقبل الأبعاد الـ 512 وتعالجها بـ 8 رؤوس)
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
    }

    async run(inputString) {
        // الخطوة 1: تحويل النص لـ Tokens خام (ASCII)
        const tokens = this._tokenize(inputString);
        
        // الخطوة 2: تحويل الـ Tokens إلى "متجهات معاني" (Embedding)
        // النتيجة هنا هي Tensor يحتوي على معلومات غنية عن كل حرف
        const embeddedTensor = this.embedding.forward(tokens);

        // الخطوة 3: تمرير المتجهات الغنية عبر الـ Attention لدمج السياق
        const contextualGraph = this.attention.forward(embeddedTensor);

        // الخطوة 4: بناء خطة التنفيذ من الرسم البياني المتكامل
        const plan = this._buildPlan(contextualGraph);

        // الخطوة 5: حقن البيانات المعالجة في الخطة ليتم شحنها للـ GPU
        if (plan.length > 0) {
            // نرسل الـ Data الناتجة من الـ Embedding كأول مدخل للـ Backend
            plan[0].inputTensorData = embeddedTensor.data;
        }

        // الخطوة 6: التنفيذ النهائي على محرك الـ WebGPU الفولاذي
        try {
            const resultData = await this.backend.execute(plan);
            return resultData; 
        } catch (err) {
            console.error("[RUNNER ERROR]: Semantic pipeline failed", err);
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
     * تحويل الشجرة لقائمة عمليات مرتبة (Topological Sort)
     */
    _buildPlan(tensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;
            
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            if (t.op && t.op !== 'const') {
                plan.push({
                    op: t.op,
                    id: t.id,
                    shape: t.shape,
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
