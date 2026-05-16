/**
 * src/core/tokenizer.js
 * FIXED VERSION - Safe OOV Handling + No Silent Corruption
 */

export class Tokenizer {
    constructor(vocabSize = 5000) {
        this.vocabSize = vocabSize;

        this.vocab = new Map();
        this.inverseVocab = new Map();

        // IDs محجوزة بشكل واضح
        this.PAD_ID = 0;
        this.UNK_ID = 1;

        this.nextId = 2;

        this.isLoadedFromDataset = false;
    }

    /**
     * تنظيف النص
     */
    _normalize(text) {
        if (!text) return "";

        return text
            .trim()
            .toLowerCase()
            .replace(/[\u064B-\u0652]/g, "")
            .replace(/[أإآ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي")
            .replace(/[.,!؟?()\[\]-]/g, " ")
            .replace(/\s+/g, " ");
    }

    /**
     * 🔥 تحميل القاموس من dataset
     */
    loadVocabularyFromDataset(datasetText) {
        if (!datasetText) return;

        console.log("%c🔮 [Tokenizer] Building dataset vocabulary...", "color:#00ffff;font-weight:bold");

        const cleanDataset = this._normalize(datasetText);
        const words = cleanDataset.split(" ").filter(Boolean);

        const uniqueWords = [...new Set(words)];

        this.vocab.clear();
        this.inverseVocab.clear();

        // Reset IDs (مع الحفاظ على النظام الآمن)
        this.nextId = 2;

        for (const word of uniqueWords) {
            if (this.nextId >= this.vocabSize) break;

            this.vocab.set(word, this.nextId);
            this.inverseVocab.set(this.nextId, word);
            this.nextId++;
        }

        this.isLoadedFromDataset = true;

        console.log(
            `%c✅ [Tokenizer] Vocabulary Ready: ${this.vocab.size} words`,
            "color:#00ff00;font-weight:bold"
        );
    }

    /**
     * 🔥 أهم دالة (FIXED OOV HANDLING)
     */
    getOrCreateId(word) {
        const cleanWord = this._normalize(word);

        if (!cleanWord) return this.PAD_ID;

        // موجود في القاموس
        if (this.vocab.has(cleanWord)) {
            return this.vocab.get(cleanWord);
        }

        // لو القاموس لم يُحمّل من dataset → يسمح بالتعلم المؤقت
        if (!this.isLoadedFromDataset && this.nextId < this.vocabSize) {
            const id = this.nextId++;

            this.vocab.set(cleanWord, id);
            this.inverseVocab.set(id, cleanWord);

            return id;
        }

        // 🚨 أهم نقطة: لا ترجع 0 أبداً للكلمات الحقيقية
        // 0 = PAD فقط
        return this.UNK_ID;
    }

    /**
     * 🔥 Encoding آمن بالكامل
     */
    encode(text) {
        const cleanText = this._normalize(text);
        const words = cleanText.split(" ").filter(Boolean);

        const ids = [];

        let unkCount = 0;

        for (const word of words) {
            const id = this.getOrCreateId(word);

            if (id === this.UNK_ID) unkCount++;
            ids.push(id);
        }

        console.log("%c📝 [Tokenizer Encode]", "color:#aa00aa;");
        console.log(`   -> input: "${text}"`);
        console.log(`   -> output IDs: [${ids.join(", ")}]`);
        console.log(`   -> UNK count: ${unkCount}`);

        return {
            tensor: new Uint32Array(ids),
            meta: {
                length: ids.length,
                unkCount,
                isClean: unkCount === 0
            }
        };
    }

    /**
     * 🔁 Decode آمن
     */
    decode(ids) {
        return Array.from(ids)
            .map(id => this.inverseVocab.get(id) || "[UNK]")
            .join(" ");
    }
}
