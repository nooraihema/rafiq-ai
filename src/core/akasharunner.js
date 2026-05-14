/**
 * src/core/akasharunner.js
 * 
 * الوظيفة: مشغل العمليات الموحد (Unified Operation Runner).
 * تم التعديل لإصلاح خطأ Shape mismatch وضمان توافق الأبعاد.
 */

import { AkashaEngine } from './akashaengine.js';
import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(device) {
        this.engine = new AkashaEngine(device);
        // مصفوفة أوزان وهمية بحجم 512
        this.weights = new Tensor(new Float32Array(512).fill(0.5), { id: 'main_weights' });
    }

    /**
     * تشغيل عملية معالجة سريعة (Inference)
     */
    async runInference(inputData) {
        // 1. تحويل البيانات القادمة إلى Tensor (يجب أن يكون الطول 512)
        const inputTensor = new Tensor(new Float32Array(inputData), { id: 'input_node' });

        // 2. بناء معادلة رياضية (Graph)
        // إصلاح الخطأ: نقوم بإنشاء Bias بنفس طول المدخلات (512) ليتوافق مع الـ Shape
        const biasData = new Float32Array(512).fill(0.1);
        const bias = new Tensor(biasData, { id: 'bias_node' });

        // العملية الآن: (512 * 512) + 512 = التوافق تام
        const graph = inputTensor.mul(this.weights).add(bias);

        // 3. التنفيذ الفعلي عبر الكومبايلر (سواء GPU أو CPU Fallback)
        const resultData = await this.engine.compute(graph);

        return {
            tensorId: graph.id,
            // نرجع أول 5 قيم للتجربة في الـ API response
            data: resultData instanceof Float32Array ? resultData.slice(0, 5) : resultData,
            status: "Success - Fused Execution Complete"
        };
    }

    /**
     * تشغيل دورة تدريب (Training Step)
     */
    async runTrainingStep(data) {
        // الـ Grad لازم يكون برضه 512
        const gradData = new Float32Array(512).fill(0.01);
        const grad = new Tensor(gradData, { id: 'grad_node' });
        
        // عملية تحديث الأوزان: W = W - Grad
        const updatedWeights = this.weights.sub(grad);
        
        await this.engine.compute(updatedWeights);
        this.weights = updatedWeights; // تحديث الأوزان في الذاكرة
        
        return "Weights Updated Successfully";
    }
}
