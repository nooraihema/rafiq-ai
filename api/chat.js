
// chat.js vΩ+2 - The Conscious & Self-Aware Conductor
// =================================================================
// START: CORE IMPORTS (Paths as per your structure)
// =================================================================
import { DEBUG, SHORT_MEMORY_LIMIT, LONG_TERM_LIMIT } from '../shared/config.js';
import {
  detectCritical,
  criticalSafetyReply,
  tokenize,
  normalizeArabic
} from '../shared/utils.js';
import {
  loadUsers,
  saveUsers,
  makeUserId,
  appendLearningQueue,
  updateProfileWithEntities,
  recordRecurringTheme,
  loadIntentThresholds,
  saveIntentThresholds,
  loadOccurrenceCounters,
  saveOccurrenceCounters
} from '../shared/storage.js';
import {
  intentIndex,
  buildIndexSync,
  getTopIntents,
  registerIntentSuccess
} from '../perception/intent_engine.js';
import { executeMetacognitiveCore } from '../core/dynamic_logic_engine.js';
import { processMeta } from '../coordination/meta_router.js';
import { ContextTracker } from '../shared/context_tracker.js';
import { generateFingerprintV2 as generateFingerprint } from '../perception/fingerprint_engine.js';
import { constructDynamicResponse } from '../core/response_constructor.js';
// =================================================================
// END: CORE IMPORTS
// =================================================================

// =================================================================
// START: NEW - HIPPOCAMPUS PROJECT IMPORTS
// =================================================================
import { atomize } from '../hippocampus/knowledgeAtomizer.js';
import { memoryGraph } from '../hippocampus/MemoryGraph.js'; 
import { InferenceEngine } from '../hippocampus/InferenceEngine.js';
// =================================================================
// END: HIPPOCAMPUS IMPORTS
// =================================================================

// --- Initialization ---
buildIndexSync();

// --- In-memory instances ---
const CONTEXT_TRACKERS = new Map();
const USER_MEMORY_GRAPHS = new Map();

// --- Thresholds & constants ---
const CONFIDENCE_BASE_THRESHOLD = 0.40;
const AMBIGUITY_MARGIN = 0.10;
const MULTI_INTENT_THRESHOLD = 0.55;
const CLARIFICATION_VALID_CHOICES = /^[1-9][0-9]*$/;
const DIAGNOSTIC_MIN_SCORE = 0.05;
const DIAGNOSTIC_VISIBLE_TO_USER = true;

// --- Internal State ---
let INTENT_THRESHOLDS = {};
let OCCURRENCE_COUNTERS = {};

// --- Meta-Learning Initialization ---
(async () => {
  INTENT_THRESHOLDS = await loadIntentThresholds() || {};
  OCCURRENCE_COUNTERS = await loadOccurrenceCounters() || {};
  if (DEBUG) {
    console.log(`🧠 Meta-Learning Initialized: ${Object.keys(INTENT_THRESHOLDS).length} thresholds, ${Object.keys(OCCURRENCE_COUNTERS).length} occurrence counters loaded.`);
  }
})();

// --- Helpers ---
function getThresholdForTag(tag) {
  if (!tag) return CONFIDENCE_BASE_THRESHOLD;
  const val = INTENT_THRESHOLDS[tag];
  return (typeof val === 'number' && !Number.isNaN(val)) ? val : CONFIDENCE_BASE_THRESHOLD;
}

async function adjustThresholdOnSuccess(tag) {
  if (!tag) return;
  const current = getThresholdForTag(tag);
  const newVal = Math.max(0.15, current - 0.02);
  INTENT_THRESHOLDS[tag] = parseFloat(newVal.toFixed(3));
  await saveIntentThresholds(INTENT_THRESHOLDS);
  if (DEBUG) console.log(`💡 Meta-Learn: Adjusted threshold for ${tag}: ${current} -> ${INTENT_THRESHOLDS[tag]}`);
}

async function incrementOccurrence(tag) {
  if (!tag) return;
  OCCURRENCE_COUNTERS[tag] = (OCCURRENCE_COUNTERS[tag] || 0) + 1;
  const count = OCCURRENCE_COUNTERS[tag];
  if (count % 10 === 0) {
    const currentThreshold = getThresholdForTag(tag);
    INTENT_THRESHOLDS[tag] = Math.max(0.12, currentThreshold - 0.01);
    await saveIntentThresholds(INTENT_THRESHOLDS);
    if (DEBUG) console.log(`💡 Meta-Learn: Occurrence-driven adjustment for ${tag}, new threshold: ${INTENT_THRESHOLDS[tag]}`);
  }
  await saveOccurrenceCounters(OCCURRENCE_COUNTERS);
}

