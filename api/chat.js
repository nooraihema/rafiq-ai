// chat.js v16.1 - Cognitive Data Aggregator
// This version introduces a new cognitive analysis layer that runs all advanced
// perception engines (Atomizer, MemoryGraph, InferenceEngine) to create a rich
// context object, which is then passed down the chain for future use by the linguistic core.
// The existing logic remains intact for now.

// =================================================================
// SECTION 1: CORE & HIPPocampus IMPORTS
// =================================================================
import { DEBUG } from '../shared/config.js';
import { detectCritical, criticalSafetyReply } from '../shared/utils.js';
import { loadUsers, saveUsers, makeUserId } from '../shared/storage.js';
import { buildIndexSync, createCognitiveBriefing } from '../perception/intent_engine.js';
import { executeProtocolStep } from '../core/dynamic_logic_engine.js';
import { processMeta } from '../coordination/meta_router.js';
import { ContextTracker } from '../shared/context_tracker.js';

// All perception engines are now explicitly used here
import { generateFingerprintV2 as generateFingerprint } from '../perception/fingerprint_engine.js';
import { atomize } from '../hippocampus/knowledgeAtomizer.js';
import { memoryGraph } from '../hippocampus/MemoryGraph.js';
import { InferenceEngine } from '../hippocampus/InferenceEngine.js';

// Preserved imports
import ResponseSynthesizer from '../intelligence/ResponseSynthesizer.js';
import HybridComposer from '../intelligence/HybridComposer.js';

// =================================================================
// SECTION 1B: INITIALIZATION & CONFIG
// =================================================================
buildIndexSync();
const CONTEXT_TRACKERS = new Map();
const MAX_NEW_PROTOCOLS_TO_INVITE = 3;

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

    // --- USER & SESSION SETUP ---
    let users = await loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = { id: userId, createdAt: new Date().toISOString(), shortMemory: {} };
      if (DEBUG) console.log(`🆕 New user: ${userId}`);
    }
    const profile = users[userId];

    let tracker = CONTEXT_TRACKERS.get(userId);
    if (!tracker) {
      if (DEBUG) console.log(`SESSION: No active tracker for ${userId}. Creating from profile.`);
      tracker = new ContextTracker(profile.shortMemory); // Pass shortMemory to restore state
      CONTEXT_TRACKERS.set(userId, tracker);
    }
    
    if (detectCritical(rawMessage)) {
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // =================================================================
    // [NEW] SECTION 3.5: THE COGNITIVE ANALYSIS LAYER
    // Here, we run all perception engines to build a rich context object.
    // =================================================================
    console.log("\n--- [Cognitive Layer] Starting Full Analysis ---");
    
    // 1. Generate the basic fingerprint (still useful for some modules)
    const fingerprint = generateFingerprint(rawMessage, { ...tracker.generateContextualSummary() });
    console.log("[Cognitive Layer] Fingerprint generated.");

    // 2. Atomize the message to create a rich Knowledge Atom
    const knowledgeAtom = atomize(rawMessage, { recentMessages: tracker.getHistory(), fingerprint });
    console.log("[Cognitive Layer] Knowledge Atom created.");

    // 3. Ingest into MemoryGraph and run the Inference Engine
    await memoryGraph.initialize();
    if (knowledgeAtom) {
        memoryGraph.ingest(knowledgeAtom);
        console.log("[Cognitive Layer] Atom ingested into MemoryGraph.");
    }
    const consciousness = new InferenceEngine(memoryGraph);
    const cognitiveProfile = await consciousness.generateCognitiveProfile();
    console.log("[Cognitive Layer] Cognitive Profile generated.");
    
    // Asynchronously run memory maintenance
    setTimeout(() => {
        memoryGraph.dream();
        memoryGraph.persist();
    }, 0);
    
    // =================================================================
    
    // --- STRATEGIC EXECUTION (Existing Logic) ---
    // The existing logic will now receive the enriched context.
    
    let finalReply = "";
    let responsePayload = {};
    const sessionContext = tracker.getSessionContext();

    const briefing = createCognitiveBriefing(rawMessage, fingerprint, sessionContext, profile);
    
    let candidates = [];
    if (briefing.activeProtocol) {
        const candidate = executeProtocolStep(
            { full_intent: briefing.activeProtocol.intent.full_intent, initial_context: briefing.activeProtocol.context },
            fingerprint, profile, briefing.activeProtocol.context
        );
        if (candidate) candidates.push(candidate);
    }

    const topNewProtocols = briefing.potentialNewProtocols.slice(0, MAX_NEW_PROTOCOLS_TO_INVITE);
    for (const newProtocol of topNewProtocols) {
        if (newProtocol && newProtocol.tag !== briefing.activeProtocol?.intent.tag) {
            const newCandidate = executeProtocolStep(
                { full_intent: newProtocol.full_intent, initial_context: { state: null } },
                fingerprint, profile, { state: null }
            );
            if (newCandidate) candidates.push(newCandidate);
        }
    }

    // This part remains unchanged for now, as per our plan
    const artisticCandidate = ResponseSynthesizer.synthesizeResponse(candidates, { cognitiveProfile, fingerprint }, {}, tracker);
    if(artisticCandidate) candidates.push(artisticCandidate);

    const empathicCandidate = {
      reply: `أتفهم أن هذا الموقف يسبب لك الكثير من المشاعر الصعبة. أنا هنا لأسمعك.`,
      source: 'empathic_safety_net', confidence: 0.95, metadata: { isSafetyNet: true }
    };
    candidates.push(empathicCandidate);

    const uniqueCandidates = [...new Map(candidates.map(item => [item["reply"], item])).values()];
    if (DEBUG) console.log(`MAESTRO'S DESK: Received ${uniqueCandidates.length} unique candidates for final review.`);
    
    // --- FINAL COMPOSITION ---
    // We now pass the full, enriched context to the next layer.
    responsePayload = HybridComposer.synthesizeHybridResponse(
        uniqueCandidates, 
        briefing,
        { 
          // [NEW] Passing all the rich data
          user_message: rawMessage,
          userId: userId,
          tracker: tracker,
          fingerprint: fingerprint,
          knowledgeAtom: knowledgeAtom,
          cognitiveProfile: cognitiveProfile
        }
    );
    
    if (!responsePayload || !responsePayload.reply) {
        responsePayload = { reply: "أنا أفكر في كلماتك بعمق...", source: 'critical_fallback' };
    }

    finalReply = responsePayload.reply;
    
    // --- POST-RESPONSE HOUSEKEEPING ---
    tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
    
    // [MODIFIED] We now get the updated user state from the linguistic core if available
    if (responsePayload.updatedUserState) {
        tracker.setUserState(responsePayload.updatedUserState);
    } else if (responsePayload.metadata?.nextSessionContext) {
        tracker.updateSessionContext(responsePayload.metadata.nextSessionContext);
    }
    
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
