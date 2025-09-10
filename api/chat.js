// chat.js v14.0 - The Meta-Fusion Conductor
// Fully asynchronous, diagnostic + fusion-based decisioning,
// adds: Dynamic Fusion Engine, Per-Intent Adaptive Thresholds, Self-Learning persistence.
// Compatible with intent_engine v13.x

import fs from "fs";
import path from "path";

import { DEBUG, SHORT_MEMORY_LIMIT, LONG_TERM_LIMIT, ROOT } from './config.js';
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
  recordRecurringTheme
} from './storage.js';
import {
  intentIndex,
  buildIndexSync,
  getTopIntents,
  registerIntentSuccess
} from './intent_engine.js';

// --------------------------- New persistence files ---------------------------
const DATA_DIR = path.join(process.cwd(), "data");
const INTENT_THRESHOLDS_FILE = path.join(DATA_DIR, "intent_thresholds.json");
const OCCURRENCE_COUNTERS_FILE = path.join(DATA_DIR, "intent_occurrences.json");

// --------------------------- Configurable Fusion Weights ---------------------------
// These control how the base intent engine score is fused with other evidence.
const FUSION_WEIGHTS = {
  baseScore: 0.60,     // weight for the original engine score
  moodMatch: 0.18,     // boost if detected mood matches intent keywords/tag heuristics
  entityMatch: 0.12,   // boost if entities match intent keywords
  contextMatch: 0.06,  // boost for recent related intents (history)
  userAdaptive: 0.04   // boost based on user's past success with the same intent
};

// Safety caps
const MAX_FUSION_BOOST = 0.40; // don't boost more than this cumulative amount

// --- Existing configuration (kept) ---
const CONFIDENCE_BASE_THRESHOLD = 0.40;
const AMBIGUITY_MARGIN = 0.10;
const MULTI_INTENT_THRESHOLD = 0.55;
const CLARIFICATION_VALID_CHOICES = /^[1-9][0-9]*$/; // allow numeric choices (1..n)
const DIAGNOSTIC_MIN_SCORE = 0.05;
const DIAGNOSTIC_VISIBLE_TO_USER = true;

// --- Init index (ensure intents loaded) ---
buildIndexSync();

// --------------------------- Utility: Safe JSON read/write ---------------------------
function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || 'null');
  } catch (e) {
    console.error(`safeReadJson failed for ${filePath}:`, e.message || e);
    return null;
  }
}

function safeWriteJson(filePath, obj) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error(`safeWriteJson failed for ${filePath}:`, e.message || e);
  }
}

// --------------------------- Adaptive thresholds persistence ---------------------------
let INTENT_THRESHOLDS = {}; // tag -> threshold

function loadIntentThresholds() {
  const parsed = safeReadJson(INTENT_THRESHOLDS_FILE);
  if (parsed && typeof parsed === 'object') {
    INTENT_THRESHOLDS = parsed;
  } else {
    INTENT_THRESHOLDS = {};
  }
  if (DEBUG) console.log("Loaded intent thresholds:", Object.keys(INTENT_THRESHOLDS).length);
}

function saveIntentThresholds() {
  safeWriteJson(INTENT_THRESHOLDS_FILE, INTENT_THRESHOLDS);
}

function getThresholdForTag(tag) {
  if (!tag) return CONFIDENCE_BASE_THRESHOLD;
  return (typeof INTENT_THRESHOLDS[tag] === 'number') ? INTENT_THRESHOLDS[tag] : CONFIDENCE_BASE_THRESHOLD;
}

// Adjust threshold on success to become slightly more permissive for that intent (meta-learning)
function adjustThresholdOnSuccess(tag) {
  if (!tag) return;
  const current = getThresholdForTag(tag);
  const newVal = Math.max(0.15, current - 0.02); // make slightly easier to trigger
  INTENT_THRESHOLDS[tag] = parseFloat(newVal.toFixed(3));
  saveIntentThresholds();
  if (DEBUG) console.log(`Adjusted threshold for ${tag}: ${current} -> ${INTENT_THRESHOLDS[tag]}`);
}

// Occurrence counters (for self-learning from repeated ambiguous signals)
let OCCURRENCE_COUNTERS = {}; // { tag: count }

