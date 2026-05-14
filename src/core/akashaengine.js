}
/**
 * src/core/akashaengine.js
 * 
 * الوظيفة: المايسترو (The Orchestrator).
 * تم التعديل لضمان استلام البيانات من الـ Backend وتحديث التنسور.
 */

import { GraphBuilder } from './graphbuilder.js';
import { IROptimizer } from './iroptimizer.js';
import { WebGPUBackend } from './webgpubackend.js';
import { Tensor } from './tensor.js'; 

export class AkashaEngine {
    constructor(device) {
        this.device = device;
        this.builder = new GraphBuilder();
        this.optimizer = new IROptimizer(this.builder);
        this.backend = new WebGPUBackend(this.device);
        
        console.log("🚀 Akasha Compiler Engine is ready and fueled.");
    }

    /**
     * تنفيذ الحسابات لأي Tensor
     */
    async compute(targetTensor) {
        if (targetTensor.isComputed) return targetTensor.data;

        console.time("🔥 Akasha Execution Time");

        // 1. تتبع المسار وبناء الرسم البياني
        this.builder.trace(targetTensor);
        
        // 2. تحسين الرسم البياني ودمج العمليات
        const optimizedPlan = this.optimizer.optimize();
        
        // 3. تخطيط الذاكرة (Memory Planning)
        this.optimizer.planMemory();

        // 4. التنفيذ (Code Gen & Execution)
        // تعديل مهم: استلام النتيجة من الـ Backend
        const resultData = await this.backend.execute(optimizedPlan);

        // 5. تحديث حالة التنسور بالبيانات الجديدة
        targetTensor.data = resultData;
        targetTensor.isComputed = true;
        
        console.timeEnd("🔥 Akasha Execution Time");

        // إرجاع البيانات الحقيقية
        return targetTensor.data;
    }

    createTensor(data, options = {}) {
        return new Tensor(data, options);
    }

    dispose() {
        if (this.backend.bufferCache) {
            this.backend.bufferCache.forEach(buffer => {
                if (buffer.destroy) buffer.destroy();
            });
            this.backend.bufferCache.clear();
        }
        this.backend.pipelineCache.clear();
        console.log("🧹 Engine memory cleared.");
    }
}
