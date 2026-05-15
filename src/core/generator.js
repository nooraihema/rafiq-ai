/**
 * src/core/generator.js
 * الوظيفة: محول الأرقام إلى نصوص (The Voice of Akasha)
 * التحديث: نظام التشخيص العميق وكشف "موت الإشارة" (Zero-Detection)
 */

export class AkashaGenerator {
    constructor(engine) {
        this.engine = engine;
        this.vocab = [];
        this.wordToId = new Map();
        this.idToWord = new Map();
    }

    /**
     * بناء القاموس مع تنظيف البيانات وضمان عدم التكرار
     */
    async buildVocabFromText(text) {
        // تنظيف النصوص من الرموز الزائدة لضمان نقاء القاموس
        const words = [...new Set(text.split(/[\s\n,.;!?]+/))]
            .filter(w => w.trim().length > 0);
        
        this.vocab = words;
        words.forEach((word, index) => {
            this.wordToId.set(word, index);
            this.idToWord.set(index, word);
        });
        
        console.log(`[Vocab System] تم بناء القاموس بنجاح: ${this.vocab.length} كلمة.`);
    }

    /**
     * دالة التوليد مع تحليل إحصائي للمخرجات (Logits Analysis)
     */
    async generate(inputBuffer) {
        // 1. استدعاء المحرك (الـ Runner والـ WebGPU)
        const results = await this.engine.run(inputBuffer);
        
        // 2. التحقق الأولي من وجود بيانات
        if (!results || results.length === 0) {
            return { word: "لا يوجد استجابة", raw: [0, 0, 0, 0, 0], health: "0%" };
        }

        // 3. تحليل "صحة الإشارة" (Signal Diagnostics)
        let sum = 0;
        let maxVal = -Infinity;
        let maxIdx = 0;
        let nonZeroCount = 0;

        for (let i = 0; i < results.length; i++) {
            const val = results[i];
            const absVal = Math.abs(val);
            
            sum += absVal;
            if (val !== 0) nonZeroCount++;
            
            if (val > maxVal) {
                maxVal = val;
                maxIdx = i;
            }
        }

        // حساب نسبة الصحة: لو 0% يبقى الـ GPU مطلع أصفار ميتة
        const signalHealth = ((nonZeroCount / results.length) * 100).toFixed(1);
        const meanSignal = (sum / results.length).toFixed(8);

        // 4. معالجة حالة "الأصفار القاتلة"
        let selectedWord;
        if (maxVal === -Infinity || (maxVal === 0 && nonZeroCount === 0)) {
            selectedWord = " [صمت مطبق - إشارة صفرية] ";
        } else {
            // ربط الـ Index بالقاموس (استخدام الـ Modulo لمنع الـ Out of bounds)
            const vocabIdx = maxIdx % this.vocab.length;
            selectedWord = this.idToWord.get(vocabIdx) || "كلمة غير معرفة";
        }

        // 5. تجهيز العينة للـ Logs (أول 10 قيم لتحليل أعمق)
        const rawSample = Array.from(results.slice(0, 10)).map(n => n.toFixed(6));

        // 6. إرجاع الكائن الكامل للـ UI
        return {
            word: selectedWord,
            confidence: maxVal.toFixed(6),
            index: maxIdx,
            raw: rawSample,
            stats: {
                health: `${signalHealth}%`,
                mean: meanSignal,
                isDead: nonZeroCount === 0
            }
        };
    }

    /**
     * تحويل النص لـ IDs (Helper للـ Runner)
     */
    encode(text) {
        return text.split(/\s+/).map(word => this.wordToId.get(word) || 0);
    }
}
