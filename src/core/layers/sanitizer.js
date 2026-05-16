/**
 * src/core/layers/sanitizer.js
 * طبقة التطهير والإنقاذ النبضي الفوري لـ (رفيق-AI) - النسخة المؤمنة حسابياً
 * المطور: إبراهيم شحات
 */

import { Tensor } from '../tensor.js';

export class SignalSanitizer {
    constructor(embedDim) {
        this.embedDim = embedDim;
        // مصفوفة إنقاذ صلبة مشحونة بنبضات حية قوية
        this.antiZeroPulse = new Float32Array(embedDim);
        this._ignitePulse();
    }

    _ignitePulse() {
        for (let i = 0; i < this.embedDim; i++) {
            // شحن قيم تتراوح بين 0.01 و 0.05 (تردد نفسي خفيف للحفاظ على طاقة الخلفية)
            this.antiZeroPulse[i] = 0.01 + Math.random() * 0.04;
        }
    }

    /**
     * تفحص التنسور، وتجبر المحرك على بناء مسار حسابي حي في الـ GPU يمنع الـ Size: 0
     */
    sanitize(inputTensor, idName = "sanitized_pulse") {
        // إذا كان التنسور منعدم تماماً، نخلق له كيان طوارئ بأبعاد مرنة تناسب عدد التوكنز
        if (!inputTensor) {
            console.warn(`⚠️ [SANITIZER] لقطة حرجة: التنسور منعدم تماماً! جاري تخليق بفر طوارئ.`);
            return new Tensor(this.antiZeroPulse, {
                shape: [1, this.embedDim],
                op: 'const',
                id: `${idName}_emergency_${Date.now()}`
            });
        }

        const currentShape = inputTensor.shape || [1, this.embedDim];
        const numTokens = currentShape[0]; // سحب عدد التوكنز الحقيقي ديناميكياً (مثلاً 6)

        // 1. إذا كان التنسور قادم من عملية GPU (مثل الـ Attention) وليس له بيانات في الـ JS
        // نقوم بعمل حيلة ذكية: تحويله إلى عملية ربط لمنع الـ Optimizer من تصفيره
        if (!inputTensor.data || inputTensor.status === 'DEAD_EMPTY_BUFFER') {
            
            // تخليق تنسور النبض الحي بنفس أبعاد التنسور الحالي الحقيقي [numTokens, 512]
            const pulseData = new Float32Array(numTokens * this.embedDim);
            for (let i = 0; i < pulseData.length; i++) {
                pulseData[i] = this.antiZeroPulse[i % this.embedDim];
            }

            const pulseTensor = new Tensor(pulseData, {
                shape: currentShape,
                op: 'const',
                id: `${idName}_rescue_pulse_${Date.now()}`
            });

            // محاكاة عملية جمع (Add) داخل الـ Graph لإجبار المحرك على حجز حجم ذاكرة حقيقي
            // وتأمين تمرير التنسور الأصلي كمدخل صريح للـ FFN
            const fusedRescueTensor = new Tensor(null, {
                shape: currentShape,
                op: 'add',
                id: `${idName}_secured_bridge`,
                inputs: [inputTensor, pulseTensor]
            });

            console.log(`%c🛡️ [SANITIZER] تم حسم اتصال الـ Attention بالـ FFN عبر جسر نبضي بأبعاد حقيقية: [${currentShape.join(', ')}]`, "color: #00ffcc; font-weight: bold;");
            return fusedRescueTensor;
        }

        // 2. إذا كانت البيانات موجودة في الـ JS وميتة (أصفار)
        if (inputTensor.data) {
            let isDead = true;
            for (let i = 0; i < Math.min(inputTensor.data.length, 20); i++) {
                if (inputTensor.data[i] !== 0) {
                    isDead = false;
                    break;
                }
            }

            if (isDead) {
                console.warn(`🚨 [SANITIZER] تم كشف إشارة ميتة في الـ JS! جاري الصعق وحقن الطاقة.`);
                const dataCopy = new Float32Array(inputTensor.data.length);
                for(let i=0; i<dataCopy.length; i++) {
                    dataCopy[i] = this.antiZeroPulse[i % this.embedDim];
                }
                inputTensor.data = dataCopy;
            }
        }

        return inputTensor;
    }
}
