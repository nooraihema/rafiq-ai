/**
 * src/core/tokenizer.js
 * الوظيفة: تحويل النص البشري بناءً على القاموس الديناميكي المستخرج من الـ Dataset الحقيقية
 * الحماية المطلقة: إبراهيم شحات (مشروع رفيق-AI)
 */

export class Tokenizer {
    constructor(vocabSize = 5000) {
        this.vocabSize = vocabSize;
        this.vocab = new Map();
        this.inverseVocab = new Map();
        this.nextId = 1; // 0 محجوز للـ Padding/Unknown
        this.isLoadedFromDataset = false;
    }

    /**
     * دالة التطهير والتوحيد اللغوي
     */
    _normalize(text) {
        if (!text) return "";
        return text
            .trim()
            .toLowerCase()
            .replace(/[\u064B-\u0652]/g, "") // إزالة التشكيل
            .replace(/[أإآ]/g, "ا")          // توحيد الألف
            .replace(/ة/g, "ه")            // توحيد الهاء والتاء المربوطة
            .replace(/ى/g, "ي")            // توحيد الياء
            .replace(/[.,!؟?()\[\]-]/g, " ");// تنظيف الرموز
    }

    /**
     * 🔥 الدالة السحرية الجديدة: بناء القاموس من ملف الـ Dataset الحقيقي لمنع الخداع
     * استدعي هذه الدالة فوراً في الـ Runner أو الـ Core بعد تحميل الـ dataset.txt بنجاح
     */
    loadVocabularyFromDataset(datasetText) {
        if (!datasetText) return;
        
        console.log("%c🔮 [Tokenizer] جاري فحص الـ Dataset وبناء مصفوفة الرموز الحرة...", "color: #00ffff; font-weight: bold;");
        
        // تنظيف النص بالكامل وتقسيمه لكلمات فريدة
        const cleanDataset = this._normalize(datasetText);
        const uniqueWords = Array.from(new Set(cleanDataset.split(/\s+/))).filter(Boolean);
        
        // إعادة تهيئة القاموس بالكامل بناءً على داتا التدريب الحقيقية
        this.vocab.clear();
        this.inverseVocab.clear();
        this.nextId = 1;

        uniqueWords.forEach(word => {
            if (this.nextId < this.vocabSize) {
                this.vocab.set(word, this.nextId);
                this.inverseVocab.set(this.nextId, word);
                this.nextId++;
            }
        });

        this.isLoadedFromDataset = true;
        console.log(`%c🎯 [Tokenizer Complete] تم بناء القاموس الحقيقي بنجاح! عدد الكلمات النشطة: ${this.vocab.size}`, "color: #00ff00; font-weight: bold;");
    }

    getOrCreateId(word) {
        const cleanWord = this._normalize(word);
        if (!cleanWord) return 0;

        if (this.vocab.has(cleanWord)) {
            return this.vocab.get(cleanWord);
        }

        // لو القاموس مش محمل من الـ Dataset، بنخليه يسجل تتابعي مؤقتاً
        if (!this.isLoadedFromDataset && this.nextId < this.vocabSize) {
            const id = this.nextId++;
            this.vocab.set(cleanWord, id);
            this.inverseVocab.set(id, cleanWord);
            return id;
        }

        return 0; // رجع 0 (Unknown) لو الكلمة مش في الـ Dataset الأصلية لحماية الأوزان من الأصفار
    }

    encode(text) {
        const cleanText = this._normalize(text);
        const words = cleanText.split(/\s+/).filter(Boolean);
        
        const ids = words.map(word => this.getOrCreateId(word));
        
        console.log("%c📝 [Tokenizer Encode]", "color: #aa00aa;");
        console.log(`   -> النص: "${text}" | الـ IDs الحقيقية: [${ids.join(", ")}]`);
        
        return new Uint32Array(ids);
    }

    decode(ids) {
        return Array.from(ids)
            .map(id => this.inverseVocab.get(id) || "[UNK]")
            .join(" ");
    }
}
