/**
 * src/core/generator.js
 * الوظيفة: محول الأرقام إلى نصوص (The Voice of Akasha)
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
        // تنظيف النص وتقسيمه لكلمات فريدة
        const words = [...new Set(text.split(/[\s\n,.;!?]+/))].filter(w => w.length > 0);
        
        this.vocab = words;
        words.forEach((word, index) => {
            this.wordToId.set(word, index);
            this.idToWord.set(index, word);
        });
        
        console.log(`[Vocab] تم تحميل ${this.vocab.length} كلمة فريدة من الـ dataset.`);
    }

    // دالة التنبؤ بالكلمة القادمة
    async generate(inputBuffer) {
        const results = await this.engine.forward(inputBuffer);
        
        // البحث عن أعلى قيمة في النتائج (Argmax)
        let maxIdx = 0;
        let maxVal = -Infinity;
        
        for (let i = 0; i < results.length; i++) {
            if (results[i] > maxVal) {
                maxVal = results[i];
                maxIdx = i;
            }
        }

        // تحويل الرقم لكلمة من القاموس
        // بنستخدم "Module" لضمان إن الرقم ميطلعش برا حدود القاموس
        const vocabIdx = maxIdx % this.vocab.length;
        return this.idToWord.get(vocabIdx) || "؟";
    }
}
