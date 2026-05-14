/**
 * src/core/akasharunner.js
 * 
 * الوظيفة: مشغل العمليات الموحد (Unified Operation Runner).
 * هذا الكود هو حلقة الوصل بين الـ API وبين الـ 7 ملفات الأساسية.
 */

import { AkashaEngine } from './akashaengine.js';
import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(device) {
        this.engine = new AkashaEngine(device);
        // مصفوفة أوزان وهمية كبداية (Weights)
        this.weights = new Tensor(new Float32Array(512).fill(0.5), { id: 'main_weights' });
    }

    /**
     * تشغيل عملية معالجة سريعة (Inference)
     */
    async runInference(inputData) {
        // 1. تحويل البيانات القادمة إلى Tensor
        const inputTensor = new Tensor(new Float32Array(inputData), { id: 'input_node' });

        // 2. بناء معادلة رياضية (Graph)
        // هنا الكومبايلر هيدمج الـ mul والـ add في Kernel واحد
        const graph = inputTensor.mul(this.weights).add(new Tensor([0.1]));

        // 3. التنفيذ الفعلي عبر الكومبايلر
        const resultData = await this.engine.compute(graph);

        return {
            tensorId: graph.id,
            data: resultData.slice(0, 5), // نرجع أول 5 قيم للتجربة
            status: "Success - Fused Execution"
        };
    }

    /**
     * تشغيل دورة تدريب (Training Step)
     */
    async runTrainingStep(data) {
        const grad = new Tensor(new Float32Array(512).fill(0.01));
        
        // عملية تحديث الأوزان: W = W - Grad
        const updatedWeights = this.weights.sub(grad);
        
        await this.engine.compute(updatedWeights);
        this.weights = updatedWeights; // تحديث الذاكرة
        
        return "Weights Updated via GPU";
    }
}
