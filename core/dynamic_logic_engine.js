// dynamic_logic_engine.js v11.3-fix-export
// Full upgrade: universal intent reader, V5 + V9 harmonized, memory + persona + feedback
// NEW in v11.1: Added Dynamic Room Engine to support new conversational protocols.
// NEW in v11.2: Added diagnostic console logs to trace execution flow.
// NEW in v11.3: Fixed duplicate export error for Vercel build compatibility.

// =================================================================
// START: IMPORTS & CONFIG
// =================================================================
import { DEBUG, AI_SETTINGS } from '../shared/config.js';
import * as knowledgeBase from '../knowledge/knowledge_base.js';
// =================================================================
// END: IMPORTS & CONFIG
// =================================================================


// =================================================================
// SECTION 1: CORE UTILITIES
// =================================================================
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

function getIntentLayer(fullIntent, layerKey) {
    return safeGet(fullIntent, `dialogue_flow.layers.${layerKey}`, {});
}

// =================================================================
// SECTION 2: LEGACY V5 ENGINE (FULL)
// =================================================================
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
    let cum = 0;
    const r = Math.random();
    for (let i = 0; i < probs.length; i++) {
        cum += probs[i];
        if (r <= cum) return { choice: candidates[i], policy: 'softmax' };
    }
    return { choice: candidates[candidates.length - 1], policy: 'fallback' };
}

// V5 Pipeline Steps
const V5_emotionalPreambleStep = (ctx) => {
    const { fingerprint } = ctx;
    const emotionType = safeGet(fingerprint, 'primaryEmotion.type', null);
    const intensity = safeGet(fingerprint, 'intensity', 0);
    let preamble = null;
    if (AI_SETTINGS?.INTENSITY_THRESHOLDS) {
        if (emotionType === 'sadness' && intensity > AI_SETTINGS.INTENSITY_THRESHOLDS.SADNESS) 
            preamble = "💜 أعلم أن هذا الشعور قد يكون ثقيلاً على قلبك الآن، لكن تذكر أنك لست وحدك.";
        else if (emotionType === 'anxiety' && intensity > AI_SETTINGS.INTENSITY_THRESHOLDS.ANXIETY) 
            preamble = "أشعر بقوة قلقك من خلال كلماتك. دعنا نأخذ نفسًا عميقًا معًا، كل شيء سيكون على ما يرام.";
    }
    if (preamble) ctx.responseParts.unshift(preamble);
    return ctx;
};

const V5_counterfactualStep = (ctx) => {
    const intensity = safeGet(ctx.fingerprint, 'intensity', 0);
    if (AI_SETTINGS?.CHANCES?.COUNTERFACTUAL && intensity < 0.8 && Math.random() < AI_SETTINGS.CHANCES.COUNTERFACTUAL) {
        ctx.responseParts.push("دعنا نجرب تمريناً عقلياً سريعاً: لو أنك في موقف مشابه، قررت أن تفعل العكس تماماً، ماذا تتخيل أن تكون النتيجة؟");
        ctx.stopProcessing = true;
    }
    return ctx;
};

const V5_coreSuggestionStep = (ctx) => {
    const { fullIntent, fingerprint, userProfile } = ctx;
    const candidates = (fullIntent.actionable_suggestions || []).map((s, i) => ({ ...s, id: s.suggestion || `act_${i}` }));
    const pick = V5_chooseSuggestionHybrid(candidates, userProfile, fingerprint);
    if (pick?.choice) {
        ctx.responseParts.push(pick.choice.suggestion);
        ctx.metadata.chosenSuggestion = { id: pick.choice.id, text: pick.choice.suggestion };
    } else ctx.responseParts.push("أنا هنا أسمعك. أخبرني المزيد.");
    return ctx;
};

const V5_selfDoubtStep = (ctx) => {
    if (AI_SETTINGS?.CHANCES?.SELF_DOUBT && ctx.metadata.chosenSuggestion && Math.random() < AI_SETTINGS.CHANCES.SELF_DOUBT) {
        ctx.responseParts.push("\n---\nبصراحة، لست متأكدًا تمامًا إذا كان هذا هو أفضل طريق. ما رأيك أنت؟ هل تشعر أننا على الطريق الصحيح؟");
    }
    return ctx;
};

