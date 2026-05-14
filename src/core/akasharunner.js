/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (Deep Transformer Block)
 * الوظيفة: الربط التسلسلي بين المعاني، الانتباه، والتفكير العميق عبر الـ FFN.
 */

import { Tensor } from './tensor.js';
import { MultiHeadAttention } from './layers/attention.js'; 
import { EmbeddingLayer } from './layers/embedding.js';
import { FeedForward } from './layers/ffn.js'; // استيراد طبقة التفكير الجديدة

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        
        // 1. طبقة المعاني (قاموس الحروف المكاني)
        this.embedding = new EmbeddingLayer(1000, 512);
        
        // 2. طبقة الانتباه (تحليل علاقات الكلمات)
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });

        // 3. طبقة الـ FeedForward (المفرمة المنطقية - تكبير لـ 2048 ثم ضغط لـ 512)
        this.ffn = new FeedForward(512, 2048);
    }

    async run(inputString) {
        // الخطوة 1: تحويل النص لـ Tokens
        const tokens = this._tokenize(inputString);
        
        // الخطوة 2: المعالجة المكانية والمعجمية
        const embeddedTensor = this.embedding.forward(tokens);

        // الخطوة 3: تحليل السياق (Attention)
        const attentionOutput = this.attention.forward(embeddedTensor);

        // الخطوة 4: التفكير العميق (FeedForward)
        // هنا بنمرر مخرجات الانتباه لطبقة الـ FFN لكسر التشابهات
        const semanticGraph = this.ffn.forward(attentionOutput);

        // الخطوة 5: بناء خطة التنفيذ الكاملة (الرسم البياني دلوقت بقى أطول وأعقد)
        const plan = this._buildPlan(semanticGraph);

        // الخطوة 6: حقن البيانات في بداية الـ Pipeline
        if (plan.length > 0) {
            plan[0].inputTensorData = embeddedTensor.data;
        }

        // الخطوة 7: التنفيذ على الـ GPU الفولاذي
        try {
            const resultData = await this.backend.execute(plan);
            return resultData; 
        } catch (err) {
            console.error("[RUNNER ERROR]: Deep pipeline execution failed", err);
            throw err;
        }
    }

    _tokenize(text) {
        const tokens = new Float32Array(512).fill(0);
        for (let i = 0; i < Math.min(text.length, 512); i++) {
            tokens[i] = text.charCodeAt(i) / 1000.0; 
        }
        return tokens;
    }

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