function loadOccurrenceCounters() {
  const parsed = safeReadJson(OCCURRENCE_COUNTERS_FILE);
  OCCURRENCE_COUNTERS = parsed && typeof parsed === 'object' ? parsed : {};
  if (DEBUG) console.log("Loaded occurrence counters:", Object.keys(OCCURRENCE_COUNTERS).length);
}

function saveOccurrenceCounters() {
  safeWriteJson(OCCURRENCE_COUNTERS_FILE, OCCURRENCE_COUNTERS);
}

function incrementOccurrence(tag) {
  if (!tag) return;
  OCCURRENCE_COUNTERS[tag] = (OCCURRENCE_COUNTERS[tag] || 0) + 1;
  // If threshold crossings occur across many occurrences, slightly lower threshold
  const cnt = OCCURRENCE_COUNTERS[tag];
  if (cnt % 10 === 0) {
    // every 10 occurrences, reduce threshold by 0.01 (small step)
    INTENT_THRESHOLDS[tag] = Math.max(0.12, (INTENT_THRESHOLDS[tag] || CONFIDENCE_BASE_THRESHOLD) - 0.01);
    saveIntentThresholds();
    if (DEBUG) console.log(`Occurrence-driven adjust for ${tag}, new threshold: ${INTENT_THRESHOLDS[tag]}`);
  }
  saveOccurrenceCounters();
}

// Load persisted artifacts
loadIntentThresholds();
loadOccurrenceCounters();

// --------------------------- Helpers: matching heuristics ---------------------------
// Heuristics to detect mood/entity matches for an intent. Uses intent.keywords and tag text.
// Returns boost values (not weighted by fusion weights yet).
function moodMatchBoost(intent, detectedMood) {
  if (!detectedMood || !intent) return 0;
  // Simple heuristic: if tag includes mood word or keywords contain mood token
  const m = detectedMood.toString().toLowerCase();
  if ((intent.tag || '').toLowerCase().includes(m)) return 1.0;
  const kws = (intent.keywords || []).map(k => (k || '').toLowerCase());
  if (kws.some(k => k.includes(m))) return 1.0;
  return 0;
}

function entityMatchBoost(intent, entities = []) {
  if (!entities || entities.length === 0 || !intent) return 0;
  const kws = new Set((intent.keywords || []).map(k => (k || '').toLowerCase()));
  const tag = (intent.tag || '').toLowerCase();
  for (const e of entities) {
    const ev = (e || '').toLowerCase();
    if (kws.has(ev)) return 1.0;
    if (tag.includes(ev)) return 1.0;
  }
  return 0;
}

function contextMatchBoost(intent, context) {
  if (!context || !Array.isArray(context.history) || !intent) return 0;
  // if any recent history tag equals this intent or is related_intents, give small boost
  const recent = context.history || [];
  for (const h of recent) {
    if (!h || !h.tag) continue;
    if (h.tag === intent.tag) return 1.0; // strong if same intent repeated
    // check related intents list (intentIndex entry)
    const lastIntentObj = intentIndex.find(i => i.tag === h.tag);
    if (lastIntentObj && (lastIntentObj.related_intents || []).includes(intent.tag)) return 1.0;
  }
  return 0;
}

function userAdaptiveBoostForIntent(profile, intent) {
  if (!profile || !intent) return 0;
  const count = (profile.intentSuccessCount && profile.intentSuccessCount[intent.tag]) || 0;
  // small decaying boost based on successes
  return Math.min(1.0, count / 10); // normalized 0..1
}

