
// dynamic_logic_engine.js v9.0 - The Empathic & Guided Core
// This version integrates the advanced v9.0 intent template, enabling stateful,
// multi-layered dialogue, service hooks, and dynamic persona adoption.

// =================================================================
// START: PATH UPDATES & IMPORTS
// =================================================================
import { DEBUG, AI_SETTINGS } from '../shared/config.js';
// [V9 UPGRADE] We will need the full knowledge base now for personas.
// Make sure knowledge_base.js exports the entire object.
import * as knowledgeBase from '../knowledge/knowledge_base.js';
// =================================================================
// END: PATH UPDATES & IMPORTS
// =================================================================


/* ========================================================================== */
/* SECTION 1: CORE UTILITIES & HELPERS (No Changes Needed)                    */
/* ========================================================================== */

function safe(obj, path, fallback = null) { /* ... same as before ... */ }
function selectRandom(arr) { /* ... same as before ... */ }
function clamp(v, a = 0, b = 1) { /* ... same as before ... */ }
function softmax(arr) { /* ... same as before ... */ }


/* ========================================================================== */
/* SECTION 2: THE ADAPTIVE SELECTION ENGINE (UPGRADED BANDIT)                 */
/* ========================================================================== */

function ensureDynamicStats(userProfile) { /* ... same as before ... */ }

/**
 * [V9 UPGRADE] The selection engine now considers user preferences and predictive logic.
 */
function chooseSuggestionHybrid(candidates = [], userProfile = {}, fingerprint = {}, intent = {}) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;

    // [V9 UPGRADE] Access personalization and predictive logic
    const personalization = safe(userProfile, 'personalization', {});
    const predictiveLogic = safe(intent, 'predictive_logic', {});

    const stats = ensureDynamicStats(userProfile);
    const scores = candidates.map((c, i) => {
        const sid = c.id || `idx_${i}`;
        const s = stats[sid] || { tries: 0, successes: 0 };
        const est = (s.successes + 1) / (s.tries + 2);
        
        // [V9 UPGRADE] Start with a base score, then apply boosts/penalties
        let score = (est * 0.7) + (0.3 / (1 + s.tries)); // Exploit + Explore

        // Apply personalization boost/penalty
        if (personalization.favorite_tool_id === sid) score += 0.5;
        if (personalization.avoid_tool_id === sid) score -= 0.5;

        // Apply predictive logic (simple example)
        if (predictiveLogic.if_successful_tool_used_twice && s.successes >= 2) {
            score += 0.3;
        }
        
        return clamp(score, 0, 2);
    });

    if (AI_SETTINGS && AI_SETTINGS.CHANCES && Math.random() < AI_SETTINGS.CHANCES.EPSILON_GREEDY) {
        return { choice: selectRandom(candidates), policy: 'epsilon_random' };
    }

    const probs = softmax(scores);
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
        cum += probs[i];
        if (r <= cum) return { choice: candidates[i], policy: 'softmax' };
    }
    return { choice: candidates[candidates.length - 1], policy: 'fallback' };
}


/* ========================================================================== */
/* SECTION 3: THE NEW V9 COGNITIVE PIPELINE STEPS                             */
/* These steps are designed to read and execute the logic from the new template. */
/* ========================================================================== */

/** [V9 Thought 1] Dialogue Flow Management & Validation Gatekeeper. */
const dialogueFlowStep = (ctx) => {
    const { fullIntent, sessionContext } = ctx;
    const sessionState = sessionContext.state; // e.g., 'validating', 'exploring'

    // The core of the "Listen First" philosophy.
    if (sessionState === 'validating') {
        const layerKey = fullIntent.dialogue_flow.entry_point || 'L0_Validation_and_Venting';
        const validationResponse = selectRandom(safe(fullIntent, `dialogue_flow.layers.${layerKey}`));
        
        if (validationResponse) {
            const newResponseParts = [validationResponse];
            // [V9 UPGRADE] We stop the pipeline here to ensure we only listen.
            return { ...ctx, responseParts: newResponseParts, stopProcessing: true };
        }
    }
    
    // If not validating, just continue the pipeline.
    return ctx;
};

/** [V9 Thought 2] Service Hooks Check. Looks for emergencies (like high emotion). */
const serviceHookStep = (ctx) => {
    const { fullIntent, fingerprint } = ctx;
    const calmingHook = safe(fullIntent, 'service_hooks.calming_service');

    if (calmingHook) {
        // [V9 UPGRADE] A more robust condition checker is needed, but this is a simple start.
        const emotionIntensity = safe(fingerprint, 'emotions.primary.intensity', 0);
        if (emotionIntensity > 0.8 && ctx.sessionContext.state !== 'validating') {
             const newResponseParts = [calmingHook.suggestion_prompt];
             const newMetadata = { ...ctx.metadata, request_service_intent: calmingHook.target_intent };
             return { ...ctx, responseParts: newResponseParts, metadata: newMetadata, stopProcessing: true };
        }
    }

    return ctx;
};

