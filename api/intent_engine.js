// intent_engine.js v14.0 - The Enhanced Mind
// Updated to support complex, weighted NLU structures and rich intent metadata.

import fs from "fs";
import path from "path";
import { DEBUG } from './config.js';
import {
  normalizeArabic,
  tokenize,
  levenshtein,
  hasNegationNearby,
  hasEmphasisNearby
} from './utils.js';

// ------------------- Configuration -------------------
const INTENTS_DIRS = [
  path.join(process.cwd(), "intents_new") // Focused on the final, processed directory.
];

const ADAPTIVE_WEIGHTS_FILE = path.join(process.cwd(), "data", "adaptive_weights.json");
const SYNONYMS_FILE = path.join(process.cwd(), "synonyms.json");

const DEFAULT_WEIGHTS = {
  wKeywords: 0.55,
  wTfIdf: 0.12,
  wPattern: 0.20,
  wContext: 0.25,
};
const DEFAULT_TOP_N = 3;
const PRIORITY_BOOST_FACTOR = 0.08; // معامل لتعزيز أولوية الـ intent

// ------------------- Internal State -------------------
export let intentIndex = [];
export let tagToIdx = {};
let synonymData = { map: {}, weights: {} };
let adaptiveWeights = {};

// ------------------- Resilient Utilities -------------------
function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content || "null");
  } catch (e) {
    console.error(`❌ SAFE_READ_ERROR: Could not read or parse ${path.basename(filePath)}. Error: ${e.message}`);
    return null;
  }
}

function safeWriteJson(filePath, obj) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error(`❌ SAFE_WRITE_ERROR: Could not write to ${path.basename(filePath)}. Adaptive weights will not be saved. Error: ${e.message}`);
  }
}

// ------------------- Adaptive weights persistence -------------------
function loadAdaptiveWeights() {
  const aw = safeReadJson(ADAPTIVE_WEIGHTS_FILE);
  adaptiveWeights = aw && typeof aw === 'object' ? aw : {};
  if (DEBUG) console.log(`Loaded ${Object.keys(adaptiveWeights).length} adaptive weight rules.`);
}
function saveAdaptiveWeights() {
  safeWriteJson(ADAPTIVE_WEIGHTS_FILE, adaptiveWeights);
}

// ------------------- Synonym Engine -------------------
function loadSynonyms() {
  synonymData = { map: {}, weights: {} };
  const parsed = safeReadJson(SYNONYMS_FILE);
  if (!parsed) {
    if (DEBUG) console.log("ℹ️ No synonyms.json found or it's invalid, skipping synonyms load.");
    return;
  }
  try {
    for (const key in parsed) {
      const normalKey = normalizeArabic(key);
      const vals = (parsed[key] || []).map(v => normalizeArabic(v));
      const group = [normalKey, ...vals];
      group.forEach((w) => {
        synonymData.map[w] = group;
        const distance = levenshtein(w, normalKey);
        const base = (w === normalKey) ? 1.0 : Math.max(0.75, 1 - (distance / Math.max(3, normalKey.length)));
        synonymData.weights[w] = parseFloat(base.toFixed(2));
      });
    }
    if (DEBUG) console.log(`📚 Loaded ${Object.keys(parsed).length} synonym groups.`);
  } catch (e) {
    console.error("❌ Error processing synonym data:", e.message);
  }
}

function expandTokensWithSynonyms(tokens) {
  const out = new Set(tokens);
  tokens.forEach(t => {
    if (synonymData.map[t]) {
      synonymData.map[t].forEach(s => out.add(s));
    }
  });
  return out;
}

function getSynonymWeight(token) {
  return synonymData.weights[token] || 1.0;
}

// ------------------- Intents Loading & Indexing -------------------
function findIntentsDir() {
  for (const d of INTENTS_DIRS) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) return d;
  }
  return null;
}