// Fuse candidate base score with heuristics to compute fusedScore
function computeFusedScore(candidate, intentObj, detectedMood, entities, context, profile) {
  // candidate.score is original engine score in [0,1]
  const base = Math.max(0, Math.min(1, candidate.score || 0));
  let moodMatch = moodMatchBoost(intentObj, detectedMood);    // 0 or 1
  let entityMatch = entityMatchBoost(intentObj, entities);    // 0 or 1
  let ctxMatch = contextMatchBoost(intentObj, context);       // 0 or 1
  let userAdapt = userAdaptiveBoostForIntent(profile, intentObj); // 0..1

  // Convert binary matches into scaled boosts
  const moodBoost = moodMatch ? FUSION_WEIGHTS.moodMatch * moodMatch : 0;
  const entityBoost = entityMatch ? FUSION_WEIGHTS.entityMatch * entityMatch : 0;
  const contextBoost = ctxMatch ? FUSION_WEIGHTS.contextMatch * ctxMatch : 0;
  const userBoost = userAdapt ? FUSION_WEIGHTS.userAdaptive * userAdapt : 0;

  let totalBoost = moodBoost + entityBoost + contextBoost + userBoost;
  if (totalBoost > MAX_FUSION_BOOST) totalBoost = MAX_FUSION_BOOST;

  const fused = (base * FUSION_WEIGHTS.baseScore) + totalBoost;
  // also allow direct combination with base, ensure capped to 0..1
  return Math.min(1, Math.max(0, fused));
}

// --------------------------- Diagnostic builders (kept/extended) ---------------------------
function buildClarificationPrompt(options) {
  let question = "لم أكن متأكدًا تمامًا مما تقصده. هل يمكنك توضيح ما إذا كنت تقصد أحد هذه المواضيع؟\n";
  const lines = options.map((opt, i) => `${i + 1}. ${opt.prompt}`);
  return `${question}${lines.join('\n')}\n(يمكنك الرد برقم الاختيار)`;
}

function buildDiagnosticHint(rawMessage, topCandidates) {
  if (!topCandidates || topCandidates.length === 0) {
    return "ماقدرتش ألقط نية واضحة من الرسالة — ممكن تكون عامة أو قصيرة جدًا. حاول توضيح المطلوب بجملة أطول أو بكلمات مختلفة.";
  }
  const visible = topCandidates.slice(0, 4);
  const parts = visible.map(c => {
    const score = (typeof c.score === 'number') ? c.score.toFixed(3) : c.score;
    let reasonLine = "";
    if (c.reasoning) {
      const firstLine = c.reasoning.split('\n')[0] || "";
      reasonLine = firstLine ? ` — ${firstLine.replace(/\n/g, ' ').slice(0, 120)}` : "";
    }
    return `- ${c.tag} (ثقة: ${score})${reasonLine}`;
  }).join("\n");
  return `قطفت احتمالات لكن بدرجات ثقة منخفضة:\n${parts}\n\nلو تحب أوضح لك ليه النسب دي طالعة كده (الكلمات أو الأنماط المؤثرة)، راسلني بعبارة "اشرح" أو فعّل DEBUG أثناء التطوير.`;
}

function buildConciseDiagnosticForUser(topCandidates) {
  if (!DIAGNOSTIC_VISIBLE_TO_USER || !topCandidates || topCandidates.length === 0) return null;
  const visible = topCandidates.filter(c => (typeof c.score === 'number' ? c.score : 0) >= DIAGNOSTIC_MIN_SCORE).slice(0, 2);
  if (visible.length === 0) return null;
  const lines = visible.map(c => `• ${c.tag.replace(/_/g, ' ')} (ثقة: ${(c.score).toFixed(2)})`);
  return `احتمالات قريبة: \n${lines.join("\n")}\nلو كانت غير مقصودة، حاول توضح جملة أو تضيف كلمة مفتاحية.`;
}

