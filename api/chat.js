
// chat.js v16.0 - The Meta-Fusion Conductor (Final Polished Version)
// Fully asynchronous, diagnostic, fusion-based decisioning with clarification and adaptive thresholds.

import { DEBUG, SHORT_MEMORY_LIMIT, LONG_TERM_LIMIT } from './config.js';
import {
  detectMood,
  detectCritical,
  extractEntities,
  extractRootCause,
  adaptReplyBase,
  criticalSafetyReply,
  tokenize
} from './utils.js';
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

// --- Initialization ---
buildIndexSync();

// --- Configuration for The Fusion Engine ---
const FUSION_WEIGHTS = {
  baseScore: 0.60,
  moodMatch: 0.18,
  entityMatch: 0.12,
  contextMatch: 0.06,
  userAdaptive: 0.04
};
const MAX_FUSION_BOOST = 0.40;
const CONFIDENCE_BASE_THRESHOLD = 0.40;
const AMBIGUITY_MARGIN = 0.10;
const MULTI_INTENT_THRESHOLD = 0.55;
const CLARIFICATION_VALID_CHOICES = /^[1-9][0-9]*$/;
const DIAGNOSTIC_MIN_SCORE = 0.05;
const DIAGNOSTIC_VISIBLE_TO_USER = true; // 🔄 خليها false في الإنتاج

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

