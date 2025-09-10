// chat.js v13.2 - The Harmonized Conductor (Diagnostic-ready)
// Fully asynchronous, diagnostic fallback, compatible with intent_engine v13.x
// Changes in v13.2:
// - Diagnostic output shown to user (concise) when confidence low (configurable).
// - Include per-intent short reasoning in diagnostic message to help user clarify.
// - More robust async saves with try/catch so failures don't block replies.
// - Minor logging improvements for easier debugging on server (Vercel).
// - v13.2a: Removed special-case tightening for very short messages (short messages no longer increase threshold)

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
  recordRecurringTheme
} from './storage.js';
import {
  intentIndex,
  buildIndexSync,
  getTopIntents,
  registerIntentSuccess
} from './intent_engine.js';

// --- Initialization ---
buildIndexSync();

// --- Configuration for v13.2 ---
const CONFIDENCE_BASE_THRESHOLD = 0.40;
const AMBIGUITY_MARGIN = 0.10;
const MULTI_INTENT_THRESHOLD = 0.55;
const CLARIFICATION_VALID_CHOICES = /^[1-9][0-9]*$/; // allow numeric choices (1..n)
const DIAGNOSTIC_MIN_SCORE = 0.05; // under this, we show simpler hint
// If true, short diagnostic summary will be included in user-facing fallback even when DEBUG=false
const DIAGNOSTIC_VISIBLE_TO_USER = true;

// --- Dynamic Confidence Threshold Function ---
// NOTE: v13.2a: removed special-case raising of threshold for short messages.
// Short messages will be treated with the base threshold unless tag-words match.
function getDynamicThreshold(message, bestIntent) {
  const tokenCount = tokenize(message).length;
  let threshold = CONFIDENCE_BASE_THRESHOLD;

  // (Removed: if (tokenCount <= 3) threshold = 0.60;)

  if (bestIntent && bestIntent.tag) {
    const tagWords = new Set((bestIntent.tag || "").split('_').map(t => t.trim()).filter(Boolean));
    const msgTokens = tokenize(message);
    if (msgTokens.some(token => tagWords.has(token))) {
      threshold = Math.max(0.30, threshold - 0.15);
    }
  }
  return threshold;
}

// --- Helper: Build clarification prompt ---
function buildClarificationPrompt(options) {
  let question = "لم أكن متأكدًا تمامًا مما تقصده. هل يمكنك توضيح ما إذا كنت تقصد أحد هذه المواضيع؟\n";
  const lines = options.map((opt, i) => `${i + 1}. ${opt.prompt}`);
  return `${question}${lines.join('\n')}\n(يمكنك الرد برقم الاختيار)`;
}

// --- Helper: Build diagnostic hint to show to user in low-confidence cases ---
// includes short reasoning snippets when available
function buildDiagnosticHint(rawMessage, topCandidates) {
  if (!topCandidates || topCandidates.length === 0) {
    return "ماقدرتش ألقط نية واضحة من الرسالة — ممكن تكون عامة أو قصيرة جدًا. حاول توضيح المطلوب بجملة أطول أو بكلمات مختلفة.";
  }

  const visible = topCandidates.slice(0, 3);
  const parts = visible.map(c => {
    const score = (typeof c.score === 'number') ? c.score.toFixed(3) : c.score;
    // try to include a one-line reasoning summary if available
    let reasonLine = "";
    if (c.reasoning) {
      // take first line of reasoning (safe, concise)
      const firstLine = c.reasoning.split('\n')[0] || "";
      reasonLine = firstLine ? ` — ${firstLine.replace(/\n/g, ' ').slice(0, 120)}` : "";
    }
    return `- ${c.tag} (ثقة: ${score})${reasonLine}`;
  }).join("\n");

  return `قطفت احتمالات لكن بدرجات ثقة منخفضة:\n${parts}\n\nلو تحب أوضح لك ليه النسب دي طالعة كده (الكلمات أو الأنماط المؤثرة)، راسلني بعبارة "اشرح" أو فعّل DEBUG أثناء التطوير.`;
}

// --- Short diagnostic visible (concise) ---
function buildConciseDiagnosticForUser(topCandidates) {
  if (!DIAGNOSTIC_VISIBLE_TO_USER || !topCandidates || topCandidates.length === 0) return null;
  // show only top 1-2 intents with scores if they exceed DIAGNOSTIC_MIN_SCORE
  const visible = topCandidates.filter(c => (typeof c.score === 'number' ? c.score : 0) >= DIAGNOSTIC_MIN_SCORE).slice(0, 2);
  if (visible.length === 0) return null;
  const lines = visible.map(c => `• ${c.tag.replace(/_/g, ' ')} (ثقة: ${(c.score).toFixed(2)})`);
  return `احتمالات قريبة: \n${lines.join("\n")}\nلو كانت غير مقصودة، حاول توضح جملة أو تضيف كلمة مفتاحية.`;
}

