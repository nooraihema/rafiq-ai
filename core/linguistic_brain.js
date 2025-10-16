// /core/linguistic_brain.js
// LinguisticBrain v2.1 - Robust Hybrid Insight Integration with Dynamic Paths
// This version uses dynamic path resolution for ALL external modules to ensure
// stability in serverless environments and integrates the legacy KnowledgeAtomizer.

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import { SynthesisEngine } from '../analysis_engines/synthesis_engine.js';
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

import path from 'path';
import { fileURLToPath } from 'url';

// --- Dynamic Path Construction ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDictionariesPath = path.join(__dirname, '../dictionaries');
const baseProtocolsPath = path.join(__dirname, '../protocols');
const legacyAtomizerPath = path.join(__dirname, '../hippocampus/KnowledgeAtomizer.js');
const legacyKBPath = path.join(__dirname, '../knowledge/knowledge_base.js');


const DEFAULT_OPTIONS = {
  debug: true,
  dictionaryFileNames: {
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

// Variable to hold the dynamically imported legacy function
let atomize = null;


export class LinguisticBrain {
    constructor(memorySystem, opts = {}) {
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.protocols = {};
        this.legacyKnowledgeBase = null;
        this.engines = { semantic: null, emotion: null, synthesis: null, catharsis: null };
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log('[Brain.init] Step 1: Starting new dictionary loading...');
        const dictFileNames = this.options.dictionaryFileNames;
        const dictionaryPromises = Object.entries(dictFileNames).map(async ([key, fileName]) => {
            const fullPath = path.join(baseDictionariesPath, fileName);
            try {
                const mod = await import(new URL(`file://${fullPath}`).href);
                this.dictionaries[key] = mod.default || mod;
                if (this.options.debug) console.log(`  ✅ Successfully loaded new dictionary: '${key}'`);
            } catch (e) {
                console.error(`  ❌ CRITICAL: Failed to load new dictionary '${key}' from ${fullPath}`, e);
                this.dictionaries[key] = null;
            }
        });
        await Promise.all(dictionaryPromises);
        console.log('[Brain.init] Step 1: New dictionary loading finished.');

        console.log('[Brain.init] Step 1b: Loading legacy Atomizer and its Knowledge Base...');
        try {
            const atomizerModule = await import(new URL(`file://${legacyAtomizerPath}`).href);
            atomize = atomizerModule.atomize;
            if (this.options.debug) console.log('  ✅ Successfully loaded legacy Atomizer module.');

            const kbModule = await import(new URL(`file://${legacyKBPath}`).href);
            this.legacyKnowledgeBase = kbModule.default || kbModule;
            if (this.options.debug) console.log('  ✅ Successfully loaded legacy Knowledge Base.');
        } catch (e) {
            console.error('  ❌ CRITICAL: Failed to load legacy Atomizer or its KB. Legacy insights will be disabled.', e);
            atomize = () => null; // Assign a dummy function to prevent crashes
            this.legacyKnowledgeBase = {};
        }

        // ... (Protocol loading logic remains the same)

        console.log('\n[Brain.init] Step 2: Validating required dictionaries for new engines...');
        const requiredForSemantic = {
            CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP,
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY,
            STOP_WORDS_SET: this.dictionaries.stop_words,
            EMOTIONAL_ANCHORS_DICTIONARY: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY
        };

        for (const [key, value] of Object.entries(requiredForSemantic)) {
            if (!value) {
                throw new Error(`Initialization failed: SemanticEngine is missing required part '${key}'.`);
            }
            if (this.options.debug) console.log(`  ✅ Validation passed for SemanticEngine requirement: '${key}'`);
        }
        console.log('[Brain.init] Step 2: All validations passed.');

        console.log('\n[Brain.init] Step 3: Instantiating analysis engines...');
        try {
            this.engines.semantic = new SemanticEngine(requiredForSemantic);
            if (this.options.debug) console.log("  ✅ SemanticEngine instantiated.");

            this.engines.emotion = new EmotionEngine({
                EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors,
                INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer
            });
            if (this.options.debug) console.log("  ✅ EmotionEngine instantiated.");

            this.engines.synthesis = new SynthesisEngine({
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal,
                BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses
            });
            if (this.options.debug) console.log("  ✅ SynthesisEngine instantiated.");

            this.engines.catharsis = new CatharsisEngine(
                { GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine },
                this.protocols,
                this.memory
            );
            if (this.options.debug) console.log("  ✅ CatharsisEngine instantiated.");

        } catch(e) {
            console.error("  ❌ CRITICAL: Error during engine instantiation.", e);
            throw e;
        }
        console.log('[Brain.init] Step 3: All engines instantiated successfully.');

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
        if (this.options.debug) console.log('  [1/4] Running New Generation Engines...');
        const semanticMap = this.engines.semantic.analyze(rawText);
        const emotionProfile = this.engines.emotion.analyze(rawText, {
            previousEmotion: context.previousEmotion || null
        });
        const synthesisProfile = this.engines.synthesis.analyze({
            semanticMap: semanticMap,
            emotionProfile: emotionProfile
        });

        // --- Pipeline: Legacy Atomizer Consultation ---
        if (this.options.debug) console.log('  [2/4] Running Legacy Atomizer for supplementary insights...');
        let atomizedInsight = null;
        try {
            if (typeof atomize !== 'function') {
                throw new Error("Legacy Atomizer function is not available.");
            }
            atomizedInsight = atomize(rawText, {
                CONCEPTS_MAP: this.legacyKnowledgeBase?.CONCEPTS_MAP,
                INTENSITY_MODIFIERS: this.legacyKnowledgeBase?.INTENSITY_MODIFIERS,
                MOTIVATIONAL_MAP: this.legacyKnowledgeBase?.MOTIVATIONAL_MAP,
                recentMessages: context.recentMessages || []
            });
            if (this.options.debug) console.log('    ✅ Legacy Atomizer ran successfully. Found subtext:', atomizedInsight?.subtextIntents);
        } catch (e) {
            console.error("    ❌ Error running legacy KnowledgeAtomizer:", e);
        }

        // --- Pipeline: Fusing All Insights ---
        if (this.options.debug) console.log('  [3/4] Fusing all insights...');
        const comprehensiveInsight = {
            rawText,
            timestamp: new Date().toISOString(),
            semanticMap,
            emotionProfile,
            synthesisProfile,
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
