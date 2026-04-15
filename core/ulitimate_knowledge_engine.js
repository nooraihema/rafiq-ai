
/**
 * /core/ultimate_knowledge_engine.js
 * UltimateKnowledgeEngine v11.2 - Sovereign Cognitive Brain (Workspace Fixed)
 * وظيفته: التعلم الذاتي وبناء العلاقات المنطقية وحقنها في الفضاء الموحد.
 */

import { normalizeArabic, tokenize } from './utils.js';

export class UltimateKnowledgeEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [KnowledgeEngine v11.2] جاري تهيئة محرك الاستيعاب المعرفي السيادي...", "color: #00E5FF; font-weight: bold;");

        // ربط القواميس بأسماء مرنة لضمان عدم حدوث Undefined
        this.stopWords = dictionaries.stopWords || new Set();
        this.conceptsDict = dictionaries.concepts || dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {};
        this.synonyms = dictionaries.synonyms || dictionaries.generative_responses_engine?.LEXICAL_POOLS?.synonyms || {};

        // بنية الرسم البياني المعرفي
        this.knowledgeGraph = {
            nodes: {}, 
            edges: [], 
            index: {}  
        };

        // أنواع الروابط المنطقية
        this.RELATION_TYPES = {
            CAUSALITY: ["يؤدي إلى", "يؤدي الى", "يسبب", "ينتج عنه", "بيسبب", "بيؤدي"],
            SYMPTOM: ["من أعراضه", "من اعراضه", "يظهر كـ", "علامته", "بيظهر في"],
            TREATMENT: ["يعالج", "يخفف", "يساعد في", "بيقلل", "بيخفف"],
            CORRELATION: ["يرتبط بـ", "يرتبط ب", "له علاقة بـ", "له علاقه ب"]
        };

        this.NEGATIONS = ["لا", "مش", "لم", "لن", "ما", "غير"];
    }

    /**
     * هضم النص وتحويله لخبرة
     */
    async digest(text, workspace = null) {
        if (!text || typeof text !== 'string') return { learned: 0, inferred: 0 };

        console.log("%c[Learning Session] جاري امتصاص المعرفة...", "color: #00E5FF;");
        
        try {
            const sentences = text.split(/[.؟!\n]/).filter(s => s.trim().length > 5);
            let learnedCount = 0;

            for (const sentence of sentences) {
                const facts = this._parseSentence(sentence);
                facts.forEach(fact => {
                    this._integrate(fact);
                    learnedCount++;
                });
            }

            const inferred = this._infer();

            // حقن البيانات في الـ Workspace بأمان
            if (workspace && workspace.state) {
                workspace.sovereignGraph = this.knowledgeGraph;
                workspace.state.knowledgeSize = this.knowledgeGraph.edges.length;
            }

            return { learned: learnedCount, inferred: inferred.length };

        } catch (err) {
            console.error("❌ [KnowledgeEngine Digest Error]:", err);
            return { learned: 0, inferred: 0 };
        }
    }

    _parseSentence(sentence) {
        try {
            const clean = normalizeArabic(sentence.toLowerCase());
            const results = [];

            for (const [type, keywords] of Object.entries(this.RELATION_TYPES)) {
                for (const key of keywords) {
                    if (clean.includes(key)) {
                        const isNegated = this._hasNegation(clean, key);
                        const parts = clean.split(key);
                        if (parts.length < 2) continue;

                        const subject = this._resolveConcept(parts[0]);
                        const objectsText = parts[1];
                        
                        // تقسيم المفاعيل المتعددة
                        const objects = objectsText.split(/و|،|,/).map(o => this._resolveConcept(o));

                        objects.forEach(obj => {
                            if (subject && obj && subject !== obj) {
                                results.push({
                                    subject,
                                    relation: type,
                                    object: obj,
                                    negated: isNegated,
                                    confidence: isNegated ? 0.4 : 0.85,
                                    raw: sentence.trim()
                                });
                            }
                        });
                    }
                }
            }
            return results;
        } catch (e) {
            return [];
        }
    }

    _resolveConcept(text) {
        if (!text) return null;
        const tokens = tokenize(text).filter(t => t.length > 2 && !this.stopWords.has(t));

        for (const word of tokens) {
            if (this.conceptsDict[word]) return word;
            for (const [id, syns] of Object.entries(this.synonyms)) {
                if (Array.isArray(syns) && syns.includes(word)) return id;
            }
        }

        const candidate = tokens[tokens.length - 1];
        if (!candidate) return null;

        if (!this.knowledgeGraph.nodes[candidate]) {
            this.knowledgeGraph.nodes[candidate] = { discovered: true, occurrences: 1 };
        }
        return candidate;
    }

    _hasNegation(text, relationWord) {
        const parts = text.split(relationWord);
        const before = parts[0] || "";
        return this.NEGATIONS.some(n => before.includes(n));
    }

    _integrate(fact) {
        const key = `${fact.subject}_${fact.relation}_${fact.object}`;
        if (!this.knowledgeGraph.index[key]) {
            this.knowledgeGraph.edges.push(fact);
            this.knowledgeGraph.index[key] = fact;
            console.log(`      ✨ [Learned]: ${fact.subject} -> ${fact.relation} -> ${fact.object}`);
        } else {
            this.knowledgeGraph.index[key].confidence = Math.min(0.99, this.knowledgeGraph.index[key].confidence + 0.05);
        }
    }

    _infer() {
        const newFacts = [];
        const map = {};

        this.knowledgeGraph.edges.forEach(e => {
            if (e.relation === "CAUSALITY" && !e.negated) {
                if (!map[e.subject]) map[e.subject] = [];
                map[e.subject].push(e.object);
            }
        });

        for (const a in map) {
            for (const b of map[a]) {
                if (map[b]) {
                    for (const c of map[b]) {
                        if (a !== c) {
                            const key = `${a}_INDIRECT_${c}`;
                            if (!this.knowledgeGraph.index[key]) {
                                const inferredFact = {
                                    subject: a, relation: "INDIRECT_CAUSALITY", object: c,
                                    confidence: 0.6, inferred: true
                                };
                                newFacts.push(inferredFact);
                                this.knowledgeGraph.edges.push(inferredFact);
                                this.knowledgeGraph.index[key] = inferredFact;
                                console.log(`      💡 [Inferred]: ${a} قد يؤدي لـ ${c}`);
                            }
                        }
                    }
                }
            }
        }
        return newFacts;
    }

    ask(concept) {
        const related = this.knowledgeGraph.edges.filter(
            e => e.subject === concept || e.object === concept
        );
        return { concept, connections: related, count: related.length };
    }
}

export default UltimateKnowledgeEngine;
