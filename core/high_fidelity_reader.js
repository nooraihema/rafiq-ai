
/**
 * /core/high_fidelity_reader.js
 * HighFidelityReader v4.0 - Unified Workspace Constructor
 * وظيفته: تحويل النص الخام إلى "نسيج عقد" (Node Mesh) داخل الفضاء الموحد.
 * التغيير الجوهري: هذا المحرك هو الذي يضع حجر الأساس للـ Workspace.
 */

import { normalizeArabic, tokenize } from './utils.js';

export class HighFidelityReader {
    constructor(dictionaries = {}) {
        console.log("%c🕸️ [HighFidelityReader v4.0] تهيئة محرك بناء نسيج الوعي الموحد...", "color: #009688; font-weight: bold;");
        
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
     * العملية الكبرى: بناء أساس الفضاء الموحد (Workspace Ingestion)
     */
    async ingest(workspace) {
        console.log("\n" + "%c[Field Ingestion] STARTING...".repeat(1), "background: #009688; color: #fff; padding: 2px 5px;");
        
        if (!workspace || !workspace.rawText) {
            console.error("❌ [HighFidelityReader]: الـ Workspace غير صالح.");
            return;
        }

        const cleanText = normalizeArabic(workspace.rawText.toLowerCase());
        const rawTokens = tokenize(cleanText);

        // المرحلة 1: بناء الهويات الفردية للعقد (Nodes)
        console.log(`   🔸 [Step 1] جاري تشريح ${rawTokens.length} عقدة لغوية...`);
        let nodes = rawTokens.map((token, index) => this._buildTokenIdentity(token, index, rawTokens));

        // المرحلة 2: بناء نسيج العلاقات (Relational Web)
        console.log("   🔸 [Step 2] جاري نسج خيوط التأثير بين العقد...");
        nodes = this._buildRelationalNetwork(nodes);

        // المرحلة 3: حساب الأوزان الأولية للأهمية
        nodes = this._calculateSalience(nodes);

        // =========================================================
        // 🚀 حقن النسيج الأساسي في الـ Workspace
        // =========================================================
        workspace.nodes = nodes;
        workspace.state.wordCount = nodes.length;
        workspace.state.focusPoint = this._identifyPrimaryFocus(nodes);
        
        console.log(`   ✅ [Ingestion Complete]: تم بناء نسيج الفضاء الموحد بـ ${nodes.length} عقدة.`);
    }

    /**
     * تشريح الكلمة لـ (Prefix + Core + Suffix) - منطقك الكامل
     */
    _morphologicalAnalysis(word) {
        let core = word;
        let prefix = null;
        let suffix = null;

        for (const p of this.prefixes) {
            if (core.startsWith(p) && core.length > p.length + 2) {
                prefix = p;
                core = core.substring(p.length);
                break;
            }
        }

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

        // العقدة الآن تمتلك مساحات فارغة للمحركات القادمة (Semantic, Emotion, Attention)
        return {
            index,
            original: token,
            normalized: norm,
            core: core,
            affixes: { prefix, suffix },
            classification: { isStop, isClin, isEmo, isUnknown: !isStop && !isClin && !isEmo },
            role: this._guessRole(norm, core, isStop, isClin, isEmo),
            relations: { prev: null, next: null, influences: [], influencedBy: [] },
            salience: 0,   // سيملؤه محرك الانتباه
            semantic: null, // سيملؤه المحرك الدلالي
            emotion: null,  // سيملؤه محرك العواطف
            importance: 0.5 
        };
    }

    /**
     * بناء شبكة العلاقات - منطقك الكامل
     */
    _buildRelationalNetwork(sequence) {
        return sequence.map((token, i) => {
            const current = { ...token };
            
            if (i > 0) current.relations.prev = sequence[i-1].original;
            if (i < sequence.length - 1) current.relations.next = sequence[i+1].original;

            if (['مش', 'لا', 'ما'].includes(current.core)) {
                if (sequence[i+1]) {
                    current.relations.influences.push({ index: i+1, type: "NEGATION" });
                }
            }

            if (['جدا', 'خالص', 'قوي'].includes(current.core)) {
                if (sequence[i-1]) {
                    current.relations.influences.push({ index: i-1, type: "AMPLIFICATION" });
                }
            }

            return current;
        });
    }

    _calculateSalience(sequence) {
        return sequence.map(t => {
            let score = 0.5;
            if (t.classification.isClin) score += 0.4;
            if (t.classification.isEmo) score += 0.3;
            if (t.role === "IDENTITY_MARKER") score += 0.2;
            if (t.classification.isStop) score -= 0.3;
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
        return sorted[0]?.original;
    }
}

export default HighFidelityReader;
