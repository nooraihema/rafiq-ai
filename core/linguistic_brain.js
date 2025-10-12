// /core/linguistic_brain.js
// LinguisticBrain v1.0 - The Conductor
// The central mastermind of the cognitive architecture. It doesn't perform analysis itself;
// it orchestrates the flow of data through a pipeline of specialized analysis engines,
// synthesizes a comprehensive insight, and triggers the final response generation.

import { normalizeArabic, tokenize } from './utils.js';
import { SemanticEngine } from '../analysis_engines/semantic_engine.js';
import { EmotionEngine } from '../analysis_engines/emotion_engine.js';
import { SynthesisEngine } from '../analysis_engines/synthesis_engine.js';
import { CatharsisEngine } from '../analysis_engines/catharsis_engine.js';

export class LinguisticBrain {
    constructor(dictionaries, protocols, memorySystem) {
        if (!dictionaries || !protocols || !memorySystem) {
            throw new Error("LinguisticBrain requires dictionaries, protocols, and a memory system.");
        }
        
        this.dictionaries = dictionaries;
        this.protocols = protocols;
        this.memory = memorySystem;

        // --- [تعديل جوهري] إنشاء نسخ من المحركات المتخصصة ---
        this.engines = {
            semantic: new SemanticEngine({
                CONCEPT_MAP: this.dictionaries.psychological_concepts_engine.CONCEPT_MAP,
                AFFIX_DICTIONARY: this.dictionaries.affixes.AFFIX_DICTIONARY,
                STOP_WORDS_SET: this.dictionaries.stop_words.STOP_WORDS_SET,
                EMOTIONAL_ANCHORS_DICTIONARY: this.dictionaries.emotional_anchors.EMOTIONAL_DICTIONARY
            }),
            emotion: new EmotionEngine({
                EMOTIONAL_ANCHORS: this.dictionaries.emotional_anchors,
                INTENSITY_ANALYZER: this.dictionaries.intensity_analyzer
            }),
            synthesis: new SynthesisEngine({
                PATTERNS: this.dictionaries.psychological_patterns_hyperreal,
                BEHAVIOR_VALUES: this.dictionaries.behavior_values_defenses
            }),
            catharsis: new CatharsisEngine(
                { GENERATIVE_ENGINE: this.dictionaries.generative_responses_engine },
                this.protocols,
                this.memory
            )
        };

        this._isInitialized = true;
    }

    /**
     * [تعديل جوهري] 
     * The main analysis pipeline. Orchestrates the specialized engines in sequence.
     * @param {string} rawText - The user's raw message.
     * @param {Object} [context={}] - Optional conversation context (e.g., previous emotion).
     * @returns {Promise<Object>} A comprehensive insight object.
     */
    async analyze(rawText, context = {}) {
        if (!this._isInitialized) {
            console.warn("LinguisticBrain is not initialized. Analysis may be incomplete.");
            return null;
        }

        const start = Date.now();
        
        // --- Pipeline Step 1: Semantic Analysis ---
        // "What does the user mean?"
        const semanticMap = this.engines.semantic.analyze(rawText);

        // --- Pipeline Step 2: Emotional Analysis ---
        // "How does the user feel?"
        const emotionProfile = this.engines.emotion.analyze(rawText, {
            previousEmotion: context.previousEmotion || null
        });

        // --- Pipeline Step 3: Cognitive Synthesis ---
        // "What is the underlying story? Why do they feel this way?"
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
     * [إضافة جديدة]
     * The final step: takes the comprehensive insight and generates a response.
     * @param {Object} comprehensiveInsight - The full output from the analyze method.
     * @returns {Promise<Object>} The final response object.
     */
    async generateResponse(comprehensiveInsight) {
        if (!comprehensiveInsight) {
            // Fallback for safety
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
     * A convenience method to run the full pipeline from text to response.
     * @param {string} rawText - The user's raw message.
     * @param {Object} [context={}] - Optional conversation context.
     * @returns {Promise<{insight: Object, response: Object}>}
     */
    async process(rawText, context = {}) {
        const insight = await this.analyze(rawText, context);
        const response = await this.generateResponse(insight);
        return { insight, response };
    }
}

// default export convenience
export default LinguisticBrain;
