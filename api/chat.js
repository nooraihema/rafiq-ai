// chat.js v11.0 - The Collective Mind Conductor
// This version implements the "Mind's Workshop" protocol, orchestrating all engines to synthesize a response.

// =================================================================
// SECTION 1: CORE & HIPPOCAMPUS IMPORTS (UNCHANGED)
// =================================================================
import { DEBUG } from '../shared/config.js';
import { detectCritical, criticalSafetyReply, tokenize } from '../shared/utils.js';
import { loadUsers, saveUsers, makeUserId } from '../shared/storage.js';
import { buildIndexSync, getTopIntents } from '../perception/intent_engine.js';
import { executeV9Engine } from '../core/dynamic_logic_engine.js';
import { composeInferentialResponse } from '../core/composition_engine.js';
import { processMeta } from '../coordination/meta_router.js';
import { ContextTracker } from '../shared/context_tracker.js';
import { generateFingerprintV2 as generateFingerprint } from '../perception/fingerprint_engine.js';
import { atomize } from '../hippocampus/KnowledgeAtomizer.js';
import { memoryGraph } from '../hippocampus/MemoryGraph.js';
import { InferenceEngine } from '../hippocampus/InferenceEngine.js';
// =================================================================

// --- Initialization ---
buildIndexSync();
const CONTEXT_TRACKERS = new Map();
const CONFIDENCE_THRESHOLD = 0.45;

// =================================================================
// SECTION 2: THE NEW STRATEGIC EXECUTION CORE (The Mind's Workshop)
// =================================================================

async function executeCollectiveMind(props) {
    const { cognitiveProfile, fingerprint, topIntents, sessionContext, userProfile } = props;
    
    if (DEBUG) console.log("🚀 Engaging The Collective Mind Protocol...");

    // STEP 1: Strategic Goal Setting (driven by InferenceEngine)
    // Here we interpret the cognitive profile to set a clear goal for this turn.
    const primaryNeed = cognitiveProfile.theoryOfMind.predictedNeeds[0] || 'need_for_reassurance';
    const uncertainty = cognitiveProfile.uncertaintyProfile.uncertainty;
    const bestIntent = topIntents[0];
    
    let strategicGoal;
    if (uncertainty > 0.6) {
        strategicGoal = 'clarify_and_probe';
    } else if (primaryNeed === 'need_for_insight' && bestIntent) {
        strategicGoal = 'advance_dialogue_flow';
    } else {
        strategicGoal = 'validate_and_explore';
    }

    if (DEBUG) console.log(`🎯 Strategic Goal for this turn: ${strategicGoal}`);

    // STEP 2: Response Synthesis (using CompositionEngine as the main tool)
    // We now pass a "plan" to the composition engine instead of just a fingerprint.
    const compositionPlan = {
      strategicGoal,
      bestIntent: bestIntent,
      cognitiveProfile,
      fingerprint
    };

    // NOTE: This assumes `composeInferentialResponse` is updated to handle this rich plan.
    // For now, we simulate this by calling the V9 engine which is state-aware.
    
    // TEMPORARY: Using a state-aware executor that simulates the new model.
    // This part will be replaced by the true CompositionEngine call later.
    let responsePayload;
    if (bestIntent && bestIntent.full_intent?.dialogue_flow) {
        
        responsePayload = executeV9Engine(bestIntent.full_intent, fingerprint, userProfile, sessionContext);

        // Update the context tracker with the new state returned by the engine.
        if (responsePayload.metadata?.nextSessionContext) {
            props.tracker.updateSessionContext(responsePayload.metadata.nextSessionContext);
        }
    } else {
       // If the best intent is not structured for dialogue flow, fallback.
       responsePayload = { 
           reply: "أنا أفكر في كلماتك بعمق. هل يمكنك أن تشرح لي أكثر؟", 
           source: 'collective_mind_fallback_no_flow' 
       };
    }

    return responsePayload;
}


// --- Main Handler ---
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    // =================================================================
    // SECTION 3: PERCEPTION & CONTEXT SETUP (The Foundation)
    // =================================================================
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });
    if (DEBUG) console.log(`\n\n- - - [ NEW TURN ] - - -\n📨 Incoming message: "${rawMessage}"`);

    let users = await loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = { id: userId, createdAt: new Date().toISOString(), shortMemory: { history: [], sessionContext: { state: null, active_intent: null, turn_counter: 0 } } };
      if (DEBUG) console.log(`🆕 New user created: ${userId}`);
    }
    const profile = users[userId];

    let tracker = CONTEXT_TRACKERS.get(userId);
    if (!tracker) {
      tracker = new ContextTracker(profile);
      CONTEXT_TRACKERS.set(userId, tracker);
    }
    const sessionContext = tracker.getSessionContext();

    if (detectCritical(rawMessage)) {
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // --- The Perception Cascade ---
    await memoryGraph.initialize();
    const knowledgeAtom = atomize(rawMessage, { recentMessages: tracker.getHistory() });
    if (knowledgeAtom) memoryGraph.ingest(knowledgeAtom);
    
    const consciousness = new InferenceEngine(memoryGraph);
    const cognitiveProfile = await consciousness.generateCognitiveProfile();
    
    const fingerprint = generateFingerprint(rawMessage, { ...tracker.generateContextualSummary(), cognitiveProfile });
    const topIntents = getTopIntents(rawMessage, { topN: 3, userProfile: profile, fingerprint });

    // =================================================================
    // SECTION 4: STRATEGIC EXECUTION (The New Core Logic)
    // =================================================================
    let finalReply = "";
    let responsePayload = {};
    
    if (topIntents[0] && topIntents[0].score > CONFIDENCE_THRESHOLD) {
       responsePayload = await executeCollectiveMind({
           cognitiveProfile,
           fingerprint,
           topIntents,
           sessionContext,
           userProfile: profile,
           tracker // Pass the tracker for state updates
       });
       finalReply = responsePayload.reply;
    } else {
      // --- LOW CONFIDENCE PATH ---
      if (DEBUG) console.log(`⚠️ LOW CONFIDENCE: No intent met the threshold.`);
      finalReply = "لم أفهم قصدك تمامًا، هل يمكنك التوضيح بجملة مختلفة؟";
      responsePayload = { source: "fallback_low_confidence" };
    }

    // =================================================================
    // SECTION 5: POST-RESPONSE HOUSEKEEPING (The Cleanup)
    // =================================================================
    
    tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
    profile.shortMemory = tracker.serialize();

    try {
      await processMeta(rawMessage, finalReply, fingerprint, profile);
      if (DEBUG) console.log("✅ Meta-router successfully enqueued post-response tasks.");
    } catch (metaErr) {
      console.error("🚨 Meta-router failed to process tasks:", metaErr);
    }
    
    await saveUsers(users);

    return res.status(200).json({
      reply: finalReply,
      source: responsePayload.source,
      tag: responsePayload.tag,
      userId,
      metadata: responsePayload.metadata ?? null
    });

  } catch (err) {
    console.error("API error:", err);
    if (DEBUG) console.error(err.stack);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
