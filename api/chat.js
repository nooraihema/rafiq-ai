// chat.js v16.0 - The Multi-Protocol Conductor
// This version introduces the "Strategy Room" concept, allowing the system
// to process multiple relevant protocols in parallel and enabling true response merging.
// Author: For Rafiq system

// =================================================================
// SECTION 1: CORE & HIPPocampus IMPORTS
// =================================================================
import { DEBUG } from '../shared/config.js';
import { detectCritical, criticalSafetyReply, tokenize } from '../shared/utils.js';
import { loadUsers, saveUsers, makeUserId } from '../shared/storage.js';
// --- UPGRADE: Using the new multi-protocol planner ---
import { buildIndexSync, createCognitiveBriefing } from '../perception/intent_engine.js';
// --- Using the correct strategic entry point from the logic engine ---
import { executeProtocolStep } from '../core/dynamic_logic_engine.js';
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
// SECTION 1B: INITIALIZATION & CONFIG
// =================================================================
buildIndexSync();
const CONTEXT_TRACKERS = new Map();
const MAX_NEW_PROTOCOLS_TO_INVITE = 3; // <-- يمكنك تعديل هذا الرقم (الحد الأقصى للخبراء الجدد)

// =================================================================
// SECTION 2: THE CONSCIOUS ORCHESTRA (This function is now retired)
// Its logic is fully integrated into the main handler.
// =================================================================

