// /core/linguistic_brain.js
// LinguisticBrain v2.0 - Hybrid Insight Integration
// This version integrates the legacy KnowledgeAtomizer as a supplementary analysis
// layer to enrich the final ComprehensiveInsight with additional data points.

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import { SynthesisEngine } from '../analysis_engines/synthesis_engine.js';
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

// --- [إضافة جديدة] استيراد المحرك القديم ---
// تأكد من أن هذا المسار صحيح بالنسبة لهيكل مشروعك
import { atomize } from '../hippocampus/KnowledgeAtomizer.js'; 

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDictionariesPath = path.join(__dirname, '../dictionaries');
const baseProtocolsPath = path.join(__dirname, '../protocols');
// --- [إضافة جديدة] مسار قاعدة المعرفة القديمة ---
const legacyKBPath = path.join(__dirname, '../knowledge/knowledge_base.js');


const DEFAULT_OPTIONS = {
  debug: true,
  dictionaryPaths: {
    affixes: 'affixes.js',
    emotional_anchors: 'emotional_anchors.js',
    intensity_analyzer: 'intensity_analyzer.js',
    psychological_concepts_engine: 'psychological_concepts_engine.js',
    psychological_patterns_hyperreal: 'psychological_patterns_hyperreal.js',
    behavior_values_defenses: 'behavior_values_defenses.js',
    generative_responses_engine: 'generative_responses_engine.js',
    stop_words: 'stop_words.js',
    emotional_dynamics_engine: 'emotional_dynamics_engine.js'
  },
  protocolsPath: baseProtocolsPath
};

