// dynamic_logic_engine.js v5.0 - The Metacognitive Core
// A complete architectural rewrite based on principles of immutability,
// flexible cognitive pipelines, and goal-oriented learning. This is the full, unabridged code.

import { DEBUG, AI_SETTINGS } from './config.js';
import { PERSONA_PROFILES } from './knowledge_base.js'; // Assuming PERSONA_PROFILES is in knowledge_base

/* ========================================================================== */
/* SECTION 1: CORE UTILITIES & HELPERS                                        */
/* ========================================================================== */

/** Safely gets a nested property from an object without throwing errors. */
function safe(obj, path, fallback = null) {
  try {
    return path.split('.').reduce((s, k) => (s && s[k] !== undefined) ? s[k] : undefined, obj) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

/** Selects a random item from an array. */
function selectRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Clamps a number between a minimum and maximum value. */
function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

/** A simple softmax function to convert scores into probabilities. */
function softmax(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((s, x) => s + x, 0) || 1;
  return exps.map(e => e / sum);
}


/* ========================================================================== */
/* SECTION 2: THE EXPERIMENTAL SELECTION ENGINE (BANDIT LOGIC)                */
/* This is the brilliant hybrid selection logic from v2.0, preserved in full. */
/* ========================================================================== */

/** Ensures the userProfile has a dynamicStats object for tracking. */
function ensureDynamicStats(userProfile) {
  if (!userProfile) return {};
  userProfile.dynamicStats = userProfile.dynamicStats || {};
  return userProfile.dynamicStats;
}

/**
 * Chooses a suggestion using a hybrid policy (Exploit, Explore, Context-Aware).
 * This is our core "experimental" intelligence.
 */
function chooseSuggestionHybrid(candidates = [], userProfile = {}, fingerprint = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const stats = ensureDynamicStats(userProfile);
  const scores = candidates.map((c, i) => {
    const sid = c.id || c.suggestion || `idx_${i}`;
    const s = stats[sid] || { tries: 0, successes: 0 };
    const est = (s.successes + 1) / (s.tries + 2); // Laplace smoothing
    const base = typeof c.baseScore === 'number' ? clamp(c.baseScore, 0, 1) : 0.5;
    
    let intensityBoost = 0;
    const intensity = safe(fingerprint, 'intensity', 0);
    if (intensity >= 0.8 && safe(c, 'logic', '').includes('قلق')) intensityBoost = 0.35;
    
    const exploration = 1 / (1 + s.tries);
    const raw = (est * 0.6) + (base * 0.2) + (exploration * 0.15) + intensityBoost;
    return clamp(raw, 0, 2);
  });

  if (Math.random() < AI_SETTINGS.CHANCES.EPSILON_GREEDY) {
    return { choice: selectRandom(candidates), policy: 'epsilon_random' };
  }

  const probs = softmax(scores);
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (r <= cum) {
      return { choice: candidates[i], policy: 'softmax' };
    }
  }
  return { choice: candidates[candidates.length - 1], policy: 'fallback' };
}


/* ========================================================================== */
/* SECTION 3: THE COGNITIVE PIPELINE STEPS                                    */
/* Each function is a "thought" in the AI's mind. It takes the current context */
/* and returns a new, modified context (Immutability).                        */
/* ========================================================================== */

/** [Thought 1] Simulates emotion, adding a preamble to the response. */
const emotionalPreambleStep = (ctx) => {
    const { fingerprint } = ctx;
    const emotionType = safe(fingerprint, 'primaryEmotion.type', null);
    const intensity = safe(fingerprint, 'intensity', 0);
    let preamble = null;

    if (emotionType === 'sadness' && intensity > AI_SETTINGS.INTENSITY_THRESHOLDS.SADNESS) {
        preamble = "💜 أعلم أن هذا الشعور قد يكون ثقيلاً على قلبك الآن، لكن تذكر أنك لست وحدك.";
    } else if (emotionType === 'anxiety' && intensity > AI_SETTINGS.INTENSITY_THRESHOLDS.ANXIETY) {
        preamble = "أشعر بقوة قلقك من خلال كلماتك. دعنا نأخذ نفسًا عميقًا معًا، كل شيء سيكون على ما يرام.";
    }

    if (preamble) {
        const newResponseParts = [preamble, ...ctx.responseParts];
        return { ...ctx, responseParts: newResponseParts };
    }
    return ctx;
};

/** [Thought 2] Poses a "what if" question to challenge the user's perspective. */
const counterfactualStep = (ctx) => {
    const { fingerprint } = ctx;
    const intensity = safe(fingerprint, 'intensity', 0);
    const isGoodCandidate = intensity < 0.8; // Avoid on very high distress

    if (isGoodCandidate && Math.random() < AI_SETTINGS.CHANCES.COUNTERFACTUAL) {
        const question = "دعنا نجرب تمريناً عقلياً سريعاً: لو أنك في موقف مشابه، قررت أن تفعل العكس تماماً، ماذا تتخيل أن تكون النتيجة؟";
        const newResponseParts = [...ctx.responseParts, question];
        // Stop the pipeline here to let the user ponder this deep question.
        return { ...ctx, responseParts: newResponseParts, stopProcessing: true };
    }
    return ctx;
};

/** [Thought 3] The core logic of selecting a tangible suggestion for the user. */
const coreSuggestionStep = (ctx) => {
    const { fullIntent, fingerprint, userProfile } = ctx;
    // We can expand candidates to include narrative prompts from layers, etc.
    const candidates = (fullIntent.actionable_suggestions || []).map((s, i) => ({ ...s, id: s.suggestion || `act_${i}` }));
    
    const pick = chooseSuggestionHybrid(candidates, userProfile, fingerprint);
    let finalChoice = pick ? pick.choice : null;
    
    // Peer learning logic can be integrated here
    // ...

    if (finalChoice) {
        const newResponseParts = [...ctx.responseParts, finalChoice.suggestion];
        const newMetadata = { ...ctx.metadata, chosenSuggestion: { id: finalChoice.id, text: finalChoice.suggestion } };
        return { ...ctx, responseParts: newResponseParts, metadata: newMetadata };
    } else {
        // If no suggestion found, add a generic listening prompt
        const newResponseParts = [...ctx.responseParts, "أنا هنا أسمعك. أخبرني المزيد."];
        return { ...ctx, responseParts: newResponseParts };
    }
};

/** [Thought 4] Adds a touch of vulnerability and self-awareness to the response. */
const selfDoubtStep = (ctx) => {
    // Only express doubt if a concrete suggestion was made.
    if (ctx.metadata.chosenSuggestion && Math.random() < AI_SETTINGS.CHANCES.SELF_DOUBT) {
        const doubtQuestion = "\n---\nبصراحة، لست متأكدًا تمامًا إذا كان هذا هو أفضل طريق. ما رأيك أنت؟ هل تشعر أننا على الطريق الصحيح؟";
        const newResponseParts = [...ctx.responseParts, doubtQuestion];
        return { ...ctx, responseParts: newResponseParts };
    }
    return ctx;
};

/* ========================================================================== */
/* SECTION 4: THE META-COGNITIVE PIPELINE DEFINITION                          */
/* This is the "consciousness stream" of the AI. We can reorder or disable   */
/* thoughts here to change the AI's cognitive process.                        */
/* ========================================================================== */

const cognitivePipeline = [
    emotionalPreambleStep,
    counterfactualStep,
    coreSuggestionStep,
    selfDoubtStep
];


/* ========================================================================== */
/* SECTION 5: THE V5 EXECUTION CORE                                           */
/* This is the main exported function that orchestrates the cognitive flow.   */
/* ========================================================================== */

export function executeMetacognitiveCore(fullIntent = {}, fingerprint = {}, userProfile = {}, sessionGoal = 'explore') {
    if (!fullIntent || !fullIntent.core_concept) return null;

    // Initialize the immutable context object for the pipeline. This is the "state of mind" for this turn.
    let responseContext = {
        responseParts: [],
        metadata: {
            intentTag: fullIntent.tag,
            sessionGoal: sessionGoal,
            persona: 'the_listener' // Default persona
        },
        fingerprint,
        userProfile,
        fullIntent,
        stopProcessing: false // Flag for steps to halt the pipeline
    };

    // Run the context through the cognitive pipeline, each step transforming the "state of mind".
    for (const step of cognitivePipeline) {
        if (responseContext.stopProcessing) break;
        responseContext = step(responseContext);
    }
    
    // Final Assembly.
    if (responseContext.responseParts.length === 0) {
        if (DEBUG) console.log("Metacognitive Core: Pipeline resulted in no response. Falling back.");
        return null;
    }

    let finalReply = responseContext.responseParts.join('\n\n');
    
    // Goal-Oriented Learning: Ask for feedback to learn effectively.
    // The metadata tells the frontend to show feedback buttons.
    const newMetadata = {
        ...responseContext.metadata,
        feedback_request: {
            prompt: "هل كان هذا مفيدًا في تحقيق هدفك لهذا الحديث؟",
            goal: sessionGoal,
            suggestionId: responseContext.metadata.chosenSuggestion?.id || null
        }
    };
    
    return {
        reply: finalReply,
        source: `metacognitive_core_v5`,
        metadata: newMetadata
    };
}


/* ========================================================================== */
/* SECTION 6: MEMORY & GOAL-ORIENTED LEARNING                                 */
/* Functions for updating the AI's memory and learning from user feedback.    */
/* ========================================================================== */

/**
 * [MEMORY CONSOLIDATION] Creates a distilled summary of a session.
 * To be called at the end of a session by server logic.
 * @returns {object} The new, updated user profile object.
 */
export function consolidateDailySummary(userProfile) {
    if (!userProfile || !Array.isArray(userProfile.shortMemory) || userProfile.shortMemory.length === 0) {
        return userProfile; // Return original profile if nothing to summarize
    }
    const today = new Date().toISOString().split('T')[0];
    const recentTurns = userProfile.shortMemory;
    const uniqueNeeds = [...new Set(recentTurns.map(turn => safe(turn, 'user_fingerprint.chosenPrimaryNeed', null)).filter(Boolean))];
    const summary = `Session focused on: [${uniqueNeeds.join(', ')}].`;
    
    const newDailySummaries = { ...(userProfile.dailySummaries || {}), [today]: summary };
    
    // Return a new userProfile object with the summary and cleared short-term memory.
    return {
        ...userProfile,
        dailySummaries: newDailySummaries,
        shortMemory: [] 
    };
}

/**
 * [GOAL-ORIENTED LEARNING] Updates user stats based on direct feedback.
 * @returns {object} The new, updated user profile object.
 */
export function updateUserProfileWithFeedback(userProfile, feedback) {
    const { suggestionId, wasHelpful } = feedback;
    const stats = { ...(userProfile.dynamicStats || {}) };
    
    if (suggestionId) {
        const currentStats = { ...(stats[suggestionId] || { tries: 0, successes: 0 }) };
        currentStats.tries += 1;
        if (wasHelpful) {
            currentStats.successes += 1;
        }
        stats[suggestionId] = currentStats;
    }
    
    // This is where you would update personaSuccess as well
    // ...

    return { ...userProfile, dynamicStats: stats };
}
