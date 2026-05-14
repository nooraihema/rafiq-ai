/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (The Multi-Head Orchestrator)
 * الوظيفة: دمج سياق الكلام باستخدام طبقة الـ Attention قبل التنفيذ.
 */

import { Tensor } from './tensor.js';
import { MultiHeadAttention } from './layers/attention.js'; // استيراد العقل الجديد

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        // تعريف طبقة الـ Attention (مثلاً بـ 512 بعد و 8 رؤوس انتباه)
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
    }

    async run(inputString) {
        // 1. تحويل النص لأرقام (Tokenization)
        const inputData = this._tokenize(inputString);
        
        // 2. بناء التنسور الأولي (المدخلات الخام)
        const inputTensor = new Tensor(inputData, { shape: [512] });

        // 3. السحر الحقيقي: تمرير المدخلات عبر طبقة الـ Attention
        // هنا الـ "أنا" هتبدأ تتأثر بالكلمات اللي بعدها وتنتج Tensor جديد مشبع بالسياق
        const contextualGraph = this.attention.forward(inputTensor);

        // 4. بناء خطة التنفيذ (Plan) من الرسم البياني الناتج عن الـ Attention
        const plan = this._buildPlan(contextualGraph);

        // 5. حقن البيانات الخام في أول خطوة (عشان الـ Backend يبدأ يشتغل)
        if (plan.length > 0) {
            plan[0].inputTensorData = inputData;
        }

        // 6. التنفيذ النهائي على الـ GPU
        try {
            const resultData = await this.backend.execute(plan);
            return resultData; 
        } catch (err) {
            console.error("[RUNNER ERROR]: Attention execution failed", err);
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
     * تحويل الشجرة لقائمة عمليات مرتبة (تدعم العمليات المعقدة)
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
