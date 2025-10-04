// api/chat.js v16.2 - Correct Wisdom Library Integration
// This version fixes the error by calling the correct `getAllIntents` function
// AFTER the index has been built, ensuring the full list of libraries is passed correctly.

import { DEBUG } from '../shared/config.js';
import { detectCritical, criticalSafetyReply } from '../shared/utils.js';
import { loadUsers, saveUsers, makeUserId } from '../shared/storage.js';
// [CORRECTED] We need the new getAllIntents function
import { buildIndexSync, createCognitiveBriefing, getAllIntents } from '../perception/intent_engine.js';
import { executeProtocolStep } from '../core/dynamic_logic_engine.js';
import { processMeta } from '../coordination/meta_router.js';
import { ContextTracker } from '../shared/context_tracker.js';

// All perception engines
import { generateFingerprintV2 as generateFingerprint } from '../perception/fingerprint_engine.js';
import { atomize } from '../hippocampus/knowledgeAtomizer.js';
import { memoryGraph } from '../hippocampus/MemoryGraph.js';
import { InferenceEngine } from '../hippocampus/InferenceEngine.js';

// Preserved imports
import ResponseSynthesizer from '../intelligence/ResponseSynthesizer.js';
import HybridComposer from '../intelligence/HybridComposer.js';

// =================================================================
// INITIALIZATION & CONFIG
// =================================================================

// --- [CORRECTION] ---
// Step 1: Build the index. This populates the internal variables in intent_engine.
buildIndexSync(); 
// Step 2: Now that the index is built, get the list of all loaded intents.
const allWisdomLibraries = getAllIntents(); 

const CONTEXT_TRACKERS = new Map();
const MAX_NEW_PROTOCOLS_TO_INVITE = 3;

// =================================================================
// MAIN HANDLER
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
      tracker = new ContextTracker(profile.shortMemory);
      CONTEXT_TRACKERS.set(userId, tracker);
    }
    
    if (detectCritical(rawMessage)) {
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // --- COGNITIVE ANALYSIS LAYER ---
    console.log("\n--- [Cognitive Layer] Starting Full Analysis ---");
    const fingerprint = generateFingerprint(rawMessage, { ...tracker.generateContextualSummary() });
    const knowledgeAtom = atomize(rawMessage, { recentMessages: tracker.getHistory(), fingerprint });
    await memoryGraph.initialize();
    if (knowledgeAtom) {
        memoryGraph.ingest(knowledgeAtom);
    }
    const consciousness = new InferenceEngine(memoryGraph);
    const cognitiveProfile = await consciousness.generateCognitiveProfile();
    console.log("[Cognitive Layer] Analysis complete.");
    
    setTimeout(() => {
        memoryGraph.dream();
        memoryGraph.persist();
    }, 0);
    
    // --- STRATEGIC EXECUTION (OLD LOGIC) ---
    const sessionContext = tracker.getSessionContext();
    const briefing = createCognitiveBriefing(rawMessage, fingerprint, sessionContext, profile);
    let candidates = [];
    const topNewProtocols = briefing.potentialNewProtocols.slice(0, MAX_NEW_PROTOCOLS_TO_INVITE);
    for (const newProtocol of topNewProtocols) {
        const newCandidate = executeProtocolStep(
            { full_intent: newProtocol.full_intent, initial_context: { state: null } },
            fingerprint, profile, { state: null }
        );
        if (newCandidate) candidates.push(newCandidate);
    }
    const empathicCandidate = {
      reply: `أتفهم أن هذا الموقف يسبب لك الكثير من المشاعر الصعبة.`,
      source: 'empathic_safety_net', confidence: 0.95
    };
    candidates.push(empathicCandidate);
    const uniqueCandidates = [...new Map(candidates.map(item => [item["reply"], item])).values()];
    
    // --- FINAL COMPOSITION ---
    let responsePayload = {};
    responsePayload = HybridComposer.synthesizeHybridResponse(
        uniqueCandidates, 
        briefing,
        { 
          user_message: rawMessage,
          userId: userId,
          tracker: tracker,
          fingerprint: fingerprint,
          knowledgeAtom: knowledgeAtom,
          cognitiveProfile: cognitiveProfile,
          // The correctly populated list is now passed
          allWisdomLibraries: allWisdomLibraries 
        }
    );
    
    if (!responsePayload || !responsePayload.reply) {
        responsePayload = { reply: "أنا أفكر في كلماتك بعمق...", source: 'critical_fallback' };
    }

    // --- POST-RESPONSE HOUSEKEEPING ---
    tracker.addTurn(fingerprint, { reply: responsePayload.reply, ...responsePayload });
    if (responsePayload.updatedUserState) {
        tracker.setUserState(responsePayload.updatedUserState);
    } else if (responsePayload.metadata?.nextSessionContext) {
        tracker.updateSessionContext(responsePayload.metadata.nextSessionContext);
    }
    profile.shortMemory = tracker.serialize();
    
    try {
      await processMeta(rawMessage, responsePayload.reply, fingerprint, profile);
    } catch (metaErr) {
      console.error("🚨 Meta-router error:", metaErr);
    }

    await saveUsers(users);

    return res.status(200).json({
      reply: responsePayload.reply,
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
