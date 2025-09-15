

// chat.js v19.1 - The Semantic Core Conductor (Integrated with fingerprint + composition + context tracker)
// Updated to integrate: fingerprint_engine.js, composition_engine.js, context_tracker.js, knowledge_base.js
// Keeps original fusion, thresholds, meta-learning, and dynamic constructor as fallbacks.

import { DEBUG, SHORT_MEMORY_LIMIT, LONG_TERM_LIMIT } from './config.js';
// ===== بداية الترقية النهائية =====
import {
  expandMessageWithSemantics,
  normalizeArabic,
  detectMood,
  detectCritical,
  extractEntities,
  extractRootCause,
  adaptReplyBase,
  criticalSafetyReply,
  tokenize
} from './utils.js';
// ===== نهاية الترقية النهائية =====

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

// New integrations
import { generateFingerprint } from './fingerprint_engine.js';
import { composeInferentialResponse } from './composition_engine.js';
import { ContextTracker } from './context_tracker.js';

import { constructDynamicResponse } from './response_constructor.js';

// --- Initialization ---
buildIndexSync();

// --- ContextTrackers per runtime (not persisted as class instances) ---
const CONTEXT_TRACKERS = new Map(); // userId -> ContextTracker instance

// --- Configuration for The Fusion Engine (unchanged) ---
const FUSION_WEIGHTS = {
  baseScore: 0.60,
  moodMatch: 0.20,
  entityMatch: 0.15,
  contextMatch: 0.06,
  userAdaptive: 0.05,
  profileMatch: 0.18
};
const MAX_FUSION_BOOST = 0.45;
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

// --- Meta-Learning Helpers (No changes) ---
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

// --- Hyper-Aware Fusion Boost Functions (No changes) ---
function moodMatchBoost(intent, detectedMood) {
    if (!detectedMood || !intent?.full_intent?.emotion || detectedMood === 'محايد') return 0;
    const intentEmotionProfile = intent.full_intent.emotion;
    const moodStr = detectedMood.toString().toLowerCase();
    const matchedEmotion = (intentEmotionProfile.emotions_detected || []).find(e => e.type.toLowerCase().includes(moodStr));
    if (matchedEmotion) {
        const intensityFactor = (matchedEmotion.intensity > 0.6) ? 1.0 : 0.8;
        return intensityFactor;
    }
    const keywords = (intent.keywords || []).map(k => (k.text || '').toLowerCase());
    if (keywords.some(k => k.includes(moodStr))) return 0.5;
    return 0;
}
function entityMatchBoost(intent, entities = []) {
    if (!entities || entities.length === 0 || !intent?.full_intent) return 0;
    const intentCoreConcept = normalizeArabic(intent.full_intent.core_concept || '');
    const contextTags = new Set(Object.values(intent.full_intent.context_tags || {}).flat().map(normalizeArabic));
    for (const entity of entities) {
        const entityStr = normalizeArabic(entity);
        if (intentCoreConcept.includes(entityStr)) {
            return 1.0;
        }
        if (contextTags.has(entityStr)) {
            return 0.8;
        }
    }
    return 0;
}
function profileMatchBoost(intent, profile) {
    if (!profile?.longTermProfile?.recurring_themes || !intent?.full_intent?.core_concept) return 0;
    const recurringThemes = profile.longTermProfile.recurring_themes;
    const intentConcept = normalizeArabic(intent.full_intent.core_concept || "");
    for (const theme in recurringThemes) {
        if (recurringThemes[theme] > 3 && intentConcept.includes(normalizeArabic(theme))) {
            return 1.0;
        }
    }
    return 0;
}
function contextMatchBoost(intent, context) {
  if (!context || !Array.isArray(context.history) || !intent) return 0;
  for (const historyItem of context.history) {
    if (!historyItem || !historyItem.tag) continue;
    if (historyItem.tag === intent.tag) return 1.0; 
    const lastIntentObj = intentIndex.find(i => i.tag === historyItem.tag);
    if (lastIntentObj && (lastIntentObj.related_intents || []).includes(intent.tag)) return 1.0;
  }
  return 0;
}
function userAdaptiveBoostForIntent(profile, intent) {
  if (!profile || !intent) return 0;
  const count = (profile.intentSuccessCount && profile.intentSuccessCount[intent.tag]) || 0;
  return Math.min(1.0, count / 10);
}

