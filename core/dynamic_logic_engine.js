// dynamic_logic_engine.js v10.0-protocol - The Protocol-Aware Expert Executor
// This version introduces a new top-level function `executeProtocolStep` to orchestrate
// the powerful V9 engine, while keeping all V5 and V9 legacy code intact.

// =================================================================
// START: PATH UPDATES & IMPORTS
// =================================================================
import { DEBUG, AI_SETTINGS } from '../shared/config.js';
import * as knowledgeBase from '../knowledge/knowledge_base.js';
// =================================================================
// END: PATH UPDATES & IMPORTS
// =================================================================


/* ========================================================================== */
/* SECTION 1: CORE UTILITIES & HELPERS                                        */
/* ========================================================================== */

// [V9 UPGRADE] Renamed from 'safe' to avoid conflicts.
function safeGet(obj, path, fallback = null) {
  try {
    return path.split('.').reduce((s, k) => (s && s[k] !== undefined) ? s[k] : undefined, obj) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function selectRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

function softmax(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((s, x) => s + x, 0) || 1;
  return exps.map(e => e / sum);
}


// =================================================================
// START: [V5 ENGINE CODE RESTORATION]
// All the original code from the V5 engine is restored here to be exported.
// =================================================================

/* ========================================================================== */
/* V5 SECTION 2: THE EXPERIMENTAL SELECTION ENGINE (BANDIT LOGIC)             */
/* ========================================================================== */
function V5_ensureDynamicStats(userProfile) {
  if (!userProfile) return {};
  userProfile.dynamicStats = userProfile.dynamicStats || {};
  return userProfile.dynamicStats;
}
function V5_chooseSuggestionHybrid(candidates = [], userProfile = {}, fingerprint = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const stats = V5_ensureDynamicStats(userProfile);
  const scores = candidates.map((c, i) => {
    const sid = c.id || c.suggestion || `idx_${i}`;
    const s = stats[sid] || { tries: 0, successes: 0 };
    const est = (s.successes + 1) / (s.tries + 2);
    const base = typeof c.baseScore === 'number' ? clamp(c.baseScore, 0, 1) : 0.5;
    let intensityBoost = 0;
    const intensity = safeGet(fingerprint, 'intensity', 0);
    if (intensity >= 0.8 && safeGet(c, 'logic', '').includes('قلق')) intensityBoost = 0.35;
    const exploration = 1 / (1 + s.tries);
    const raw = (est * 0.6) + (base * 0.2) + (exploration * 0.15) + intensityBoost;
    return clamp(raw, 0, 2);
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
/* V5 SECTION 3: THE COGNITIVE PIPELINE STEPS                                 */
/* ========================================================================== */
const V5_emotionalPreambleStep = (ctx) => {
    const { fingerprint } = ctx;
    const emotionType = safeGet(fingerprint, 'primaryEmotion.type', null);
    const intensity = safeGet(fingerprint, 'intensity', 0);
    let preamble = null;
    if (AI_SETTINGS && AI_SETTINGS.INTENSITY_THRESHOLDS) {
        if (emotionType === 'sadness' && intensity > AI_SETTINGS.INTENSITY_THRESHOLDS.SADNESS) preamble = "💜 أعلم أن هذا الشعور قد يكون ثقيلاً على قلبك الآن، لكن تذكر أنك لست وحدك.";
        else if (emotionType === 'anxiety' && intensity > AI_SETTINGS.INTENSITY_THRESHOLDS.ANXIETY) preamble = "أشعر بقوة قلقك من خلال كلماتك. دعنا نأخذ نفسًا عميقًا معًا، كل شيء سيكون على ما يرام.";
    }
    if (preamble) {
        const newResponseParts = [preamble, ...ctx.responseParts];
        return { ...ctx, responseParts: newResponseParts };
    }
    return ctx;
};
const V5_counterfactualStep = (ctx) => {
    const { fingerprint } = ctx;
    const intensity = safeGet(fingerprint, 'intensity', 0);
    const isGoodCandidate = intensity < 0.8;
    if (AI_SETTINGS && AI_SETTINGS.CHANCES && isGoodCandidate && Math.random() < AI_SETTINGS.CHANCES.COUNTERFACTUAL) {
        const question = "دعنا نجرب تمريناً عقلياً سريعاً: لو أنك في موقف مشابه، قررت أن تفعل العكس تماماً، ماذا تتخيل أن تكون النتيجة؟";
        const newResponseParts = [...ctx.responseParts, question];
        return { ...ctx, responseParts: newResponseParts, stopProcessing: true };
    }
    return ctx;
};
const V5_coreSuggestionStep = (ctx) => {
    const { fullIntent, fingerprint, userProfile } = ctx;
    const candidates = (fullIntent.actionable_suggestions || []).map((s, i) => ({ ...s, id: s.suggestion || `act_${i}` }));
    const pick = V5_chooseSuggestionHybrid(candidates, userProfile, fingerprint);
    let finalChoice = pick ? pick.choice : null;
    if (finalChoice) {
        const newResponseParts = [...ctx.responseParts, finalChoice.suggestion];
        const newMetadata = { ...ctx.metadata, chosenSuggestion: { id: finalChoice.id, text: finalChoice.suggestion } };
        return { ...ctx, responseParts: newResponseParts, metadata: newMetadata };
    } else {
        const newResponseParts = [...ctx.responseParts, "أنا هنا أسمعك. أخبرني المزيد."];
        return { ...ctx, responseParts: newResponseParts };
    }
};
const V5_selfDoubtStep = (ctx) => {
    if (AI_SETTINGS && AI_SETTINGS.CHANCES && ctx.metadata.chosenSuggestion && Math.random() < AI_SETTINGS.CHANCES.SELF_DOUBT) {
        const doubtQuestion = "\n---\nبصراحة، لست متأكدًا تمامًا إذا كان هذا هو أفضل طريق. ما رأيك أنت؟ هل تشعر أننا على الطريق الصحيح؟";
        const newResponseParts = [...ctx.responseParts, doubtQuestion];
        return { ...ctx, responseParts: newResponseParts };
    }
    return ctx;
};
/* ========================================================================== */
/* V5 SECTION 4: THE META-COGNITIVE PIPELINE DEFINITION                       */
/* ========================================================================== */
const V5_cognitivePipeline = [
    V5_emotionalPreambleStep,
    V5_counterfactualStep,
    V5_coreSuggestionStep,
    V5_selfDoubtStep
];
/* ========================================================================== */
/* V5 SECTION 5: THE V5 EXECUTION CORE                                        */
/* ========================================================================== */
export function executeMetacognitiveCore(fullIntent = {}, fingerprint = {}, userProfile = {}, sessionGoal = 'explore') {
    if (!fullIntent || !fullIntent.core_concept) return null;
    let responseContext = {
        responseParts: [],
        metadata: { intentTag: fullIntent.tag, sessionGoal: sessionGoal, persona: 'the_listener' },
        fingerprint, userProfile, fullIntent, stopProcessing: false
    };
    for (const step of V5_cognitivePipeline) {
        if (responseContext.stopProcessing) break;
        responseContext = step(responseContext);
    }
    if (responseContext.responseParts.length === 0) {
        if (DEBUG) console.log("Metacognitive Core: Pipeline resulted in no response. Falling back.");
        return null;
    }
    let finalReply = responseContext.responseParts.join('\n\n');
    const newMetadata = {
        ...responseContext.metadata,
        feedback_request: {
            prompt: "هل كان هذا مفيدًا في تحقيق هدفك لهذا الحديث؟",
            goal: sessionGoal,
            suggestionId: responseContext.metadata.chosenSuggestion?.id || null
        }
    };
    return { reply: finalReply, source: `metacognitive_core_v5`, metadata: newMetadata };
}
/* ========================================================================== */
/* V5 SECTION 6: MEMORY & GOAL-ORIENTED LEARNING                              */
/* ========================================================================== */
export function V5_consolidateDailySummary(userProfile) {
    if (!userProfile || !Array.isArray(userProfile.shortMemory) || userProfile.shortMemory.length === 0) return userProfile;
    const today = new Date().toISOString().split('T')[0];
    const recentTurns = userProfile.shortMemory;
    const uniqueNeeds = [...new Set(recentTurns.map(turn => safeGet(turn, 'user_fingerprint.chosenPrimaryNeed', null)).filter(Boolean))];
    const summary = `Session focused on: [${uniqueNeeds.join(', ')}].`;
    const newDailySummaries = { ...(userProfile.dailySummaries || {}), [today]: summary };
    return { ...userProfile, dailySummaries: newDailySummaries, shortMemory: [] };
}
export function V5_updateUserProfileWithFeedback(userProfile, feedback) {
    const { suggestionId, wasHelpful } = feedback;
    const stats = { ...(userProfile.dynamicStats || {}) };
    if (suggestionId) {
        const currentStats = { ...(stats[suggestionId] || { tries: 0, successes: 0 }) };
        currentStats.tries += 1;
        if (wasHelpful) currentStats.successes += 1;
        stats[suggestionId] = currentStats;
    }
    return { ...userProfile, dynamicStats: stats };
}
// =================================================================
// END: [V5 ENGINE CODE RESTORATION]
// =================================================================


// =================================================================
// START: [V9 ENGINE CODE]
// The new engine code from our previous step.
// =================================================================

/* ========================================================================== */
/* V9 SECTION 2: THE ADAPTIVE SELECTION ENGINE (UPGRADED BANDIT)              */
/* ========================================================================== */
function V9_ensureDynamicStats(userProfile) {
    if (!userProfile) return {};
    userProfile.dynamicStats = userProfile.dynamicStats || {};
    return userProfile.dynamicStats;
}
function V9_chooseSuggestionHybrid(candidates = [], userProfile = {}, fingerprint = {}, intent = {}) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const personalization = safeGet(userProfile, 'personalization', {});
    const predictiveLogic = safeGet(intent, 'predictive_logic', {});
    const stats = V9_ensureDynamicStats(userProfile);
    const scores = candidates.map((c, i) => {
        const sid = c.id || `idx_${i}`;
        const s = stats[sid] || { tries: 0, successes: 0 };
        const est = (s.successes + 1) / (s.tries + 2);
        let score = (est * 0.7) + (0.3 / (1 + s.tries));
        if (personalization.favorite_tool_id === sid) score += 0.5;
        if (personalization.avoid_tool_id === sid) score -= 0.5;
        if (predictiveLogic.if_successful_tool_used_twice && s.successes >= 2) score += 0.3;
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
/* V9 SECTION 3: THE NEW V9 COGNITIVE PIPELINE STEPS                          */
/* ========================================================================== */
const V9_dialogueFlowStep = (ctx) => {
    const { fullIntent, sessionContext } = ctx;
    const sessionState = sessionContext.state;
    // --- MODIFICATION: Logic simplified to handle any layer based on sessionContext ---
    const layerKey = sessionState; // The state from sessionContext IS the layer key.
    const layer = safeGet(fullIntent, `dialogue_flow.layers.${layerKey}`);

    if(layer && layer.responses) {
        const response = selectRandom(layer.responses);
        const responseText = (typeof response === 'object') ? [response.opener, response.question].filter(Boolean).join('\n') : response;
        if (responseText) {
            const newResponseParts = [responseText];
            // If this layer's purpose is just to talk, we might stop here.
            const stopHere = layer.next_state === "L3_Tool_Selection"; // Example logic
            return { ...ctx, responseParts: newResponseParts, stopProcessing: stopHere };
        }
    }
    return ctx;
};
const V9_serviceHookStep = (ctx) => {
    const { fullIntent, fingerprint } = ctx;
    const calmingHook = safeGet(fullIntent, 'service_hooks.calming_service');
    if (calmingHook) {
        const emotionIntensity = safeGet(fingerprint, 'intensity', 0); // Corrected path
        if (emotionIntensity > 0.8 && ctx.sessionContext.state !== 'L0_Validation') {
             const newResponseParts = [calmingHook.suggestion_prompt];
             const newMetadata = { ...ctx.metadata, request_service_intent: calmingHook.target_intent };
             return { ...ctx, responseParts: newResponseParts, metadata: newMetadata, stopProcessing: true };
        }
    }
    return ctx;
};
const V9_coreSuggestionStep = (ctx) => {
    const { fullIntent, fingerprint, userProfile, sessionContext } = ctx;
    
    // This step now only triggers if we are specifically in a state that requires tool selection.
    if (sessionContext.state !== 'L3_Tool_Selection') {
        return ctx;
    }

    const candidates = safeGet(fullIntent, 'actionable_suggestions', []);
    const pick = V9_chooseSuggestionHybrid(candidates, userProfile, fingerprint, fullIntent);
    
    if (pick && pick.choice) {
        const finalChoice = pick.choice;
        const suggestionText = finalChoice.suggestion_prompt || finalChoice.suggestion;
        const newResponseParts = [...ctx.responseParts, suggestionText];
        const newMetadata = { ...ctx.metadata, chosenSuggestion: { id: finalChoice.id, text: suggestionText } };
        return { ...ctx, responseParts: newResponseParts, metadata: newMetadata };
    }
    const fallbackResponse = "أنا هنا أسمعك. أخبرني المزيد.";
    return { ...ctx, responseParts: [...ctx.responseParts, fallbackResponse] };
};
const V9_bridgingLogicStep = (ctx) => {
    // --- MODIFICATION: Logic now triggers when the state is PROTOCOL_COMPLETE ---
    if (ctx.sessionContext.state === 'PROTOCOL_COMPLETE') {
        const bridge = selectRandom(safeGet(ctx.fullIntent, 'bridging_logic.on_successful_resolution'));
        if (bridge) {
            // We are adding to existing parts, which might be empty or might have the final room's response
            const newResponseParts = [...ctx.responseParts, bridge.suggestion];
            const newMetadata = { ...ctx.metadata, request_bridge_intent: bridge.target_intent };
            // Stop processing after bridging to avoid any other steps interfering
            return { ...ctx, responseParts: newResponseParts, metadata: newMetadata, stopProcessing: true };
        }
    }
    return ctx;
};
/* ========================================================================== */
/* V9 SECTION 4: THE NEW V9 META-COGNITIVE PIPELINE                           */
/* ========================================================================== */
const cognitivePipelineV9 = [
    V9_dialogueFlowStep,
    V9_serviceHookStep,
    V9_coreSuggestionStep,
    V9_bridgingLogicStep,
];
/* ========================================================================== */
/* V9 SECTION 5: THE V9 EXECUTION CORE                                        */
/* ========================================================================== */
export function executeV9Engine(fullIntent = {}, fingerprint = {}, userProfile = {}, sessionContext = {}) {
    if (!fullIntent || !fullIntent.core_concept) return null;

    // --- <<< START: NEW COMPATIBILITY LAYER FOR "CONVERSATION ROOMS" >>> ---
    const isNewRoomStructure = fullIntent.hasOwnProperty('conversation_rooms');
    if (isNewRoomStructure) {
        if (DEBUG) console.log(`V9 ENGINE: Detected new "Conversation Rooms" structure for intent "${fullIntent.tag}". Adapting...`);
        let adaptedIntent = JSON.parse(JSON.stringify(fullIntent));
        adaptedIntent.dialogue_flow = {
            entry_point: adaptedIntent.dialogue_engine_config?.entry_room,
            layers: {}
        };
        for (const roomName in adaptedIntent.conversation_rooms) {
            const room = adaptedIntent.conversation_rooms[roomName];
            let nextState = room.next_room_suggestions ? room.next_room_suggestions[0] : null;
            if (room.is_resolution_point === true && !nextState) {
                nextState = 'PROTOCOL_COMPLETE';
            }
            adaptedIntent.dialogue_flow.layers[roomName] = {
                purpose: room.purpose,
                responses: room.responses,
                next_state: nextState
            };
        }
        if (adaptedIntent.bridging_logic?.on_resolution?.branching_suggestion?.choices) {
            adaptedIntent.bridging_logic.on_successful_resolution = 
                adaptedIntent.bridging_logic.on_resolution.branching_suggestion.choices.map(choice => ({
                    suggestion: `${choice.title}: ${choice.description}`,
                    target_intent: choice.target_intent
                }));
        }
        fullIntent = adaptedIntent;
    }
    // --- <<< END: NEW COMPATIBILITY LAYER >>> ---

    const currentSessionContext = {
        state: sessionContext.state || fullIntent.dialogue_flow.entry_point,
        turn_counter: sessionContext.turn_counter || 0
    };

    let responseContext = {
        responseParts: [],
        metadata: { intentTag: fullIntent.tag },
        fingerprint, userProfile, fullIntent,
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
    
    const personaKey = safeGet(fullIntent, `dynamic_response_logic.persona_logic.${currentSessionContext.state}`, 'the_empathetic_listener');
    const persona = safeGet(knowledgeBase, `PERSONA_PROFILES.${personaKey}`, {});
    
    let finalReply = responseContext.responseParts.join('\n\n');
    if (persona.prefix) {
        finalReply = `${persona.prefix} ${finalReply}`;
    }
    
    // --- MODIFICATION: State transition logic now respects PROTOCOL_COMPLETE ---
    let nextState;
    // If the pipeline ended because of bridging logic, the protocol is complete
    if (responseContext.metadata.request_bridge_intent) {
        nextState = 'PROTOCOL_COMPLETE';
    } else {
        const currentLayer = safeGet(fullIntent, `dialogue_flow.layers.${currentSessionContext.state}`, {});
        nextState = currentLayer.next_state || null;
    }
    
    const nextSessionContext = { 
        ...currentSessionContext,
        active_intent: fullIntent.tag,
        state: nextState,
        turn_counter: currentSessionContext.turn_counter + 1
    };

    const newMetadata = {
        ...responseContext.metadata,
        nextSessionContext,
        feedback_request: { 
            prompt: "هل كان هذا مفيدًا؟",
            suggestionId: responseContext.metadata.chosenSuggestion?.id || null
        }
    };
    return { reply: finalReply, source: `v9_engine:${fullIntent.tag}:${currentSessionContext.state}`, metadata: newMetadata };
}
// =================================================================
// END: [V9 ENGINE CODE]
// =================================================================

// --- [THE GRAND UPGRADE: The Protocol Executor] ---
/* ==================================================================
   NEW EXPORTED FUNCTION: executeProtocolStep
   This is the new, clean entry point. It decides whether to use the
   powerful V9 engine for protocol-based intents or the legacy V5
   engine for simpler ones, based on the intent's structure.
   ================================================================== */
export function executeProtocolStep(protocolPacket, fingerprint, userProfile, sessionContext) {
    const { full_intent, initial_context } = protocolPacket;

    if (!full_intent) {
        if (DEBUG) console.warn("executeProtocolStep called with an empty protocol packet.");
        return { reply: "أنا أفكر في ذلك...", source: "protocol_error", metadata: {} };
    }

    // --- Strategic Decision: Check if the intent is a modern V9 protocol ---
    // --- MODIFICATION: Also check for the new structure to route to V9 ---
    if ((full_intent.dialogue_flow && full_intent.dialogue_flow.layers) || full_intent.conversation_rooms) {
        if (DEBUG) console.log(`PROTOCOL EXECUTOR: Engaging V9 Engine for protocol "${full_intent.tag}" at state "${initial_context.state}".`);
        return executeV9Engine(full_intent, fingerprint, userProfile, initial_context);
    } 
    
    // --- Fallback: Use the legacy V5 engine for older, simpler intents ---
    if (full_intent.actionable_suggestions) {
        if (DEBUG) console.log(`PROTOCOL EXECUTOR: Engaging legacy V5 Engine for simple intent "${full_intent.tag}".`);
        return executeMetacognitiveCore(full_intent, fingerprint, userProfile);
    }

    // --- Final Fallback ---
    if (DEBUG) console.log(`PROTOCOL EXECUTOR: Intent "${full_intent.tag}" has no executable parts. Falling back.`);
    return { reply: "هناك فكرة لدي، لكن دعني أنظمها أولاً. ماذا يدور في ذهنك الآن؟", source: "protocol_no_action", metadata: {} };
}


// [V9 UPGRADE] Renaming the old memory functions to avoid export conflicts.
export { V5_consolidateDailySummary as consolidateDailySummary }
export { V5_updateUserProfileWithFeedback as updateUserProfileWithFeedback }
