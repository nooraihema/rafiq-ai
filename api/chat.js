// chat.js vΩ.1 - The Integrated Mind Conductor (Final Fix)
// Implements the full cognitive architecture and fixes the critical syntax error in getThresholdForTag.

import { DEBUG, SHORT_MEMORY_LIMIT, LONG_TERM_LIMIT } from './config.js';
// ===== Essential utilities only =====
import {
  detectCritical,
  criticalSafetyReply,
  tokenize,
  normalizeArabic
} from './utils.js';
// ===== End essential utilities =====

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
} from './storage.js';
import {
  intentIndex,
  buildIndexSync,
  getTopIntents,
  registerIntentSuccess
} from './intent_engine.js';

// =================================================================
// START: IMPORTING THE NEW COGNITIVE ARCHITECTURE
// =================================================================
import { ContextTracker } from './context_tracker.js';
import { generateFingerprintV2 as generateFingerprint } from './fingerprint_engine.js';
import { composeInferentialResponse } from './composition_engine.js';
import { constructDynamicResponse } from './response_constructor.js'; // Kept as a fallback
// =================================================================
// END: IMPORTING THE NEW COGNITIVE ARCHITECTURE
// =================================================================

// --- Initialization ---
buildIndexSync();

// --- ContextTrackers per runtime (not persisted as class instances) ---
const CONTEXT_TRACKERS = new Map(); // userId -> ContextTracker instance

// --- Thresholds & constants (Preserving your battle-tested values) ---
const CONFIDENCE_BASE_THRESHOLD = 0.40;
const AMBIGUITY_MARGIN = 0.10;
const MULTI_INTENT_THRESHOLD = 0.55;
const CLARIFICATION_VALID_CHOICES = /^[1-9][0-9]*$/;
const DIAGNOSTIC_MIN_SCORE = 0.05;
const DIAGNOSTIC_VISIBLE_TO_USER = true;

// --- Internal State for Meta-Learning ---
let INTENT_THRESHOLDS = {};
let OCCURRENCE_COUNTERS = {};

// --- Meta-Learning Initialization ---
(async () => {
  INTENT_THRESHOLDS = await loadIntentThresholds() || {};
  OCCURRENCE_COUNTERS = await loadOccurrenceCounters() || {};
  if (DEBUG) {
    console.log(
      `🧠 Meta-Learning Initialized: ${Object.keys(INTENT_THRESHOLDS).length} thresholds, ${Object.keys(OCCURRENCE_COUNTERS).length} occurrence counters loaded.`
    );
  }
})();

// --- Meta-Learning Helpers (Preserved) ---
// ===== بداية الإصلاح الحاسم =====
/**
 * vΩ.1: Fixed the faulty nested ternary operator that was causing a SyntaxError.
 */
function getThresholdForTag(tag) {
  if (!tag) return CONFIDENCE_BASE_THRESHOLD;
  const val = INTENT_THRESHOLDS[tag];
  // Use the safer, more readable version you suggested.
  return (typeof val === 'number' && !Number.isNaN(val)) ? val : CONFIDENCE_BASE_THRESHOLD;
}
// ===== نهاية الإصلاح الحاسم =====

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