// --- Diagnostic Builders ---
function buildClarificationPrompt(options) {
  let question = "لم أكن متأكدًا تمامًا مما تقصده. هل يمكنك توضيح ما إذا كنت تقصد أحد هذه المواضيع؟\n";
  const lines = options.map((opt, i) => {
      const intentObj = intentIndex.find(it => it.tag === opt.tag);
      const promptText = intentObj?.full_intent?.layers?.L1?.[0] || opt.tag.replace(/_/g, ' ');
      return `${i + 1}. ${promptText}`;
  });
  return `${question}${lines.join('\n')}\n(يمكنك الرد برقم الاختيار)`;
}

function buildConciseDiagnosticForUser(topCandidates) {
  if (!DIAGNOSTIC_VISIBLE_TO_USER || !topCandidates || topCandidates.length === 0) return null;
  const visible = topCandidates.filter(c => (c.score || 0) >= DIAGNOSTIC_MIN_SCORE).slice(0, 2);
  if (visible.length === 0) return null;
  const lines = visible.map(c => `• ${c.tag.replace(/_/g, ' ')} (ثقة: ${(c.score * 100).toFixed(0)}%)`);
  return `احتمالات قريبة:\n${lines.join("\n")}\nإذا كانت غير مقصودة، حاول توضيح جملتك.`;
}

