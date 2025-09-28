// intelligence/shared/context_tracker.js v9.2 - Mood-Aware State Management
// This version adds explicit tracking for the conversational mood (lastMood, moodStreak),
// providing the necessary state for advanced modules like the mood_analyzer and the Brain.
// It exposes safe getters and updates the serialization process to persist this new state.

import { DEBUG } from './config.js';

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
        this.history = Array.isArray(userProfile.shortMemory?.history) ? [...userProfile.shortMemory.history] : [];
        this._lastAnalyzedState = null;

        // DIALOGUE SESSION CONTEXT
        this.sessionContext = {
            active_intent: null,
            state: 'greeting',
            layer: null,
            last_suggestion_id: null,
            turn_counter: 0
        };
        if (userProfile.shortMemory?.sessionContext) {
            this.sessionContext = { ...this.sessionContext, ...userProfile.shortMemory.sessionContext };
        }

        // --- [NEW v9.2] MOOD STATE MEMORY ---
        this.moodState = {
            lastMood: 'supportive',
            moodStreak: 0,
            moodHistory: [],
        };
        // Restore mood state if it was saved in the user profile
        if (userProfile.shortMemory?.moodState) {
            this.moodState = { ...this.moodState, ...userProfile.shortMemory.moodState };
        }
    }

    // --- [NEW v9.2] GETTERS FOR MOOD STATE ---
    getLastMood() {
        return this.moodState.lastMood;
    }

    getMoodStreak() {
        return this.moodState.moodStreak;
    }

    // A single, safe method to get all user state needed by the linguistic core
    getUserState() {
        return { 
            lastMood: this.moodState.lastMood,
            moodStreak: this.moodState.moodStreak,
            moodHistory: [...this.moodState.moodHistory] // Return a copy
        };
    }
    
    // --- [NEW v9.2] SETTER FOR MOOD STATE ---
    // The Brain will return the updated state, and this method will set it.
    setUserState(newState) {
        if (newState.lastMood !== undefined) this.moodState.lastMood = newState.lastMood;
        if (newState.moodStreak !== undefined) this.moodState.moodStreak = newState.moodStreak;
        if (newState.moodHistory !== undefined) this.moodState.moodHistory = newState.moodHistory;
    }

    getHistory() {
        return this.history || [];
    }
    
    updateSessionContext(nextSessionContext) {
        if (!nextSessionContext) return;
        this.sessionContext = { ...this.sessionContext, ...nextSessionContext };
        if (DEBUG) console.log(`[ContextTracker:${this.userId}] Session context updated =>`, this.sessionContext);
    }

    getSessionContext() {
        return { ...this.sessionContext };
    }

    addTurn(fingerprint, responsePayload, opts = {}) {
        this.sessionContext.turn_counter += 1;

        const entry = {
            timestamp: new Date().toISOString(),
            user_fingerprint: fingerprint || null,
            ai_response: responsePayload || null,
            satisfaction: opts.satisfaction || null,
            meta: {
                ...opts.extraMeta,
                sessionContextAtTurn: this.getSessionContext()
            }
        };

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
        const patterns = { /* ... */ }; // Logic remains the same
        // ...
        return patterns;
    }

    analyzeState() {
        // ... (This extensive logic remains the same)
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
            sessionContext: this.getSessionContext()
        };
    }

    /**
     * [MODIFIED v9.2] Serialization now includes the mood state.
     */
    serialize() {
        return {
            history: JSON.parse(JSON.stringify(this.history)),
            sessionContext: this.sessionContext,
            moodState: this.moodState // <-- NEW
        };
    }

    restoreFromSerialized(serializedData = {}) {
        if (serializedData && typeof serializedData === 'object') {
            if (Array.isArray(serializedData.history)) {
                this.history = [...serializedData.history].slice(-this.MAX_HISTORY);
            }
            if (typeof serializedData.sessionContext === 'object') {
                this.sessionContext = { ...this.sessionContext, ...serializedData.sessionContext };
            }
            // [NEW v9.2] Restore mood state
            if (typeof serializedData.moodState === 'object') {
                this.moodState = { ...this.moodState, ...serializedData.moodState };
            }
        }
        this._lastAnalyzedState = null;
        return true;
    }
}
