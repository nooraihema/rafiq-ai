/**
 * src/core/generator.js
 * الوظيفة: محول الأرقام إلى نصوص (The Voice of Akasha)
 * التحديث: إرسال بيانات تفصيلية للـ Logs (Raw Data)
 */

export class AkashaGenerator {
    constructor(engine) {
        this.engine = engine;
        this.vocab = [];
        this.wordToId = new Map();
        this.idToWord = new Map();
    }

    // بناء القاموس من ملف الـ dataset.txt
    async buildVocabFromText(text) {
        const words = [...new Set(text.split(/[\s\n,.;!?]+/))].filter(w => w.length > 0);
        
        this.vocab = words;
        words.forEach((word, index) => {
            this.wordToId.set(word, index);
            this.idToWord.set(index, word);
        });
        
        console.log(`[Vocab] تم تحميل ${this.vocab.length} كلمة فريدة.`);
    }

    // دالة التنبؤ بالكلمة القادمة
    async generate(inputBuffer) {
        // تشغيل المحرك على الـ GPU
        const results = await this.engine.run(inputBuffer);
        
        if (!results || results.length === 0) {
            return { word: "خطأ في المعالجة", raw: [] };
        }

        // البحث عن أعلى قيمة (Argmax) لمعرفة الكلمة الأكثر احتمالية
        let maxIdx = 0;
        let maxVal = -Infinity;
        
        for (let i = 0; i < results.length; i++) {
            if (results[i] > maxVal) {
                maxVal = results[i];
                maxIdx = i;
            }
        }

        // تحويل الرقم لكلمة من القاموس
        const vocabIdx = maxIdx % this.vocab.length;
        const selectedWord = this.idToWord.get(vocabIdx) || "أكاشا";

        // تجهيز عينة من المخرجات الخام للـ Log (أول 5 أرقام مثلاً)
        // بنعمل .slice عشان مناخدش المصفوفة كلها لو كانت كبيرة جداً
        const rawSample = Array.from(results.slice(0, 5)).map(n => n.toFixed(4));

        // نرجع كائن (Object) فيه كل التفاصيل
        return {
            word: selectedWord,
            confidence: maxVal.toFixed(4),
            index: maxIdx,
            raw: rawSample
        };
    }
}