export class LinguisticBrain {
    constructor(memorySystem, opts = {}) {
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.protocols = {};
        this.legacyKnowledgeBase = null; // --- [إضافة جديدة] ---
        this.engines = { semantic: null, emotion: null, synthesis: null, catharsis: null };
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log('[Brain.init] Step 1: Starting dictionary loading...');
        const dictFileNames = this.options.dictionaryPaths;
        const promises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
            const fullPath = path.join(baseDictionariesPath, fileName);
            try {
                const mod = await import(new URL(`file://${fullPath}`).href);
                this.dictionaries[key] = mod.default || mod;
                if (this.options.debug) console.log(`  ✅ Successfully loaded dictionary: '${key}'`);
            } catch (e) {
                console.error(`  ❌ CRITICAL: Failed to load dictionary '${key}' from ${fullPath}`, e);
                this.dictionaries[key] = null;
            }
        });
        await Promise.all(promises);
        console.log('[Brain.init] Step 1: Dictionary loading finished.');
        
        // --- [إضافة جديدة] تحميل قاعدة المعرفة القديمة لـ Atomizer ---
        console.log('[Brain.init] Step 1b: Loading legacy Knowledge Base for Atomizer...');
        try {
            const mod = await import(new URL(`file://${legacyKBPath}`).href);
            this.legacyKnowledgeBase = mod.default || mod;
            if (this.options.debug) console.log('  ✅ Successfully loaded legacy Knowledge Base.');
        } catch (e) {
            console.error('  ❌ CRITICAL: Failed to load legacy Knowledge Base. Atomizer will not function.', e);
            this.legacyKnowledgeBase = {};
        }

        // ... (منطق تحميل البروتوكولات)
        try {
            const fs = await import('fs');
            if (fs.existsSync(this.options.protocolsPath)) {
                const protocolFiles = fs.readdirSync(this.options.protocolsPath).filter(file => file.endsWith('.js'));
                 const protocolPromises = protocolFiles.map(async (file) => {
                    const protocolPath = path.join(this.options.protocolsPath, file);
                    try {
                        const mod = await import(new URL(`file://${protocolPath}`).href);
                        const protocol = mod.default || mod;
                        if (protocol.tag) this.protocols[protocol.tag] = protocol;
                    } catch (e) { /* ... */ }
                });
                await Promise.all(protocolPromises);
                 if (this.options.debug) console.log(`  ✅ Successfully loaded ${protocolFiles.length} protocols.`);
            }
        } catch(e) { /* ... */ }

        console.log('\n[Brain.init] Step 2: Validating required dictionaries before engine instantiation...');
        // ... (منطق التحقق يبقى كما هو)
        
        console.log('\n[Brain.init] Step 3: Instantiating analysis engines...');
        // ... (منطق إنشاء المحركات يبقى كما هو)

        this._isInitialized = true;
        console.log(`\n🎉 LinguisticBrain initialized successfully.`);
        return this;
    }

    async analyze(rawText, context = {}) {
        if (!this._isInitialized) {
            console.error("LinguisticBrain is not initialized. Call init() before using analyze().");
            return null;
        }

        const start = Date.now();
        if (this.options.debug) console.log('\n[Brain.analyze] Starting analysis pipeline...');
        
        // --- Pipeline: New Generation Engines ---
        if (this.options.debug) console.log('  [1/4] Running New Generation Engines (Semantic, Emotion, Synthesis)...');
        const semanticMap = this.engines.semantic.analyze(rawText);
        if (this.options.debug) console.log('    - SemanticEngine Output:', { concepts: semanticMap.allConcepts });

        const emotionProfile = this.engines.emotion.analyze(rawText, {
            previousEmotion: context.previousEmotion || null
        });
        if (this.options.debug) console.log('    - EmotionEngine Output:', { primary: emotionProfile.primaryEmotion, dissonance: emotionProfile.dissonance.dissonanceScore });

        const synthesisProfile = this.engines.synthesis.analyze({
            semanticMap: semanticMap,
            emotionProfile: emotionProfile
        });
        if (this.options.debug) console.log('    - SynthesisEngine Output:', { pattern: synthesisProfile.dominantPattern?.pattern_id, conflict: synthesisProfile.coreConflict?.tension_id });

        // --- Pipeline Step: Legacy Atomizer Consultation ---
        if (this.options.debug) console.log('  [2/4] Running Legacy Atomizer for supplementary insights...');
        let atomizedInsight = null;
        try {
            if (!this.legacyKnowledgeBase || Object.keys(this.legacyKnowledgeBase).length === 0) {
                throw new Error("Legacy Knowledge Base not loaded.");
            }
            atomizedInsight = atomize(rawText, {
                CONCEPTS_MAP: this.legacyKnowledgeBase.CONCEPTS_MAP,
                INTENSITY_MODIFIERS: this.legacyKnowledgeBase.INTENSITY_MODIFIERS,
                MOTIVATIONAL_MAP: this.legacyKnowledgeBase.MOTIVATIONAL_MAP,
                recentMessages: context.recentMessages || []
            });
             if (this.options.debug) console.log('    ✅ Legacy Atomizer ran successfully. Found subtext:', atomizedInsight?.subtextIntents);
        } catch (e) {
            console.error("    ❌ Error running legacy KnowledgeAtomizer:", e);
        }

        // --- Pipeline Step: Fusing All Insights ---
        if (this.options.debug) console.log('  [3/4] Fusing all insights into a single comprehensive object...');
        const comprehensiveInsight = {
            rawText,
            timestamp: new Date().toISOString(),
            // New engines' outputs
            semanticMap,
            emotionProfile,
            synthesisProfile,
            // Enrich with legacy data
            legacyData: {
                subtext: atomizedInsight?.subtextIntents || [],
                relations: atomizedInsight?.relations || [],
                dissonanceFlags: atomizedInsight?.dissonanceFlags || [],
                tags: atomizedInsight?.tags || [],
                atomId: atomizedInsight?.atomId || null
            },
            _meta: {
                durationMs: Date.now() - start
            }
        };

        if (this.options.debug) console.log('  [4/4] Pipeline finished. Comprehensive Insight generated.');
        return comprehensiveInsight;
    }

    async generateResponse(comprehensiveInsight) {
        if (!this._isInitialized) {
            console.error("LinguisticBrain is not initialized. Cannot generate response.");
            return null;
        }
        if (!comprehensiveInsight) {
            return this.engines.catharsis.generateResponse({
                rawText: "",
                semanticMap: { conceptInsights: {} },
                emotionProfile: { primaryEmotion: { name: 'neutral', score: 1 } },
                synthesisProfile: { cognitiveHypotheses: [] }
            });
        }
        if (this.options.debug) console.log('\n[Brain.generateResponse] Handing off to CatharsisEngine...');
        return this.engines.catharsis.generateResponse(comprehensiveInsight);
    }

    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        if (!insight) return null;
        
        const response = await this.generateResponse(insight);
        return { insight, response };
    }
}

export default LinguisticBrain;