const V5_cognitivePipeline = [V5_emotionalPreambleStep, V5_counterfactualStep, V5_coreSuggestionStep, V5_selfDoubtStep];

export function executeMetacognitiveCore(fullIntent = {}, fingerprint = {}, userProfile = {}, sessionGoal = 'explore') {
    if (!fullIntent?.core_concept) return null;
    let ctx = { responseParts: [], metadata: { intentTag: fullIntent.tag, sessionGoal, persona: 'the_listener' }, fingerprint, userProfile, fullIntent, stopProcessing: false };
    for (const step of V5_cognitivePipeline) if (!ctx.stopProcessing) ctx = step(ctx);
    if (ctx.responseParts.length === 0) return null;
    const finalReply = ctx.responseParts.join('\n\n');
    return { reply: finalReply, source: 'metacognitive_core_v5', metadata: { ...ctx.metadata, feedback_request: { prompt: "هل كان هذا مفيدًا في تحقيق هدفك لهذا الحديث؟", goal: sessionGoal, suggestionId: ctx.metadata.chosenSuggestion?.id || null } } };
}

export function V5_consolidateDailySummary(userProfile) {
    if (!userProfile?.shortMemory?.length) return userProfile;
    const today = new Date().toISOString().split('T')[0];
    const uniqueNeeds = [...new Set(userProfile.shortMemory.map(t => safeGet(t, 'user_fingerprint.chosenPrimaryNeed', null)).filter(Boolean))];
    const summary = `Session focused on: [${uniqueNeeds.join(', ')}].`;
    return { ...userProfile, dailySummaries: { ...(userProfile.dailySummaries || {}), [today]: summary }, shortMemory: [] };
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
// SECTION 3: V9 ENGINE (FULL UPGRADE)
// =================================================================
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
        let score = (s.successes + 1) / (s.tries + 2) * 0.7 + 0.3 / (1 + s.tries);
        if (personalization.favorite_tool_id === sid) score += 0.5;
        if (personalization.avoid_tool_id === sid) score -= 0.5;
        if (predictiveLogic.if_successful_tool_used_twice && s.successes >= 2) score += 0.3;
        return clamp(score, 0, 2);
    });
    if (AI_SETTINGS?.CHANCES?.EPSILON_GREEDY && Math.random() < AI_SETTINGS.CHANCES.EPSILON_GREEDY) return { choice: selectRandom(candidates), policy: 'epsilon_random' };
    const probs = softmax(scores);
    let cum = 0;
    const r = Math.random();
    for (let i = 0; i < probs.length; i++) {
        cum += probs[i];
        if (r <= cum) return { choice: candidates[i], policy: 'softmax' };
    }
    return { choice: candidates[candidates.length - 1], policy: 'fallback' };
}

// V9 Pipeline Steps
const V9_dialogueFlowStep = (ctx) => {
    const layer = getIntentLayer(ctx.fullIntent, ctx.sessionContext.state);
    if (layer?.responses) {
        const resp = selectRandom(layer.responses);
        const responseText = (typeof resp === 'object') ? [resp.opener, resp.question].filter(Boolean).join('\n') : resp;
        if (responseText) {
            ctx.responseParts.push(responseText);
            ctx.stopProcessing = layer.next_state === 'L3_Tool_Selection';
        }
    }
    return ctx;
};

const V9_serviceHookStep = (ctx) => {
    const calmingHook = safeGet(ctx.fullIntent, 'service_hooks.calming_service');
    if (calmingHook) {
        const intensity = safeGet(ctx.fingerprint, 'intensity', 0);
        if (intensity > 0.8 && ctx.sessionContext.state !== 'L0_Validation') {
            ctx.responseParts.push(calmingHook.suggestion_prompt);
            ctx.metadata.request_service_intent = calmingHook.target_intent;
            ctx.stopProcessing = true;
        }
    }
    return ctx;
};