// --- Meta-Learning Helpers ---
function getThresholdForTag(tag) {
  if (!tag) return CONFIDENCE_BASE_THRESHOLD;
  return (typeof INTENT_THRESHOLDS[tag] === 'number')
    ? INTENT_THRESHOLDS[tag]
    : CONFIDENCE_BASE_THRESHOLD;
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

// --- Fusion Engine Helpers ---
function moodMatchBoost(intent, detectedMood) {
  if (!detectedMood || !intent || detectedMood === 'محايد') return 0;
  const moodStr = detectedMood.toString().toLowerCase();
  if ((intent.tag || '').toLowerCase().includes(moodStr)) return 1.0;
  const keywords = (intent.keywords || []).map(k => (k || '').toLowerCase());
  if (keywords.some(k => k.includes(moodStr))) return 1.0;
  return 0;
}

function entityMatchBoost(intent, entities = []) {
  if (!entities || entities.length === 0 || !intent) return 0;
  const keywords = new Set((intent.keywords || []).map(k => (k || '').toLowerCase()));
  const tag = (intent.tag || '').toLowerCase();
  for (const entity of entities) {
    const entityStr = (entity || '').toLowerCase();
    if (keywords.has(entityStr) || tag.includes(entityStr)) return 1.0;
  }
  return 0;
}

function contextMatchBoost(intent, context) {
  if (!context || !Array.isArray(context.history) || !intent) return 0;
  for (const historyItem of context.history) {
    if (!historyItem || !historyItem.tag) continue;
    if (historyItem.tag === intent.tag) return 1.0; // Strong boost for repetition
    const lastIntentObj = intentIndex.find(i => i.tag === historyItem.tag);
    if (lastIntentObj && (lastIntentObj.related_intents || []).includes(intent.tag)) return 1.0;
  }
  return 0;
}

function userAdaptiveBoostForIntent(profile, intent) {
  if (!profile || !intent) return 0;
  const count = (profile.intentSuccessCount && profile.intentSuccessCount[intent.tag]) || 0;
  return Math.min(1.0, count / 10); // Normalized 0..1, caps at 10 successes
}

function computeFusedScore(candidate, intentObj, detectedMood, entities, context, profile) {
  const base = Math.max(0, Math.min(1, candidate.score || 0));

  const moodBoost = FUSION_WEIGHTS.moodMatch * moodMatchBoost(intentObj, detectedMood);
  const entityBoost = FUSION_WEIGHTS.entityMatch * entityMatchBoost(intentObj, entities);
  const contextBoost = FUSION_WEIGHTS.contextMatch * contextMatchBoost(intentObj, context);
  const userBoost = FUSION_WEIGHTS.userAdaptive * userAdaptiveBoostForIntent(profile, intentObj);

  let totalBoost = moodBoost + entityBoost + contextBoost + userBoost;
  if (totalBoost > MAX_FUSION_BOOST) totalBoost = MAX_FUSION_BOOST;

  const fusedScore = (base * FUSION_WEIGHTS.baseScore) + totalBoost;
  return Math.min(1, Math.max(0, fusedScore));
}

// --- Diagnostic Builders ---
function buildClarificationPrompt(options) {
  let question = "لم أكن متأكدًا تمامًا مما تقصده. هل يمكنك توضيح ما إذا كنت تقصد أحد هذه المواضيع؟\n";
  const lines = options.map((opt, i) => `${i + 1}. ${opt.prompt}`);
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

    let users = await loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = { id: userId, createdAt: new Date().toISOString(), shortMemory: [], intentSuccessCount: {}, intentLastSuccess: {} };
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    // --- Critical check ---
    if (detectCritical(rawMessage)) {
      profile.flags = profile.flags || {};
      profile.flags.critical = true;
      await saveUsers(users);
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    const mood = detectMood(rawMessage);
    const entities = extractEntities(rawMessage) || [];

    updateProfileWithEntities(profile, entities, mood, null);
    profile.moodHistory = (profile.moodHistory || []).slice(-LONG_TERM_LIMIT + 1);
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });

    profile.shortMemory = profile.shortMemory || [];
    profile.shortMemory.forEach(item => { item.age = (item.age || 0) + 1; });

    // --- Handle Clarification Response ---
    if (profile.expectingFollowUp?.isClarification) {
      const trimmed = rawMessage.trim();
      if (CLARIFICATION_VALID_CHOICES.test(trimmed)) {
        const idx = parseInt(trimmed, 10) - 1;
        const chosen = profile.expectingFollowUp.options[idx];
        if (chosen) {
          profile.expectingFollowUp = null;
          registerIntentSuccess(profile, chosen.tag);
          await adjustThresholdOnSuccess(chosen.tag);

          const intent = intentIndex.find(i => i.tag === chosen.tag);
          const baseReply = Array.isArray(intent?.responses) && intent.responses.length
            ? intent.responses[Math.floor(Math.random() * intent.responses.length)]
            : "شكرًا للتوضيح. كيف يمكنني المساعدة أكثر؟";
          const personalized = adaptReplyBase(baseReply, profile, mood);

          profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, tag: chosen.tag, age: 0, entities });
          await saveUsers(users);
          return res.status(200).json({ reply: personalized, source: "intent_clarified", tag: chosen.tag, userId });
        }
      }
      profile.expectingFollowUp = null; // Invalid choice
    }

    // --- Intent Recognition Pipeline ---
    const context = { history: profile.shortMemory.slice(-3) };
    const coreCandidates = getTopIntents(rawMessage, { topN: 5, context, userProfile: profile });

    const fusedCandidates = coreCandidates.map(c => {
      const intentObj = intentIndex.find(i => i.tag === c.tag);
      const fusedScore = intentObj ? computeFusedScore(c, intentObj, mood, entities, context, profile) : c.score;
      return { ...c, fusedScore, intentObj };
    }).sort((a, b) => (b.fusedScore || 0) - (a.fusedScore || 0));

    if (DEBUG) {
      console.log("\n--- FUSED CANDIDATES ---");
      fusedCandidates.forEach(c => console.log(`- ${c.tag}: base=${(c.score).toFixed(4)} fused=${(c.fusedScore || 0).toFixed(4)}`));
    }

    // --- Decision Logic ---
    const best = fusedCandidates[0];
    if (best) {
      let threshold = getThresholdForTag(best.tag);

      // Dynamic threshold adjustment for short inputs
      const tokens = tokenize(rawMessage);
      if (tokens.length <= 3) threshold = Math.min(0.9, threshold + 0.20);
      else if (tokens.length <= 6) threshold = Math.min(0.9, threshold + 0.10);

      if (best.fusedScore >= threshold) {
        const second = fusedCandidates[1];

        // --- Ambiguity Handling ---
        if (second && (best.fusedScore - second.fusedScore < AMBIGUITY_MARGIN)) {
          const options = [best, second].map(c => ({
            tag: c.tag,
            prompt: c.tag.replace(/_/g, ' ')
          }));
          profile.expectingFollowUp = { isClarification: true, options, expiresTs: Date.now() + (5 * 60 * 1000) };
          await saveUsers(users);
          return res.status(200).json({ reply: buildClarificationPrompt(options), source: "clarification", userId });
        }

        // --- No Ambiguity: Proceed with best intent ---
        registerIntentSuccess(profile, best.tag);
        await adjustThresholdOnSuccess(best.tag);
        await incrementOccurrence(best.tag);
        recordRecurringTheme(profile, best.tag, mood);

        const intent = best.intentObj;
        const baseReply = Array.isArray(intent?.responses) && intent.responses.length
          ? intent.responses[Math.floor(Math.random() * intent.responses.length)]
          : "أنا أسمعك...";
        let finalReply = adaptReplyBase(baseReply, profile, mood);

        // Multi-intent suggestion (only if no clarification)
        const secondary = fusedCandidates.find(c => c.tag !== best.tag && (c.fusedScore || 0) >= MULTI_INTENT_THRESHOLD);
        if (secondary) {
          finalReply += `\n\nبالمناسبة، لاحظت أنك قد تكون تتحدث أيضًا عن "${secondary.tag.replace(/_/g, ' ')}". هل ننتقل لهذا الموضوع بعد ذلك؟`;
          profile.expectingFollowUp = { isSuggestion: true, next_tag: secondary.tag, expiresTs: Date.now() + (5 * 60 * 1000) };
        }

        profile.shortMemory.push({ message: rawMessage, reply: finalReply, mood, tag: best.tag, age: 0, entities });
        await saveUsers(users);
        return res.status(200).json({ reply: finalReply, source: "intent_fused", tag: best.tag, score: Number(best.fusedScore.toFixed(3)), userId });
      }
    }

    // --- Fallback Logic ---
    if (best) await incrementOccurrence(best.tag);
    if (DEBUG) console.log(`LOW CONFIDENCE: Best candidate [${best?.tag}] with fused score ${best?.fusedScore?.toFixed(3)} did not meet its threshold.`);

    await appendLearningQueue({ message: rawMessage, userId, topCandidate: best?.tag, score: best?.fusedScore });

    const conciseDiag = buildConciseDiagnosticForUser(coreCandidates);
    const generalFallback = "لم أفهم قصدك تمامًا، هل يمكنك التوضيح بجملة مختلفة؟ أحيانًا يساعدني ذلك على فهمك بشكل أفضل. أنا هنا لأسمعك.";
    const fallback = conciseDiag ? `${conciseDiag}\n\n${generalFallback}` : generalFallback;

    profile.shortMemory.push({ message: rawMessage, reply: fallback, mood, age: 0, entities });
    await saveUsers(users);
    return res.status(200).json({ reply: fallback, source: "fallback_diagnostic", userId });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
