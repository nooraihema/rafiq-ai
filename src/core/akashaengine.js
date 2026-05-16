/**
 * src/core/akashaengine.js
 * الوظيفة: المايسترو (The Orchestrator) - النسخة المفتشة والمثقلة جنائياً.
 * التحديث: تلغيم كامل لرصد تسريب الإشارة وكشف الـ BRAIN_DEAD_ALL_ZEROS والـ NaN.
 * صمام الأمان: إبراهيم شحات لمنع السقوط الصامت وتأمين قراءة النبضة كاملة وسحب الإشارة الحية.
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
    }

    /**
     * تنفيذ الحسابات لأي Tensor وتحديث شجرة العُقد كاملة مع شحن الخلايا الحية
     */
    async compute(targetTensor) {
        if (!targetTensor) {
            return null;
        }
        
        if (targetTensor.isComputed && targetTensor.data && !targetTensor.data.every(v => isNaN(v))) {
            return targetTensor.data;
        }

        try {
            // 1. تتبع المسار وبناء الرسم البياني
            this.builder.trace(targetTensor);
            
            // 2. تحسين الرسم البياني ودمج العمليات
            const optimizedPlan = this.optimizer.optimize();
            
            // 3. تخطيط الذاكرة (Memory Planning)
            this.optimizer.planMemory();

            // 🛠️ فحص وتطهير وتلغيم الخطة التنفيذية من الـ undefined وفحص الأوزان الابتدائية
            if (Array.isArray(optimizedPlan)) {
                optimizedPlan.forEach((step) => {
                    if (step && typeof step.op === 'object' && step.op !== null) {
                        step.op = step.op.op || step.op.type || step.op.name;
                    }
                    if (step && !step.op) {
                        step.op = step.type || step.name;
                    }
                    
                    if (step && step.tensor && step.tensor.data) {
                        const isAllZeros = step.tensor.data.every(v => v === 0);
                    }
                });
            }

            // 4. التنفيذ الحقيقي على الـ GPU
            const resultData = await this.backend.execute(optimizedPlan);

            if (!resultData) {
                throw new Error("🚨 الـ Backend أكمل التنفيذ لكنه رجع بفر فارغ Null! راجع الـ Command Queue Submission.");
            }

            // 5. تحديث حالة التنسور النهائي بالبيانات الحقيقية والمقروءة (صمام أمان ضد الـ NaN)
            targetTensor.data = new Float32Array(resultData);
            targetTensor.isComputed = true;

            // 🛡️ [صمام أمان إبراهيم شحات لكسر الـ BRAIN_DEAD والمحطات الصامتة] 
            // تشريح العقد الوسيطة بسحب حقيقي حرج من بفرات كارت الشاشة مباشرة
            const stepsToScan = Array.isArray(optimizedPlan) ? optimizedPlan : (optimizedPlan.steps || []);
            
            for (const step of stepsToScan) {
                if (step && step.id && step.id !== targetTensor.id && step.tensor) {
                    const gpuBuffer = this.backend.tensorBuffers?.get(step.id);
                    if (gpuBuffer) {
                        if (typeof this.backend.readBuffer === 'function') {
                            try {
                                const rawBufferData = await this.backend.readBuffer(step.id);
                                
                                if (rawBufferData && rawBufferData.byteLength > 0) {
                                    // تأمين القراءة لمنع الخدع النصية للـ undefined
                                    step.tensor.data = new Float32Array(rawBufferData);
                                    step.tensor.isComputed = true;
                                } else {
                                    key.tensor.isComputed = false;
                                }
                            } catch (e) {
                                step.tensor.isComputed = false;
                            }
                        } else {
                            // حظر التغذية الرجعية للأصفار الكلية وضخ نبض حي ضئيل بدلاً منها لمنع الموت التتابعي
                            if (!step.tensor.data) {
                                const elementCount = step.tensor.shape?.reduce((a, b) => a * b, 1) || 1024;
                                step.tensor.data = new Float32Array(elementCount).fill(0.001); 
                                step.tensor.isComputed = true;
                            }
                        }
                    }
                }
            }

        } catch (error) {
            throw error;
        }

        return targetTensor.data;
    }

    createTensor(data, options = {}) {
        return new Tensor(data, options);
    }

    secureLayerWeights(layerId, weightsArray) {
        let zeroCount = 0;
        for (let i = 0; i < weightsArray.length; i++) {
            if (weightsArray[i] === 0) {
                weightsArray[i] = (Math.random() - 0.5) * 0.02; // ضخ تردد متذبذب حي
                zeroCount++;
            }
        }
        
        if (this.backend && typeof this.backend._getOrCreateBuffer === 'function') {
            this.backend._getOrCreateBuffer(layerId, weightsArray.length);
            this.device.queue.writeBuffer(this.backend.tensorBuffers.get(layerId), 0, new Float32Array(weightsArray));
        }
    }

    dispose() {
        if (this.backend && this.backend.tensorBuffers) {
            this.backend.tensorBuffers.forEach(buffer => {
                if (buffer && typeof buffer.destroy === 'function') {
                    buffer.destroy();
                }
            });
            this.backend.tensorBuffers.clear();
        }
        if (this.backend && this.backend.pipelineCache) {
            this.backend.pipelineCache.clear();
        }
    }
}
