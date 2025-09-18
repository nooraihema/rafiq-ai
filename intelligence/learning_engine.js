// learning_engine.js v2.0 - Adaptive Self-Review Engine (Arabic-aware, template rewriter)
// Purpose: After every response, analyze multi-dimensional quality, update a per-user profile,
// detect repeating patterns, and produce actionable suggestions + a template-based improved reply.
// No external libs required. Designed to be plugged into finalizeResponse in chat.js.
//
// Exports:
//   - runLearningEngine(userMessage, responsePayload, fingerprint)
// Returns:
//   { logEntry, suggestion, improvedResponse }

import fs from "fs";
import path from "path";

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
// Path to the data directory (as per user specification)
const DATA_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(DATA_DIR, "learning_logs.json");
const PROFILE_FILE = path.join(DATA_DIR, "user_profiles.json");
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================


// ----- Utilities: Arabic basic normalization & tokenization -----
// Simple normalizer (removes diacritics, normalize alef forms, tatweel, lowercases)
function normalizeArabic(text = "") {
  return String(text)
    .replace(/[\u064B-\u0652]/g, "") // remove harakat
    .replace(/ـ/g, "") // tatweel
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه") // keep simple
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation (unicode aware)
    .toLowerCase()
    .trim();
}

function tokenize(text = "") {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

// ----- Vector & similarity (TF + cosine) -----
function termFrequency(tokens) {
  const tf = {};
  tokens.forEach((t) => {
    tf[t] = (tf[t] || 0) + 1;
  });
  return tf;
}

function cosineSimilarityFromTF(tfA, tfB) {
  const keys = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  keys.forEach((k) => {
    const a = tfA[k] || 0;
    const b = tfB[k] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ----- Small lexicons for heuristics -----
const empathyKeywords = [
  "مفتكر", "آسف", "أفهم", "مفهوم", "متفهم", "مزعج", "صعب", "قلق", "متأسف", "أقدّر", "تفهمت"
];
const actionVerbs = ["جرب", "قم", "افعل", "حاول", "ابدأ", "اتخذ", "راجع", "نقح"];
const negativeIndicators = ["قَلِق", "قلب", "خائف", "خوف", "قلق", "مضغوط", "محبط", "حزين"];
// (note: some words capitalized or diacritics removed by normalizeArabic)

// ----- Profile & Logs management -----
function safeReadJSON(file) {
  try {
    // Ensure the data directory exists before reading
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(file)) return {};
    const t = fs.readFileSync(file, "utf8");
    return JSON.parse(t || "{}");
  } catch (e) {
    return {};
  }
}
function safeWriteJSON(file, obj) {
  try {
    // Ensure the data directory exists before writing
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error("[LearningEngine] write error:", e.message);
  }
}

// ----- Heuristic analyzers -----
function calcRepetitionScore(currentTokens, recentTokensArray = []) {
  // compute average overlap ratio with recent messages
  if (!recentTokensArray.length) return 0;
  let totalOverlap = 0;
  recentTokensArray.forEach((tokens) => {
    const setA = new Set(currentTokens);
    const setB = new Set(tokens);
    let common = 0;
    setA.forEach((w) => { if (setB.has(w)) common++; });
    const overlap = common / Math.max(1, Math.min(setA.size, setB.size));
    totalOverlap += overlap;
  });
  return totalOverlap / recentTokensArray.length; // 0..1
}

function containsKeyword(tokens, lexicon) {
  const s = new Set(tokens);
  return lexicon.some((k) => s.has(normalizeArabic(k)));
}

// Create template-based "improved" rewriter
function templateRewrite({ userMessage, responsePayload, analysis }) {
  const userTokens = tokenize(userMessage);
  const respTokens = tokenize(responsePayload);

  // Start with existing response
  let improved = responsePayload;

  // If low relevance - try to craft a short direct answer: echo user's topic + suggest next step
  if (analysis.relevance < 0.35) {
    const topic = userTokens.slice(0, 6).join(" ") || "في الموضوع ده";
    improved = `أفهم قصدك عن "${topic}"، خليني أوضح: ${responsePayload}\n\nلو تحب، ممكن أبدأ بـخطوة عملية: ${actionVerbs[0]} مثال بسيط أو أخلي الشرح أبسط؟`;
  }

  // If low empathy but user shows negative emotion, prepend empathetic opener
  if (!analysis.hasEmpathy && analysis.userSentiment === "negative") {
    improved = `بحس إن الموقف مزعج فعلاً — أنا معاك. ${improved}`;
  }

  // If shallow (short) add a bullet with 2 concrete actions
  if (analysis.depth < 0.35) {
    improved += `\n\nخطوتان عمليتان يمكنك تجربتهما:\n1) ${actionVerbs[1]} خطوة سريعة لتجربة تحليل المشكلة.\n2) ${actionVerbs[2]} تقيّم النتيجة خلال يومين وارجع لي بالنتيجة.`;
  }

  // Remove accidental duplication if any (simple)
  if (improved.length > 1000) improved = improved.slice(0, 900) + "...";

  return improved;
}

// ----- Main engine -----
export async function runLearningEngine(userMessage = "", responsePayload = "", fingerprint = "anon") {
  try {
    // tokenize
    const userTokens = tokenize(userMessage);
    const respTokens = tokenize(responsePayload);

    // TF vectors
    const tfUser = termFrequency(userTokens);
    const tfResp = termFrequency(respTokens);

    const relevance = cosineSimilarityFromTF(tfUser, tfResp); // 0..1

    // depth heuristic: unique tokens ratio and length
    const uniqueRespRatio = Object.keys(tfResp).length / Math.max(1, respTokens.length);
    const depth = Math.min(1, (respTokens.length / 60) * 0.6 + uniqueRespRatio * 0.4); // normalized 0..1

    // empathy heuristic
    const hasEmpathy = containsKeyword(respTokens, empathyKeywords);
    const userHasNeg = containsKeyword(userTokens, negativeIndicators) || /قلق|خايف|حزين|محبط/.test(userMessage);

    // quick sentiment label for user message (very small heuristic)
    const userSentiment = userHasNeg ? "negative" : "neutral";

    // action/helpfulness heuristic
    const hasAction = containsKeyword(respTokens, actionVerbs) || respTokens.some(t => t.endsWith("؟") === false && t.length > 3); // loose
    const helpfulness = (hasAction ? 0.6 : 0.2) + 0.4 * depth; // 0..1

    // repetition detection: load recent logs for this fingerprint
    const logs = safeReadJSON(LOG_FILE) || [];
    const recentForUser = logs.filter(l => l.fingerprint === fingerprint).slice(-6).map(l => tokenize(l.userMessage));
    const repScore = calcRepetitionScore(userTokens, recentForUser);

    // novelty: check if response identical to recent system replies
    const recentRespTexts = logs.filter(l => l.fingerprint === fingerprint).slice(-8).map(l => l.responsePayload || "");
    const duplicate = recentRespTexts.includes(responsePayload);

    // Build scores and notes
    const analysis = {
      relevance: Number(relevance.toFixed(3)),
      depth: Number(depth.toFixed(3)),
      hasEmpathy,
      helpfulness: Number(Math.min(1, helpfulness).toFixed(3)),
      repetitionScore: Number(repScore.toFixed(3)),
      duplicate,
      userSentiment
    };

    const notes = [];
    if (analysis.relevance < 0.25) notes.push("الرد بعيد جدًا عن نية المستخدم (مشكلة فهم).");
    else if (analysis.relevance < 0.45) notes.push("الرد مرتبط جزئياً — يحتاج تفاصيل محددة أكثر.");
    else notes.push("الرد مرتبط جيدًا بمسألة المستخدم.");

    if (analysis.depth < 0.3) notes.push("الرد سطحي؛ ضع أمثلة أو خطوات عملية.");
    if (!analysis.hasEmpathy && analysis.userSentiment === "negative") notes.push("مفقود تعاطف ظاهري مع المستخدم في حالة سلبية.");
    if (analysis.repetitionScore > 0.6) notes.push("المستخدم يكرر موضوع مشابه — أظهر تتبع للسياق السابق.");
    if (analysis.duplicate) notes.push("الرد مكرر بنفس الصياغة كما قبل.");

    // Update user profile summary
    const profiles = safeReadJSON(PROFILE_FILE) || {};
    const prof = profiles[fingerprint] || {
      fingerprint,
      messages: 0,
      avgRelevance: 0,
      avgDepth: 0,
      lastSeen: null,
      repeatedTopics: {}
    };

    // incremental averages
    prof.messages += 1;
    prof.avgRelevance = ((prof.avgRelevance * (prof.messages - 1)) + analysis.relevance) / prof.messages;
    prof.avgDepth = ((prof.avgDepth * (prof.messages - 1)) + analysis.depth) / prof.messages;
    prof.lastSeen = new Date().toISOString();

    // detect repeated topic tokens (simple frequency)
    userTokens.slice(0, 6).forEach(t => {
      prof.repeatedTopics[t] = (prof.repeatedTopics[t] || 0) + 1;
    });

    profiles[fingerprint] = prof;
    safeWriteJSON(PROFILE_FILE, profiles);

    // Compose log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      fingerprint,
      userMessage,
      responsePayload,
      analysis,
      notes
    };

    // Append to main log file (array)
    const existing = Array.isArray(logs) ? logs : [];
    existing.push(logEntry);
    safeWriteJSON(LOG_FILE, existing);

    // Generate suggestion + improved response via templates
    const suggestion = [];
    if (analysis.relevance < 0.45) suggestion.push("ركز على استهداف كلمات المستخدم الأساسية في الجواب؛ أعد صياغة الجواب ليتضمن توضيحًا مباشرًا لمشكلته.");
    if (analysis.depth < 0.4) suggestion.push("أضف مثالين أو خطوتين عمليتين يمكن تنفيذهم فورًا.");
    if (!analysis.hasEmpathy && analysis.userSentiment === "negative") suggestion.push("ابدأ بجملة تعاطفية قصيرة قبل شرح الحل.");
    if (analysis.repetitionScore > 0.6) suggestion.push("استعمل إشارات لرسائل سابقة: 'ذكرت قبل كذا أنك...' لبناء مصداقية.");

    // If nothing to suggest, praise
    if (!suggestion.length) suggestion.push("جيد — الرد مناسب ومتوازن. راقب التطور فقط.");

    const improvedResponse = templateRewrite({ userMessage, responsePayload, analysis });

    // Debug log if needed
    if (process.env.DEBUG === "true") {
      console.log("[LearningEngine] analysis:", analysis, "notes:", notes);
    }

    return {
      logEntry,
      suggestion,
      improvedResponse
    };
  } catch (err) {
    console.error("[LearningEngine] Fatal:", err.message);
    return {
      logEntry: null,
      suggestion: ["حدث خطأ داخلي أثناء تحليل الرد."],
      improvedResponse: responsePayload
    };
  }
}

// Simple local demo if run directly (useful for quick manual test)
// This check might fail if using ES modules without specific config.
// For library use, this part is not critical.
// if (require.main === module) {
//   (async () => {
//     const demoUser = "أنا قلق جدا من قرار الشغل الجديد ومش عارف أتصرف إزاي";
//     const demoResp = "تقدر تجرب تنتظر وترى الأمور.";
//     const res = await runLearningEngine(demoUser, demoResp, "demo_user_1");
//     console.log("=== Demo Result ===");
//     console.log("Analysis:", res.logEntry.analysis);
//     console.log("Notes:", res.logEntry.notes);
//     console.log("Suggestion:", res.suggestion.join(" | "));
//     console.log("Improved Response:\n", res.improvedResponse);
//   })();
// }
