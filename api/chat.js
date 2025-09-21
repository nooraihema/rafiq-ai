// chat.js v14.0 - The Stable Protocol Conductor
// Final version with corrected parameter passing and robust session management.
// The Conscious Orchestra is fully restored as the creative fallback.
// Author: For Rafiq system

// =أو================================================================
// SECTION 1: CORE & HIPPOCAMPUS IMPORTS
// =================================================================
import { DEBUG } from '../shared/config.js';
import { detectCritical, criticalSafetyReply, tokenize } from '../shared/utils.js';
import { loadUsers, saveUsers, makeUserId } from '../shared/storage.js';
// --- MODIFICATION: Using the final, correct function names ---
import { buildIndexSync, findActiveProtocol } from '../perception/intent_engine.js';
import { executeV9Engine } from '../core/dynamic_logic_engine.js'; // We will call V9 directly
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
const CONTEXT_TRACKERS = new Map();
const CONFIDENCE_THRESHOLD = 0.45;

// =================================================================
// SECTION 2: THE CONSCIOUS ORCHESTRA (Restored to its full power)
// =================================================================
async function conductOrchestra(props) {
  const { cognitiveProfile, fingerprint, topIntents, sessionContext, userProfile, tracker } = props;

  if (DEBUG) console.log("🎼 Orchestra Fallback: No specific protocol found. Generating creative response.");

  // a) The Soloist (Direct & Logical Candidate from V9)
  // We call the original executeV9Engine as it was designed to be called.
  const logicalCandidate = executeV9Engine(topIntents[0]?.full_intent, fingerprint, userProfile, sessionContext);

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

  // The Music Arranger (HybridComposer) makes the final selection.
  const finalResponse = HybridComposer.synthesizeHybridResponse(
      allCandidates,
      // We pass the new protocol packet structure, signaling this is a fallback.
      { protocol_found: false, strategicRecommendation: 'EXPLORE_AND_CLARIFY' },
      { fingerprint, tracker }
  );

  return finalResponse;
}

// =================================================================
// SECTION 3: MAIN HANDLER (With Corrected Protocol Logic)
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
    // SECTION 4: STRATEGIC EXECUTION (Corrected)
    // =================================================================
    let finalReply = "";
    let responsePayload = {};

    // 1. The Strategic Planner finds a protocol.
    const protocolPacket = findActiveProtocol(rawMessage, fingerprint, sessionContext, profile);

    if (protocolPacket.protocol_found) {
        if (DEBUG) console.log(`STRATEGY: Protocol "${protocolPacket.protocol_tag}" is active. Engaging V9 Engine directly.`);
        
        // --- [THE CRITICAL FIX] ---
        // 2. We call the powerful V9 engine DIRECTLY with the correct parameters.
        // We are no longer using a faulty wrapper function.
        responsePayload = executeV9Engine(
            protocolPacket.full_intent,
            fingerprint,
            profile,
            protocolPacket.initial_context
        );
    } else {
        // 3. If no protocol is found, we fall back to the creative Conscious Orchestra.
        if (DEBUG) console.log(`STRATEGY: No protocol found. Engaging Conscious Orchestra as fallback.`);
        
        // The orchestra needs the results of the old intent engine to function.
        const topIntents = [protocolPacket.top_raw_intent].filter(Boolean);

        responsePayload = await conductOrchestra({
            cognitiveProfile,
            fingerprint,
            topIntents, // Pass the raw intent found
            sessionContext,
            userProfile: profile,
            tracker
        });
    }

    // This handles the case where an engine might fail and return null
    if (!responsePayload) {
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
    } else {
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
