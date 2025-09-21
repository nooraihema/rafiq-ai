// chat.js v12.0 - The Conscious Orchestra
// Implements the "Parallel Audition" model, using all engines in concert.
// Author: For Rafiq system
// Notes: All engines now work in parallel to generate diverse candidates for a final, intelligent selection.

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

// --- MODIFICATION: Importing our repaired and ready expert engines ---
import ResponseSynthesizer from '../intelligence/ResponseSynthesizer.js';
import HybridComposer from '../intelligence/HybridComposer.js';

// =================================================================
// SECTION 1B: INITIALIZATION
// =================================================================
buildIndexSync();
const CONTEXT_TRACKERS = new Map();
const CONFIDENCE_THRESHOLD = 0.45;

// =================================================================
// SECTION 2: THE NEW CONSCIOUS ORCHESTRA CONDUCTOR
// =================================================================
async function conductOrchestra(props) {
  const { cognitiveProfile, fingerprint, topIntents, sessionContext, userProfile, tracker } = props;

  if (DEBUG) console.log("🎼 Conducting The Conscious Orchestra...");

  // --- STEP 1: PARALLEL AUDITION ---
  // The conductor asks each expert musician to perform their best piece.

  // a) The Soloist (Direct & Logical Candidate)
  // V9Engine provides the clear, logical melody.
  const logicalCandidate = executeV9Engine(topIntents[0], fingerprint, userProfile, sessionContext);

  // b) The Pianist (Artistic & Fused Candidate)
  // ResponseSynthesizer adds harmony and emotional depth, using the logical melody as a base.
  const artisticCandidate = ResponseSynthesizer.synthesizeResponse(
      [logicalCandidate].filter(Boolean), // Pass only valid candidates
      { cognitiveProfile, fingerprint }, 
      {}, 
      tracker
  );

  // c) The Heartbeat (Empathic Safety Net)
  // This is a guaranteed, pure emotional response, ensuring we never sound cold.
  const empathicCandidate = {
    reply: `أتفهم أن هذا الموقف يسبب لك الكثير من المشاعر الصعبة. أنا هنا لأسمعك، ومثل هذه المشاعر طبيعية تمامًا.`,
    source: 'empathic_safety_net',
    confidence: 0.95,
    metadata: { isSafetyNet: true }
  };

  // Gather all performances. The .filter(Boolean) removes any nulls if an engine fails.
  const allCandidates = [logicalCandidate, artisticCandidate, empathicCandidate].filter(Boolean);
  if (DEBUG) console.log(`🎶 Audition produced ${allCandidates.length} candidates.`);

  // --- STEP 2: THE FINAL JUDGEMENT ---
  // The Music Arranger (HybridComposer) listens to all performances and selects/fuses the final masterpiece.
  // Its internal logic will now weigh these diverse options based on the user's fingerprint.
  const finalResponse = HybridComposer.synthesizeHybridResponse(
      allCandidates, 
      { fingerprint, tracker }
  );

  return finalResponse;
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

    // --- PERCEPTION & KNOWLEDGE GRAPH (The Conductor reads the music sheet) ---
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
      // --- MODIFICATION: The Conductor starts the Orchestra ---
      responsePayload = await conductOrchestra({
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
      responsePayload = { source: "fallback_low_confidence", metadata: {} };
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
    if (DEBUG) console.error(err.stack); // Use err.stack for more detailed error logging
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
