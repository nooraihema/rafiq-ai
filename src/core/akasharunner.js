/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (The Multi-Head Orchestrator)
 * الوظيفة: دمج سياق الكلام باستخدام طبقة الـ Attention قبل التنفيذ وضمان توافق أبعاد المصفوفات.
 */

import { Tensor } from './tensor.js';
import { MultiHeadAttention } from './layers/attention.js'; 

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        // تعريف طبقة الـ Attention (بأبعاد 512 و 8 رؤوس انتباه)
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
    }

    async run(inputString) {
        // 1. تحويل النص لأرقام (Tokenization)
        const inputData = this._tokenize(inputString);
        
        // 2. بناء التنسور كـ Matrix (صف واحد و 512 عمود)
        // هذا التعديل [1, 512] ضروري جداً لنجاح عملية الـ MatMul (Inner dimensions match)
        const inputTensor = new Tensor(inputData, { shape: [1, 512] });

        // 3. تمرير المدخلات عبر طبقة الـ Attention لدمج السياق
        const contextualGraph = this.attention.forward(inputTensor);

        // 4. بناء خطة التنفيذ من الرسم البياني
        const plan = this._buildPlan(contextualGraph);

        // 5. حقن البيانات الخام في أول خطوة في الخطة
        if (plan.length > 0) {
            plan[0].inputTensorData = inputData;
        }

        // 6. التنفيذ النهائي على الـ GPU
        try {
            const resultData = await this.backend.execute(plan);
            return resultData; 
        } catch (err) {
            console.error("[RUNNER ERROR]: Attention execution failed", err);
            // إظهار تفاصيل الخطأ للمساعدة في التصحيح
            throw err;
        }
    }

    /**
     * تحويل النص لـ Normalized ASCII بين 0 و 1
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
            
            // زيارة المدخلات أولاً لضمان ترتيب العمليات
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            // إضافة العملية للخطة إذا كانت عقدة حسابية (Operation)
            if (t.op && t.op !== 'const') {
                plan.push({
                    op: t.op,
                    id: t.id,
                    shape: t.shape,
                    opNode: t, // نمرر الـ Tensor نفسه لإنتاج الـ WGSL لاحقاً
                    inputTensorData: null 
                });
                visited.add(t.id);
            }
        };

        traverse(tensor);
        return plan;
    }
}
