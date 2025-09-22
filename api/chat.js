// chat.js v15.0 - The Fully Integrated Conductor
// Final version that ensures the Protocol Engine and the Creative Orchestra always work together.
// Author: For Rafiq system

// =================================================================
// SECTION 1: CORE & HIPPOCAMPUS IMPORTS
// =================================================================
import { DEBUG } from '../shared/config.js';
import { detectCritical, criticalSafetyReply, tokenize } from '../shared/utils.js';
import { loadUsers, saveUsers, makeUserId } from '../shared/storage.js';
// Using the final, correct function names
import { buildIndexSync, findActiveProtocol } from '../perception/intent_engine.js';
import { executeV9Engine } from '../core/dynamic_logic_engine.js'; // We will call V9 directly
import { composeInferentialResponse } from '../core/composition_engine.js';
import { processMeta } from '../coordination/meta_router.js';
import { ContextTracker } from '../shared/context_tracker.js';
import { generateFingerprintV2 as generateFingerprint } from '../perception/fingerprint_engine.js';
import { atomize } from '../hippocampus/knowledgeAtomizer.js';
import { memoryGraph } from '../hippocampus/MemoryGraph.js';
import { InferenceEngine } from '../hippocampus/InferenceEngine.js';

// Preserved imports for the orchestra
import ResponseSynthesizer from '../intelligence/ResponseSynthesizer.js';
import HybridComposer from '../intelligence/HybridComposer.js';

// =================================================================
// SECTION 1B: INITIALIZATION & SESSION MEMORY
// =================================================================
buildIndexSync();
const CONTEXT_TRACKERS = new Map();
const CONFIDENCE_THRESHOLD = 0.45; // This is now a legacy threshold, but kept for safety.

// =================================================================
// SECTION 2: THE CONSCIOUS ORCHESTRA (This function is now retired)
// Its logic is now integrated directly into the main handler.
// We are keeping it here commented out, as a sign of respect for the work done.
/*
async function conductOrchestra(props) {
  // ... (previous logic)
}
*/
// =================================================================

// =================================================================
// SECTION 3: MAIN HANDLER (The Final Integrated Logic)
// =================================================================
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });

    if (DEBUG) console.log(`\n\n- - - [ NEW TURN ] - - -\n📨 Incoming message: "${rawMessage}"`);

    // --- USER & SESSION-AWARE CONTEXT SETUP (Preserved) ---
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
      if(DEBUG) console.log(`SESSION: No active tracker for ${userId}. Creating from profile.`);
      tracker = new ContextTracker(profile);
      CONTEXT_TRACKERS.set(userId, tracker);
    } else {
      if(DEBUG) console.log(`SESSION: Active tracker found for ${userId}. Continuing session...`);
    }
    const sessionContext = tracker.getSessionContext();

    if (detectCritical(rawMessage)) {
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // --- PERCEPTION & KNOWLEDGE GRAPH (Preserved) ---
    await memoryGraph.initialize();
    const knowledgeAtom = atomize(rawMessage, { recentMessages: tracker.getHistory() });
    if (knowledgeAtom) memoryGraph.ingest(knowledgeAtom);
    const consciousness = new InferenceEngine(memoryGraph);
    const cognitiveProfile = await consciousness.generateCognitiveProfile();
    const fingerprint = generateFingerprint(rawMessage, { ...tracker.generateContextualSummary(), cognitiveProfile });
    
    // =================================================================
    // SECTION 4: STRATEGIC EXECUTION (The New Integrated Flow)
    // =================================================================
    let finalReply = "";
    let responsePayload = {};

    // 1. The Strategic Planner creates the "Case File" for this turn.
    const protocolPacket = findActiveProtocol(rawMessage, fingerprint, sessionContext, profile);

    // 2. The Orchestra's musicians prepare their performances in parallel.
    let protocolCandidate = null;
    if (protocolPacket.protocol_found) {
        if (DEBUG) console.log(`STRATEGY: Protocol "${protocolPacket.protocol_tag}" is active. Engaging V9 Engine.`);
        // The expert soloist plays the main melody from the protocol.
        protocolCandidate = executeV9Engine(
            protocolPacket.full_intent,
            fingerprint,
            profile,
            protocolPacket.initial_context
        );
    } else {
        if (DEBUG) console.log(`STRATEGY: No protocol found. The orchestra will improvise.`);
    }

    // The creative pianist adds harmony, using the protocol's melody as inspiration if available.
    const artisticCandidate = ResponseSynthesizer.synthesizeResponse(
        [protocolCandidate].filter(Boolean),
        { cognitiveProfile, fingerprint },
        {},
        tracker
    );

    // The empathic heartbeat is always ready with a safety net.
    const empathicCandidate = {
        reply: `أتفهم أن هذا الموقف يسبب لك الكثير من المشاعر الصعبة. أنا هنا لأسمعك، ومثل هذه المشاعر طبيعية تمامًا.`,
        source: 'empathic_safety_net',
        confidence: 0.95,
        metadata: { isSafetyNet: true }
    };

    // 3. All musicians present their work to the Maestro.
    const allCandidates = [protocolCandidate, artisticCandidate, empathicCandidate].filter(Boolean);
    if (DEBUG) console.log(`MAESTRO'S DESK: Received ${allCandidates.length} candidates for final review.`);

    // 4. The Maestro (HybridComposer) makes the final, strategic decision
    // using the "Case File" to guide its choice.
    responsePayload = HybridComposer.synthesizeHybridResponse(
        allCandidates,
        protocolPacket, // The full strategic packet
        { fingerprint, tracker }
    );
    
    // Safety net for any unexpected failure in the composition process
    if (!responsePayload || !responsePayload.reply) {
        responsePayload = {
            reply: "أنا أفكر في كلماتك بعمق. هل يمكنك أن تشرح لي أكثر؟",
            source: 'critical_fallback',
            metadata: {}
        };
    }

    finalReply = responsePayload.reply;
    
    // --- POST-RESPONSE HOUSEKEEPING (Preserved) ---
    tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
    
    if (responsePayload.metadata?.nextSessionContext) {
        if(DEBUG) console.log(`SESSION: Updating context for ${userId} to state:`, responsePayload.metadata.nextSessionContext);
        tracker.updateSessionContext(responsePayload.metadata.nextSessionContext);
    } else if (protocolPacket.protocol_found) {
       if(DEBUG) console.log(`SESSION: Protocol may have ended or failed to provide next state. Resetting for safety.`);
       tracker.updateSessionContext({ active_intent: null, state: null });
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
