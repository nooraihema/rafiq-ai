// chat.js v13.0 - The Session-Aware Protocol Conductor
// Implements the "Protocol-First" strategy with in-memory session persistence.
// The Conscious Orchestra now serves as a creative fallback.
// Author: For Rafiq system

// =================================================================
// SECTION 1: CORE & HIPPOCAMPUS IMPORTS
// =================================================================
import { DEBUG } from '../shared/config.js';
import { detectCritical, criticalSafetyReply, tokenize } from '../shared/utils.js';
import { loadUsers, saveUsers, makeUserId } from '../shared/storage.js';
// --- MODIFICATION: Importing the new strategic planner and protocol executor ---
import { buildIndexSync, findActiveProtocol } from '../perception/intent_engine.js';
import { executeProtocolStep } from '../core/dynamic_logic_engine.js';
import { composeInferentialResponse } from '../core/composition_engine.js';
import { processMeta } from '../coordination/meta_router.js';
import { ContextTracker } from '../shared/context_tracker.js';
import { generateFingerprintV2 as generateFingerprint } from '../perception/fingerprint_engine.js';
import { atomize } from '../hippocampus/knowledgeAtomizer.js';
import { memoryGraph } from '../hippocampus/MemoryGraph.js';
import { InferenceEngine } from '../hippocampus/InferenceEngine.js';

// --- Preserved imports for the orchestra fallback ---
import ResponseSynthesizer from '../intelligence/ResponseSynthesizer.js';
import HybridComposer from '../intelligence/HybridComposer.js';

// =================================================================
// SECTION 1B: INITIALIZATION & SESSION MEMORY
// =================================================================
buildIndexSync();
// --- MODIFICATION: This is now our primary mechanism for session memory ---
const CONTEXT_TRACKERS = new Map();
const CONFIDENCE_THRESHOLD = 0.45; // This is now mainly for the fallback logic

// =================================================================
// SECTION 2: THE CONSCIOUS ORCHESTRA (Preserved as a Creative Fallback)
// =================================================================
async function conductOrchestra(props) {
  const { cognitiveProfile, fingerprint, top_raw_intent, sessionContext, userProfile, tracker } = props;

  if (DEBUG) console.log("🎼 Orchestra Fallback: No specific protocol found. Generating creative response.");

  // a) The Soloist (a simple response based on the top raw intent, if any)
  const logicalCandidate = {
      reply: top_raw_intent?.full_intent?.dialogue_flow?.layers?.L0_Validation?.responses[0] || "كيف يمكنني مساعدتك بشكل أفضل؟",
      source: `fallback_engine:${top_raw_intent?.tag || 'none'}`,
      confidence: top_raw_intent?.score || 0.6,
      metadata: {}
  };

  // b) The Pianist (Artistic & Fused Candidate)
  const artisticCandidate = ResponseSynthesizer.synthesizeResponse(
      [logicalCandidate].filter(Boolean),
      { cognitiveProfile, fingerprint }, 
      {}, 
      tracker
  );

  // c) The Heartbeat (Empathic Safety Net)
  const empathicCandidate = {
    reply: `أتفهم أن هذا الموقف يسبب لك الكثير من المشاعر الصعبة. أنا هنا لأسمعك، ومثل هذه المشاعر طبيعية تمامًا.`,
    source: 'empathic_safety_net',
    confidence: 0.95,
    metadata: { isSafetyNet: true }
  };
  
  const allCandidates = [logicalCandidate, artisticCandidate, empathicCandidate].filter(Boolean);
  if (DEBUG) console.log(`🎶 Fallback Audition produced ${allCandidates.length} candidates.`);

  // The Music Arranger (HybridComposer) makes the final selection
  // --- MODIFICATION: Passing the protocolPacket as an empty object for compatibility ---
  const finalResponse = HybridComposer.synthesizeHybridResponse(
      allCandidates, 
      { protocol_found: false }, // Signal that this is a fallback
      { fingerprint, tracker }
  );

  return finalResponse;
}

// =================================================================
// SECTION 3: MAIN HANDLER (With Session-Aware Protocol Logic)
// =================================================================
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });

    if (DEBUG) console.log(`\n\n- - - [ NEW TURN ] - - -\n📨 Incoming message: "${rawMessage}"`);

    // --- USER & SESSION-AWARE CONTEXT SETUP ---
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

    // --- MODIFICATION: The session memory logic is now robust ---
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

    // --- PERCEPTION & KNOWLEDGE GRAPH (Unchanged) ---
    // This part of your code is excellent and remains the same.
    await memoryGraph.initialize();
    const knowledgeAtom = atomize(rawMessage, { recentMessages: tracker.getHistory() });
    if (knowledgeAtom) memoryGraph.ingest(knowledgeAtom);
    const consciousness = new InferenceEngine(memoryGraph);
    const cognitiveProfile = await consciousness.generateCognitiveProfile();
    const fingerprint = generateFingerprint(rawMessage, { ...tracker.generateContextualSummary(), cognitiveProfile });
    
    // =================================================================
    // SECTION 4: STRATEGIC EXECUTION (Upgraded to Protocol-First)
    // =================================================================
    let finalReply = "";
    let responsePayload = {};

    // --- MODIFICATION: The new strategic core of the application ---
    // 1. First, we ask the Strategic Planner to find a protocol.
    const protocolPacket = findActiveProtocol(rawMessage, fingerprint, sessionContext, profile);

    if (protocolPacket.protocol_found) {
        if (DEBUG) console.log(`STRATEGY: Protocol "${protocolPacket.protocol_tag}" is active. Engaging Protocol Executor.`);
        // 2. If a protocol is found, we execute the current step.
        responsePayload = executeProtocolStep(
            protocolPacket.full_intent,
            fingerprint,
            profile,
            protocolPacket.initial_context
        );
    } else {
        // 3. If NO protocol is found, we fall back to the creative Conscious Orchestra.
        if (DEBUG) console.log(`STRATEGY: No protocol found. Engaging Conscious Orchestra as fallback.`);
        responsePayload = await conductOrchestra({
            cognitiveProfile,
            fingerprint,
            top_raw_intent: protocolPacket.top_raw_intent, // Pass any raw data we found
            sessionContext,
            userProfile: profile,
            tracker
        });
        // Since the orchestra is a fallback, we clear the context to avoid getting stuck.
        responsePayload.metadata = { ...(responsePayload.metadata || {}), nextSessionContext: { active_intent: null, state: null, turn_counter: 0 } };
    }

    finalReply = responsePayload.reply;
    
    // --- POST-RESPONSE HOUSEKEEPING (With Session Memory Update) ---
    tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
    
    // --- MODIFICATION: The memory update is now more robust ---
    if (responsePayload.metadata?.nextSessionContext) {
        if(DEBUG) console.log(`SESSION: Updating context for ${userId} to state:`, responsePayload.metadata.nextSessionContext);
        tracker.updateSessionContext(responsePayload.metadata.nextSessionContext);
    } else {
       // If a response has no next context (e.g., orchestra fallback), reset the state for the next turn.
       if(DEBUG) console.log(`SESSION: No next context provided. Resetting state for ${userId}.`);
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
