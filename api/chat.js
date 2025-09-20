
// chat.js v11.1 - The Collective Mind Conductor + Supreme Response Fusion
// Implements "Mind's Workshop" + ResponseSynthesizer + HybridComposer integration
// Author: For Rafiq system
// Notes: Full multi-layer synthesis, micro-story, fractal seeds, tone harmonizer, meta-twist

// =================================================================
// SECTION 1: CORE & HIPPOCAMPUS IMPORTS
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
import { atomize } from '../hippocampus/knowledgeAtomizer.js';
import { memoryGraph } from '../hippocampus/MemoryGraph.js';
import { InferenceEngine } from '../hippocampus/InferenceEngine.js';

// Integration of new modules
import ResponseSynthesizer from '../intelligence/ResponseSynthesizer.js';
import HybridComposer from '../intelligence/HybridComposer.js';

// =================================================================
// SECTION 1B: INITIALIZATION
// =================================================================
buildIndexSync();
const CONTEXT_TRACKERS = new Map();
const CONFIDENCE_THRESHOLD = 0.45;

// =================================================================
// SECTION 2: THE NEW STRATEGIC EXECUTION CORE
// =================================================================
async function executeCollectiveMind(props) {
  const { cognitiveProfile, fingerprint, topIntents, sessionContext, userProfile, tracker } = props;

  if (DEBUG) console.log("🚀 Engaging The Collective Mind Protocol...");

  // STEP 1: Strategic Goal Setting
  const primaryNeed = cognitiveProfile.theoryOfMind.predictedNeeds[0] || 'need_for_reassurance';
  const uncertainty = cognitiveProfile.uncertaintyProfile.uncertainty;
  const bestIntent = topIntents[0];

  let strategicGoal;
  if (uncertainty > 0.6) strategicGoal = 'clarify_and_probe';
  else if (primaryNeed === 'need_for_insight' && bestIntent) strategicGoal = 'advance_dialogue_flow';
  else strategicGoal = 'validate_and_explore';

  if (DEBUG) console.log(`🎯 Strategic Goal: ${strategicGoal}`);

  // STEP 2: Execute base engine (state-aware)
  let baseResponse;
  if (bestIntent && bestIntent.full_intent?.dialogue_flow) {
    baseResponse = executeV9Engine(bestIntent.full_intent, fingerprint, userProfile, sessionContext);
    if (baseResponse.metadata?.nextSessionContext) {
      tracker.updateSessionContext(baseResponse.metadata.nextSessionContext);
    }
  } else {
    baseResponse = {
      reply: "أنا أفكر في كلماتك بعمق. هل يمكنك أن تشرح لي أكثر؟",
      source: 'collective_mind_fallback_no_flow'
    };
  }

  // STEP 3: ResponseSynthesizer fusion
  const synthesizerInput = topIntents.map(intent => ({
    reply: baseResponse.reply,
    source: intent.name || intent.id || 'unknown',
    confidence: intent.score || 0.6,
    metadata: {}
  }));

  const synthesized = ResponseSynthesizer.synthesizeResponse(
    synthesizerInput,
    cognitiveProfile,
    { strategicGoal, fingerprint },
    tracker
  );

  // STEP 4: HybridComposer final selection
  const hybridInput = [
    { reply: synthesized.reply, source: 'synthesizer', confidence: 0.9 },
    { reply: baseResponse.reply, source: 'v9engine', confidence: baseResponse.confidence || 0.8 }
  ];

  const finalHybrid = HybridComposer.selectHybrid(hybridInput);

  // STEP 5: Attach metadata for tracking
  const responsePayload = {
    reply: finalHybrid.reply,
    source: finalHybrid.source,
    metadata: {
      synthesizerMetadata: synthesized.metadata,
      hybridMetadata: finalHybrid.metadata || {},
      topIntent: bestIntent,
      strategicGoal
    }
  };

  return responsePayload;
}

// =================================================================
// SECTION 3: MAIN HANDLER
// =================================================================
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });

    if (DEBUG) console.log(`\n\n- - - [ NEW TURN ] - - -\n📨 Incoming message: "${rawMessage}"`);

    // --- USER & CONTEXT SETUP ---
    let users = await loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = {
        id: userId,
        createdAt: new Date().toISOString(),
        shortMemory: { history: [], sessionContext: { state: null, active_intent: null, turn_counter: 0 } }
      };
      if (DEBUG) console.log(`🆕 New user: ${userId}`);
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

    // --- PERCEPTION & KNOWLEDGE GRAPH ---
    await memoryGraph.initialize();
    const knowledgeAtom = atomize(rawMessage, { recentMessages: tracker.getHistory() });
    if (knowledgeAtom) memoryGraph.ingest(knowledgeAtom);

    const consciousness = new InferenceEngine(memoryGraph);
    const cognitiveProfile = await consciousness.generateCognitiveProfile();

    const fingerprint = generateFingerprint(rawMessage, { ...tracker.generateContextualSummary(), cognitiveProfile });
    const topIntents = getTopIntents(rawMessage, { topN: 3, userProfile: profile, fingerprint });

    // =================================================================
    // SECTION 4: STRATEGIC EXECUTION
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
        tracker
      });
      finalReply = responsePayload.reply;
    } else {
      if (DEBUG) console.log(`⚠️ LOW CONFIDENCE`);
      finalReply = "لم أفهم قصدك تمامًا، هل يمكنك التوضيح بجملة مختلفة؟";
      responsePayload = { source: "fallback_low_confidence" };
    }

    // --- POST-RESPONSE HOUSEKEEPING ---
    tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
    profile.shortMemory = tracker.serialize();

    try {
      await processMeta(rawMessage, finalReply, fingerprint, profile);
      if (DEBUG) console.log("✅ Meta-router tasks enqueued.");
    } catch (metaErr) {
      console.error("🚨 Meta-router error:", metaErr);
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