const V9_coreSuggestionStep = (ctx) => {
    if (ctx.sessionContext.state !== 'L3_Tool_Selection') return ctx;
    const candidates = safeGet(ctx.fullIntent, 'actionable_suggestions', []);
    const pick = V9_chooseSuggestionHybrid(candidates, ctx.userProfile, ctx.fingerprint, ctx.fullIntent);
    if (pick?.choice) {
        const suggestionText = pick.choice.suggestion_prompt || pick.choice.suggestion;
        ctx.responseParts.push(suggestionText);
        ctx.metadata.chosenSuggestion = { id: pick.choice.id, text: suggestionText };
    } else ctx.responseParts.push("أنا هنا أسمعك. أخبرني المزيد.");
    return ctx;
};

const V9_bridgingLogicStep = (ctx) => {
    if (ctx.sessionContext.state === 'resolved') {
        const bridge = selectRandom(safeGet(ctx.fullIntent, 'bridging_logic.on_successful_resolution'));
        if (bridge) {
            ctx.responseParts.push(bridge.suggestion);
            ctx.metadata.request_bridge_intent = bridge.target_intent;
        }
    }
    return ctx;
};

const cognitivePipelineV9 = [V9_dialogueFlowStep, V9_serviceHookStep, V9_coreSuggestionStep, V9_bridgingLogicStep];

export function executeV9Engine(fullIntent = {}, fingerprint = {}, userProfile = {}, sessionContext = {}) {
    if (!fullIntent?.core_concept) return null;

    const currentSessionContext = {
        state: sessionContext.state || fullIntent.dialogue_flow?.entry_point || 'L0_Validation',
        turn_counter: sessionContext.turn_counter || 0
    };

    let ctx = { responseParts: [], metadata: { intentTag: fullIntent.tag }, fingerprint, userProfile, fullIntent, sessionContext: currentSessionContext, stopProcessing: false };

    for (const step of cognitivePipelineV9) if (!ctx.stopProcessing) ctx = step(ctx);

    let finalReply = ctx.responseParts.join('\n\n');
    const personaKey = safeGet(fullIntent, `dynamic_response_logic.persona_logic.${currentSessionContext.state}`, 'the_empathetic_listener');
    const persona = safeGet(knowledgeBase, `PERSONA_PROFILES.${personaKey}`, {});
    if (persona.prefix) finalReply = `${persona.prefix} ${finalReply}`;

    const currentLayer = getIntentLayer(fullIntent, currentSessionContext.state);
    const nextState = currentLayer.next_state || null;
    const nextSessionContext = { ...currentSessionContext, active_intent: fullIntent.tag, state: nextState, turn_counter: currentSessionContext.turn_counter + 1 };

    return { reply: finalReply, source: `v9_engine:${fullIntent.tag}:${currentSessionContext.state}`, metadata: { ...ctx.metadata, nextSessionContext, feedback_request: { prompt: "هل كان هذا مفيدًا؟", suggestionId: ctx.metadata.chosenSuggestion?.id || null } } };
}


// =================================================================
// SECTION 4: [NEW] DYNAMIC ROOM ENGINE
// =================================================================
function executeDynamicRoomEngine(fullIntent, fingerprint, userProfile, sessionContext) {
    const config = fullIntent.dialogue_engine_config;
    const rooms = fullIntent.conversation_rooms;
    const userName = safeGet(userProfile, 'name', 'صديقي'); // Get user name safely

    // 1. Determine the current room
    const currentRoomKey = sessionContext.state || config.entry_room;
    const currentRoom = rooms[currentRoomKey];

    if (!currentRoom) {
        // Error case: The room doesn't exist in the protocol
        return { reply: "يبدو أنني فقدت تسلسل أفكاري. أين كنا؟", source: "room_engine_error_room_not_found", metadata: { triedRoom: currentRoomKey } };
    }

    // 2. Select a random reply from the current room's responses
    // The .flat() method handles nested arrays like [["a"], ["b", "c"]] => ["a", "b", "c"]
    const possibleReplies = (currentRoom.responses || []).flat();
    let chosenReply = selectRandom(possibleReplies);

    if (!chosenReply) {
         // Fallback if a room has no replies defined
        chosenReply = "أخبرني المزيد عن هذا الأمر.";
    }
    
    // 3. Personalize the reply by replacing placeholders like {{username}}
    chosenReply = chosenReply.replace(/\{\{username\}\}/g, userName);

    // 4. Prepare the session context for the next turn
    const nextRoom = selectRandom(currentRoom.next_room_suggestions) || 'resolved';
    const nextSessionContext = {
        active_intent: fullIntent.tag,
        state: nextRoom, // The 'state' is now the key for the next room
        layer: 'dynamic_room_engine',
        last_suggestion_id: null,
        turn_counter: (sessionContext.turn_counter || 0) + 1,
    };

    // 5. Build and return the final candidate packet
    return {
        reply: chosenReply,
        source: `dynamic_room_engine:${fullIntent.tag}:${currentRoomKey}`,
        confidence: 0.98, // High confidence as it's a direct protocol execution
        metadata: {
            intentTag: fullIntent.tag,
            nextSessionContext: nextSessionContext, // This is crucial for the Maestro to update the session
        }
    };
}