// --------------------------- Main Handler v14.0 ---------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });

    // load users (async storage expected)
    let users;
    try {
      users = await loadUsers();
    } catch (e) {
      console.error("Failed to load users storage:", e.message || e);
      users = {};
    }

    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = {
        id: userId,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        preferredTone: "warm",
        shortMemory: [],
        longMemory: [],
        longTermProfile: {},
        moodHistory: [],
        flags: {},
        intentSuccessCount: {},
        intentLastSuccess: {}
      };
      if (DEBUG) console.error("Created user", userId);
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    // safety check
    if (detectCritical(rawMessage)) {
      profile.flags.critical = true;
      try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (critical path):", e.message || e); }
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // analyze message
    const mood = detectMood(rawMessage);                       // e.g. 'حزن', 'فرح', etc.
    const entities = extractEntities(rawMessage) || [];        // array of entity strings
    const rootCause = (typeof extractRootCause === "function") ? extractRootCause(rawMessage) : null;

    try {
      updateProfileWithEntities(profile, entities, mood, rootCause);
    } catch (e) {
      console.error("updateProfileWithEntities failed:", e.message || e);
    }

    profile.moodHistory = profile.moodHistory || [];
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });
    if (profile.moodHistory.length > LONG_TERM_LIMIT) profile.moodHistory.shift();

    profile.shortMemory = profile.shortMemory || [];
    profile.shortMemory.forEach(item => { item.age = (item.age || 0) + 1; });

    // --- Handle Clarification Response if expected ---
    if (profile.expectingFollowUp?.isClarification) {
      const candidate = profile.expectingFollowUp;
      const trimmed = rawMessage.trim();
      if (CLARIFICATION_VALID_CHOICES.test(trimmed)) {
        const idx = parseInt(trimmed, 10) - 1;
        if (idx >= 0 && idx < (candidate.options || []).length) {
          const chosen = candidate.options[idx];
          profile.expectingFollowUp = null;

          // mark success
          registerIntentSuccess(profile, chosen.tag);
          // meta-learn: adjust threshold and counters
          adjustThresholdOnSuccess(chosen.tag);

          const intent = intentIndex.find(i => i.tag === chosen.tag);
          const baseReply = (intent?.responses?.length) ? intent.responses[Math.floor(Math.random() * intent.responses.length)] : "شكرًا للتوضيح. كيف يمكنني المساعدة أكثر؟";
          const personalized = adaptReplyBase(baseReply, profile, mood);

          profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, tag: chosen.tag, age: 0, ts: new Date().toISOString(), entities });
          if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();

          try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (clarification):", e.message || e); }

          return res.status(200).json({ reply: personalized, source: "intent_clarified", tag: chosen.tag, userId });
        }
      }
      profile.expectingFollowUp = null;
    }

    // --- Prepare Context for Intent Engine ---
    const context = {
      history: profile.shortMemory.slice(-3).map(it => ({ tag: it.tag, age: it.age || 0 })),
      lastEntities: profile.shortMemory.length ? profile.shortMemory[profile.shortMemory.length - 1].entities || [] : []
    };

    // --- Get Top Intents from core engine ---
    const coreCandidates = getTopIntents(rawMessage, { topN: 6, context, userProfile: profile }) || [];

    // If no candidates returned, fallback quickly
    if (!coreCandidates || coreCandidates.length === 0) {
      // fallback logic below (will append to learning queue etc.)
    }

    // Compute fused scores for each candidate
    const fusedCandidates = coreCandidates.map(c => {
      const intentObj = intentIndex.find(i => i.tag === c.tag);
      const fusedScore = intentObj
        ? computeFusedScore(c, intentObj, mood, entities, context, profile)
        : c.score;
      return { ...c, fusedScore, intentObj };
    });

    // Sort by fusedScore desc
    fusedCandidates.sort((a, b) => (b.fusedScore || 0) - (a.fusedScore || 0));

    if (DEBUG) {
      console.error("\n--- CORE CANDIDATES (base) ---");
      coreCandidates.forEach(c => console.error(`- ${c.tag}: ${typeof c.score === 'number' ? c.score.toFixed(4) : c.score}`));
      console.error("\n--- FUSED CANDIDATES ---");
      fusedCandidates.forEach(c => {
        try {
          const reason = c.intentObj ? ` (moodK:${mood}, ents:${entities.join(',')})` : '';
          console.error(`- ${c.tag}: base=${(c.score).toFixed(4)} fused=${(c.fusedScore || 0).toFixed(4)}${reason}`);
        } catch (e) {}
      });
    }

    // Decision: use fusedScore and per-intent threshold
    const chosen = fusedCandidates[0];
    const chosenTag = chosen?.tag;
    const chosenIntentObj = chosen?.intentObj;
    const chosenFused = chosen ? (chosen.fusedScore || chosen.score || 0) : 0;

    // If candidate exists, get its threshold (adaptive per-intent)
    const thresholdForChosen = getThresholdForTag(chosenTag);

    // Ambiguity check using top two fused scores
    const second = fusedCandidates[1];
    const secondFused = second ? (second.fusedScore || second.score || 0) : 0;

    // If best fused >= threshold, and not ambiguous, accept it.
    if (chosen && chosenFused >= thresholdForChosen) {
      // Ambiguity detection
      if (second && (chosenFused - secondFused < AMBIGUITY_MARGIN)) {
        // Ask clarification between top two fusedCandidates
        const options = [chosen, second].map(opt => ({ tag: opt.tag, prompt: (opt.tag || "").replace(/_/g, " ") }));
        profile.expectingFollowUp = { isClarification: true, options, expiresTs: Date.now() + (5 * 60 * 1000) };
        const prompt = buildClarificationPrompt(options);

        profile.shortMemory.push({ message: rawMessage, reply: prompt, mood, tag: 'clarification_request', age: 0, ts: new Date().toISOString(), entities });
        try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (clarification ask):", e.message || e); }
        return res.status(200).json({ reply: prompt, source: "clarification", userId });
      }

      // No ambiguity -> accept chosen
      // Mark success & meta-learn
      registerIntentSuccess(profile, chosenTag);
      adjustThresholdOnSuccess(chosenTag);      // make it slightly easier next time
      incrementOccurrence(chosenTag);           // count occurrence for self-learning counters

      // record recurring theme
      try { recordRecurringTheme(profile, chosenTag, mood); } catch (e) { if (DEBUG) console.error("recordRecurringTheme failed:", e.message || e); }

      // Build reply
      const baseReply = chosenIntentObj?.responses?.length ? chosenIntentObj.responses[Math.floor(Math.random() * chosenIntentObj.responses.length)] : "أنا أسمعك. هل يمكنك أن تخبرني المزيد؟";
      let finalReply = adaptReplyBase(baseReply, profile, mood);

      // Multi-intent suggestion using other fused candidates
      const secondarySuggestion = fusedCandidates.find(c => c.tag !== chosenTag && (c.fusedScore || c.score || 0) >= MULTI_INTENT_THRESHOLD);
      if (secondarySuggestion) {
        finalReply += `\n\nبالمناسبة، لاحظت أنك قد تكون تتحدث أيضًا عن "${secondarySuggestion.tag.replace(/_/g, ' ')}". هل ننتقل لهذا الموضوع بعد ذلك؟`;
        profile.expectingFollowUp = { isSuggestion: true, next_tag: secondarySuggestion.tag, expiresTs: Date.now() + (5 * 60 * 1000) };
      }

      profile.shortMemory.push({ message: rawMessage, reply: finalReply, mood, tag: chosenTag, age: 0, ts: new Date().toISOString(), entities });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();

      try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (intent path):", e.message || e); }
      return res.status(200).json({ reply: finalReply, source: "intent_fused", tag: chosenTag, score: Number(chosenFused.toFixed(3)), userId });
    }

    // If we reach here: no confident intent accepted. We'll do diagnostic fallback.
    if (chosen) {
      // increment occurrence count for the chosen tag to learn from repeated ambiguous triggers
      incrementOccurrence(chosenTag);
    }

    // Append to learning queue (best candidate & context) but don't block user if it fails
    try {
      await appendLearningQueue({ message: rawMessage, userId, topCandidate: chosenTag, baseScore: chosen?.score, fusedScore: chosenFused, ts: new Date().toISOString() });
    } catch (e) {
      if (DEBUG) console.error("appendLearningQueue failed:", e.message || e);
    }

    // Diagnostic messages
    const diagHint = buildDiagnosticHint(rawMessage, coreCandidates);
    const conciseDiag = buildConciseDiagnosticForUser(coreCandidates);

    const generalFallback = "لم أفهم قصدك تمامًا، هل يمكنك التوضيح بجملة مختلفة؟ أحيانًا يساعدني ذلك على فهمك بشكل أفضل. أنا هنا لأسمعك.";
    let fallback;
    if (DEBUG) {
      fallback = `تشخيصي:\n${diagHint}\n\nالرد العام: ${generalFallback}`;
    } else if (conciseDiag) {
      fallback = `${conciseDiag}\n\n${generalFallback}`;
    } else {
      fallback = generalFallback;
    }

    profile.shortMemory.push({ message: rawMessage, reply: fallback, mood, age: 0, ts: new Date().toISOString(), entities });
    if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();

    try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (fallback):", e.message || e); }
    return res.status(200).json({ reply: fallback, source: "fallback_diagnostic", userId });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
