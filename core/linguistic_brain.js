// /core/linguistic_brain.js
// LinguisticBrain v1.1 - The Conductor with Protocol Awareness
// This version is now self-sufficient in loading not just dictionaries,
// but also the entire library of therapeutic protocols.

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import { SynthesisEngine } from '../analysis_engines/synthesis_engine.js';
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

const DEFAULT_OPTIONS = {
  debug: false,
  dictionaryPaths: {
    affixes: '../dictionaries/affixes.js',
    emotionalAnchors: '../dictionaries/emotional_anchors.js',
    intensityAnalyzer: '../dictionaries/intensity_analyzer.js',
    conceptsEngine: '../dictionaries/psychological_concepts_engine.js',
    patternsHyperreal: '../dictionaries/psychological_patterns_hyperreal.js',
    behaviorValues: '../dictionaries/behavior_values_defenses.js',
    generative: '../dictionaries/generative_responses_engine.js',
    stopWords: '../dictionaries/stop_words.js',
    emotionalDynamics: '../dictionaries/emotional_dynamics_engine.js'
  },
  // Assumes protocols are individual JS files within this directory
  protocolsPath: '../protocols/' 
};

export class LinguisticBrain {
    constructor(memorySystem, opts = {}) {
        if (!memorySystem) {
            throw new Error("LinguisticBrain requires a memory system instance.");
        }
        
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.memory = memorySystem;
        
        this.dictionaries = {}; // Will be populated in init
        this.protocols = {};    // Will be populated in init

        this.engines = {
            semantic: null,
            emotion: null,
            synthesis: null,
            catharsis: null
        };
        this._isInitialized = false;
    }

    /**
     * Initializes the brain by loading all necessary dictionaries and protocols,
     * then instantiating the analysis engines. This must be called before analysis.
     */
    async init() {
        if (this._isInitialized) return this;

        // Step 1: Load all dictionary modules
        const dictPaths = this.options.dictionaryPaths;
        const dictionaryPromises = Object.entries(dictPaths).map(async ([key, path]) => {
            try {
                const mod = await import(path);
                this.dictionaries[key] = mod.default || mod;
            } catch (e) {
                if (this.options.debug) console.warn(`LinguisticBrain: Failed to load dictionary '${key}' from ${path}`, e.message || e);
            }
        });
        await Promise.all(dictionaryPromises);

        // Step 2: Load all protocol modules from the specified directory
        // Note: This requires a Node.js environment to access the filesystem.
        // For browser environments, protocols might need to be imported explicitly.
        try {
            const fs = await import('fs');
            const path = await import('path');
            const resolvedProtocolsPath = path.resolve(this.options.protocolsPath);
            
            if (fs.existsSync(resolvedProtocolsPath)) {
                const protocolFiles = fs.readdirSync(resolvedProtocolsPath).filter(file => file.endsWith('.js'));
                
                const protocolPromises = protocolFiles.map(async (file) => {
                    const protocolPath = path.join(this.options.protocolsPath, file);
                    try {
                        const mod = await import(protocolPath);
                        const protocol = mod.default || mod;
                        if (protocol.tag) {
                            this.protocols[protocol.tag] = protocol;
                        }
                    } catch (e) {
                        if (this.options.debug) console.warn(`LinguisticBrain: Failed to load protocol from ${protocolPath}`, e.message || e);
                    }
                });
                await Promise.all(protocolPromises);
            }
        } catch(e) {
            if (this.options.debug) console.warn(`LinguisticBrain: Could not load protocols. This may be normal in a browser environment.`, e.message || e);
        }

        // Step 3: Instantiate all analysis engines with the loaded resources
        this.engines.semantic = new SemanticEngine({
            CONCEPT_MAP: this.dictionaries.conceptsEngine?.CONCEPT_MAP,
            AFFIX_DICTIONARY: this.dictionaries.affixes?.AFFIX_DICTIONARY,
            STOP_WORDS_SET: this.dictionaries.stopWords?.STOP_WORDS_SET,
            EMOTIONAL_ANCHORS_DICTIONARY: this.dictionaries.emotionalAnchors?.EMOTIONAL_DICTIONARY
        });

        this.engines.emotion = new EmotionEngine({
            EMOTIONAL_ANCHORS: this.dictionaries.emotionalAnchors,
            INTENSITY_ANALYZER: this.dictionaries.intensityAnalyzer
        });

        this.engines.synthesis = new SynthesisEngine({
            PATTERNS: this.dictionaries.patternsHyperreal,
            BEHAVIOR_VALUES: this.dictionaries.behaviorValues
        });

        this.engines.catharsis = new CatharsisEngine(
            { GENERATIVE_ENGINE: this.dictionaries.generative },
            this.protocols,
            this.memory
        );

        this._isInitialized = true;
        if (this.options.debug) console.log(`LinguisticBrain initialized with ${Object.keys(this.dictionaries).length} dictionaries and ${Object.keys(this.protocols).length} protocols.`);
        return this;
    }

    /**
     * The main analysis pipeline. Orchestrates the specialized engines in sequence
     * to produce a comprehensive, multi-layered insight into the user's message.
     * @param {string} rawText - The user's raw message.
     * @param {Object} [context={}] - Optional conversation context (e.g., previous emotion).
     * @returns {Promise<Object|null>} A comprehensive insight object, or null if not initialized.
     */
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) {
            console.error("LinguisticBrain is not initialized. Call init() before using analyze().");
            return null;
        }

        const start = Date.now();
        
        // Pipeline Step 1: Semantic Analysis -> "What does the user mean?"
        const semanticMap = this.engines.semantic.analyze(rawText);

        // Pipeline Step 2: Emotional Analysis -> "How does the user feel?"
        const emotionProfile = this.engines.emotion.analyze(rawText, {
            previousEmotion: context.previousEmotion || null
        });

        // Pipeline Step 3: Cognitive Synthesis -> "What is the underlying story? Why?"
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

        return comprehensiveInsight;
    }

    /**
     * The final expressive step: takes the comprehensive insight and generates a response.
     * @param {Object} comprehensiveInsight - The full output from the analyze method.
     * @returns {Promise<Object|null>} The final response object, or null on error.
     */
    async generateResponse(comprehensiveInsight) {
        if (!this._isInitialized) {
            console.error("LinguisticBrain is not initialized. Cannot generate response.");
            return null;
        }
        if (!comprehensiveInsight) {
            // Fallback for safety to prevent crashes
            return this.engines.catharsis.generateResponse({
                rawText: "",
                semanticMap: { conceptInsights: {} },
                emotionProfile: { primaryEmotion: { name: 'neutral', score: 1 } },
                synthesisProfile: { cognitiveHypotheses: [] }
            });
        }
        return this.engines.catharsis.generateResponse(comprehensiveInsight);
    }

    /**
     * A convenience method to run the full pipeline from raw text to final response.
     * @param {string} rawText - The user's raw message.
     * @param {Object} [context={}] - Optional conversation context.
     * @returns {Promise<{insight: Object, response: Object}|null>}
     */
    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        if (!insight) return null;
        
        const response = await this.generateResponse(insight);
        return { insight, response };
    }
}

export default LinguisticBrain;
