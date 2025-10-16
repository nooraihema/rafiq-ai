// /core/linguistic_brain.js
// LinguisticBrain v3.0 - Pure Architecture
// This version removes all dependencies on legacy systems (like KnowledgeAtomizer)
// and relies entirely on the new, powerful, modular analysis engine pipeline.
// It also includes the fix for the SemanticEngine dependency injection.

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import { SynthesisEngine } from '../analysis_engines/synthesis_engine.js';
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDictionariesPath = path.join(__dirname, '../dictionaries');
const baseProtocolsPath = path.join(__dirname, '../protocols');

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

export class LinguisticBrain {
    constructor(memorySystem, opts = {}) {
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        this.dictionaries = {};
        this.protocols = {};
        this.engines = { semantic: null, emotion: null, synthesis: null, catharsis: null };
        this._isInitialized = false;
    }

    async init() {
        if (this._isInitialized) return this;

        console.log('[Brain.init] Step 1: Starting new dictionary loading...');
        const dictFileNames = this.options.dictionaryFileNames;
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

        // Protocol loading logic
        try {
            const fs = await import('fs');
            if (fs.existsSync(this.options.protocolsPath)) {
                const protocolFiles = fs.readdirSync(this.options.protocolsPath).filter(file => file.endsWith('.js'));
                 const protocolPromises = protocolFiles.map(async (file) => {
                    const protocolPath = path.join(this.options.protocolsPath, file);
                    try {
                        const mod = await import(new URL(`file://${protocolPath}`).href);
                        const protocol = mod.default || mod;
                        if (protocol.tag) {
                            this.protocols[protocol.tag] = protocol;
                            if (this.options.debug) console.log(`  ✅ Successfully loaded protocol: '${protocol.tag}'`);
                        }
                    } catch (e) {
                        console.error(`  ❌ CRITICAL: Failed to load protocol from ${protocolPath}`, e);
                    }
                });
                await Promise.all(protocolPromises);
            }
        } catch(e) {
            if (this.options.debug) console.warn(`LinguisticBrain: Could not load protocols directory. This may be normal in a browser environment.`, e.message || e);
        }

        console.log('\n[Brain.init] Step 2: Validating required dictionaries for new engines...');
        const requiredForSemantic = {
            CONCEPT_MAP: this.dictionaries.psychological_concepts_engine?.CONCEPT_MAP,
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY,
            STOP_WORDS_SET: this.dictionaries.stop_words,
            EMOTIONAL_ANCHORS_DICTIONARY: this.dictionaries.emotional_anchors?.EMOTIONAL_DICTIONARY,
            CONCEPT_DEFINITIONS: this.dictionaries.psychological_concepts_engine?.CONCEPT_DEFINITIONS // --- [الإصلاح النهائي] ---
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
        console.log(`\n🎉 LinguisticBrain initialized successfully with ${Object.keys(this.dictionaries).length} dictionaries and ${Object.keys(this.protocols).length} protocols.`);
        return this;
    }

    async analyze(rawText, context = {}) {
        if (!this._isInitialized) {
            console.error("LinguisticBrain is not initialized. Call init() before using analyze().");
            return null;
        }

        const start = Date.now();
        if (this.options.debug) console.log('\n[Brain.analyze] Starting analysis pipeline...');
        
        if (this.options.debug) console.log('  [1/3] Running SemanticEngine...');
        const semanticMap = this.engines.semantic.analyze(rawText);

        if (this.options.debug) console.log('  [2/3] Running EmotionEngine...');
        const emotionProfile = this.engines.emotion.analyze(rawText, {
            previousEmotion: context.previousEmotion || null
        });

        if (this.options.debug) console.log('  [3/3] Running SynthesisEngine...');
        const synthesisProfile = this.engines.synthesis.analyze({
            semanticMap: semanticMap,
            emotionProfile: emotionProfile
        });

        const comprehensiveInsight = {
            rawText,
            timestamp: new Date().toISOString(),
            semanticMap,
            emotionProfile,
            synthesisProfile,
            _meta: {
                durationMs: Date.now() - start
            }
        };

        if (this.options.debug) console.log('[Brain.analyze] Pipeline finished. Insight generated.');
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