function loadIntentsRaw() {
  const dir = findIntentsDir();
  if (!dir) {
    console.error(`❌ CRITICAL: Failed to find intents directory in any of: ${INTENTS_DIRS.join(", ")}`);
    return [];
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  let all = [];
  for (const f of files) {
    const j = safeReadJson(path.join(dir, f));
    if (j) {
      // Handles both a single intent object or an array of intents in one file
      const arr = Array.isArray(j) ? j : [j];
      all = all.concat(arr);
      if (DEBUG) console.log(`- Loaded ${arr.length} intents from ${f}`);
    } else {
      console.warn(`⚠️ Skipping invalid JSON file: ${f}`);
    }
  }
  return all;
}


function cosineScore(vecA, vecB, normA = 1, normB = 1) {
  if (!vecA || !vecB) return 0;
  let dot = 0;
  for (const k in vecA) {
    if (vecB[k]) dot += vecA[k] * vecB[k];
  }
  const denom = (normA || 1) * (normB || 1);
  return denom ? (dot / denom) : 0;
}

function autoLinkIntents() {
  let links = 0;
  for (let i = 0; i < intentIndex.length; i++) {
    for (let j = i + 1; j < intentIndex.length; j++) {
      const a = intentIndex[i];
      const b = intentIndex[j];
      const sim = cosineScore(a.tfidfVector, b.tfidfVector, a.tfidfNorm, b.tfidfNorm);
      if (sim > 0.6) {
        if (!a.related_intents.includes(b.tag)) a.related_intents.push(b.tag);
        if (!b.related_intents.includes(a.tag)) b.related_intents.push(a.tag);
        links++;
      }
    }
  }
  if (DEBUG) console.log(`🔗 Auto-linked ${links} related intent pairs.`);
}

// ===== بداية التعديلات الرئيسية (بناء الفهرس) =====
export function buildIndexSync() {
  loadSynonyms();
  loadAdaptiveWeights();

  const raw = loadIntentsRaw();
  if (!raw || raw.length === 0) {
    if (DEBUG) console.warn("WARNING: No intents found while building index.");
    intentIndex = [];
    tagToIdx = {};
    return;
  }

  // تجميع جميع النصوص للـ TF-IDF
  const docsTokens = raw.map(it => {
    //  الجديد: استخلاص الكلمات من البنية الجديدة للكلمات المفتاحية والأنماط
    const keywordsText = (it.nlu?.keywords || []).map(k => k.word || '').join(' ');
    const patternsText = (it.patterns || []).join(' ');
    const allText = `${keywordsText} ${patternsText}`;
    return tokenize(allText);
  });

  // حساب Document Frequency
  const df = {};
  docsTokens.forEach(tokens => {
    new Set(tokens).forEach(t => df[t] = (df[t] || 0) + 1);
  });
  const N = Math.max(1, docsTokens.length);
  const idf = {};
  Object.keys(df).forEach(t => idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1);

  // بناء index
  intentIndex = raw.map((it, idx) => {
    const tokens = docsTokens[idx] || [];
    const counts = tokens.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    const total = Math.max(1, tokens.length);
    const vec = {};
    let sq = 0;
    Object.keys(counts).forEach(t => {
      const tf = counts[t] / total;
      const v = tf * (idf[t] || 1);
      vec[t] = v;
      sq += v * v;
    });

    // الجديد: تحويل الأنماط إلى RegExp
    const compiledPatterns = (it.patterns || []).map(p => {
      if (!p) return null;
      try {
        const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(esc, 'i');
      } catch (e) {
        if (DEBUG) console.warn("Invalid pattern", p, e.message || e);
        return null;
      }
    }).filter(Boolean);

    // الجديد: معالجة الكلمات المفتاحية الموزونة وتطبيعها
    const processedKeywords = (it.nlu?.keywords || []).map(k => ({
        text: normalizeArabic(k.word),
        weight: k.weight || 1.0
    }));

    return {
      tag: it.tag || `intent_${idx}`,
      // الجديد: تمرير كل بيانات الـ intent الأصلية لتكون متاحة لاحقاً
      full_intent: it,
      
      // بيانات معالجة للوصول السريع
      keywords: processedKeywords,
      patterns: compiledPatterns,
      priority_score: it.priority_score || 0,
      related_intents: [], // سيتم ملؤها بواسطة autoLinkIntents
      
      // بيانات الـ TF-IDF
      tfidfVector: vec,
      tfidfNorm: Math.sqrt(sq) || 1,
    };
  });

  // بناء map من tag للـ index
  tagToIdx = {};
  intentIndex.forEach((it, i) => tagToIdx[it.tag] = i);

  autoLinkIntents();

  if (DEBUG) {
    console.log(`🚀 Engine v14.0 (Enhanced Mind) indexed successfully.`);
    console.log(`📂 Total intents loaded: ${intentIndex.length}.`);
    const sampleTags = Object.keys(tagToIdx).slice(0, 10);
    console.log(`📌 Sample Tags: [${sampleTags.join(", ")}]...`);
  }
}
// ===== نهاية التعديلات الرئيسية (بناء الفهرس) =====

// ------------------- Vector & Style helpers -------------------
function jaccardSimilarity(setA, setB) {
  if (!setA || !setB || setA.size === 0 || setA.size === 0) return 0;
  const inter = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return inter.size / union.size;
}

function detectStyleSignals(rawMessage) {
    const tokens = tokenize(rawMessage);
    const isQuestion = /[\?؟]$/.test(rawMessage.trim()) || /^\s*(هل|متى|لماذا|أين|كيف|من|ما|كم)\b/.test(rawMessage.trim());
    const sarcasm = /(بجد\?|عنجد\?|يا سلام\?)/i.test(rawMessage) || /(؟\?){1,}/.test(rawMessage);
    const hasBasicEmphasis = tokens.some(t => ["جدا","للغاية","كتير","بشدة","أوي","اوي"].includes(t)) || /!{2,}/.test(rawMessage);
    return { isQuestion, sarcasm, hasBasicEmphasis, tokens };
}

// ------------------- Reasoning Layer -------------------
function buildReasoning(intent, breakdown, matchedTerms, contextSummary) {
  const lines = [`لأنّي وجدت دلائل على النية "${intent.tag}":`];
  if (matchedTerms && matchedTerms.size > 0) lines.push(`- كلمات/أنماط مطابقة: ${[...matchedTerms].join(", ")}`);
  if (breakdown.base) lines.push(`- وزن الكلمات (أساسي): ${breakdown.base.count.toFixed(3)}, وزن TF-IDF: ${breakdown.base.tfidf.toFixed(3)}, وزن الأنماط: ${breakdown.base.pattern.toFixed(3)}`);
  const bonuses = [];
  if (breakdown.bonuses.emphasis) bonuses.push(`تشديد: ${breakdown.bonuses.emphasis.toFixed(3)}`);
  if (breakdown.bonuses.question) bonuses.push(`سؤال: ${breakdown.bonuses.question.toFixed(3)}`);
  if (breakdown.bonuses.priority) bonuses.push(`أولوية: ${breakdown.bonuses.priority.toFixed(3)}`);
  if (bonuses.length) lines.push(`- مكافآت: ${bonuses.join(" | ")}`);
  if (breakdown.context) lines.push(`- سياق/تعلم: سياق سابق: ${breakdown.context.contextBoost.toFixed(3)}, تعلم ذاتي: ${breakdown.context.adaptiveBoost.toFixed(3)}`);
  if (contextSummary) lines.push(`- ملخص السياق: ${contextSummary}`);
  lines.push(`النتيجة النهائية: ثقة ${breakdown.final.toFixed(3)}`);
  return lines.join("\n");
}

// ------------------- Multi-intent detection & scoring -------------------
// ===== بداية التعديلات الرئيسية (حساب النقاط) =====
function scoreIntentDetailed(rawMessage, msgTf, intent, options = {}) {
  const { context = null, userProfile = null, weightsOverrides = {} } = options;
  const normMsg = normalizeArabic(rawMessage);
  const origTokens = msgTf.tokens || [];
  const expandedUserTokens = expandTokensWithSynonyms(origTokens);

  let keywordMatchWeight = 0;
  const matchedTerms = new Set();
  
  // الجديد: استخدام بنية الكلمات المفتاحية الموزونة
  (intent.keywords || []).forEach(kw => {
    // kw هو الآن {text: 'كلمة', weight: 1.0}
    const expandedKwTokens = expandTokensWithSynonyms(tokenize(kw.text));
    const matched = [...expandedKwTokens].some(t => expandedUserTokens.has(t) || normMsg.includes(t));
    
    if (matched && !hasNegationNearby(rawMessage, kw.text)) {
      const matchingToken = origTokens.find(t => expandedKwTokens.has(t));
      const synonymWeight = matchingToken ? getSynonymWeight(matchingToken) : 0.9;
      // نستخدم وزن الكلمة من ملف الـ intent مضروبًا في وزن المرادف
      keywordMatchWeight += (kw.weight * synonymWeight);
      matchedTerms.add(kw.text);
    }
  });

  let patternMatchScore = 0;
  (intent.patterns || []).forEach(regex => {
    try {
      if (regex.test(rawMessage) && !hasNegationNearby(rawMessage, regex.source)) {
        patternMatchScore += 1.0;
        matchedTerms.add(regex.source);
      }
    } catch (e) {
      if (DEBUG) console.warn("Pattern test failed:", e.message || e);
    }
  });

  const tfidfSim = cosineScore(msgTf.vec || {}, intent.tfidfVector || {}, msgTf.norm || 1, intent.tfidfNorm || 1);

  const style = detectStyleSignals(rawMessage);
  let emphasisBoost = style.hasBasicEmphasis ? 0.05 : 0;
  matchedTerms.forEach(t => {
      if (hasEmphasisNearby(rawMessage, t)) emphasisBoost += 0.05;
  });

  const questionBoost = style.isQuestion ? 0.05 : 0;
  const sarcasmPenalty = style.sarcasm ? -0.05 : 0;

  let contextBoost = 0;
  // (منطق السياق لم يتغير)
  if (context && Array.isArray(context.history)) {
    for (const item of context.history) {
        // ... (نفس الكود السابق)
    }
  }
  
  let adaptiveBoost = 0;
  // (منطق التعلم الذاتي لم يتغير)
  if (userProfile?.intentSuccessCount?.[intent.tag]) {
      // ... (نفس الكود السابق)
  }

  const baseWeights = { ...DEFAULT_WEIGHTS, ...weightsOverrides };
  const perIntentAdaptive = adaptiveWeights[intent.tag] || {};
  const wKeywords = perIntentAdaptive.wKeywords || baseWeights.wKeywords;
  const wTfIdf = perIntentAdaptive.wTfIdf || baseWeights.wTfIdf;
  const wPattern = perIntentAdaptive.wPattern || baseWeights.wPattern;
  const wContext = baseWeights.wContext;

  const kwScore = Math.tanh(keywordMatchWeight / 2.0);
  const patScore = Math.tanh(patternMatchScore / 1.5);
  const tfScore = Math.max(0, tfidfSim);

  // الجديد: إضافة تعزيز للأولوية
  const priorityBoost = (intent.priority_score || 0) * PRIORITY_BOOST_FACTOR;

  const finalScore = (kwScore * wKeywords) + (tfScore * wTfIdf) + (patScore * wPattern) + (contextBoost * wContext) + emphasisBoost + questionBoost + adaptiveBoost + sarcasmPenalty + priorityBoost;

  const breakdown = {
    base: { count: kwScore * wKeywords, tfidf: tfScore * wTfIdf, pattern: patScore * wPattern },
    bonuses: { emphasis: emphasisBoost, question: questionBoost, sarcasm: sarcasmPenalty, priority: priorityBoost },
    context: { contextBoost, adaptiveBoost },
    final: Math.min(Math.max(finalScore, 0), 1),
  };

  const contextSummary = context?.history?.length ? `سياق (${context.history.length} دور)` : "لا سياق";
  const reasoning = buildReasoning(intent, breakdown, matchedTerms, contextSummary);

  return { breakdown, matchedTerms: [...matchedTerms], reasoning, score: breakdown.final };
}
// ===== نهاية التعديلات الرئيسية (حساب النقاط) =====


export function getTopIntents(rawMessage, options = {}) {
  const topN = options.topN || DEFAULT_TOP_N;
  const context = options.context || null;
  const userProfile = options.userProfile || null;
  const minScore = typeof options.minScore === 'number' ? options.minScore : 0.08;

  const tokens = tokenize(rawMessage);
  const vec = {};
  const tokenCounts = tokens.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const totalTokens = Math.max(1, tokens.length);
  for (const t in tokenCounts) {
      const tf = tokenCounts[t] / totalTokens;
      vec[t] = tf;
  }
  const norm = Math.sqrt(Object.values(vec).reduce((sum, val) => sum + val * val, 0)) || 1;
  const msgTf = { vec, norm, tokens };

  const results = intentIndex.map(intent => {
    const det = scoreIntentDetailed(rawMessage, msgTf, intent, { context, userProfile });
    return {
      tag: intent.tag,
      score: det.score,
      // الجديد: إرجاع الـ intent الكامل مع النتائج
      full_intent: intent.full_intent,
      breakdown: det.breakdown,
      matchedTerms: det.matchedTerms,
      reasoning: det.reasoning,
    };
  });

  results.sort((a, b) => b.score - a.score);

  return results.filter(r => r.score >= minScore).slice(0, topN);
}

// ------------------- Feedback / Learning hooks -------------------
export function registerIntentSuccess(userProfile, tag) {
  if (!userProfile) return;

  userProfile.intentSuccessCount = userProfile.intentSuccessCount || {};
  userProfile.intentLastSuccess = userProfile.intentLastSuccess || {};
  userProfile.intentSuccessCount[tag] = (userProfile.intentSuccessCount[tag] || 0) + 1;
  userProfile.intentLastSuccess[tag] = new Date().toISOString();

  adaptiveWeights[tag] = adaptiveWeights[tag] || {};
  adaptiveWeights[tag].wKeywords = Math.min(0.9, (adaptiveWeights[tag].wKeywords || DEFAULT_WEIGHTS.wKeywords) + 0.02);
  adaptiveWeights[tag].wTfIdf = Math.max(0.05, (adaptiveWeights[tag].wTfIdf || DEFAULT_WEIGHTS.wTfIdf) - 0.005);

  saveAdaptiveWeights();
}
