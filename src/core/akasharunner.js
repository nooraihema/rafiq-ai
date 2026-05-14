/**
 * src/core/akasharunner.js
 * الحالة: المايسترو (The Orchestrator)
 * الوظيفة: تحويل مدخلات المستخدم إلى Tensors وضمان وصول البيانات للـ Backend.
 */

import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
    }

    async run(inputString) {
        // 1. تحويل النص لأرقام (Tokenization)
        const inputData = this._tokenize(inputString);
        
        // لو النص فاضي أو مش شغال، هنعرف من هنا في الـ Console الحقيقي
        console.log(`[DEBUG RUNNER] Input: "${inputString}" | First 3 Tokens:`, inputData.slice(0, 3));

        // 2. بناء التنسور والـ Graph
        const inputTensor = new Tensor(inputData, { shape: [512] });
        
        // تجربة حسابية: (قيمة الحرف + 0.5) * 0.1
        // لو الحرف "أ" قيمته 0.6، الناتج المفروض يكون 0.11
        const graph = inputTensor.add(0.5).mul(0.1);

        // 3. تحويل الـ Graph لخطة (Plan)
        const plan = this._buildPlan(graph);

        // 🚨 الخطوة الأهم: حقن البيانات الفعلية في الخطة 
        // عشان الـ Backend لما يجي يـ Dispatch يعرف يبعت إيه للـ GPU
        if (plan.length > 0) {
            plan[0].inputTensorData = inputData;
        }

        // 4. إرسال الخطة للتنفيذ
        try {
            const resultData = await this.backend.execute(plan);
            return resultData; 
        } catch (err) {
            console.error("[RUNNER ERROR]: Execution failed", err);
            throw err;
        }
    }

    /**
     * تحويل النص لـ Normalized ASCII
     */
    _tokenize(text) {
        const tokens = new Float32Array(512).fill(0);
        for (let i = 0; i < Math.min(text.length, 512); i++) {
            // تحويل الكود لنسبة بين 0 و 1 عشان الحسابات تكون مستقرة
            tokens[i] = text.charCodeAt(i) / 1000.0; 
        }
        return tokens;
    }

    /**
     * تحويل الشجرة لقائمة عمليات مرتبة
     */
    _buildPlan(tensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;
            
            // زيارة المدخلات أولاً (Depth First)
            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            // إضافة العملية للخطة لو مكنتش مجرد قيمة ثابتة
            if (t.op && t.op !== 'const') {
                plan.push({
                    op: t.op,
                    id: t.id,
                    shape: t.shape,
                    opNode: t, // نمرر الـ Tensor نفسه كـ OpNode لإنتاج الـ WGSL
                    inputTensorData: null // هيتم حقنها في أول عملية
                });
                visited.add(t.id);
            }
        };

        traverse(tensor);
        return plan;
    }
}
