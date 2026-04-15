
/**
 * /core/ultimate_knowledge_engine.js
 * UltimateKnowledgeEngine v11.1 - The Sovereign Cognitive Brain
 * وظيفته: التعلم الذاتي من الكتب، بناء علاقات منطقية، وتغذية الـ Workspace بالحقائق العلمية.
 */

import { normalizeArabic, tokenize } from './utils.js';

export class UltimateKnowledgeEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [KnowledgeEngine v11.1] جاري تهيئة محرك الاستيعاب المعرفي...", "color: #00E5FF; font-weight: bold;");

        // ربط القواميس الأساسية للتعرف على المفاهيم
        this.stopWords = dictionaries.stopWords || new Set();
        this.conceptsDict = dictionaries.psychological_concepts_engine?.CONCEPT_MAP || {};
        this.synonyms = dictionaries.generative_responses_engine?.LEXICAL_POOLS?.synonyms || {};

        // بنية قاعدة البيانات المعرفية (الرسم البياني)
        this.knowledgeGraph = {
            nodes: {}, // المفاهيم (مثل: اكتئاب، قلق)
            edges: [], // العلاقات (مثل: يسبب، يعالج)
            index: {}  // فهرس سريع للبحث لمنع التكرار
        };

        // أنواع الروابط التي يستطيع "رفيق" فهمها من الكتب
        this.RELATION_TYPES = {
            CAUSALITY: ["يؤدي إلى", "يؤدي الى", "يسبب", "ينتج عنه", "بيسبب", "بيؤدي"],
            SYMPTOM: ["من أعراضه", "من اعراضه", "يظهر كـ", "علامته", "بيظهر في"],
            TREATMENT: ["يعالج", "يخفف", "يساعد في", "بيقلل", "بيخفف"],
            CORRELATION: ["يرتبط بـ", "يرتبط ب", "له علاقة بـ", "له علاقه ب"]
        };

        this.NEGATIONS = ["لا", "مش", "لم", "لن", "ما", "غير"];
    }

    /**
     * 🚀 المهمة: هضم نص الكتاب وتحويله لخبرة في الـ Workspace
     */
    async digest(text, workspace = null) {
        console.log("%c[Learning Session] جاري استخراج المعرفة من النص...", "color: #00E5FF;");
        
        // تقسيم النص لجمل نظيفة
        const sentences = text.split(/[.؟!\n]/).filter(s => s.trim().length > 5);
        let learnedCount = 0;

        for (const sentence of sentences) {
            const facts = this._parseSentence(sentence);
            facts.forEach(fact => {
                this._integrate(fact);
                learnedCount++;
            });
        }

        // إجراء الاستدلال المنطقي لربط الحقائق ببعضها
        const inferred = this._infer();

        // 🔥 حقن "الذاكرة السيادية" في الـ Workspace
        if (workspace) {
            workspace.knowledgeGraph = this.knowledgeGraph;
            workspace.state.knowledgeSize = this.knowledgeGraph.edges.length;
            console.log(`   ✅ [Workspace Enriched]: الذاكرة العلمية تضم الآن ${workspace.state.knowledgeSize} حقيقة.`);
        }

        return {
            learned: learnedCount,
            inferred: inferred.length
        };
    }

    /**
     * 🧠 المحلل اللغوي: يستخرج (مبتدأ -> علاقة -> خبر)
     */
    _parseSentence(sentence) {
        const clean = normalizeArabic(sentence.toLowerCase());
        const results = [];

        for (const [type, keywords] of Object.entries(this.RELATION_TYPES)) {
            for (const key of keywords) {
                if (clean.includes(key)) {
                    // كشف النفي
                    const isNegated = this._hasNegation(clean, key);

                    // تقسيم الجملة حول أداة الربط
                    const [left, right] = clean.split(key);

                    // حل المفهوم (التعرف على الكلمة الأساسية)
                    const subject = this._resolveConcept(left);
                    
                    // دعم تعدد المفاعيل (مثلاً: الاكتئاب يسبب الحزن، والعزلة، والتعب)
                    const objects = right.split(/و|،|,/).map(o => this._resolveConcept(o));

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
    }

    /**
     * مطابقة الكلمة مع القواميس النفسية لتحويلها لـ Concept ID
     */
    _resolveConcept(text) {
        const tokens = tokenize(text).filter(t => t.length > 2 && !this.stopWords.has(t));

        for (const word of tokens) {
            // 1. هل هي موجودة في قاموس المفاهيم؟
            if (this.conceptsDict[word]) return word;

            // 2. هل هي مترادفة لشيء نعرفه؟
            for (const [id, syns] of Object.entries(this.synonyms)) {
                if (syns.includes(word)) return id;
            }
        }

        // 3. إذا كانت كلمة جديدة ومهمة، نعتبرها "مفهوم مكتشف"
        const candidate = tokens[tokens.length - 1];
        if (!candidate) return null;

        if (!this.knowledgeGraph.nodes[candidate]) {
            this.knowledgeGraph.nodes[candidate] = { discovered: true, occurrences: 1 };
        }
        return candidate;
    }

    _hasNegation(text, relationWord) {
        const before = text.split(relationWord)[0];
        return this.NEGATIONS.some(n => before.includes(n));
    }

    /**
     * دمج الحقيقة في الرسم البياني وتحديث اليقين
     */
    _integrate(fact) {
        const key = `${fact.subject}_${fact.relation}_${fact.object}`;

        if (!this.knowledgeGraph.index[key]) {
            this.knowledgeGraph.edges.push(fact);
            this.knowledgeGraph.index[key] = fact;
            console.log(`      ✨ [Learned]: ${fact.subject} -> ${fact.relation} -> ${fact.object}`);
        } else {
            // إذا تكررت المعلومة، يرتفع اليقين بها (Reinforcement Learning)
            this.knowledgeGraph.index[key].confidence = Math.min(0.99, this.knowledgeGraph.index[key].confidence + 0.05);
        }
    }

    /**
     * 🧠 محرك الاستدلال: ربط النقاط المفقودة (Transitive Inference)
     */
    _infer() {
        const newFacts = [];
        const map = {};

        // بناء خريطة الجوار (Adjacency Map)
        this.knowledgeGraph.edges.forEach(e => {
            if (e.relation === "CAUSALITY" && !e.negated) {
                if (!map[e.subject]) map[e.subject] = [];
                map[e.subject].push(e.object);
            }
        });

        // قاعدة التعدي: لو A يسبب B و B يسبب C -> إذن A يسبب C
        for (const a in map) {
            for (const b of map[a]) {
                if (map[b]) {
                    for (const c of map[b]) {
                        if (a !== c) {
                            const key = `${a}_INDIRECT_${c}`;
                            if (!this.knowledgeGraph.index[key]) {
                                const inferredFact = {
                                    subject: a,
                                    relation: "INDIRECT_CAUSALITY",
                                    object: c,
                                    confidence: 0.6,
                                    inferred: true
                                };
                                newFacts.push(inferredFact);
                                this.knowledgeGraph.edges.push(inferredFact);
                                this.knowledgeGraph.index[key] = inferredFact;
                                console.log(`      💡 [Inferred]: ${a} قد يؤدي بشكل غير مباشر إلى ${c}`);
                            }
                        }
                    }
                }
            }
        }
        return newFacts;
    }

    /**
     * البحث في الذاكرة (سؤال رفيق)
     */
    ask(concept) {
        const related = this.knowledgeGraph.edges.filter(
            e => e.subject === concept || e.object === concept
        );
        return { concept, connections: related, count: related.length };
    }
}

export default UltimateKnowledgeEngine;