// =================================================================
// SECTION 3: MAIN HANDLER (The Final "Strategy Room" Logic)
// =================================================================
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });

    if (DEBUG) console.log(`\n\n- - - [ NEW TURN ] - - -\n📨 Incoming message: "${rawMessage}"`);

    // --- USER & SESSION-AWARE CONTEXT SETUP (Preserved and stable) ---
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
    // SECTION 4: STRATEGIC EXECUTION (The New Multi-Protocol Flow)
    // =================================================================
    let finalReply = "";
    let responsePayload = {};

    // 1. The Strategic Planner provides a full intelligence briefing.
    const briefing = createCognitiveBriefing(rawMessage, fingerprint, sessionContext, profile);
    
    // 2. The Strategy Room gathers all relevant experts for a parallel performance.
    let candidates = [];

    // Expert 1: The Active Protocol Expert (Continues the ongoing conversation)
    if (briefing.activeProtocol) {
        if (DEBUG) console.log(`STRATEGY ROOM: Inviting active protocol "${briefing.activeProtocol.intent.tag}" to perform.`);
        const candidate = executeProtocolStep(
            { full_intent: briefing.activeProtocol.intent.full_intent, initial_context: briefing.activeProtocol.context },
            fingerprint, profile, briefing.activeProtocol.context
        );
        if (candidate) candidates.push(candidate);
    }

    // --- <<< START: FINAL FIX - INVITING MULTIPLE EXPERTS >>> ---
    // Expert 2: The Multiple New Protocol Experts (Responds to all relevant new topics)
    const topNewProtocols = briefing.potentialNewProtocols.slice(0, MAX_NEW_PROTOCOLS_TO_INVITE);

    for (const newProtocol of topNewProtocols) {
        // Ensure we don't re-invite the active protocol if it appears in the new list
        if (newProtocol && newProtocol.tag !== briefing.activeProtocol?.intent.tag) {
            if (DEBUG) console.log(`STRATEGY ROOM: Inviting new protocol candidate "${newProtocol.tag}" with score ${newProtocol.score.toFixed(3)} to perform.`);
            
            const newCandidate = executeProtocolStep(
                { full_intent: newProtocol.full_intent, initial_context: { state: null, turn_counter: 0 } },
                fingerprint, profile, { state: null, turn_counter: 0 }
            );
            if (newCandidate) {
                candidates.push(newCandidate);
            }
        }
    }
    // --- <<< END: FINAL FIX >>> ---
    
    // --- <<< START: MODIFIED DIAGNOSTIC LOGGING >>> ---
    if (DEBUG) {
        // This diagnostic now checks if ANY candidates were generated from protocols
        const protocolCandidates = candidates.filter(c => c.source !== 'empathic_safety_net' && c.source !== 'response_synthesizer_v1.2');
        if (protocolCandidates.length === 0) {
            console.log('DIAGNOSTIC: No candidates were generated from any protocol.');
            if (!briefing.activeProtocol) {
                console.log('DIAGNOSTIC: Reason -> No active protocol in context.');
            }
            if (briefing.potentialNewProtocols.length === 0) {
                console.log(`DIAGNOSTIC: Reason -> No new protocols met the minimum score threshold.`);
            }
             console.log('DIAGNOSTIC: All potential protocols found by planner:', briefing.potentialNewProtocols.map(p => ({ tag: p.tag, score: p.score.toFixed(3) })));
        } else {
             console.log('DIAGNOSTIC: Candidates generated successfully:', candidates.map(c => ({ source: c.source, reply: (c.reply || "").slice(0, 50) + "..." })));
        }
    }
    // --- <<< END: MODIFIED DIAGNOSTIC LOGGING >>> ---

    // Expert 3: The Creative Synthesizer (Adds a different flavor)
    const artisticCandidate = ResponseSynthesizer.synthesizeResponse(candidates, { cognitiveProfile, fingerprint }, {}, tracker);
    if(artisticCandidate) candidates.push(artisticCandidate);

    // Expert 4: The Empathic Safety Net (Always present)
    const empathicCandidate = {
      reply: `أتفهم أن هذا الموقف يسبب لك الكثير من المشاعر الصعبة. أنا هنا لأسمعك.`,
      source: 'empathic_safety_net', confidence: 0.95, metadata: { isSafetyNet: true }
    };
    candidates.push(empathicCandidate);

    // Remove any exact duplicate replies before sending to the Maestro
    const uniqueCandidates = [...new Map(candidates.map(item => [item["reply"], item])).values()];
    if (DEBUG) console.log(`MAESTRO'S DESK: Received ${uniqueCandidates.length} unique candidates for final review.`);
    
    // 3. The Maestro (HybridComposer) receives ALL expert opinions and the briefing to make the final composition.
    responsePayload = HybridComposer.synthesizeHybridResponse(
        uniqueCandidates, 
        briefing, // Pass the full briefing for strategic context
        { fingerprint, tracker }
    );
    
    if (!responsePayload || !responsePayload.reply) {
        responsePayload = {
            reply: "أنا أفكر في كلماتك بعمق. هل يمكنك أن تشرح لي أكثر؟",
            source: 'critical_fallback',
            metadata: {}
        };
    }

    finalReply = responsePayload.reply;
    
    // --- POST-RESPONSE HOUSEKEEPING (UPGRADED AND STABLE) ---
    tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
    
    // --- <<< START: UPGRADED SESSION MANAGEMENT LOGIC >>> ---
    const nextContext = responsePayload.metadata?.nextSessionContext;

    if (nextContext) {
        // Check for the successful completion signal we added
        if (nextContext.state === 'PROTOCOL_COMPLETE') {
            if(DEBUG) console.log(`SESSION: Protocol "${nextContext.active_intent}" completed successfully. Resetting for next turn.`);
            // Reset intentionally because the protocol has finished its job
            tracker.updateSessionContext({ active_intent: null, state: null, turn_counter: 0 }); 
        } else {
            // If not complete, update the context to continue the conversation
            if(DEBUG) console.log(`SESSION: Updating context for ${userId} to state:`, nextContext);
            tracker.updateSessionContext(nextContext);
        }
    } else {
       // This block now correctly handles true errors where no context was provided at all
       if(DEBUG) console.log(`SESSION: No next context provided (true error or end of non-protocol response). Resetting state for ${userId}.`);
       tracker.updateSessionContext({ active_intent: null, state: null, turn_counter: 0 });
    }
    // --- <<< END: UPGRADED SESSION MANAGEMENT LOGIC >>> ---

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
