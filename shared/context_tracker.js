// context_tracker.js v9.0 - The Stateful Short-Term Memory Core
// Purpose: Maintain and analyze immediate conversational context.
// Adds: Management for dialogue state (state, layer, active_intent) to support the v9 engine.

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { DEBUG } from './config.js';
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================

const DEFAULT_MAX_HISTORY = 8;
const DECAY_BASE = 0.85;
const LOOP_DETECTION_WINDOW = 3;
const SUMMARY_WINDOW = 5;

/**
 * Helper: safe getter for nested values
 */
function safeGet(obj, path, fallback = undefined) {
    try {
        return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : fallback, obj);
    } catch (e) {
        return fallback;
    }
}

/**
 * Normalize a number into 0..1
 */
function clamp01(v) {
    if (Number.isFinite(v) === false) return 0;
    return Math.max(0, Math.min(1, v));
}

/**
 * Compute an exponential weight for index (0 newest, n oldest)
 */
function weightForIndex(index) {
    return Math.pow(DECAY_BASE, index);
}

/**
 * Produce a short textual summary from a list of emotive labels.
 */
function generateSimpleSummaryFromConcepts(conceptsArray) {
    if (!conceptsArray || conceptsArray.length === 0) return '';
    const counts = {};
    conceptsArray.forEach(c => counts[c] = (counts[c] || 0) + 1);
    const ordered = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    const top = ordered.slice(0, 3).map(([k, v]) => `${k}${v>1 ? `(${v})` : ''}`).join('، ');
    return top;
}

/**
 * Class: ContextTracker
 */
export class ContextTracker {
    constructor(userProfile = {}, opts = {}) {
        this.userId = safeGet(userProfile, 'id', 'anonymous');
        this.MAX_HISTORY = opts.maxHistory || userProfile.maxHistory || DEFAULT_MAX_HISTORY;
        if (opts.decayBase && typeof opts.decayBase === 'number') {
            this.decayBase = clamp01(opts.decayBase);
        } else {
            this.decayBase = DECAY_BASE;
        }
        this.history = Array.isArray(userProfile.shortMemory) ? [...userProfile.shortMemory] : [];
        this._lastAnalyzedState = null;

        // =================================================================
        // SECTION: [V9 UPGRADE] DIALOGUE SESSION CONTEXT MANAGEMENT
        // This is the new short-term memory for the dialogue flow itself.
        // =================================================================
        this.sessionContext = {
            active_intent: null,
            state: 'greeting',
            layer: null,
            last_suggestion_id: null,
            turn_counter: 0
        };
        // Restore session context if it was saved in the user profile
        if (userProfile.sessionContext) {
            this.sessionContext = { ...this.sessionContext, ...userProfile.sessionContext };
        }
    }

    /**
     * [V9 UPGRADE] A dedicated method to update the session context.
     * Called by the main chat API after the engine returns a response.
     */
    updateSessionContext(nextSessionContext) {
        if (!nextSessionContext) return;
        this.sessionContext = { ...this.sessionContext, ...nextSessionContext };
        if (DEBUG) console.log(`[ContextTracker:${this.userId}] Session context updated =>`, this.sessionContext);
    }

    /**
     * [V9 UPGRADE] A getter to provide the current session context to the engine.
     */
    getSessionContext() {
        return { ...this.sessionContext }; // Return a copy
    }

    addTurn(fingerprint, responsePayload, opts = {}) {
        // [V9 UPGRADE] Increment the turn counter with each new turn.
        this.sessionContext.turn_counter += 1;

        const entry = {
            timestamp: new Date().toISOString(),
            user_fingerprint: fingerprint || null,
            ai_response: responsePayload || null,
            satisfaction: opts.satisfaction || null,
            meta: opts.extraMeta || {}
        };

        // [V9 UPGRADE] We can also store the state/layer of this specific turn.
        entry.meta.sessionContextAtTurn = this.getSessionContext();

        this.history.push(entry);

        if (this.history.length > this.MAX_HISTORY) {
            this.history.splice(0, this.history.length - this.MAX_HISTORY);
        }

        if (DEBUG) console.log(`[ContextTracker:${this.userId}] addTurn — history length:`, this.history.length);

        this._lastAnalyzedState = null;
    }

    markLastResponseSatisfaction(satisfaction) {
        if (!this.history.length) return false;
        const last = this.history[this.history.length - 1];
        last.satisfaction = satisfaction;
        this._lastAnalyzedState = null;
        return true;
    }

