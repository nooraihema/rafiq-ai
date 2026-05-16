/**
 * src/core/layers/sanitizer.js
 * طبقة التطهير والإنقاذ النبضي الفوري لـ (رفيق-AI)
 * وظيفتها: منع الموت الصامت للإشارة وضمان وجود طاقة حية داخل الـ VRAM
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
            // شحن قيم تتراوح بين 0.05 و 0.15 (إشارة نفسية دافئة لا يمكن تصفيرها)
            this.antiZeroPulse[i] = 0.05 + Math.random() * 0.1;
        }
    }

    /**
     * تفحص التنسور، وإذا ثبت موته أو خلوه من الأبعاد، تعيد بناءه وحقنه بالنبض
     */
    sanitize(inputTensor, idName = "sanitized_pulse") {
        const safeShape = [1, this.embedDim];

        // 1. فحص الأبعاد وهيكل التنسور
        if (!inputTensor || !inputTensor.shape || inputTensor.shape.length !== 2 || inputTensor.shape[1] !== this.embedDim) {
            console.warn(`⚠️ [SANITIZER] لقطة حرجة: تم رصد تنسور مشوه، جاري إعادة البناء الهيكلي الحين.`);
            return new Tensor(this.antiZeroPulse, {
                shape: safeShape,
                op: 'const',
                id: `${idName}_rescue_${Date.now()}`
            });
        }

        // 2. إذا كان التنسور يحتوي على بيانات محلياً (JS) وميتة كلها أصفار
        if (inputTensor.data) {
            let isDead = true;
            for (let i = 0; i < Math.min(inputTensor.data.length, 20); i++) {
                if (inputTensor.data[i] !== 0) {
                    isDead = false;
                    break;
                }
            }

            if (isDead) {
                console.warn(`🚨 [SANITIZER] تحذير صاعق: تم كشف إشارة ميتة (كلها أصفار) في الـ JS! جاري الصعق الكهربائي وحقن النبض عالي الطاقة.`);
                // استبدال الأصفار بالنبض الحي فوراً
                const dataCopy = new Float32Array(inputTensor.data.length);
                for(let i=0; i<dataCopy.length; i++) {
                    dataCopy[i] = this.antiZeroPulse[i % this.embedDim];
                }
                inputTensor.data = dataCopy;
            }
        }

        // 3. تأمين شيدر الطوارئ (تعديل العملية برمجياً داخل الـ Graph لضمان التنفيذ في الـ GPU)
        // إذا كانت العملية تؤدي إلى صفر، ندمج معها عملية إضافة محايدة بقيم حية
        if (inputTensor.op === 'const' || inputTensor.status === 'DEAD_EMPTY_BUFFER') {
            inputTensor.op = 'const'; // إجبار الـ Op على التثبيت
            if(!inputTensor.data) {
                inputTensor.data = this.antiZeroPulse;
            }
        }

        return inputTensor;
    }
}
