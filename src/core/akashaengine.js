/**
 * src/core/akashaengine.js
 * 
 * الوظيفة: المايسترو (The Orchestrator).
 * الملف النهائي الذي يربط التنسورات، الرسم البياني، المحسن، والمحرك التنفيذي.
 * يوفر للمستخدم واجهة بسيطة لتشغيل الكومبايلر بضغطة واحدة.
 */

import { GraphBuilder } from '/graphbuilder.js';
import { IROptimizer } from '/iroptimizer.js';
import { WebGPUBackend } from '/webgpubackend.js';

export class AkashaEngine {
    /**
     * @param {GPUDevice} device - جهاز الـ GPU المفعل
     */
    constructor(device) {
        this.device = device;
        this.builder = new GraphBuilder();
        this.optimizer = new IROptimizer(this.builder);
        this.backend = new WebGPUBackend(this.device);
        
        console.log("🚀 Akasha Compiler Engine is ready and fueled.");
    }

    /**
     * الوظيفة الأهم: تنفيذ الحسابات لأي Tensor
     * @param {Tensor} targetTensor - التنسور المراد حساب قيمته النهائية
     */
    async compute(targetTensor) {
        if (targetTensor.isComputed) return targetTensor.data;

        // 1. تتبع المسار وبناء الرسم البياني (Tracing)
        console.time("ExecutionTime");
        const executionOrder = this.builder.trace(targetTensor);
        
        // 2. تحسين الرسم البياني ودمج العمليات (Optimization/Fusion)
        const optimizedPlan = this.optimizer.optimize();
        
        // 3. تخطيط الذاكرة (Memory Planning - Placeholder)
        this.optimizer.planMemory();

        // 4. الترجمة للـ WGSL والتنفيذ على كرت الشاشة (Code Gen & Execution)
        await this.backend.execute(optimizedPlan);

        // 5. تحديث حالة التنسور
        targetTensor.isComputed = true;
        console.timeEnd("ExecutionTime");

        return targetTensor.data;
    }

    /**
     * دالة مساعدة لإنشاء التنسورات مرتبطة بهذا المحرك
     */
    createTensor(data, options = {}) {
        // يمكن إضافة منطق هنا لربط التنسور بـ Memory Pool خاص بالمحرك
        return new Tensor(data, options);
    }

    /**
     * تنظيف الذاكرة (Memory Cleanup)
     */
    dispose() {
        this.backend.bufferCache.forEach(buffer => buffer.destroy());
        this.backend.bufferCache.clear();
        this.backend.pipelineCache.clear();
        console.log("🧹 Engine memory cleared.");
    }
}