    computeEnergyIndexFromFingerprint(fingerprint) {
        if (!fingerprint) return 0.0;
        const text = safeGet(fingerprint, 'originalMessage', '') || '';
        const tokensCount = text.trim().split(/\s+/).filter(Boolean).length;
        const tokenScore = clamp01((tokensCount - 3) / 40);
        const intensity = clamp01(safeGet(fingerprint, 'primaryEmotion.intensity', 0.5));
        const punctuationBoost = /[!؟!?]{2,}/.test(text) ? 0.15 : 0;
        const energy = clamp01(0.45 * tokenScore + 0.45 * intensity + punctuationBoost);
        return parseFloat(energy.toFixed(3));
    }

    detectPatterns() {
        const patterns = {
            repeatedNeeds: {},
            repeatedConcepts: {},
            repeatedRecipes: {},
            stuckNeedsSequence: false,
            stuckConceptsSequence: false
        };
        const needsSeq = this.history.map(h => safeGet(h, 'user_fingerprint.inferredNeed', null)).filter(Boolean);
        const conceptsSeq = this.history.map(h => safeGet(h, 'user_fingerprint.concepts', [])).map(arr => arr.join('|'));
        const recipesSeq = this.history.map(h => safeGet(h, 'ai_response.recipe', [])).map(r => r.join('|'));
        needsSeq.forEach(n => patterns.repeatedNeeds[n] = (patterns.repeatedNeeds[n] || 0) + 1);
        conceptsSeq.forEach(c => patterns.repeatedConcepts[c] = (patterns.repeatedConcepts[c] || 0) + 1);
        recipesSeq.forEach(r => patterns.repeatedRecipes[r] = (patterns.repeatedRecipes[r] || 0) + 1);
        if (needsSeq.length >= LOOP_DETECTION_WINDOW) {
            const last = needsSeq.slice(-LOOP_DETECTION_WINDOW);
            patterns.stuckNeedsSequence = last.every(x => x === last[0]) && last[0] !== null;
        }
        if (conceptsSeq.length >= LOOP_DETECTION_WINDOW) {
            const lastC = conceptsSeq.slice(-LOOP_DETECTION_WINDOW);
            patterns.stuckConceptsSequence = lastC.every(x => x === lastC[0]) && lastC[0] !== '';
        }
        return patterns;
    }