// --- Diagnostic Builders (Preserved) ---
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
    
    // Step 1: Load User and Initialize Context
    let users = await loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = { id: userId, createdAt: new Date().toISOString(), shortMemory: [], longTermProfile: { recurring_themes: {} } };
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    let tracker = CONTEXT_TRACKERS.get(userId);
    if (!tracker) {
      tracker = new ContextTracker(profile);
      if (Array.isArray(profile.shortMemory) && profile.shortMemory.length > 0) {
        tracker.restoreFromSerialized(profile.shortMemory);
      }
      CONTEXT_TRACKERS.set(userId, tracker);
    }
    const contextState = tracker.analyzeState();

    // Step 2: Critical Safety Check
    if (detectCritical(rawMessage)) {
      profile.flags = { ...profile.flags, critical: true };
      await saveUsers(users);
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // Step 3: Perception - The New Cognitive Core
    const fingerprint = generateFingerprint(rawMessage, contextState);

    // Step 4: Dual Analysis - Intent Engine guided by the Fingerprint
    const topIntents = getTopIntents(rawMessage, { 
        topN: 3, 
        userProfile: profile, 
        fingerprint
    });

    // Step 5: Decision - Check for confidence and ambiguity
    const bestIntent = topIntents[0];
    if (bestIntent) {
      let threshold = getThresholdForTag(bestIntent.tag);
      const tokens = tokenize(rawMessage);
      if (tokens.length <= 3) threshold = Math.min(0.9, threshold + 0.20);
      else if (tokens.length <= 6) threshold = Math.min(0.9, threshold + 0.10);

      if (bestIntent.score >= threshold) {
        const secondIntent = topIntents[1];
        if (secondIntent && (bestIntent.score - secondIntent.score < AMBIGUITY_MARGIN)) {
          const options = [bestIntent, secondIntent].map(c => ({ tag: c.tag }));
          profile.expectingFollowUp = { isClarification: true, options, expiresTs: Date.now() + (5 * 60 * 1000) };
          await saveUsers(users);
          return res.status(200).json({ reply: buildClarificationPrompt(options), source: "clarification", userId });
        }

        // --- SUCCESS PATH ---
        registerIntentSuccess(profile, bestIntent.tag);
        await adjustThresholdOnSuccess(bestIntent.tag);
        await incrementOccurrence(bestIntent.tag);
        recordRecurringTheme(profile, bestIntent.tag, fingerprint.primaryEmotion.type);

        // Step 6: Creation - The new Composition Engine takes the lead
        const personaKey = profile.preferred_persona || 'the_listener';
        let responsePayload = null;
        let finalReply = '';
        
        try {
          responsePayload = composeInferentialResponse(fingerprint, topIntents, personaKey);
          finalReply = responsePayload.reply;
        } catch (err) {
          if (DEBUG) console.error("Composition engine crashed:", err);
          try {
              const fallbackPayload = await constructDynamicResponse(bestIntent.full_intent, profile, fingerprint.primaryEmotion.type, rawMessage);
              finalReply = fallbackPayload.reply;
              responsePayload = { source: 'fallback_constructor', ...fallbackPayload };
          } catch (fallbackErr) {
              if (DEBUG) console.error("Fallback constructor also crashed:", fallbackErr);
              finalReply = "أنا أسمعك، لكنني أواجه صعوبة في ترتيب أفكاري الآن.";
              responsePayload = { source: 'critical_fallback' };
          }
        }

        const secondary = topIntents.find(c => c.tag !== bestIntent.tag && c.score >= MULTI_INTENT_THRESHOLD);
        if (secondary) {
          finalReply += `\n\nبالمناسبة، لاحظت أنك قد تكون تتحدث أيضًا عن "${secondary.tag.replace(/_/g, ' ')}". هل ننتقل لهذا الموضوع بعد ذلك؟`;
        }
        
        // Step 7: Memory Update
        tracker.addTurn(fingerprint, { reply: finalReply, ...responsePayload });
        profile.shortMemory = tracker.serialize();
        updateProfileWithEntities(profile, fingerprint.concepts.map(c => c.concept), fingerprint.primaryEmotion.type, null);
        
        await saveUsers(users);
        return res.status(200).json({
          reply: finalReply,
          source: responsePayload.source || 'composition_engine',
          tag: bestIntent.tag,
          score: Number(bestIntent.score.toFixed(3)),
          userId,
          composition_eval: responsePayload.eval ?? null
        });
      }
    }

    // --- LOW CONFIDENCE PATH ---
    if (bestIntent) await incrementOccurrence(bestIntent.tag);
    if (DEBUG) console.log(`LOW CONFIDENCE: Best candidate [${bestIntent?.tag}] with score ${bestIntent?.score?.toFixed(3)} did not meet its threshold.`);
    
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
