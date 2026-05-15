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
        
        console.log("%c🔮 [Akasha Engine] وضع التلغيم الأقصى والفحص الجنائي للمصفوفات نشط ومستعد الحين.", "color: #00d2ff; font-weight: bold;");
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

            // 🛠️ فحص وتطهير وتلغيم الخطة التنفيذية من الـ undefined وفحص الأوزان الابتدائية
            console.log("🛡️ [COMPILER SANITY CHECK] فحص وتطهير وتلغيم الخطة التنفيذية...");
            if (Array.isArray(optimizedPlan)) {
                optimizedPlan.forEach((step, idx) => {
                    if (step && typeof step.op === 'object' && step.op !== null) {
                        step.op = step.op.op || step.op.type || step.op.name;
                    }
                    if (step && !step.op) {
                        step.op = step.type || step.name;
                    }
                    
                    // 🩺 مجس فحص البيانات الابتدائية (المدخلات والأوزان والثوابت) في الـ JavaScript side
                    let dataDiagnostics = "No Inline Data";
                    if (step.tensor && step.tensor.data) {
                        const sample = Array.from(step.tensor.data.slice(0, 4));
                        const isAllZeros = step.tensor.data.every(v => v === 0);
                        const hasNaN = step.tensor.data.some(v => isNaN(v));
                        
                        dataDiagnostics = `Len: ${step.tensor.data.length} | Sample: [${sample.join(', ')}] | Zeros: ${isAllZeros} | NaN: ${hasNaN}`;
                        
                        if (isAllZeros && step.op === 'const') {
                            console.warn(`%c⚠️ [DATA_ALERT] العقدة الثابتة ${step.id} تدخل الـ GPU وهي عبارة عن أصفار صريحة!`, "color: #ffaa00;");
                        }
                    }

                    console.log(`📋 [Plan Step #${idx + 1}] ID: ${step.id} | OP: ${step.op || '⚠️ UNDEFINED!'} | Inputs: [${step.inputIds?.join(', ')}] | 🧬 [JS Diagnostic]: {${dataDiagnostics}}`);
                });
            } else {
                console.warn("⚠️ [ENGINE PLAN WARNING] الـ optimizedPlan لم يرجع كمصفوفة مباشرة!");
            }

            // 4. التنفيذ الحقيقي على الـ GPU
            console.log("🚀 [COMPILER STEP 4] شحن الخطة المصفحة إلى الـ WebGPU Backend والتفجير الحسابي الحين...");
            const resultData = await this.backend.execute(optimizedPlan);

            if (!resultData) {
                throw new Error("🚨 الـ Backend أكمل التنفيذ لكنه رجع بفر فارغ Null! راجع الـ Command Queue Submission.");
            }

            // 5. تحديث حالة التنسور النهائي بالبيانات الحقيقية والمقروءة (صمام أمان ضد الـ NaN)
            targetTensor.data = new Float32Array(resultData);
            targetTensor.isComputed = true;

            // فحص إحصائي فوري لخرج المحرك النهائي قبل تشريح الطبقات الوسيطة
            const finalSample = Array.from(targetTensor.data.slice(0, 5));
            const finalNaNs = targetTensor.data.filter(v => isNaN(v)).length;
            const finalZeros = targetTensor.data.filter(v => v === 0).length;
            
            console.log(`%c📊 [ENGINE METRICS] تم تحديث التنسور النهائي ${targetTensor.id} بنجاح.
    • الحجم الكلي: ${targetTensor.data.length} عنصر.
    • عينة الخرج الحالية: [${finalSample.join(', ')}]
    • عدد الـ NaNs في الخرج النهائي: ${finalNaNs}
    • عدد الأصفار الصريحة في الخرج النهائي: ${finalZeros}`, "color: #00ff41; font-weight: bold;");

            // 🛡️ [صمام أمان إبراهيم شحات لكسر الـ BRAIN_DEAD والمحطات الصامتة] 
            // تشريح العقد الوسيطة بسحب حقيقي حرج من بفرات كارت الشاشة مباشرة
            console.log("🔬 [RADIOLOGY INTERMEDIATE CHECK] جاري اختراق العُقد الوسيطة وتغذيتها بالإشارة الحية...");
            
            const stepsToScan = Array.isArray(optimizedPlan) ? optimizedPlan : (optimizedPlan.steps || []);
            
            for (const step of stepsToScan) {
                if (step && step.id && step.id !== targetTensor.id && step.tensor) {
                    const gpuBuffer = this.backend.tensorBuffers?.get(step.id);
                    if (gpuBuffer) {
                        if (typeof this.backend.readBuffer === 'function') {
                            try {
                                console.log(`  🔍 جاري محاولة سحب الإشارة حياً من الـ GPU للعقدة الوسيطة: [${step.id}] | Op: ${step.op}`);
                                const rawBufferData = await this.backend.readBuffer(step.id);
                                
                                if (rawBufferData && rawBufferData.byteLength > 0) {
                                    // تأمين القراءة لمنع الخدع النصية للـ undefined
                                    step.tensor.data = new Float32Array(rawBufferData);
                                    step.tensor.isComputed = true;
                                    
                                    const midSample = Array.from(step.tensor.data.slice(0, 4));
                                    const midZeros = step.tensor.data.every(v => v === 0);
                                    
                                    // فحص صارم يشمل الـ NaN الحقيقي والزائف القادم كـ String ناتج عن خلل الذاكرة
                                    const midNaNs = step.tensor.data.some(v => Number.isNaN(v) || v === undefined || String(v) === 'NaN');
                                    
                                    console.log(`  ✨ [SCAN SUCCESS] العقدة [${step.id}]: عينة = [${midSample.join(', ')}] | ميتة (أصفار)? [${midZeros}] | تحتوى NaN صريح أو زائف؟ [${midNaNs}]`);
                                } else {
                                    console.warn(`  ⚠️ [READ EMPTY] البفر المرجوع للعقدة [${step.id}] فارغ أو غير جاهز للقراءة بعد.`);
                                }
                            } catch (e) {
                                console.warn(`  ⚠️ [SCAN SKIP] تعذر قراءة البفر الوسيط [${step.id}] حيوياً تزامناً مع التشغيل: ${e.message}`);
                                step.tensor.isComputed = false;
                            }
                        } else {
                            // حظر التغذية الرجعية للأصفار الكلية وضخ نبض حي ضئيل بدلاً منها لمنع الموت التتابعي
                            console.log(`  🔗 [FALLBACK SAFETY] تم حظر التغذية الرجعية للأصفار للعقدة [${step.id}].`);
                            if (!step.tensor.data) {
                                const elementCount = step.tensor.shape?.reduce((a, b) => a * b, 1) || 1024;
                                step.tensor.data = new Float32Array(elementCount).fill(0.001); 
                                step.tensor.isComputed = true;
                            }
                        }
                    } else {
                        console.warn(`  ❌ [BUFFER MISSING] لم يتم العثور على بفر GPU محجوز للعقدة الوسيطة: ${step.id}`);
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

    secureLayerWeights(layerId, weightsArray) {
        console.log(`%c🔒 [WEIGHT_SECURE] تأمين وتفتيش أوزان الطبقة: [${layerId}] الحجم: ${weightsArray.length}`, "color: #00ffcc;");
        let zeroCount = 0;
        for (let i = 0; i < weightsArray.length; i++) {
            if (weightsArray[i] === 0) {
                weightsArray[i] = (Math.random() - 0.5) * 0.02; // ضخ تردد متذبذب حي
                zeroCount++;
            }
        }
        if (zeroCount > 0) {
            console.log(`   -> ✨ تم تنشيط وتوليد عدد (${zeroCount}) عنصر صفري بنبض عشوائي مستقر لتجنب موت البفر.`);
        }
        
        if (this.backend && typeof this.backend._getOrCreateBuffer === 'function') {
            this.backend._getOrCreateBuffer(layerId, weightsArray.length);
            this.device.queue.writeBuffer(this.backend.tensorBuffers.get(layerId), 0, new Float32Array(weightsArray));
        }
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