    analyzeState() {
        if (this._lastAnalyzedState) return this._lastAnalyzedState;
        const state = {
            recent_concepts: new Map(),
            recent_needs: new Map(),
            recent_recipes: new Map(),
            is_stuck_in_loop: false,
            emotional_trend: 'stable',
            weightedIntensity: 0.0,
            averageEnergyIndex: 0.0,
            summary: '',
            satisfactionTrend: 'unknown',
            patterns: {},
            last_turn: this.history.length ? this.history[this.history.length - 1] : null
        };
        if (this.history.length === 0) {
            this._lastAnalyzedState = state;
            return state;
        }
        let weightedIntensitySum = 0, weightSum = 0, energySum = 0;
        let satisfactionCounts = { positive: 0, negative: 0, neutral: 0, unknown: 0 };
        for (let i = 0; i < this.history.length; i++) {
            const idxFromEnd = this.history.length - 1 - i;
            const turn = this.history[idxFromEnd];
            const w = Math.pow(this.decayBase, i);
            const intensity = clamp01(safeGet(turn, 'user_fingerprint.primaryEmotion.intensity', 0.5));
            weightedIntensitySum += intensity * w;
            weightSum += w;
            const energy = this.computeEnergyIndexFromFingerprint(turn.user_fingerprint);
            energySum += energy * w;
            const concepts = Array.isArray(safeGet(turn, 'user_fingerprint.concepts', [])) ? turn.user_fingerprint.concepts : [];
            concepts.forEach(c => state.recent_concepts.set(c, (state.recent_concepts.get(c) || 0) + w));
            const need = safeGet(turn, 'user_fingerprint.inferredNeed', null);
            if (need) state.recent_needs.set(need, (state.recent_needs.get(need) || 0) + w);
            const recipe = safeGet(turn, 'ai_response.recipe', []) || [];
            const recipeKey = Array.isArray(recipe) ? recipe.join('|') : String(recipe);
            if (recipeKey) state.recent_recipes.set(recipeKey, (state.recent_recipes.get(recipeKey) || 0) + w);
            const s = turn.satisfaction || 'unknown';
            if (!satisfactionCounts[s]) satisfactionCounts[s] = 0;
            satisfactionCounts[s] += 1 * w;
        }
        state.weightedIntensity = weightSum > 0 ? parseFloat((weightedIntensitySum / weightSum).toFixed(3)) : 0.0;
        state.averageEnergyIndex = weightSum > 0 ? parseFloat((energySum / weightSum).toFixed(3)) : 0.0;
        const oldest = this.history[0];
        const newest = this.history[this.history.length - 1];
        const oldestIntensity = clamp01(safeGet(oldest, 'user_fingerprint.primaryEmotion.intensity', state.weightedIntensity));
        const newestIntensity = clamp01(safeGet(newest, 'user_fingerprint.primaryEmotion.intensity', state.weightedIntensity));
        if (newestIntensity <= oldestIntensity - 0.2) state.emotional_trend = 'improving';
        else if (newestIntensity >= oldestIntensity + 0.2) state.emotional_trend = 'worsening';
        else state.emotional_trend = 'stable';
        const pos = satisfactionCounts.positive || 0;
        const neg = satisfactionCounts.negative || 0;
        if (pos > neg * 1.2 && pos > 0) state.satisfactionTrend = 'positive';
        else if (neg > pos * 1.2 && neg > 0) state.satisfactionTrend = 'negative';
        else state.satisfactionTrend = (pos === 0 && neg === 0) ? 'unknown' : 'mixed';
        const conceptsSorted = [...state.recent_concepts.entries()].sort((a,b) => b[1]-a[1]).map(e => e[0]);
        const needsSorted = [...state.recent_needs.entries()].sort((a,b) => b[1]-a[1]).map(e => e[0]);
        const summaryParts = [];
        if (needsSorted.length) summaryParts.push(`الاحتياجات: ${needsSorted.slice(0,3).join('، ')}`);
        if (conceptsSorted.length) summaryParts.push(`الموضوعات: ${conceptsSorted.slice(0,5).join('، ')}`);
        summaryParts.push(`اتجاه المشاعر: ${state.emotional_trend}`);
        summaryParts.push(`مؤشر الطاقة: ${state.averageEnergyIndex}`);
        state.summary = summaryParts.join(' | ');
        const patterns = this.detectPatterns();
        state.patterns = patterns;
        state.is_stuck_in_loop = patterns.stuckNeedsSequence || patterns.stuckConceptsSequence;
        state.last_turn_info = {
            timestamp: safeGet(newest, 'timestamp', null),
            last_intensity: clamp01(safeGet(newest, 'user_fingerprint.primaryEmotion.intensity', 0)),
            last_concepts: safeGet(newest, 'user_fingerprint.concepts', []),
            last_need: safeGet(newest, 'user_fingerprint.inferredNeed', null),
            last_recipe: safeGet(newest, 'ai_response.recipe', []),
            last_satisfaction: newest.satisfaction || null
        };
        this._lastAnalyzedState = state;
        if (DEBUG) console.log(`[ContextTracker:${this.userId}] analyzeState =>`, {
            weightedIntensity: state.weightedIntensity, avgEnergy: state.averageEnergyIndex,
            emotionalTrend: state.emotional_trend, summary: state.summary,
            is_stuck_in_loop: state.is_stuck_in_loop
        });
        return state;
    }

    generateContextualSummary() {
        const analysis = this.analyzeState();
        return {
            shortSummary: analysis.summary,
            dominantNeeds: [...analysis.recent_needs.entries()].sort((a,b) => b[1]-a[1]).slice(0,3).map(e => e[0]),
            dominantConcepts: [...analysis.recent_concepts.entries()].sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]),
            emotionalTrend: analysis.emotional_trend,
            energyIndex: analysis.averageEnergyIndex,
            isStuck: analysis.is_stuck_in_loop,
            patterns: analysis.patterns,
            // [V9 UPGRADE] Add the current session context to the summary
            sessionContext: this.getSessionContext()
        };
    }

    serialize() {
        // [V9 UPGRADE] Serialization now also includes the session context.
        return {
            history: JSON.parse(JSON.stringify(this.history)),
            sessionContext: this.sessionContext
        };
    }

    restoreFromSerialized(serializedData = {}) {
        // [V9 UPGRADE] Restoration now also restores the session context.
        if (serializedData && typeof serializedData === 'object') {
            if (Array.isArray(serializedData.history)) {
                this.history = [...serializedData.history].slice(-this.MAX_HISTORY);
            }
            if (typeof serializedData.sessionContext === 'object') {
                this.sessionContext = { ...this.sessionContext, ...serializedData.sessionContext };
            }
        }
        this._lastAnalyzedState = null;
        return true;
    }
}
