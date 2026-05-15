/**
 * src/core/tokenizer.js
 * الوظيفة: تحويل النص البشري إلى معرفات رقمية (Token IDs) مع معالجة ذكية للغة العربية
 * الحالة: إصدار التطهير والتوافق اللغوي لـ رفيق-AI
 */

export class Tokenizer {
    constructor(vocabSize = 5000) {
        this.vocabSize = vocabSize;
        this.vocab = new Map();
        this.inverseVocab = new Map();
        this.nextId = 1; // 0 محجوز للـ Padding/Unknown

        // تسجيل الكلمات الأساسية بالصيغة القياسية (المعالجة)
        this._prefillVocab([
            "انا", "اشعر", "بالسعاده", "بالوحده", "غضب", "اكتئاب", "شك", "تجربه"
        ]);
    }

    /**
     * دالة سحرية لتطهير النص العربي وتوحيد الحروف لمنع اختلاف الـ IDs
     */
    _normalize(text) {
        if (!text) return "";
        return text
            .trim()
            .toLowerCase()
            // إزالة التشكيل (الفتحة، الضمة، الكسرة، التنوين)
            .replace(/[\u064B-\u0652]/g, "")
            // توحيد الألفات (أ، إ، آ -> ا)
            .replace(/[أإآ]/g, "ا")
            // توحيد التاء المربوطة والهاء (ة -> ه)
            .replace(/ة/g, "ه")
            // توحيد الياء (ى -> ي)
            .replace(/ى/g, "ي")
            // تنظيف علامات الترقيم
            .replace(/[.,!؟?()\[\]-]/g, " ");
    }

    _prefillVocab(words) {
        words.forEach(word => {
            const cleanWord = this._normalize(word);
            this.getOrCreateId(cleanWord);
        });
    }

    getOrCreateId(word) {
        const cleanWord = this._normalize(word);
        if (!cleanWord) return 0;

        if (this.vocab.has(cleanWord)) {
            return this.vocab.get(cleanWord);
        }
        if (this.nextId < this.vocabSize) {
            const id = this.nextId++;
            this.vocab.set(cleanWord, id);
            this.inverseVocab.set(id, cleanWord);
            return id;
        }
        return 0; 
    }

    /**
     * تحويل الجملة لـ Uint32Array مع حماية الحروف
     */
    encode(text) {
        const cleanText = this._normalize(text);
        // تقسيم النص بناءً على المسافات
        const words = cleanText.split(/\s+/).filter(Boolean);
        
        const ids = words.map(word => this.getOrCreateId(word));
        
        console.log("%c📝 [Tokenizer Debug] تفاصيل التشفير اللغوي الحالية:", "color: #00aaaa; font-weight: bold;");
        console.log(`   -> النص الأصلي: "${text}"`);
        console.log(`   -> النص بعد التوحيد: "${cleanText}"`);
        console.log(`   -> الـ IDs الناتجة: [${ids.join(", ")}]`);
        
        return new Uint32Array(ids);
    }

    decode(ids) {
        return Array.from(ids)
            .map(id => this.inverseVocab.get(id) || "[UNK]")
            .join(" ");
    }
}