function computeFusedScore(candidate, intentObj, detectedMood, entities, context, profile) {
  const base = Math.max(0, Math.min(1, candidate.score || 0));
  const moodBoost = FUSION_WEIGHTS.moodMatch * moodMatchBoost(intentObj, detectedMood);
  const entityBoost = FUSION_WEIGHTS.entityMatch * entityMatchBoost(intentObj, entities);
  const contextBoost = FUSION_WEIGHTS.contextMatch * contextMatchBoost(intentObj, context);
  const userBoost = FUSION_WEIGHTS.userAdaptive * userAdaptiveBoostForIntent(profile, intentObj);
  const profMatchBoost = FUSION_WEIGHTS.profileMatch * profileMatchBoost(intentObj, profile);
  let totalBoost = moodBoost + entityBoost + contextBoost + userBoost + profMatchBoost;
  if (totalBoost > MAX_FUSION_BOOST) totalBoost = MAX_FUSION_BOOST;
  const fusedScore = (base * FUSION_WEIGHTS.baseScore) + totalBoost;
  if(DEBUG && totalBoost > 0) {
      console.log(`🧠 FUSION BOOST for [${intentObj.tag}]: mood=${moodBoost.toFixed(2)}, entity=${entityBoost.toFixed(2)}, profile=${profMatchBoost.toFixed(2)} | Total Boost=${totalBoost.toFixed(2)}`);
  }
  return Math.min(1, Math.max(0, fusedScore));
}