// --- Main Handler ---
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });
    if (DEBUG) console.log(`📨 Incoming message: "${rawMessage}"`);

    // --- Load User ---
    let users = await loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = { id: userId, createdAt: new Date().toISOString(), shortMemory: [], longTermProfile: { recurring_themes: {} } };
      if (DEBUG) console.log(`🆕 New user created: ${userId}`);
    } else if (DEBUG) {
      console.log(`👤 Existing user: ${userId}`);
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    // --- HIPPOCAMPUS INTEGRATION ---
    let userMemory = memoryGraph; 
    await userMemory.initialize();
    const knowledgeAtom = atomize(rawMessage, { recentMessages: profile.shortMemory });
    if (knowledgeAtom) {
      userMemory.ingest(knowledgeAtom);
      if (DEBUG) console.log("🧩 Knowledge atom ingested:", knowledgeAtom);
    }
    const consciousness = new InferenceEngine(userMemory);
    const cognitiveProfile = await consciousness.generateCognitiveProfile();
    if (DEBUG) console.log("🧠 Cognitive profile generated:", cognitiveProfile);

    // --- Context Tracker ---
    let tracker = CONTEXT_TRACKERS.get(userId);
    if (!tracker) {
      tracker = new ContextTracker(profile);
      if (Array.isArray(profile.shortMemory) && profile.shortMemory.length > 0) tracker.restoreFromSerialized(profile.shortMemory);
      CONTEXT_TRACKERS.set(userId, tracker);
      if (DEBUG) console.log("🗂️ Context tracker initialized.");
    }
    const contextState = tracker.analyzeState();
    if (DEBUG) console.log("🔍 Context state:", contextState);

    // --- Critical Check ---
    if (detectCritical(rawMessage)) {
      profile.flags = { ...profile.flags, critical: true };
      await saveUsers(users);
      if (DEBUG) console.warn("⚠️ Critical message detected!");
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // --- Fingerprint ---
    const fingerprint = generateFingerprint(rawMessage, { ...contextState, cognitiveProfile });
    if (DEBUG) console.log("🔑 Fingerprint generated:", fingerprint);

    // --- Intent Analysis ---
    const topIntents = getTopIntents(rawMessage, { topN: 3, userProfile: profile, fingerprint });
    if (DEBUG) console.log("🎯 Top intents:", topIntents);

    // --- Decision & Response ---
    const bestIntent = topIntents[0];
    if (bestIntent) {
      let threshold = getThresholdForTag(bestIntent.tag);
      const tokens = tokenize(rawMessage);
      if (tokens.length <= 3) threshold = Math.min(0.9, threshold + 0.20);
      else if (tokens.length <= 6) threshold = Math.min(0.9, threshold + 0.10);
      if (DEBUG) console.log(`⚖️ Best intent: ${bestIntent.tag}, score: ${bestIntent.score}, threshold: ${threshold}`);

      if (bestIntent.score >= threshold) {
        const secondIntent = topIntents[1];
        if (secondIntent && (bestIntent.score - secondIntent.score < AMBIGUITY_MARGIN)) {
          const options = [bestIntent, secondIntent].map(c => ({ tag: c.tag }));
          profile.expectingFollowUp = { isClarification: true, options, expiresTs: Date.now() + (5 * 60 * 1000) };
          await saveUsers(users);
          if (DEBUG) console.log("❓ Ambiguous intents detected, asking for clarification.");
          return res.status(200).json({ reply: buildClarificationPrompt(options), source: "clarification", userId });
        }

        registerIntentSuccess(profile, bestIntent.tag);
        await adjustThresholdOnSuccess(bestIntent.tag);
        await incrementOccurrence(bestIntent.tag);
        recordRecurringTheme(profile, bestIntent.tag, fingerprint.primaryEmotion.type);
        if (DEBUG) console.log("✅ Intent registered and thresholds updated.");

        let responsePayload = null;
        let finalReply = '';

        try {
          responsePayload = executeMetacognitiveCore(bestIntent.full_intent, fingerprint, profile, cognitiveProfile);
          if (responsePayload && responsePayload.reply) finalReply = responsePayload.reply;
          else throw new Error("Empty response from Metacognitive Core");
          if (DEBUG) console.log("🧩 Metacognitive core reply:", finalReply);
        } catch (err) {
          if (DEBUG) console.error("🚨 Metacognitive core crashed:", err);
          try {
            const fallbackPayload = await constructDynamicResponse(bestIntent.full_intent, profile, fingerprint.primaryEmotion.type, rawMessage);
            finalReply = fallbackPayload.reply;
            responsePayload = { source: 'fallback_constructor', ...fallbackPayload };
            if (DEBUG) console.log("🛠️ Fallback constructor reply:", finalReply);
          } catch (fallbackErr) {
            if (DEBUG) console.error("🚨 Fallback constructor also crashed:", fallbackErr);
            finalReply = "أنا أسمعك، لكنني أواجه صعوبة في ترتيب أفكاري الآن.";
            responsePayload = { source: 'critical_fallback' };
          }
        }

        // --- Multi-Intent Suggestion ---
        const secondary = topIntents.find(c => c.tag !== bestIntent.tag && c.score >= MULTI_INTENT_THRESHOLD);
        if (secondary) {
          finalReply += `\n\nبالمناسبة، لاحظت أنك قد تكون تتحدث أيضًا عن "${secondary.tag.replace(/_/g, ' ')}". هل ننتقل لهذا الموضوع بعد ذلك؟`;
          if (DEBUG) console.log("💡 Multi-intent suggestion added:", secondary.tag);
        }

        // --- Post-Response Orchestration ---
        try {
          await processMeta(rawMessage, finalReply, fingerprint, profile);
          if (DEBUG) console.log("✅ Meta-router successfully enqueued post-response tasks.");
        } catch (metaErr) {
          console.error("🚨 Meta-router failed to process tasks:", metaErr);
        }

        // --- Update Memory & Profile ---
        tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
        profile.shortMemory = tracker.serialize();
        updateProfileWithEntities(profile, fingerprint.concepts.map(c => c.concept), fingerprint.primaryEmotion.type, null);

        // --- HIPPOCAMPUS PERSISTENCE ---
        await userMemory.persist();
        if (DEBUG) console.log("💾 User memory persisted in hippocampus.");

        // --- Save Users ---
        await saveUsers(users);

        return res.status(200).json({
          reply: finalReply,
          source: responsePayload.source || 'metacognitive_core_v5',
          tag: bestIntent.tag,
          score: Number(bestIntent.score.toFixed(3)),
          userId,
          metadata: responsePayload.metadata ?? null
        });
      }
    }

    // --- LOW CONFIDENCE PATH ---
    if (bestIntent) await incrementOccurrence(bestIntent.tag);
    if (DEBUG) console.log(`⚠️ LOW CONFIDENCE: Best candidate [${bestIntent?.tag}] with score ${bestIntent?.score?.toFixed(3)} did not meet threshold.`);

    await appendLearningQueue({ message: rawMessage, userId, topCandidate: bestIntent?.tag, score: bestIntent?.score });
    const conciseDiag = buildConciseDiagnosticForUser(topIntents);
    const generalFallback = "لم أفهم قصدك تمامًا، هل يمكنك التوضيح بجملة مختلفة؟ أحيانًا يساعدني ذلك على فهمك بشكل أفضل. أنا هنا لأسمعك.";
    const fallbackReply = conciseDiag ? `${conciseDiag}\n\n${generalFallback}` : generalFallback;

    tracker.addTurn(fingerprint, { reply: fallbackReply, source: "fallback_diagnostic" });
    profile.shortMemory = tracker.serialize();
    await saveUsers(users);

    return res.status(200).json({ reply: fallbackReply, source: "fallback_diagnostic", userId });

  } catch (err) {
    console.error("API error:", err);
    if (DEBUG) console.error(err.stack);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
