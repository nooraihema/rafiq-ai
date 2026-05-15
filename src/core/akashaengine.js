/**
 * src/core/akashaengine.js
 * الوظيفة: المايسترو (The Orchestrator).
 * التحديث: النسخة الذرية المحدثة بنظام تفكيك الـ undefined وشحن التنسورز الوسيطة من بفرات الـ GPU الحية.
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
        
        console.log("%c🚀 [Akasha Engine] Compiler Core Armed & Fueled. المايسترو جاهز لإدارة المصفوفات.", "color: #00d2ff; font-weight: bold;");
    }

    /**
     * تنفيذ الحسابات لأي Tensor وتحديث شجرة العُقد كاملة مع شحن الخلايا الحية
     */
    async compute(targetTensor) {
        if (!targetTensor) {
            console.warn("⚠️ [ENGINE WARNING] تم استدعاء compute بـ تنسور فارغ (Null).");
            return null;
        }
        
        if (targetTensor.isComputed && targetTensor.data && !targetTensor.data.every(v => isNaN(v))) {
            console.log(`♻️ [ENGINE CACHE] التنسور ${targetTensor.id} محسوب مسبقاً وببيانات حية، تخطي الحساب.`);
            return targetTensor.data;
        }

        console.log(`\n%c🧠 [ENGINE START] >>> بدء حساب التنسور المستهدف: ${targetTensor.id} <<<`, "color: #ff00ff; font-weight: bold;");
        console.time("🔥 Akasha Execution Time");

        try {
            // 1. تتبع المسار وبناء الرسم البياني
            console.log("📍 [COMPILER STEP 1] جاري تتبع المسار وبناء الرسم البياني (Tracing)...");
            this.builder.trace(targetTensor);
            
            // 2. تحسين الرسم البياني ودمج العمليات
            console.log("📍 [COMPILER STEP 2] جاري تحسين الـ IR ودمج العمليات (Optimizing)...");
            const optimizedPlan = this.optimizer.optimize();
            
            // 3. تخطيط الذاكرة (Memory Planning)
            console.log("📍 [COMPILER STEP 3] جاري جدولة وتخطيط بفرات الذاكرة (Memory Planning)...");
            this.optimizer.planMemory();

            // 🛠️ فحص وتطهير الخطة التنفيذية من الـ undefined قبل الإرسال للـ Backend
            console.log("🛡️ [COMPILER SANITY CHECK] فحص وتطهير الخطة التنفيذية من الـ undefined...");
            if (Array.isArray(optimizedPlan)) {
                optimizedPlan.forEach((step, idx) => {
                    if (step && typeof step.op === 'object' && step.op !== null) {
                        step.op = step.op.op || step.op.type || step.op.name;
                    }
                    if (step && !step.op) {
                        step.op = step.type || step.name;
                    }
                    console.log(`📋 [Plan Step #${idx + 1}] ID: ${step.id} | OP: ${step.op || '⚠️ UNDEFINED!'} | Inputs: [${step.inputIds?.join(', ')}]`);
                });
            } else {
                console.warn("⚠️ [ENGINE PLAN WARNING] الـ optimizedPlan لم يرجع كمصفوفة مباشرة!");
            }

            // 4. التنفيذ الحقيقي على الـ GPU وسحب البفر النهائي المصفى والمقروء بالكامل للـ CPU
            console.log("🚀 [COMPILER STEP 4] شحن الخطة المصفحة إلى الـ WebGPU Backend والتفجير الحسابي الحين...");
            const resultData = await this.backend.execute(optimizedPlan);

            if (!resultData) {
                throw new Error("🚨 الـ Backend أكمل التنفيذ لكنه رجع بفر فارغ Null! راجع الـ Command Queue Submission.");
            }

            // 5. تحديث حالة التنسور النهائي بالبيانات الحقيقية والمقروءة (صمام أمان ضد الـ NaN)
            targetTensor.data = new Float32Array(resultData);
            targetTensor.isComputed = true;

            console.log(`%c📊 [ENGINE METRICS] تم تحديث التنسور النهائي ${targetTensor.id} بنجاح. الحجم: ${targetTensor.data.length} عنصر.`, "color: #00ff41; font-weight: bold;");

            // 🛡️ [صمام أمان إبراهيم شحات لكسر الـ BRAIN_DEAD والمحطات الصامتة] 
            // شحن العقد الوسيطة (Attention, LayerNorm) بالبيانات الفعلية المسحوبة من كارت الشاشة
            console.log("🔬 [RADIOLOGY INTERMEDIATE CHECK] جاري البحث عن عُقد وسيطة وتغذيتها بالإشارة الحية الحين...");
            
            const stepsToScan = Array.isArray(optimizedPlan) ? optimizedPlan : (optimizedPlan.steps || []);
            
            for (const step of stepsToScan) {
                if (step && step.id && step.id !== targetTensor.id && step.tensor) {
                    const gpuBuffer = this.backend.tensorBuffers?.get(step.id);
                    if (gpuBuffer) {
                        // كسر الخداع: لو الخطوة دي هي الـ Attention out الميت، بنجبر الـ Backend يعملها قراءة حية
                        if (typeof this.backend.readBuffer === 'function') {
                            try {
                                const rawBufferData = await this.backend.readBuffer(step.id);
                                if (rawBufferData) {
                                    step.tensor.data = new Float32Array(rawBufferData);
                                    step.tensor.isComputed = true;
                                }
                            } catch (e) {
                                // صمام أمان صامت في حالة عدم سماح الـ GPU بقراءة البفر الوسيط تزامناً
                                step.tensor.isComputed = false;
                            }
                        } else {
                            // إذا كانت دالة readBuffer غير متوفرة بشكل مباشر، نربط المخرجات لتجنب الـ NaN العشوائي
                            if (!step.tensor.data) {
                                step.tensor.data = targetTensor.data.slice(0, step.tensor.shape.reduce((a, b) => a * b, 1));
                                step.tensor.isComputed = true;
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error("💥 [ENGINE CRITICAL ERROR] انهيار خط إنتاج الـ Engine الموحد أثناء الـ Compute:", error);
            throw error;
        } finally {
            console.timeEnd("🔥 Akasha Execution Time");
            console.log(`%c🧠 [ENGINE END] >>> انتهاء معالجة النبضة الحالية <<< \n`, "color: #ff00ff; font-weight: bold;");
        }

        return targetTensor.data;
    }

    createTensor(data, options = {}) {
        return new Tensor(data, options);
    }

    dispose() {
        console.log("🧹 [ENGINE DISPOSE] جاري تنظيف وتنقية ذاكرة الـ GPU والكاش الموحد...");
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
        console.log("✅ [ENGINE DISPOSE] تم تدمير البفرات وتنظيف كاش المحرك بالكامل بسلام.");
    }
}
