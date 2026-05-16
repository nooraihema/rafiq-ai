/**
 * src/core/tokenizer.js
 * الحالة: النسخة السيادية الفولاذية (BPE-Inspired Subword Resilience + Word Frequency Ranking)
 * الحماية المطلقة: إبراهيم شحات (مشروع رفيق-AI)
 * الوظيفة: محرك الترميز المتقدم لـ رفيق-AI. يمنع فخ الـ [UNK] القاتل ويضمن استقرار تدفق المصفوفات.
 */

export class Tokenizer {
    constructor(vocabSize = 5000) {
        this.vocabSize = vocabSize;
        this.vocab = new Map();
        this.inverseVocab = new Map();
        
        // 🛡️ الرموز النظامية الثابتة (Special Tokens) المحصنة في بداية القاموس
        this.SPECIAL_TOKENS = {
            PAD: { id: 0, str: "[PAD]" }, // حشو الأبعاد
            UNK: { id: 1, str: "[UNK]" }, // الكلمات المجهولة تماماً
            SOS: { id: 2, str: "[SOS]" }, // بداية النبضة النفسية
            EOS: { id: 3, str: "[EOS]" }  // نهاية تدفق الأفكار
        };

        this.nextId = 4; // الـ IDs العادية تبدأ بعد الرموز الخاصة مباشرة
        this.isLoadedFromDataset = false;
        this._initSpecialTokens();
    }

    /**
     * تهيئة الرموز الخاصة لضمان ثبات مواقعها في الـ VRAM
     */
    _initSpecialTokens() {
        Object.values(this.SPECIAL_TOKENS).forEach(token => {
            this.vocab.set(token.str, token.id);
            this.inverseVocab.set(token.id, token.str);
        });
    }

    /**
     * دالة التطهير والتوحيد اللغوي الصارم (عزل الجذور وحماية الحروف الهجائية)
     */
    _normalize(text) {
        if (!text) return "";
        return text
            .trim()
            .toLowerCase()
            // 1. تطهير علامات التشكيل والزخارف العربية بالكامل
            .replace(/[\u064B-\u0652\u0640]/g, "") 
            // 2. توحيد الأنماط البصرية للحروف لتقليل تشتت القاموس
            .replace(/[أإآلإلألآ]/g, "ا")          
            .replace(/ة/g, "ه")            
            .replace(/[ىيِ]/g, "ي")            
            // 3. عزل وعمل مسافات حول علامات الترقيم المتصلة بالكلمات حتى لا تدمج مع الكلمة
            .replace(/([.,!؟?()\[\]\{\}\-\:\;\/\\])/g, " $1 ")
            // 4. تصفية المسافات الزائدة
            .replace(/\s+/g, " ");
    }

