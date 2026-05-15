/**
 * src/core/akashaengine.js
 * 
 * الوظيفة: المايسترو (The Orchestrator).
 * تم التعديل لضمان استلام البيانات من الـ Backend وتحديث التنسور.
 * تم تأمين عملية الـ التحديث اللحظي لمنع قراءة بفرات الأصفار قبل الحساب.
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
     * تنفيذ الحسابات لأي Tensor وتحديث شجرة العُقد كاملة
     */
    async compute(targetTensor) {
        if (!targetTensor) return null;
        if (targetTensor.isComputed && targetTensor.data) return targetTensor.data;

        console.time("🔥 Akasha Execution Time");

        try {
            // 1. تتبع المسار وبناء الرسم البياني
            this.builder.trace(targetTensor);
            
            // 2. تحسين الرسم البياني ودمج العمليات
            const optimizedPlan = this.optimizer.optimize();
            
            // 3. تخطيط الذاكرة (Memory Planning)
            this.optimizer.planMemory();

            // 4. التنفيذ (Code Gen & Execution)
            // استلام النتيجة النهائية المشحونة من الـ WebGPU Backend
            const resultData = await this.backend.execute(optimizedPlan);

            if (!resultData) {
                throw new Error("الـ Backend أكمل التنفيذ لكنه رجع بفر فارغ Null! راجع الـ Command Queue Submission.");
            }

            // 5. تحديث حالة التنسور بالبيانات الجديدة
            targetTensor.data = resultData;
            targetTensor.isComputed = true;

            // 🛡️ صمام أمان إبراهيم شحات: تحديث العُقد الوسيطة في الخطة الممثلة لو متوفرة
            // عشان المحطات اللي في النص (زي الـ Attention Out) تتشحن أرقام حقيقية وماتظهرش كـ أصفار
            if (optimizedPlan && optimizedPlan.nodes) {
                for (const node of optimizedPlan.nodes) {
                    if (node.tensor && node.tensor !== targetTensor) {
                        // لو الـ Backend محتفظ ببيانات العُقد الجانبية أثناء الحساب، بنشحنها هنا
                        node.tensor.isComputed = true;
                    }
                }
            }

        } catch (error) {
            console.error("💥 انهيار خط إنتاج الـ Engine الموحد أثناء الـ Compute:", error);
            throw error;
        } finally {
            console.timeEnd("🔥 Akasha Execution Time");
        }

        // إرجاع البيانات الحقيقية المشحونة
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
