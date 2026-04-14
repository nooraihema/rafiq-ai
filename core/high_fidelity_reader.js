

/**  
 * /core/high_fidelity_reader.js  
 * HighFidelityReader v3.0 - "The Relational Identity Engine"  
 * وظيفته: تشريح الكلمات وتحويلها لشبكة مترابطة (Contextual Mesh).  
 * الميزات: (Prefix+Stem+Suffix)، ربط الجيران (Prev/Next)، وحساب الأهمية النسبية.  
 */  
  
import { normalizeArabic, tokenize } from './utils.js';  
  
export class HighFidelityReader {  
    constructor(dictionaries = {}) {  
        console.log("%c🕸️ [HighFidelityReader v3.0] جاري تهيئة محرك العلاقات اللغوية...", "color: #009688; font-weight: bold;");  
          
        this.dictionaries = {  
            anchors: dictionaries.anchors || {},  
            concepts: dictionaries.concepts || {},  
            stopWords: dictionaries.stopWords || new Set(),  
            affixes: dictionaries.affixes || { prefixes: [], suffixes: [] }  
        };  
  
        // تجهيز أدوات التشريح الصرفي (سوابق ولواحق)  
        this.prefixes = (this.dictionaries.affixes.prefixes || []).map(p => p.value).sort((a,b) => b.length - a.length);  
        this.suffixes = (this.dictionaries.affixes.suffixes || []).map(s => s.value).sort((a,b) => b.length - a.length);  
    }  
  
    /**  
     * العملية الكبرى: القراءة المترابطة (Relational Reading)  
     */  
    async read(rawText) {  
        console.log("\n" + "%c[Relational Reading] STARTING...".repeat(1), "background: #009688; color: #fff; padding: 2px 5px;");  
          
        const cleanText = normalizeArabic(rawText.toLowerCase());  
        const rawTokens = tokenize(cleanText);  
  
        // المرحلة 1: بناء الهويات الفردية (كما في v2 ولكن مع Suffixes)  
        let sequence = rawTokens.map((token, index) => this._buildTokenIdentity(token, index, rawTokens));  
  
        // المرحلة 2: بناء شبكة العلاقات (Relational Linking) - "الذكاء الحقيقي"  
        console.log("   🔸 [Step 2: Linking] جاري ربط الكلمات وبناء شبكة التأثير...");  
        sequence = this._buildRelationalNetwork(sequence);  
  
        // المرحلة 3: حساب أوزان الأهمية (Importance Scoring)  
        sequence = this._calculateSalience(sequence);  
  
        console.log(`   ✅ [Reading Complete]: تم بناء شبكة من ${sequence.length} عقدة لغوية.`);  
          
        return {  
            sequence,   
            focusPoint: this._identifyPrimaryFocus(sequence),  
            unknownTokens: sequence.filter(t => t.classification.isUnknown),  
            _meta: { version: "3.0-Relational" }  
        };  
    }  
  
    /**  
     * تشريح الكلمة لـ (Prefix + Core + Suffix)  
     */  
    _morphologicalAnalysis(word) {  
        let core = word;  
        let prefix = null;  
        let suffix = null;  
  
        // 1. قص السوابق (Prefixes)  
        for (const p of this.prefixes) {  
            if (core.startsWith(p) && core.length > p.length + 2) {  
                prefix = p;  
                core = core.substring(p.length);  
                break;  
            }  
        }  
  
        // 2. قص اللواحق (Suffixes) - مثل: "هم"، "نا"، "ك"  
        for (const s of this.suffixes) {  
            if (core.endsWith(s) && core.length > s.length + 2) {  
                suffix = s;  
                core = core.substring(0, core.length - s.length);  
                break;  
            }  
        }  
  
        return { core, prefix, suffix };  
    }  
  
    _buildTokenIdentity(token, index, allTokens) {  
        const norm = normalizeArabic(token);  
        const { core, prefix, suffix } = this._morphologicalAnalysis(norm);  
          
        const isStop = this.dictionaries.stopWords.has(norm) || this.dictionaries.stopWords.has(core);  
        const isClin = !!(this.dictionaries.concepts[norm] || this.dictionaries.concepts[core]);  
        const isEmo = !!(this.dictionaries.anchors[norm] || this.dictionaries.anchors[core]);  
  
        return {  
            index,  
            original: token,  
            core: core,  
            affixes: { prefix, suffix },  
            classification: { isStop, isClin, isEmo, isUnknown: !isStop && !isClin && !isEmo },  
            role: this._guessRole(norm, core, isStop, isClin, isEmo),  
            relations: { prev: null, next: null, influences: [], influencedBy: [] }, // سيتم ملؤها في المرحلة 2  
            importance: 0.5 // افتراضي  
        };  
    }  
  
    /**  
     * بناء شبكة العلاقات (The Web)  
     */  
    _buildRelationalNetwork(sequence) {  
        return sequence.map((token, i) => {  
            const current = { ...token };  
              
            // 1. ربط الجيران  
            if (i > 0) current.relations.prev = sequence[i-1].original;  
            if (i < sequence.length - 1) current.relations.next = sequence[i+1].original;  
  
            // 2. منطق التأثير (Influence Logic)  
            // مثال: كلمات النفي تؤثر على ما بعدها  
            if (['مش', 'لا', 'ما'].includes(current.core)) {  
                if (sequence[i+1]) {  
                    current.relations.influences.push({ index: i+1, type: "NEGATION" });  
                    console.log(`      🔗 [Negation Link]: "${current.original}" -> "${sequence[i+1].original}"`);  
                }  
            }  
  
            // مثال: كلمات الشدة تؤثر على ما قبلها أو ما بعدها  
            if (['جدا', 'خالص', 'قوي'].includes(current.core)) {  
                if (sequence[i-1]) {  
                    current.relations.influences.push({ index: i-1, type: "AMPLIFICATION" });  
                    console.log(`      🔗 [Amplification Link]: "${current.original}" -> "${sequence[i-1].original}"`);  
                }  
            }  
  
            return current;  
        });  
    }  
  
    /**  
     * حساب "بروز" الكلمة (Salience) بناءً على دورها وعلاقاتها  
     */  
    _calculateSalience(sequence) {  
        return sequence.map(t => {  
            let score = 0.5;  
            if (t.classification.isClin) score += 0.4;  
            if (t.classification.isEmo) score += 0.3;  
            if (t.role === "IDENTITY_MARKER") score += 0.2;  
            if (t.classification.isStop) score -= 0.3;  
              
            // زيادة الوزن إذا كانت الكلمة "مؤثرة" (مثل جداً)  
            if (t.relations.influences.length > 0) score += 0.2;  
  
            return { ...t, importance: Math.min(1, Math.max(0.1, score)) };  
        });  
    }  
  
    _guessRole(norm, core, isStop, isClin, isEmo) {  
        if (isClin) return "CLINICAL_CONCEPT";  
        if (isEmo) return "EMOTIONAL_ANCHOR";  
        if (['انا', 'نحن', 'انت'].includes(norm)) return "IDENTITY_MARKER";  
        if (['مش', 'لا', 'لم'].includes(norm)) return "NEGATOR";  
        if (['جدا', 'قوي', 'خالص'].includes(norm)) return "INTENSIFIER";  
        return "GENERIC_TOKEN";  
    }  
  
    _identifyPrimaryFocus(sequence) {  
        const sorted = [...sequence].sort((a,b) => b.importance - a.importance);  
        return sorted[0];  
    }  
}  
  
export default HighFidelityReader;