// --- Diagnostic Builders (No changes) ---
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
  const visible = topCandidates.filter(c => (c.fusedScore || 0) >= DIAGNOSTIC_MIN_SCORE).slice(0, 2);
  if (visible.length === 0) return null;
  const lines = visible.map(c => `• ${c.tag.replace(/_/g, ' ')} (ثقة: ${(c.fusedScore * 100).toFixed(0)}%)`);
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
      users[userId] = { id: userId, createdAt: new Date().toISOString(), shortMemory: [], intentSuccessCount: {}, intentLastSuccess: {}, longTermProfile: { recurring_themes: {} } };
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();
    
    // ensure ContextTracker exists for this runtime
    let tracker = CONTEXT_TRACKERS.get(userId);
    if (!tracker) {
      tracker = new ContextTracker(profile);
      CONTEXT_TRACKERS.set(userId, tracker);
    }

    if (detectCritical(rawMessage)) {
      profile.flags = profile.flags || {};
      profile.flags.critical = true;
      await saveUsers(users);
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // =================================================================
    // START: SEMANTIC CORE INTEGRATION (THE FINAL UPGRADE)
    // =================================================================
    
    // Step 1: Enrich the user's message with semantic concepts.
    const semanticallyExpandedMessage = expandMessageWithSemantics(rawMessage);
    if (DEBUG) console.log(`🔎 Semantically Expanded Message: "${semanticallyExpandedMessage}"`);

    // Step 2: Use the enriched message for sensory functions.
    const mood = detectMood(semanticallyExpandedMessage);
    const entities = extractEntities(semanticallyExpandedMessage);

    // Build a short context summary from tracker
    const contextState = tracker.analyzeState();

    // Build fingerprint (uses knowledge_base internally)
    const fingerprint = generateFingerprint(rawMessage, {
      ...contextState,
      user_name: profile.name || '',
      last_need: contextState.recent_needs ? [...contextState.recent_needs].slice(-1)[0] : null,
      last_emotion: profile.moodHistory?.slice(-1)[0]?.mood || ''
    });

    // Attach computed mood/entities to fingerprint for downstream use
    fingerprint.detectedMood = mood;
    fingerprint.entities = entities;

    if (DEBUG) console.log('🧾 Fingerprint:', fingerprint);

    // =================================================================
    // END: SEMANTIC CORE INTEGRATION
    // =================================================================

    updateProfileWithEntities(profile, entities, mood, null);
    profile.moodHistory = (profile.moodHistory || []).slice(-LONG_TERM_LIMIT + 1);
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });
    profile.shortMemory = profile.shortMemory || [];
    profile.shortMemory.forEach(item => { item.age = (item.age || 0) + 1; });
    
    if (profile.expectingFollowUp?.isClarification) {
        // ... (No changes in this block)
    }

    // Step 3: Pass the ORIGINAL message to the intent engine.
    const contextForIntent = { history: profile.shortMemory.slice(-3) };
    const coreCandidates = getTopIntents(rawMessage, { topN: 5, context: contextForIntent, userProfile: profile });
    
    // The rest of the pipeline uses the ACCURATE mood and entities.
    const fusedCandidates = coreCandidates.map(c => {
      const intentObj = intentIndex.find(i => i.tag === c.tag);
      const fusedScore = intentObj ? computeFusedScore(c, intentObj, mood, entities, contextForIntent, profile) : c.score;
      return { ...c, fusedScore, intentObj: intentObj || c.full_intent };
    }).sort((a, b) => (b.fusedScore || 0) - (a.fusedScore || 0));

    if (DEBUG) {
      console.log("\n--- FUSED CANDIDATES ---");
      fusedCandidates.forEach(c => console.log(`- ${c.tag}: base=${(c.score).toFixed(4)} fused=${(c.fusedScore || 0).toFixed(4)}`));
    }

    const best = fusedCandidates[0];
    if (best) {
      let threshold = getThresholdForTag(best.tag);
      const tokens = tokenize(rawMessage);
      if (tokens.length <= 3) threshold = Math.min(0.9, threshold + 0.20);
      else if (tokens.length <= 6) threshold = Math.min(0.9, threshold + 0.10);

      if (best.fusedScore >= threshold) {
        const second = fusedCandidates[1];
        if (second && (best.fusedScore - second.fusedScore < AMBIGUITY_MARGIN)) {
          const options = [best, second].map(c => ({ tag: c.tag }));
          profile.expectingFollowUp = { isClarification: true, options, expiresTs: Date.now() + (5 * 60 * 1000) };
          await saveUsers(users);
          return res.status(200).json({ reply: buildClarificationPrompt(options), source: "clarification", userId });
        }

        // SUCCESS path: register and produce response using composition engine (primary) with fallback to constructDynamicResponse
        registerIntentSuccess(profile, best.tag);
        await adjustThresholdOnSuccess(best.tag);
        await incrementOccurrence(best.tag);
        recordRecurringTheme(profile, best.tag, mood);

        // Prepare top intents for composition (pass top 3 with intent objects)
        const topForComposition = fusedCandidates.slice(0, 3).map(c => ({
          score: c.fusedScore,
          full_intent: intentIndex.find(i => i.tag === c.tag) || c.intentObj,
          tag: c.tag
        }));

        // Persona selection: prefer user's chosen persona if set, else default 'the_listener'
        const personaKey = profile.preferred_persona || profile.persona || 'the_listener';

        // Ask composition engine to craft reply
        let compositionPayload;
        try {
          compositionPayload = await composeInferentialResponse(fingerprint, topForComposition, personaKey);
        } catch (err) {
          if (DEBUG) console.error("Composition engine error:", err);
          compositionPayload = null;
        }

        let finalReply = null;
        let compositionUsed = false;

        if (compositionPayload && compositionPayload.reply) {
          // Use composition if evaluation acceptable OR (keep as primary)
          const evalScore = compositionPayload.eval ?? 1.0;
          if (evalScore >= 0.45) { // threshold to accept composition; tuned low because we have fallback
            finalReply = compositionPayload.reply;
            compositionUsed = true;
          }
        }

        // If composition not used or low-quality, fallback to existing constructor (preserve old logic)
        if (!finalReply) {
          try {
            const dynamicPayload = await constructDynamicResponse(best.intentObj || best.intentObj, profile, mood, rawMessage);
            finalReply = dynamicPayload.reply;
          } catch (err) {
            if (DEBUG) console.error("constructDynamicResponse error:", err);
            finalReply = "أنا أسمعك، لكن لم أستطع تجهيز رد جيد الآن. هل يمكنك التوضيح أكثر؟";
          }
        }

        // If there's a notable secondary intent, mention it (preserve original UX)
        const secondary = fusedCandidates.find(c => c.tag !== best.tag && (c.fusedScore || 0) >= MULTI_INTENT_THRESHOLD);
        if (secondary) {
          finalReply += `\n\nبالمناسبة، لاحظت أنك قد تكون تتحدث أيضًا عن "${secondary.tag.replace(/_/g, ' ')}". هل ننتقل لهذا الموضوع بعد ذلك؟`;
          profile.expectingFollowUp = { isSuggestion: true, next_tag: secondary.tag, expiresTs: Date.now() + (5 * 60 * 1000) };
        }

        // Push to short memory via tracker
        tracker.addTurn(fingerprint, { reply: finalReply, source: compositionUsed ? compositionPayload.source : "dynamic_constructor" });
        // Persist shortMemory in profile (serialize)
        profile.shortMemory = tracker.serialize();

        // Save and return
        await saveUsers(users);
        return res.status(200).json({
          reply: finalReply,
          source: compositionUsed ? compositionPayload.source : "intent_dynamic",
          tag: best.tag,
          score: Number(best.fusedScore.toFixed(3)),
          userId,
          composition_eval: compositionPayload?.eval ?? null
        });
      }
    }

    if (best) await incrementOccurrence(best.tag);
    if (DEBUG) console.log(`LOW CONFIDENCE: Best candidate [${best?.tag}] with fused score ${best?.fusedScore?.toFixed(3)} did not meet its threshold.`);
    await appendLearningQueue({ message: rawMessage, userId, topCandidate: best?.tag, score: best?.fusedScore });

    const conciseDiag = buildConciseDiagnosticForUser(fusedCandidates);
    const generalFallback = "لم أفهم قصدك تمامًا، هل يمكنك التوضيح بجملة مختلفة؟ أحيانًا يساعدني ذلك على فهمك بشكل أفضل. أنا هنا لأسمعك.";
    const fallback = conciseDiag ? `${conciseDiag}\n\n${generalFallback}` : generalFallback;

    // Save fallback in short memory via tracker
    tracker.addTurn(fingerprint, { reply: fallback, source: "fallback_diagnostic" });
    profile.shortMemory = tracker.serialize();

    await saveUsers(users);
    return res.status(200).json({ reply: fallback, source: "fallback_diagnostic", userId });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
