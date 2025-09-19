// learning_engine.js v9.0 - State-Aware Self-Review Engine
// Purpose: After every response, analyze quality against intent-defined success metrics.
// This version integrates with the v9 intent template to perform more objective, goal-oriented analysis.

import fs from "fs";
import path from "path";

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
const DATA_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(DATA_DIR, "learning_logs.json");
const PROFILE_FILE = path.join(DATA_DIR, "user_profiles.json");
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================


// ----- Utilities: Arabic basic normalization & tokenization -----
function normalizeArabic(text = "") {
  return String(text)
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/ـ/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
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
  let dot = 0, magA = 0, magB = 0;
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
const empathyKeywords = ["مفتكر", "آسف", "أفهم", "مفهوم", "متفهم", "مزعج", "صعب", "قلق", "متأسف", "أقدّر", "تفهمت"];
const actionVerbs = ["جرب", "قم", "افعل", "حاول", "ابدأ", "اتخذ", "راجع", "نقح"];
const negativeIndicators = ["قَلِق", "قلب", "خائف", "خوف", "قلق", "مضغوط", "محبط", "حزين"];

// ----- Profile & Logs management -----
function safeReadJSON(file) {
  try {
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
  return totalOverlap / recentTokensArray.length;
}

function containsKeyword(tokens, lexicon) {
  const s = new Set(tokens);
  return lexicon.some((k) => s.has(normalizeArabic(k)));
}

// Create template-based "improved" rewriter
function templateRewrite({ userMessage, responsePayload, analysis }) {
  const userTokens = tokenize(userMessage);
  let improved = responsePayload;
  if (analysis.relevance < 0.35) {
    const topic = userTokens.slice(0, 6).join(" ") || "في الموضوع ده";
    improved = `أفهم قصدك عن "${topic}"، خليني أوضح: ${responsePayload}\n\nلو تحب، ممكن أبدأ بـخطوة عملية: ${actionVerbs[0]} مثال بسيط أو أخلي الشرح أبسط؟`;
  }
  if (!analysis.hasEmpathy && analysis.userSentiment === "negative") {
    improved = `بحس إن الموقف مزعج فعلاً — أنا معاك. ${improved}`;
  }
  if (analysis.depth < 0.35) {
    improved += `\n\nخطوتان عمليتان يمكنك تجربتهما:\n1) ${actionVerbs[1]} خطوة سريعة لتجربة تحليل المشكلة.\n2) ${actionVerbs[2]} تقيّم النتيجة خلال يومين وارجع لي بالنتيجة.`;
  }
  if (improved.length > 1000) improved = improved.slice(0, 900) + "...";
  return improved;
}

// =================================================================
// START: [V9 UPGRADE] NEW GOAL-ORIENTED ANALYSIS FUNCTION
// =================================================================
/**
 * [V9 UPGRADE] Analyzes the outcome of a turn against the intent's defined success metrics.
 * @param {object} intent - The full v9 intent object that was used.
 * @param {object} initialContext - The session context BEFORE the turn.
 * @param {object} finalContext - The session context AFTER the turn.
 * @param {object} fingerprint - The user's fingerprint for this turn.
 * @returns {object} An object with { score: number, notes: string[] }
 */
function analyzeAgainstSuccessMetrics(intent, initialContext, finalContext, fingerprint) {
    const metrics = intent?.success_metrics;
    if (!metrics) {
        return { score: 0.5, notes: ["لا توجد مقاييس نجاح محددة في الـ intent."] };
    }

    let successScore = 0;
    let totalWeight = 0;
    const notes = [];

    // Primary Metric: Did the dialogue state advance? (Weight: 3)
    if (metrics.primary && initialContext.state !== finalContext.state && finalContext.state !== 'greeting') {
        successScore += 3;
        notes.push(`[نجاح أساسي]: حالة الحوار تقدمت من '${initialContext.state}' إلى '${finalContext.state}'.`);
    } else {
        notes.push(`[ملاحظة]: حالة الحوار لم تتقدم (بقيت '${initialContext.state}').`);
    }
    totalWeight += 3;
    
    // Secondary Metric: Was a tool used successfully? (Weight: 2)
    if (metrics.secondary) {
        // This requires feedback from the user, for now we can check if emotion intensity dropped.
        const initialIntensity = initialContext.last_intensity || 0;
        const currentIntensity = fingerprint.intensity || 0;
        
        if (finalContext.last_suggestion_id && currentIntensity < initialIntensity - 0.1) {
            successScore += 2;
            notes.push(`[نجاح ثانوي]: تم استخدام أداة وانخفضت حدة المشاعر من ${initialIntensity} إلى ${currentIntensity}.`);
        }
    }
    totalWeight += 2;

    // Tertiary Metric: Was a bridge/service suggested? (Weight: 1)
    if (metrics.tertiary && (finalContext.request_bridge_intent || finalContext.request_service_intent)) {
        successScore += 1;
        notes.push(`[نجاح إضافي]: تم اقتراح انتقال ناجح إلى intent آخر.`);
    }
    totalWeight += 1;

    const finalScore = totalWeight > 0 ? successScore / totalWeight : 0.5;
    return {
        score: parseFloat(finalScore.toFixed(2)),
        notes: notes
    };
}
// =================================================================
// END: [V9 UPGRADE]
// =================================================================


// ----- Main engine -----
// [V9 UPGRADE] The main function signature is updated to accept the rich context it needs.
export async function runLearningEngine(
    userMessage = "", 
    responsePayload = "", 
    fingerprint = {}, // The user's fingerprint for the CURRENT turn
    activeIntent = {}, // The full v9 intent object that was used
    initialSessionContext = {}, // The session context BEFORE this turn
    finalSessionContext = {} // The session context AFTER this turn
) {
  try {
    const userTokens = tokenize(userMessage);
    const respTokens = tokenize(responsePayload);
    const tfUser = termFrequency(userTokens);
    const tfResp = termFrequency(respTokens);
    const relevance = cosineSimilarityFromTF(tfUser, tfResp);
    const uniqueRespRatio = Object.keys(tfResp).length / Math.max(1, respTokens.length);
    const depth = Math.min(1, (respTokens.length / 60) * 0.6 + uniqueRespRatio * 0.4);
    const hasEmpathy = containsKeyword(respTokens, empathyKeywords);
    const userHasNeg = containsKeyword(userTokens, negativeIndicators) || /قلق|خايف|حزين|محبط/.test(userMessage);
    const userSentiment = userHasNeg ? "negative" : "neutral";
    const hasAction = containsKeyword(respTokens, actionVerbs) || respTokens.some(t => t.endsWith("؟") === false && t.length > 3);
    const helpfulness = (hasAction ? 0.6 : 0.2) + 0.4 * depth;

    const logs = safeReadJSON(LOG_FILE) || [];
    const userId = fingerprint.userId || "anon"; // Assuming fingerprint has a userId
    const recentForUser = logs.filter(l => l.userId === userId).slice(-6).map(l => tokenize(l.userMessage));
    const repScore = calcRepetitionScore(userTokens, recentForUser);
    const recentRespTexts = logs.filter(l => l.userId === userId).slice(-8).map(l => l.responsePayload || "");
    const duplicate = recentRespTexts.includes(responsePayload);

    const analysis = {
      relevance: Number(relevance.toFixed(3)),
      depth: Number(depth.toFixed(3)),
      hasEmpathy,
      helpfulness: Number(Math.min(1, helpfulness).toFixed(3)),
      repetitionScore: Number(repScore.toFixed(3)),
      duplicate,
      userSentiment
    };

    // [V9 UPGRADE] Perform the new goal-oriented analysis
    const goalAnalysis = analyzeAgainstSuccessMetrics(activeIntent, initialSessionContext, finalSessionContext, fingerprint);
    
    const notes = [];
    if (analysis.relevance < 0.25) notes.push("الرد بعيد جدًا عن نية المستخدم.");
    else if (analysis.relevance < 0.45) notes.push("الرد مرتبط جزئياً، يحتاج تفاصيل أكثر.");
    else notes.push("الرد مرتبط جيدًا بمسألة المستخدم.");

    if (analysis.depth < 0.3) notes.push("الرد سطحي، يحتاج أمثلة أو خطوات.");
    if (!analysis.hasEmpathy && analysis.userSentiment === "negative") notes.push("مفقود تعاطف مع المستخدم.");
    if (analysis.repetitionScore > 0.6) notes.push("المستخدم يكرر نفس الموضوع.");
    if (analysis.duplicate) notes.push("الرد مكرر بنفس الصياغة.");
    
    // [V9 UPGRADE] Add notes from the new analysis
    notes.push(...goalAnalysis.notes);

    const profiles = safeReadJSON(PROFILE_FILE) || {};
    const prof = profiles[userId] || {
      userId, messages: 0, avgRelevance: 0, avgDepth: 0, lastSeen: null, repeatedTopics: {}
    };

    prof.messages += 1;
    prof.avgRelevance = ((prof.avgRelevance * (prof.messages - 1)) + analysis.relevance) / prof.messages;
    prof.avgDepth = ((prof.avgDepth * (prof.messages - 1)) + analysis.depth) / prof.messages;
    prof.lastSeen = new Date().toISOString();
    userTokens.slice(0, 6).forEach(t => {
      prof.repeatedTopics[t] = (prof.repeatedTopics[t] || 0) + 1;
    });

    // [V9 UPGRADE] Add goal achievement score to the user profile
    prof.avgGoalSuccess = ((prof.avgGoalSuccess || 0) * (prof.messages - 1) + goalAnalysis.score) / prof.messages;

    profiles[userId] = prof;
    safeWriteJSON(PROFILE_FILE, profiles);

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      userMessage,
      responsePayload,
      analysis,
      goalAnalysis, // [V9 UPGRADE] Storing the new analysis in the log
      notes
    };
    
    const existing = Array.isArray(logs) ? logs : [];
    existing.push(logEntry);
    safeWriteJSON(LOG_FILE, existing);

    const suggestion = [];
    if (analysis.relevance < 0.45) suggestion.push("ركز على استهداف كلمات المستخدم الأساسية.");
    if (analysis.depth < 0.4) suggestion.push("أضف مثالين أو خطوتين عمليتين.");
    if (!analysis.hasEmpathy && analysis.userSentiment === "negative") suggestion.push("ابدأ بجملة تعاطفية قصيرة.");
    if (analysis.repetitionScore > 0.6) suggestion.push("استعمل إشارات لرسائل سابقة: 'ذكرت قبل كذا...'.");
    
    // [V9 UPGRADE] Add suggestions based on goal analysis
    if (goalAnalysis.score < 0.4) {
        suggestion.push("فشل تحقيق هدف الحوار. راجع منطق انتقال الحالة في الـ intent.");
    }
    
    if (!suggestion.length) suggestion.push("جيد — الرد مناسب ومتوازن. راقب التطور فقط.");

    const improvedResponse = templateRewrite({ userMessage, responsePayload, analysis });

    if (process.env.DEBUG === "true") {
      console.log("[LearningEngine] analysis:", analysis, "goalAnalysis:", goalAnalysis, "notes:", notes);
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

// Simple local demo if run directly
// if (require.main === module) {
//   (async () => {
//     const demoUser = "أنا قلق جدا من قرار الشغل الجديد ومش عارف أتصرف إزاي";
//     const demoResp = "تقدر تجرب تنتظر وترى الأمور.";
//     // For V9, we need to mock more context
//     const demoIntent = { success_metrics: { primary: true, secondary: true } };
//     const initialCtx = { state: 'validating', last_intensity: 0.8 };
//     const finalCtx = { state: 'exploring' };
//     const demoFingerprint = { intensity: 0.6, userId: 'demo_user_1' };
//     const res = await runLearningEngine(demoUser, demoResp, demoFingerprint, demoIntent, initialCtx, finalCtx);
//     console.log("=== Demo Result ===");
//     console.log("Analysis:", res.logEntry.analysis);
//     console.log("Goal Analysis:", res.logEntry.goalAnalysis);
//     console.log("Notes:", res.logEntry.notes);
//     console.log("Suggestion:", res.suggestion.join(" | "));
//     console.log("Improved Response:\n", res.improvedResponse);
//   })();
// }