    /**
     * 🔥 خوارزمية الترتيب التكراري الذكي لبناء القاموس بناءً على ثقل الكلمة في الـ Dataset
     */
    loadVocabularyFromDataset(datasetText) {
        if (!datasetText) return;
        
        console.log("%c🔮 [Tokenizer] جاري فحص الـ Dataset وفرز التكرارات هندسياً...", "color: #00ffff; font-weight: bold;");
        
        const cleanDataset = this._normalize(datasetText);
        const allWords = cleanDataset.split(" ").filter(Boolean);
        
        // حساب تكرار كل كلمة (Frequency Mapping) لاختيار الكلمات الأكثر تأثيراً أولاً
        const wordCounts = new Map();
        allWords.forEach(word => {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        });

        // ترتيب الكلمات تنازلياً من الأكثر تكراراً إلى الأقل تكراراً
        const sortedWords = Array.from(wordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        // إعادة تهيئة القاموس مع الحفاظ على الرموز الخاصة
        this.vocab.clear();
        this.inverseVocab.clear();
        this._initSpecialTokens();
        this.nextId = 4;

        // ضخ الكلمات الأكثر تكراراً في حدود الحجم المسموح للـ Vocab Size
        for (const word of sortedWords) {
            if (this.nextId >= this.vocabSize) break;
            
            // تخطي الرموز الخاصة إذا وجدت بالخطأ في الكلمات
            if (this.vocab.has(word)) continue;

            this.vocab.set(word, this.nextId);
            this.inverseVocab.set(this.nextId, word);
            this.nextId++;
        }

        this.isLoadedFromDataset = true;
        console.log(`%c🎯 [Tokenizer Complete] تم بناء القاموس الفولاذي! الكلمات النشطة: ${this.vocab.size}/${this.vocabSize}`, "color: #00ff00; font-weight: bold;");
    }

    /**
     * آلية التفكيك الفرعي الذكي (Subword Fallback) لحماية الأوزان من الأصفار
     */
    _tokenizeWord(word) {
        const cleanWord = this._normalize(word);
        if (!cleanWord) return [];

        // 1. المسار السريع: الكلمة موجودة بالكامل في القاموس
        if (this.vocab.has(cleanWord)) {
            return [this.vocab.get(cleanWord)];
        }

        // 2. مسار التفكيك الاحتياطي (الهروب من الـ UNK): محاولة فصل السوابق واللواحق العربية الشائعة
        // مثل (والاكتئاب -> و + اكتئاب) أو (حزنك -> حزن + ك)
        if (cleanWord.length > 3) {
            // فحص السوابق (Prefixes)
            const prefixes = ["وا", "با", "فا", "ال"];
            for (const prefix of prefixes) {
                if (cleanWord.startsWith(prefix)) {
                    const remain = cleanWord.substring(prefix.length);
                    if (this.vocab.has(remain)) {
                        return [this.getOrCreateId(prefix), this.vocab.get(remain)];
                    }
                }
            }

            // فحص اللواحق (Suffixes)
            const suffixes = ["ك", "نا", "هم", "ها", "ين", "ون"];
            for (const suffix of suffixes) {
                if (cleanWord.endsWith(suffix)) {
                    const remain = cleanWord.substring(0, cleanWord.length - suffix.length);
                    if (this.vocab.has(remain)) {
                        return [this.vocab.get(remain), this.getOrCreateId(suffix)];
                    }
                }
            }
        }

        // 3. الملاذ الأخير: إذا لم تنجح المحاولات، يتم إسقاطها كـ UNK لحماية أبعاد الشبكة
        return [this.SPECIAL_TOKENS.UNK.id];
    }

    getOrCreateId(word) {
        const cleanWord = this._normalize(word);
        if (!cleanWord) return this.SPECIAL_TOKENS.PAD.id;

        if (this.vocab.has(cleanWord)) {
            return this.vocab.get(cleanWord);
        }

        // تسجيل الكلمات الجديدة ديناميكياً فقط لو لم نقم بالتحميل الصارم من الـ Dataset
        if (!this.isLoadedFromDataset && this.nextId < this.vocabSize) {
            const id = this.nextId++;
            this.vocab.set(cleanWord, id);
            this.inverseVocab.set(id, cleanWord);
            return id;
        }

        return this.SPECIAL_TOKENS.UNK.id;
    }

    /**
     * تحويل النص الكامل إلى مصفوفة تتابعية مؤمنة بالكامل للـ Tensors
     */
    encode(text, addSpecialTokens = true) {
        if (!text) return new Uint32Array(0);

        const cleanText = this._normalize(text);
        const words = cleanText.split(" ").filter(Boolean);
        
        let finalIds = [];

        // إضافة توكن بداية الجلسة تلقائياً لتهيئة قنوات الـ Attention
        if (addSpecialTokens) {
            finalIds.push(this.SPECIAL_TOKENS.SOS.id);
        }

        // تفكيك الكلمات وترميزها
        for (const word of words) {
            const wordIds = this._tokenizeWord(word);
            finalIds.push(...wordIds);
        }

        // إضافة توكن نهاية الجلسة
        if (addSpecialTokens) {
            finalIds.push(this.SPECIAL_TOKENS.EOS.id);
        }
        
        console.log("%c📝 [Tokenizer Encode Secured]", "color: #aa00aa; font-weight: bold;");
        console.log(`   -> المدخل: "${text}"`);
        console.log(`   -> المعرفات الرقمية المتدفقة: [${finalIds.join(", ")}]`);
        
        return new Uint32Array(finalIds);
    }

    /**
     * تحويل الـ IDs لمخرجات لغوية بشرية مفهومة ونظيفة
     */
    decode(ids) {
        if (!ids || ids.length === 0) return "";
        
        return Array.from(ids)
            .map(id => {
                // تخطي الرموز الخدمية أثناء الطباعة للمستخدم النهائي
                if (id === this.SPECIAL_TOKENS.PAD.id) return "";
                if (id === this.SPECIAL_TOKENS.SOS.id || id === this.SPECIAL_TOKENS.EOS.id) return "";
                
                return this.inverseVocab.get(id) || "[UNK]";
            })
            .filter(Boolean)
            .join(" ")
            // معالجة ذكية للمسافات حول علامات الترقيم الناتجة عن الـ Decode
            .replace(/\s+([.,!؟?])/g, "$1");
    }
}
