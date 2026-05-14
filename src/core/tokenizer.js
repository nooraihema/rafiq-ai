/**
 * src/core/tokenizer.js
 * الوظيفة: تحويل النص البشري إلى معرفات رقمية (Token IDs)
 * الحالة: نظام القاموس الثابت
 */

export class Tokenizer {
    constructor(vocabSize = 5000) {
        this.vocabSize = vocabSize;
        // القاموس - بنخزن فيه كل كلمة والرقم بتاعها
        this.vocab = new Map();
        this.inverseVocab = new Map();
        this.nextId = 1; // 0 محجوز للكلمات المجهولة (Padding/Unknown)

        // كلمات أساسية بنسجلها مسبقاً لضمان الدقة
        this._prefillVocab([
            "أنا", "أشعر", "بالسعادة", "بالوحدة", "غضب", "اكتئاب", "شك", "تجربه"
        ]);
    }

    _prefillVocab(words) {
        words.forEach(word => this.getOrCreateId(word));
    }

    getOrCreateId(word) {
        if (this.vocab.has(word)) {
            return this.vocab.get(word);
        }
        if (this.nextId < this.vocabSize) {
            const id = this.nextId++;
            this.vocab.set(word, id);
            this.inverseVocab.set(id, word);
            return id;
        }
        return 0; // رجع 0 لو القاموس اتملى
    }

    /**
     * تحويل الجملة لـ Uint32Array جاهز للـ Embedding
     */
    encode(text) {
        // تنظيف النص من الحركات والعلامات البسيطة
        const cleanText = text.replace(/[.,!؟]/g, " ");
        const words = cleanText.trim().split(/\s+/);
        
        const ids = words.map(word => this.getOrCreateId(word));
        return new Uint32Array(ids);
    }

    decode(ids) {
        return Array.from(ids)
            .map(id => this.inverseVocab.get(id) || "[UNK]")
            .join(" ");
    }
}
