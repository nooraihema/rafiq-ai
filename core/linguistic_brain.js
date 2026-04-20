
/**
 * /core/linguistic_brain_v4.js
 * LinguisticBrain v11.0 - [GOLD PLATE MASTER ORCHESTRATOR]
 * المايسترو النهائي: ينسق العمل بين المطبخ المركزي (LexicalProcessor) والمحركات التحليلية.
 */

import { normalizeArabic, tokenize } from './utils.js';
import LexicalProcessor from './lexical_processor.js'; // المطبخ المركزي الجديد
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import SynthesisEngine from '../analysis_engines/synthesis_engine.js'; 
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';
import { AttentionLayer } from './attention_layer.js';
import { ReasoningEngine } from './reasoning_engine.js';
import { KnowledgeEngine } from './knowledge_engine.js';
import { HighFidelityReader } from './high_fidelity_reader.js';
import { StateSynthesizer } from './state_synthesizer.js';
import { UnifiedWorkspace } from './workspace.js';

export class LinguisticBrain {
    constructor(memorySystem, opts = {}) {
        console.log("%c🧠 [Brain] LinguisticBrain v11.0 Initializing...", "color:#2196F3; font-weight:bold;");
        this.memory = memorySystem;
        this.dictionaries = {};
        this.engines = {};
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log("%c🚀 [Boot] Building Cognitive Infrastructure...", "color:#4CAF50; font-weight:bold;");

        // 1. القواميس بيتم تحميلها داخل LexicalProcessor تلقائياً،
        // ولكن بنحملها هنا برضه عشان نمررها للمحركات اللي محتاجة "تعريفات" أو "أنماط"
        const dictFiles = {
            concepts: 'psychological_concepts_engine.js',
            patterns: 'psychological_patterns_hyperreal.js',
            behaviors: 'behavior_values_defenses.js',
            dynamics: 'emotional_dynamics_engine.js',
            generative: 'generative_responses_engine.js'
        };

        await Promise.all(Object.entries(dictFiles).map(async ([key, fileName]) => {
            try {
                const mod = await import(`../dictionaries/${fileName}`);
                this.dictionaries[key] = mod.default || mod;
                console.log(`   ✅ Asset Ready: ${key}`);
            } catch (e) {
                console.error(`   ❌ Failed to load asset: ${key}`, e);
            }
        }));

        // 2. تهيئة المحركات وربطها بـ "طبق الذهب"
        console.log("%c⚙️ [Registry] Connecting Engines to Gold-Plate Pipeline...", "color:#673AB7; font-weight:bold;");

        this.engines.reader = new HighFidelityReader(); // يبني نسيج العقد البصري
        this.engines.attention = new AttentionLayer(); // يوزع طاقة التركيز
        this.engines.synthesizer = new StateSynthesizer(); // يحلل الموقف
        
        // المحركات التحليلية (تستلم التعريفات للمرجعية)
        this.engines.semantic = new SemanticEngine({
            CONCEPT_DEFINITIONS: this.dictionaries.concepts?.CONCEPT_DEFINITIONS
        });
        
        this.engines.emotion = new EmotionEngine(); 
        
        this.engines.synthesis = new SynthesisEngine({
            PATTERNS: this.dictionaries.patterns,
            BEHAVIOR_VALUES: this.dictionaries.behaviors
        });

        this.engines.reasoning = new ReasoningEngine(this.memory);
        this.engines.knowledge = new KnowledgeEngine();

        this.engines.catharsis = new CatharsisEngine({
            GENERATIVE_ENGINE: this.dictionaries.generative,
            EMOTIONAL_DYNAMICS: this.dictionaries.dynamics,
            PATTERNS: this.dictionaries.patterns
        }, {}, this.memory);

        console.log("%c✅ [Brain] All Engines Optimized for Gold-Plate Ingestion", "color:#4CAF50; font-weight:bold;");
        this._isInitialized = true;
        return this;
    }

    // =========================================================
    // 🌌 دورة حياة التحليل الموحدة (The Gold Pipeline)
    // =========================================================
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) return null;

        const workspace = new UnifiedWorkspace(rawText);

        try {
            console.log(`\n%c🌌 [Workspace] Energy Detected: "${rawText}"`, "color:#607D8B; font-weight:bold;");

            // الخطوة 0 [الجوهرية]: إنتاج طبق الذهب من المطبخ المركزي
            console.log("%c🍴 [Lexical] Generating Gold Plate...", "color:#FFD700;");
            workspace.goldPlate = LexicalProcessor.process(rawText);

            // الخطوة 1: بناء النسيج البصري وتوزيع الانتباه (للعرض والتحليل المكاني)
            await this.engines.reader.ingest(workspace);
            await this.engines.attention.process(workspace);
            
            // الخطوة 2: تحليل الحالة الموقفية (Intent & Trajectory)
            await this.engines.synthesizer.synthesize(workspace, this.memory?.workingMemory || []);

            console.log("%c⚡ [Process] Activating Specialized Cognitive Engines...", "color:#FF9800;");

            // الخطوة 3: التحليل العميق (يستهلك طبق الذهب مباشرة)
            // المحركات دلوقتى مبرمجة تقرأ من workspace.goldPlate
            await Promise.all([
                this.engines.semantic.analyze(workspace, context),
                this.engines.emotion.analyze(workspace, context)
            ]);

            // الخطوة 4: التركيب النفسي (يربط كل ما سبق)
            await this.engines.synthesis.analyze(workspace, context);
            
            // الخطوة 5: اتخاذ القرار الاستراتيجي
            await this.engines.reasoning.computeStrategicInsight(workspace);

            // الخطوة 6: استشارة المكتبة العلمية
            workspace.clinicalInsights = await this.engines.knowledge.consultLibrary(workspace);

            // طباعة التقرير النهائي
            workspace.generateFieldReport();

            return workspace;

        } catch (e) {
            console.error("🚨 [Pipeline Failure]:", e);
            return null;
        }
    }

    async generateResponse(workspace) {
        try {
            console.log("%c💬 [Response] Brewing Expressive Catharsis...", "color:#9C27B0; font-weight:bold;");
            const response = await this.engines.catharsis.generateResponse(workspace);
            
            console.log(`🎯 [Intent]: ${workspace.state.finalIntent}`);
            console.log(`🧬 [DNA]: ${response.emotionalDNA?.name}`);

            return response;
        } catch (e) {
            console.error("❌ Response Error:", e);
            return { responseText: "أنا معاك، كمل كلامك." };
        }
    }

    async process(rawText, context = {}) {
        const workspace = await this.analyze(rawText, context);
        if (!workspace) return { response: { responseText: "خطأ في المعالجة." } };
        const response = await this.generateResponse(workspace);
        return { insight: workspace, response };
    }
}

export default LinguisticBrain;