// --- Main Handler v13.2 ---
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
      // If storage failed, still proceed with in-memory fallback to avoid blocking user
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
    const mood = detectMood(rawMessage);
    const entities = extractEntities(rawMessage);
    const rootCause = (typeof extractRootCause === "function") ? extractRootCause(rawMessage) : null;

    try {
      updateProfileWithEntities(profile, entities, mood, rootCause);
    } catch (e) {
      // don't fail user if profile update has issues
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

          registerIntentSuccess(profile, chosen.tag);

          const intent = intentIndex.find(i => i.tag === chosen.tag);
          const baseReply = (intent?.responses?.length) ? intent.responses[Math.floor(Math.random() * intent.responses.length)] : "شكرًا للتوضيح. كيف يمكنني المساعدة أكثر؟";
          const personalized = adaptReplyBase(baseReply, profile, mood);

          profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, tag: chosen.tag, age: 0, ts: new Date().toISOString(), entities });
          if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();

          try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (clarification):", e.message || e); }

          return res.status(200).json({ reply: personalized, source: "intent_clarified", tag: chosen.tag, userId });
        }
      }
      // Not a valid clarification answer -> clear to avoid infinite loop and continue
      profile.expectingFollowUp = null;
    }

    // --- Prepare Context for Intent Engine ---
    const context = {
      history: profile.shortMemory.slice(-3).map(it => ({ tag: it.tag, age: it.age || 0 })),
      lastEntities: profile.shortMemory.length ? profile.shortMemory[profile.shortMemory.length - 1].entities || [] : []
    };

    // --- Get Top Intents ---
    const topCandidates = getTopIntents(rawMessage, { topN: 3, context, userProfile: profile }) || [];

    if (DEBUG) {
      console.error("\n--- TOP CANDIDATES ---");
      topCandidates.forEach(c => {
        try {
          console.error(`- ${c.tag}: ${c.score.toFixed ? c.score.toFixed(4) : c.score}`);
          if (c.reasoning) console.error(`  Reasoning: ${c.reasoning.replace(/\n/g, "\n  ")}`);
        } catch (e) { /* ignore formatting errors */ }
      });
    }

    // --- Decision Logic ---
    if (topCandidates.length > 0) {
      const bestCandidate = topCandidates[0];
      const confidenceThreshold = getDynamicThreshold(rawMessage, bestCandidate);

      if (bestCandidate.score >= confidenceThreshold) {
        const secondCandidate = topCandidates.length > 1 ? topCandidates[1] : null;

        if (secondCandidate && (bestCandidate.score - secondCandidate.score < AMBIGUITY_MARGIN)) {
          // Ambiguity -> Ask clarification
          const options = [bestCandidate, secondCandidate].map(opt => ({ tag: opt.tag, prompt: (opt.tag || "").replace(/_/g, " ") }));
          profile.expectingFollowUp = { isClarification: true, options, expiresTs: Date.now() + (5 * 60 * 1000) };
          const prompt = buildClarificationPrompt(options);

          profile.shortMemory.push({ message: rawMessage, reply: prompt, mood, tag: 'clarification_request', age: 0, ts: new Date().toISOString(), entities });
          try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (clarification ask):", e.message || e); }
          return res.status(200).json({ reply: prompt, source: "clarification", userId });
        }

        // No ambiguity -> proceed with best candidate
        const primaryTag = bestCandidate.tag;
        const intent = intentIndex.find(i => i.tag === primaryTag);

        if (intent) {
          registerIntentSuccess(profile, primaryTag);
          try { recordRecurringTheme(profile, primaryTag, mood); } catch (e) { console.error("recordRecurringTheme failed:", e.message || e); }

          const baseReply = intent.responses.length ? intent.responses[Math.floor(Math.random() * intent.responses.length)] : "أنا أسمعك. هل يمكنك أن تخبرني المزيد؟";
          let finalReply = adaptReplyBase(baseReply, profile, mood);

          // Multi-intent suggestion
          const secondaryCandidate = topCandidates.find(c => c.tag !== primaryTag && c.score >= MULTI_INTENT_THRESHOLD);
          if (secondaryCandidate) {
            const suggestionText = `\n\nبالمناسبة، لاحظت أنك قد تكون تتحدث أيضًا عن "${secondaryCandidate.tag.replace(/_/g, ' ')}". هل ننتقل لهذا الموضوع بعد ذلك؟`;
            finalReply += suggestionText;
            profile.expectingFollowUp = { isSuggestion: true, next_tag: secondaryCandidate.tag, expiresTs: Date.now() + (5 * 60 * 1000) };
          }

          profile.shortMemory.push({ message: rawMessage, reply: finalReply, mood, tag: primaryTag, age: 0, ts: new Date().toISOString(), entities });
          if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();

          try { await saveUsers(users); } catch (e) { console.error("saveUsers failed (intent path):", e.message || e); }
          return res.status(200).json({ reply: finalReply, source: "intent", tag: primaryTag, score: Number(bestCandidate.score.toFixed(3)), userId });
        }
      } else {
        // bestCandidate exists but below threshold -> diagnostic fallback path
        if (DEBUG) {
          console.error(`LOW CONFIDENCE: best ${topCandidates[0].tag} (${topCandidates[0].score.toFixed(3)}) < threshold ${confidenceThreshold.toFixed(3)}`);
        }
      }
    }

    // --- Fallback (no confident intent) ---
    try {
      await appendLearningQueue({ message: rawMessage, userId, topCandidate: topCandidates[0]?.tag, score: topCandidates[0]?.score, ts: new Date().toISOString() });
    } catch (e) {
      console.error("appendLearningQueue failed:", e.message || e);
    }

    // Build diagnostic hint for the user
    const diagHint = buildDiagnosticHint(rawMessage, topCandidates);
    const conciseDiag = buildConciseDiagnosticForUser(topCandidates);

    // Compose fallback message:
    // - If DEBUG => verbose diagnostic + general fallback
    // - Else if DIAGNOSTIC_VISIBLE_TO_USER => show concise diagnostic + general fallback
    // - Else => general fallback only
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
    return res.status(200).json({ reply: fallback, source: "fallback_low_confidence", userId });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
