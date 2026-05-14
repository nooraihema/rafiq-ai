/**
 * src/core/akasharunner.js
 * الحالة: المايسترو (The Orchestrator)
 * الوظيفة: تحويل مدخلات المستخدم إلى Tensors وبناء مخطط العمليات (Graph).
 */

import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
    }

    async run(inputString) {
        console.log(`🚀 [RUNNER]: Processing input: "${inputString}"`);

        // 1. مرحلة التجهيز (Preprocessing)
        // بنحول النص لمصفوفة أرقام بناءً على طول كل كلمة مثلاً
        const inputData = this._tokenize(inputString);
        const inputTensor = new Tensor(inputData, { shape: [inputData.length] });

        // 2. بناء الـ Graph (العمليات اللي عايزينها تتم)
        // هنعمل عملية رياضية حقيقية: (المدخلات + 0.5) * 0.1
        // دي مجرد تجربة عشان نختبر إن الـ OpNode والـ WebGPUBackend شغالين صح
        const graph = inputTensor.add(0.5).mul(0.1);

        // 3. تحويل الـ Graph لخطة تنفيذ (Plan)
        // في المحركات الكبيرة بنعمل هنا Optimization، حالياً هنبعتها مباشرة
        const plan = this._buildPlan(graph);

        // 4. التنفيذ والحصول على النتائج من الـ GPU
        const resultData = await this.backend.execute(plan);

        return Array.from(resultData.slice(0, 3)); // نرجع أول 3 أرقام للتجربة
    }

    /**
     * تحويل النص لأرقام (Tokenization مبدئي)
     */
    _tokenize(text) {
        // مؤقتاً: هنحول كل حرف للكود بتاعه (ASCII) عشان الأرقام تختلف حسب الكلام
        const tokens = new Float32Array(512).fill(0);
        for (let i = 0; i < Math.min(text.length, 512); i++) {
            tokens[i] = text.charCodeAt(i) / 255.0; // Normalized 0-1
        }
        return tokens;
    }

    /**
     * تحويل شجرة التنسورات إلى قائمة مرتبة من العمليات
     */
    _buildPlan(tensor) {
        const plan = [];
        const traverse = (t) => {
            if (t.op !== 'const') {
                t.inputs.forEach(input => traverse(input));
                plan.push({
                    op: t.op,
                    id: t.id,
                    shape: t.shape,
                    // بنمرر الـ OpNode نفسه عشان الـ Backend يولد منه الـ WGSL
                    opNode: t // بما إن التنسور في تصميمنا هو اللي شايل العملية
                });
            }
        };
        traverse(tensor);
        return plan;
    }
}
