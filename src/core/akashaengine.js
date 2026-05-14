/**
 * src/core/akashaengine.js
 * 
 * الوظيفة: المايسترو (The Orchestrator).
 * الملف النهائي الذي يربط التنسورات، الرسم البياني، المحسن، والمحرك التنفيذي.
 * يوفر للمستخدم واجهة بسيطة لتشغيل الكومبايلر بضغطة واحدة.
 */

// استيراد المكونات الأساسية - تم التأكد من المسارات لبيئة Vercel
import { GraphBuilder } from './graphbuilder.js';
import { IROptimizer } from './iroptimizer.js';
import { WebGPUBackend } from './webgpubackend.js';
import { Tensor } from './tensor.js'; // السطر ده ضروري لعمل دالة createTensor

export class AkashaEngine {
    /**
     * @param {GPUDevice} device - جهاز الـ GPU المفعل من الـ WebGPU API
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
     * تقوم الدالة بتتبع العمليات، تحسينها، ثم تحويلها لكود GPU وتنفيذها.
     * @param {Tensor} targetTensor - التنسور المراد حساب قيمته النهائية
     */
    async compute(targetTensor) {
        // إذا كان التنسور محسوباً بالفعل، نرجع البيانات مباشرة
        if (targetTensor.isComputed) return targetTensor.data;

        console.time("🔥 Akasha Execution Time");

        // 1. تتبع المسار وبناء الرسم البياني (Tracing)
        // يحول العمليات المسجلة إلى تسلسل منطقي (Execution Order)
        const executionOrder = this.builder.trace(targetTensor);
        
        // 2. تحسين الرسم البياني ودمج العمليات (Optimization/Fusion)
        // هنا يتم دمج العمليات البسيطة (مثل Add و Mul) لتقليل استهلاك الذاكرة
        const optimizedPlan = this.optimizer.optimize();
        
        // 3. تخطيط الذاكرة (Memory Planning)
        // يتم حجز الأماكن اللازمة في الـ VRAM لضمان أعلى أداء
        this.optimizer.planMemory();

        // 4. الترجمة للـ WGSL والتنفيذ على كرت الشاشة (Code Gen & Execution)
        // تحويل الخطة إلى كود Shader حقيقي وتشغيله
        await this.backend.execute(optimizedPlan);

        // 5. تحديث حالة التنسور
        targetTensor.isComputed = true;
        
        console.timeEnd("🔥 Akasha Execution Time");

        return targetTensor.data;
    }

    /**
     * دالة مساعدة لإنشاء التنسورات مرتبطة بهذا المحرك
     */
    createTensor(data, options = {}) {
        return new Tensor(data, options);
    }

    /**
     * تنظيف الذاكرة (Memory Cleanup)
     * ضروري جداً لمنع الـ Memory Leaks في كرت الشاشة
     */
    dispose() {
        this.backend.bufferCache.forEach(buffer => buffer.destroy());
        this.backend.bufferCache.clear();
        this.backend.pipelineCache.clear();
        console.log("🧹 Engine memory cleared.");
    }
}