/** [V9 Thought 3] Core Suggestion Step (Upgraded). */
const coreSuggestionStepV9 = (ctx) => {
    const { fullIntent, fingerprint, userProfile, sessionContext } = ctx;

    // Only try to suggest if the state is appropriate.
    if (sessionContext.state !== 'tool_introduction') {
        // If not ready for tools, maybe ask an exploration question from the current layer.
        const currentLayerKey = sessionContext.layer || 'L1_Exploration';
        const explorationLayer = safe(fullIntent, `dialogue_flow.layers.${currentLayerKey}`);
        const explorationPrompt = selectRandom(explorationLayer);
        
        if (explorationPrompt && typeof explorationPrompt === 'object') {
            // Handles the rich {opener, question, example} format
            const responseText = [explorationPrompt.opener, explorationPrompt.question].filter(Boolean).join('\n');
            const newResponseParts = [...ctx.responseParts, responseText];
            return { ...ctx, responseParts: newResponseParts };
        } else if (typeof explorationPrompt === 'string') {
            return { ...ctx, responseParts: [...ctx.responseParts, explorationPrompt] };
        }
    }

    // If state IS 'tool_introduction', find and suggest a tool.
    const candidates = safe(fullIntent, 'actionable_suggestions', []);
    const pick = chooseSuggestionHybrid(candidates, userProfile, fingerprint, fullIntent);
    
    if (pick && pick.choice) {
        const finalChoice = pick.choice;
        const suggestionText = finalChoice.suggestion_prompt || finalChoice.suggestion;
        const newResponseParts = [...ctx.responseParts, suggestionText];
        const newMetadata = { ...ctx.metadata, chosenSuggestion: { id: finalChoice.id, text: suggestionText } };
        return { ...ctx, responseParts: newResponseParts, metadata: newMetadata };
    }
    
    // Fallback if no specific prompt or tool is found.
    const fallbackResponse = "أنا هنا أسمعك. أخبرني المزيد.";
    return { ...ctx, responseParts: [...ctx.responseParts, fallbackResponse] };
};

/** [V9 Thought 4] Bridging Logic Step. Suggests the next step in the user's journey. */
const bridgingLogicStep = (ctx) => {
    // [V9 UPGRADE] This logic should be triggered by a specific state, e.g., 'resolution'.
    // For now, we'll simulate it.
    if (ctx.sessionContext.state === 'resolved') {
        const bridge = selectRandom(safe(ctx.fullIntent, 'bridging_logic.on_successful_resolution'));
        if (bridge) {
            const newResponseParts = [...ctx.responseParts, bridge.suggestion];
            const newMetadata = { ...ctx.metadata, request_bridge_intent: bridge.target_intent };
            return { ...ctx, responseParts: newResponseParts, metadata: newMetadata };
        }
    }
    return ctx;
};


/* ========================================================================== */
/* SECTION 4: THE NEW V9 META-COGNITIVE PIPELINE                              */
/* ========================================================================== */

const cognitivePipelineV9 = [
    dialogueFlowStep,
    serviceHookStep,
    coreSuggestionStepV9,
    bridgingLogicStep,
    // [V9 UPGRADE] selfDoubtStep and emotionalPreamble can be integrated into a new "Persona Formatting" step.
];


/* ========================================================================== */
/* SECTION 5: THE V9 EXECUTION CORE                                           */
/* ========================================================================== */

export function executeV9Engine(fullIntent = {}, fingerprint = {}, userProfile = {}, sessionContext = {}) {
    if (!fullIntent || !fullIntent.core_concept) return null;

    // [V9 UPGRADE] sessionContext is the new short-term memory for the session.
    // It should be managed by your chat API and passed in.
    const currentSessionContext = {
        state: sessionContext.state || 'validating', // Default to 'validating'
        layer: sessionContext.layer || fullIntent.dialogue_flow.entry_point,
        // ... other session-specific data
    };

    let responseContext = {
        responseParts: [],
        metadata: { intentTag: fullIntent.tag },
        fingerprint,
        userProfile,
        fullIntent,
        sessionContext: currentSessionContext,
        stopProcessing: false,
    };

    for (const step of cognitivePipelineV9) {
        if (responseContext.stopProcessing) break;
        responseContext = step(responseContext);
    }
    
    if (responseContext.responseParts.length === 0) {
        if (DEBUG) console.log("V9 Engine: Pipeline resulted in no response. Falling back.");
        return { reply: "أنا أفكر في كلماتك. هل يمكنك أن تخبرني المزيد؟", source: 'v9_engine_fallback', metadata: {} };
    }

    // [V9 UPGRADE] Final formatting step with Persona.
    const personaKey = safe(fullIntent, 'dynamic_response_logic.persona_logic', 'the_empathetic_listener');
    const persona = safe(knowledgeBase, `PERSONA_PROFILES.${personaKey}`, {});
    
    let finalReply = responseContext.responseParts.join('\n\n');
    // Example of applying persona tone (can be more complex)
    if (persona.prefix) {
        finalReply = `${persona.prefix} ${finalReply}`;
    }

    // [V9 UPGRADE] Update session context for the next turn.
    const nextSessionContext = { ...currentSessionContext };
    // Add logic here to transition state, e.g., if a tool was suggested, next state is 'awaiting_feedback'.
    // This is a CRITICAL part of making the dialogue stateful.
    
    const newMetadata = {
        ...responseContext.metadata,
        nextSessionContext, // Send the updated context back to the chat API to be saved.
        feedback_request: { /* ... same as before ... */ }
    };
    
    return {
        reply: finalReply,
        source: `v9_engine`,
        metadata: newMetadata
    };
}


/* ========================================================================== */
/* SECTION 6: MEMORY & LEARNING (No Major Changes Needed)                     */
/* The existing functions are well-designed and can be reused.                */
/* ========================================================================== */

export function consolidateDailySummary(userProfile) { /* ... same as before ... */ }
export function updateUserProfileWithFeedback(userProfile, feedback) { /* ... same-as-before... */ }