// =================================================================
// SECTION 5: PROTOCOL EXECUTOR (THE MAIN ROUTER) - [MODIFIED]
// =================================================================
export function executeProtocolStep(protocolPacket, fingerprint, userProfile, sessionContext) {
    const { full_intent, initial_context } = protocolPacket;

    // DEBUG: Checkpoint at the very entrance of the main router
    console.log("--- DEBUG CHECKPOINT 5: Executor received protocol:", full_intent ? full_intent.tag : "UNDEFINED");

    if (!full_intent) {
        console.log("--- DEBUG EXECUTOR: full_intent is missing! Returning error. ---");
        return { reply: "أنا أفكر في ذلك...", source: "protocol_error", metadata: {} };
    }

    // [NEW] Check for the Dynamic Room Engine protocol first
    if (full_intent.dialogue_engine_config?.engine_type === 'dynamic_room_engine' && full_intent.conversation_rooms) {
        // DEBUG: The most critical checkpoint. Will it enter this block?
        console.log("--- DEBUG CHECKPOINT 6: SUCCESS! Matched dynamic_room_engine. Executing now... ---");
        return executeDynamicRoomEngine(full_intent, fingerprint, userProfile, initial_context);
    }
    
    // DEBUG: If it didn't match the first block, log the reason why.
    console.log("--- DEBUG EXECUTOR: Did NOT match dynamic room engine. Checking other engines... ---");
    console.log("--- DEBUG REASON: dialogue_engine_config was:", JSON.stringify(full_intent.dialogue_engine_config, null, 2));


    // Check for V9 Engine (No changes here)
    if (full_intent.dialogue_flow?.layers || full_intent.service_hooks || full_intent.bridging_logic) {
        if (DEBUG) console.log(`PROTOCOL EXECUTOR: Using V9 Engine for intent "${full_intent.tag}" at state "${initial_context.state}".`);
        return executeV9Engine(full_intent, fingerprint, userProfile, initial_context);
    }

    // Check for legacy V5 Engine (No changes here)
    if (full_intent.actionable_suggestions) {
        if (DEBUG) console.log(`PROTOCOL EXECUTOR: Using legacy V5 Engine for intent "${full_intent.tag}".`);
        return executeMetacognitiveCore(full_intent, fingerprint, userProfile);
    }

    // Fallback if no engine matches (No changes here)
    if (DEBUG) console.log(`PROTOCOL EXECUTOR: No executable parts for intent "${full_intent.tag}".`);
    // DEBUG: Log if it reached the end without any match
    console.log("--- DEBUG CHECKPOINT 7: No engine matched. Returning fallback. ---");
    return { reply: "هناك فكرة لدي، لكن دعني أنظمها أولاً. ماذا يدور في ذهنك الآن؟", source: "protocol_no_action", metadata: {} };
}


// =================================================================
// SECTION 6: EXPORT ALL ENGINE FUNCTIONS [FIXED]
// =================================================================
export default {
    executeProtocolStep,
    consolidateDailySummary: V5_consolidateDailySummary,
    updateUserProfileWithFeedback: V5_updateUserProfileWithFeedback
};
