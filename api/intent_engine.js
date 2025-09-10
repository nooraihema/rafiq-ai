
// intent_engine.js v13. let intentIndex = []; // <--  هذا هو الإصلاح! أضفنا كلمة "export" هنا
export1 - The Final Key
// Fully compatible with chat.js v12.1 and fixes the final export issue.

import let tagToIdx = {};
let synonymData = { map: {}, weights: {} };
let adaptiveWeights = {};

// fs from "fs";
import path from "path";
import { DEBUG } from './config.js';
import {
  normalizeArabic,
  tokenize,
  levenshtein,
  hasNegationNearby,
  has ------------------- Resilient Utilities -------------------
function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content || "null");
  } catch (e) {
    console.error(`❌ SAFEEmphasisNearby
} from './utils.js';

// ------------------- Configuration -------------------
const INTENTS_DIRS = [
  path.join(process.cwd(), "intents"),
  path.join(process.cwd_READ_ERROR: Could not read or parse ${path.basename(filePath)}. Error: ${e.message}`);
(), "api", "intents"),
];
const ADAPTIVE_WEIGHTS_FILE = path.join(process    return null;
  }
}

function safeWriteJson(filePath, obj) {
  try {
    .cwd(), "data", "adaptive_weights.json");
const SYNONYMS_FILE = path.join(const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir,process.cwd(), "synonyms.json");

const DEFAULT_WEIGHTS = {
  wKeywords:  { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "0.55,
  wTfIdf: 0.12,
  wPattern: 0.utf8");
  } catch (e) {
    console.error(`❌ SAFE_WRITE_ERROR:20,
  wContext: 0.25,
};
const DEFAULT_TOP_N =  Could not write to ${path.basename(filePath)}. Adaptive weights will not be saved. Error: ${e.message}`);
3;

// ------------------- Internal State -------------------
// ===== التعديل الأول والحاسم هنا =====
export let intent  }
}

// ------------------- Synonym Engine -------------------
function loadSynonyms() {
  synIndex = []; 
export let tagToIdx = {};
// ===================================
let synonymData = {onymData = { map: {}, weights: {} };
  const parsed = safeReadJson(SYNONYMS_FILE);
  if (!parsed) {
    if (DEBUG) console.log("ℹ️ No synonyms.json map: {}, weights: {} };
let adaptiveWeights = {};

// ------------------- Resilient Utilities -------------------
 found or it's invalid, skipping synonyms load.");
    return;
  }
  try {
    forfunction safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content (const key in parsed) {
      const normalKey = normalizeArabic(key);
      const vals = ( || "null");
  } catch (e) {
    console.error(`❌ SAFE_READ_ERRORparsed[key] || []).map(v => normalizeArabic(v));
      const group = [normalKey, ...vals];
      group.forEach((w) => {
        synonymData.map[w] = group: Could not read or parse ${path.basename(filePath)}. Error: ${e.message}`);
    return null;
  }
}

function safeWriteJson(filePath, obj) {
  try {
    const dir =;
        const distance = levenshtein(w, normalKey);
        const base = (w === normalKey) path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true ? 1.0 : Math.max(0.75, 1 - (distance / Math.max(3 });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
, normalKey.length)));
        synonymData.weights[w] = parseFloat(base.toFixed(2  } catch (e) {
    console.error(`❌ SAFE_WRITE_ERROR: Could not write to));
      });
    }
    if (DEBUG) console.log(`📚 Loaded ${Object.keys(parsed ${path.basename(filePath)}. Adaptive weights will not be saved. Error: ${e.message}`);
  }
).length} synonym groups.`);
  } catch (e) {
    console.error("❌ Error processing synonym}

// ------------------- Synonym Engine -------------------
function loadSynonyms() {
  synonymData = { map data:", e.message);
  }
}

function expandTokensWithSynonyms(tokens) {
  : {}, weights: {} };
  const parsed = safeReadJson(SYNONYMS_FILE);
  ifconst out = new Set(tokens);
  tokens.forEach(t => {
    if (synonymData.map[t]) {
      synonymData.map[t].forEach(s => out.add(s)); (!parsed) {
    if (DEBUG) console.log("ℹ️ No synonyms.json found or it's invalid,
    }
  });
  return out;
}

function getSynonymWeight(token) {
   skipping synonyms load.");
    return;
  }
  try {
    for (const key in parsed)return synonymData.weights[token] || 1.0;
}

// ------------------- Intents Loading & {
      const normalKey = normalizeArabic(key);
      const vals = (parsed[key] || [] Indexing -------------------
function findIntentsDir() {
  for (const d of INTENTS_DIRS).map(v => normalizeArabic(v));
      const group = [normalKey, ...vals];
      group) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) return d.forEach((w) => {
        synonymData.map[w] = group;
        const distance = levenshtein(w, normalKey);
        const base = (w === normalKey) ? 1.;
  }
  return null;
}

function loadIntentsRaw() {
  const dir = findIntentsDir();
  if (!dir) {
    console.error(`❌ CRITICAL: Failed to find intents0 : Math.max(0.75, 1 - (distance / Math.max(3, normalKey.length)));
        synonymData.weights[w] = parseFloat(base.toFixed(2));
      }); directory in any of: ${INTENTS_DIRS.join(", ")}`);
    return [];
  }
  
    }
    if (DEBUG) console.log(`📚 Loaded ${Object.keys(parsed).length} synonymconst files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  let all = [];
  for (const f of files) {
    const j = safeReadJson(path.join(dir groups.`);
  } catch (e) {
    console.error("❌ Error processing synonym data:", e.message);, f));
    if (j) {
      const arr = Array.isArray(j.intents)
  }
}

function expandTokensWithSynonyms(tokens) {
  const out = new Set( ? j.intents : (Array.isArray(j) ? j : []);
      all = all.concattokens);
  tokens.forEach(t => {
    if (synonymData.map[t]) {
      syn(arr);
      if (DEBUG) console.log(`- Loaded ${arr.length} intents from ${f}`);
    onymData.map[t].forEach(s => out.add(s));
    }
  });
  } else {
      console.warn(`⚠️ Skipping invalid JSON file: ${f}`);
    }
  }
  return out;
}

function getSynonymWeight(token) {
  return synonymData.weights[tokenreturn all;
}

function cosineScore(vecA, vecB, normA = 1, normB = ] || 1.0;
}

// ------------------- Intents Loading & Indexing -------------------
function1) {
  if (!vecA || !vecB) return 0;
  let dot = 0;
 findIntentsDir() {
  for (const d of INTENTS_DIRS) {
    if (fs.existsSync(  for (const k in vecA) {
    if (vecB[k]) dot += vecA[d) && fs.statSync(d).isDirectory()) return d;
  }
  return null;
}

k] * vecB[k];
  }
  const denom = (normA || 1) *function loadIntentsRaw() {
  const dir = findIntentsDir();
  if (!dir) {
    console (normB || 1);
  return denom ? (dot / denom) : 0;
}


.error(`❌ CRITICAL: Failed to find intents directory in any of: ${INTENTS_DIRS.join(",function autoLinkIntents() {
  let links = 0;
  for (let i = 0 ")}`);
    return [];
  }
  const files = fs.readdirSync(dir).filter(; i < intentIndex.length; i++) {
    for (let j = i + 1; j < intentIndexf => f.endsWith(".json"));
  let all = [];
  for (const f of files) {
    const j = safeReadJson(path.join(dir, f));
    if (j) {
.length; j++) {
      const a = intentIndex[i];
      const b = intentIndex[j];      const arr = Array.isArray(j.intents) ? j.intents : (Array.isArray(
      const sim = cosineScore(a.tfidfVector, b.tfidfVector, a.tfidfNorm, b.tfidfNorm);
      if (sim > 0.6) {
        if (!a.related_intents.includesj) ? j : []);
      all = all.concat(arr);
      if (DEBUG) console.log(`- Loaded ${arr.length} intents from ${f}`);
    } else {
      console.warn(`⚠️ Skipping(b.tag)) a.related_intents.push(b.tag);
        if (!b.related_intents.includes(a.tag)) b.related_intents.push(a.tag);
        links++; invalid JSON file: ${f}`);
    }
  }
  return all;
}

function cosineScore(vecA, vecB, normA = 1, normB = 1) {
  if (!vec
      }
    }
  }
  if (DEBUG) console.log(`🔗 Auto-linked ${linksA || !vecB) return 0;
  let dot = 0;
  for (const k in vec} related intent pairs.`);
}

export function buildIndexSync() {
  loadSynonyms();
  loadAdaptiveA) {
    if (vecB[k]) dot += vecA[k] * vecB[k];Weights();

  const raw = loadIntentsRaw();
  if (!raw || raw.length === 0
  }
  const denom = (normA || 1) * (normB || 1);
  return denom) {
    if (DEBUG) console.warn("WARNING: No intents found while building index.");
    intent ? (dot / denom) : 0;
}


function autoLinkIntents() {
  let linksIndex = [];
    tagToIdx = {};
    return;
  }

  const docsTokens = raw = 0;
  for (let i = 0; i < intentIndex.length; i++) {
    for.map(it => tokenize([...(it.patterns || []), ...(it.keywords || [])].join(" ")));
   (let j = i + 1; j < intentIndex.length; j++) {
      const a = intentIndex[const df = {};
  docsTokens.forEach(tokens => { new Set(tokens).forEach(t => dfi];
      const b = intentIndex[j];
      const sim = cosineScore(a.tfidfVector[t] = (df[t] || 0) + 1); });
  const N = Math, b.tfidfVector, a.tfidfNorm, b.tfidfNorm);
      if (sim > 0.6.max(1, docsTokens.length);
  const idf = {};
  Object.keys(df).forEach) {
        if (!a.related_intents.includes(b.tag)) a.related_int(t => idf[t] = Math.log((N + 1) / (df[t] +ents.push(b.tag);
        if (!b.related_intents.includes(a.tag)) 1)) + 1);

  intentIndex = raw.map((it, idx) => {
    const tokens b.related_intents.push(a.tag);
        links++;
      }
    }
   = docsTokens[idx] || [];
    const counts = tokens.reduce((acc, t) => { acc}
  if (DEBUG) console.log(`🔗 Auto-linked ${links} related intent pairs.`);
}

[t] = (acc[t] || 0) + 1; return acc; }, {});
    const total = Math.max(1, tokens.length);
    const vec = {};
    let sq =export function buildIndexSync() {
  loadSynonyms();
  loadAdaptiveWeights();

  const raw = load 0;
    Object.keys(counts).forEach(t => {
      const tf = counts[t] /IntentsRaw();
  if (!raw || raw.length === 0) {
    if (DEBUG) total;
      const v = tf * (idf[t] || 1);
      vec[t] = console.warn("WARNING: No intents found while building index.");
    intentIndex = [];
    tagToIdx = {};
    return;
  }

  const docsTokens = raw.map(it => tokenize([...(it v;
      sq += v * v;
    });

    const compiled = (it.patterns || []).map(.patterns || []), ...(it.keywords || [])].join(" ")));
  const df = {};
  docsp => {
      try {
        const esc = p.replace(/[.*+?^${}()|[\]Tokens.forEach(tokens => { new Set(tokens).forEach(t => df[t] = (df[t]\\]/g, '\\$&');
        return new RegExp(esc, 'i');
      } catch (e || 0) + 1); });
  const N = Math.max(1, docsTokens.length);
  ) {
        if (DEBUG) console.warn("Invalid pattern", p, e.message || e);
        return nullconst idf = {};
  Object.keys(df).forEach(t => idf[t] = Math;
      }
    }).filter(Boolean);

    return {
      tag: it.tag || it.intent.log((N + 1) / (df[t] + 1)) + 1);

  intent || `intent_${idx}`,
      responses: it.responses || [],
      response_constructor: it.response_constructor ||Index = raw.map((it, idx) => {
    const tokens = docsTokens[idx] || [];
     null,
      safety: (it.safety_protocol || "").toUpperCase(),
      keywords: (it.keywordsconst counts = tokens.reduce((acc, t) => { acc[t] = (acc[t] || 0) || []).map(normalizeArabic),
      patterns: compiled,
      follow_up_intents: it.follow_ + 1; return acc; }, {});
    const total = Math.max(1, tokens.length);
    const vec = {};
    let sq = 0;
    Object.keys(counts).forEach(t => {
up_intents || [],
      related_intents: Array.isArray(it.related_intents) ? it      const tf = counts[t] / total;
      const v = tf * (idf[t] ||.related_intents.slice() : [],
      tfidfVector: vec,
      tfidfNorm: Math.sqrt(sq) || 1,
    };
  });

  tagToIdx = {};
  intentIndex.forEach 1);
      vec[t] = v;
      sq += v * v;
    });

((it, i) => tagToIdx[it.tag] = i);

  autoLinkIntents();

      const compiled = (it.patterns || []).map(p => {
      try {
        const escif (DEBUG) console.log(`🚀 Engine v13.1 (Final Fix) indexed successfully. Total Intents = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return: ${intentIndex.length}`);
}

// ------------------- Vector & Style helpers -------------------
function jacc new RegExp(esc, 'i');
      } catch (e) {
        if (DEBUG) console.warnardSimilarity(setA, setB) {
  if (!setA || !setB || setA.size("Invalid pattern", p, e.message || e);
        return null;
      }
    }).filter(Boolean === 0 || setB.size === 0) return 0;
  const inter = new Set([...);

    return {
      tag: it.tag || it.intent || `intent_${idx}`,
      setA].filter(x => setB.has(x)));
  const union = new Set([...setAresponses: it.responses || [],
      response_constructor: it.response_constructor || null,
      safety: (, ...setB]);
  return inter.size / union.size;
}

function detectStyleSignals(rawit.safety_protocol || "").toUpperCase(),
      keywords: (it.keywords || []).map(normalizeArabic),
      patterns: compiled,
      follow_up_intents: it.follow_up_intents || [],
      Message) {
    const tokens = tokenize(rawMessage);
    const isQuestion = /[\?؟]$related_intents: Array.isArray(it.related_intents) ? it.related_intents.slice/.test(rawMessage.trim()) || /^\s*(هل|متى|لماذا|أين|كيف() : [],
      tfidfVector: vec,
      tfidfNorm: Math.sqrt(sq) || 1,
    };
  });

  tagToIdx = {};
  intentIndex.forEach((it, i|من|ما|كم)\b/.test(rawMessage.trim());
    const sarcasm = /(بجد\) => tagToIdx[it.tag] = i);

  autoLinkIntents();

  if (DEBUG) console?|عنجد\?|يا سلام\?)/i.test(rawMessage) || /(؟\?){.log(`🚀 Engine v13.1 (Final Key) indexed successfully. Total Intents: ${intentIndex.length}`);
}

// ------------------- Vector & Style helpers -------------------
function jaccardSimilarity(setA, set1,}/.test(rawMessage);
    const hasBasicEmphasis = tokens.some(t => ["جB) {
  if (!setA || !setB || setA.size === 0 || setBدا","للغاية","كتير","بشدة","أوي","اوي"].includes(t)) || /.size === 0) return 0;
  const inter = new Set([...setA].filter(x!{2,}/.test(rawMessage);
    return { isQuestion, sarcasm, hasBasicEmphasis, tokens => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return inter };
}

// ------------------- Reasoning Layer -------------------
function buildReasoning(intent, breakdown, matched.size / union.size;
}

function detectStyleSignals(rawMessage) {
    const tokens = tokenize(rawMessage);
    const isQuestion = /[\?؟]$/.test(rawMessage.trim()) || /Terms, contextSummary) {
  const lines = [`لأنّي وجدت دلائل على النية "${intent.tag}":`];
  if (matchedTerms && matchedTerms.size > 0) lines.push(`-^\s*(هل|متى|لماذا|أين|كيف|من|ما|كم)\b/. كلمات/أنماط مطابقة: ${[...matchedTerms].join(", ")}`);
  if (breaktest(rawMessage.trim());
    const sarcasm = /(بجد\?|عنجد\?|down.base) lines.push(`- وزن الكلمات (أساسي): ${breakdown.base.count.toFixed(3يا سلام\?)/i.test(rawMessage) || /(؟\?){1,}/.test()}, وزن TF-IDF: ${breakdown.base.tfidf.toFixed(3)}, وزن الأنماط: ${breakdown.rawMessage);
    const hasBasicEmphasis = tokens.some(t => ["جدا","للغاية","كتbase.pattern.toFixed(3)}`);
  const bonuses = [];
  if (breakdown.bonusesير","بشدة","أوي","اوي"].includes(t)) || /!{2,}/..emphasis) bonuses.push(`تشديد: ${breakdown.bonuses.emphasis.toFixed(3)}`);
  if (breakdown.bonuses.question) bonuses.push(`سؤال: ${breakdown.bonusestest(rawMessage);
    return { isQuestion, sarcasm, hasBasicEmphasis, tokens };
}

// ------------------- Reasoning Layer -------------------
function buildReasoning(intent, breakdown, matchedTerms, contextSummary) {
  const lines.question.toFixed(3)}`);
  if (bonuses.length) lines.push(`- مكافآت: ${bonuses.join(" | ")}`);
  if (breakdown.context) lines.push = [`لأنّي وجدت دلائل على النية "${intent.tag}":`];
  if ((`- سياق/تعلم: سياق سابق: ${breakdown.context.contextBoost.toFixed(3)}, تعلم ذاتي: ${breakdown.context.adaptiveBoost.toFixed(3)}`);
  if (contextSummary) linesmatchedTerms && matchedTerms.size > 0) lines.push(`- كلمات/أنماط مطابقة: ${[.push(`- ملخص السياق: ${contextSummary}`);
  lines.push(`النتيجة النهائية:...matchedTerms].join(", ")}`);
  if (breakdown.base) lines.push(`- وزن ثقة ${breakdown.final.toFixed(3)}`);
  return lines.join("\n");
} الكلمات (أساسي): ${breakdown.base.count.toFixed(3)}, وزن TF-IDF: ${breakdown.

// ------------------- Adaptive weights persistence -------------------
function loadAdaptiveWeights() {
  const aw = safeReadJsonbase.tfidf.toFixed(3)}, وزن الأنماط: ${breakdown.base.pattern.toFixed(3)}(ADAPTIVE_WEIGHTS_FILE);
  adaptiveWeights = aw && typeof aw === 'object' ? aw`);
  const bonuses = [];
  if (breakdown.bonuses.emphasis) bonuses.push(`تش : {};
  if (DEBUG) console.log(`Loaded ${Object.keys(adaptiveWeights).length} adaptiveديد: ${breakdown.bonuses.emphasis.toFixed(3)}`);
  if (breakdown.bon weight rules.`);
}
function saveAdaptiveWeights() {
  safeWriteJson(ADAPTIVE_WEIGHTS_FILEuses.question) bonuses.push(`سؤال: ${breakdown.bonuses.question.toFixed(3)}`);, adaptiveWeights);
}

// ------------------- Multi-intent detection & scoring -------------------
function scoreIntent
  if (bonuses.length) lines.push(`- مكافآت: ${bonuses.join(" | ")}`);
  if (breakdown.context) lines.push(`- سياق/تعDetailed(rawMessage, msgTf, intent, options = {}) {
  const { context = null, userProfileلم: سياق سابق: ${breakdown.context.contextBoost.toFixed(3)}, تعلم ذاتي: ${break = null, weightsOverrides = {} } = options;
  const normMsg = normalizeArabic(rawMessage);
down.context.adaptiveBoost.toFixed(3)}`);
  if (contextSummary) lines.push(`-  const origTokens = msgTf.tokens;
  const expandedUserTokens = expandTokensWithSynonyms(orig ملخص السياق: ${contextSummary}`);
  lines.push(`النتيجة النهائية: ثقة ${breakdown.finalTokens);

  let keywordMatchWeight = 0;
  const matchedTerms = new Set();
  (.toFixed(3)}`);
  return lines.join("\n");
}

// ------------------- Adaptive weights persistenceintent.keywords || []).forEach(kw => {
    const nkw = normalizeArabic(kw);
    const expandedKw -------------------
function loadAdaptiveWeights() {
  const aw = safeReadJson(ADAPTIVE_WEIGHTTokens = expandTokensWithSynonyms(tokenize(nkw));
    const matched = [...expandedKwTokens].some(t =>S_FILE);
  adaptiveWeights = aw && typeof aw === 'object' ? aw : {};
  if (DEBUG expandedUserTokens.has(t) || normMsg.includes(t));
    if (matched && !hasNeg) console.log(`Loaded ${Object.keys(adaptiveWeights).length} adaptive weight rules.`);
}
function saveAdaptiveWeightsationNearby(rawMessage, nkw)) {
      const matchingToken = origTokens.find(t => expanded() {
  safeWriteJson(ADAPTIVE_WEIGHTS_FILE, adaptiveWeights);
}

// ----------------KwTokens.has(t));
      const w = matchingToken ? getSynonymWeight(matchingToken) : 0.9;
      keywordMatchWeight += w;
      matchedTerms.add(nkw);
    --- Multi-intent detection & scoring -------------------
function scoreIntentDetailed(rawMessage, msgTf, intent}
  });

  let patternMatchScore = 0;
  let bestPatternSimilarity = 0;, options = {}) {
  const { context = null, userProfile = null, weightsOverrides = {} } =
  (intent.patterns || []).forEach(regex => {
    if (regex.test(rawMessage) options;
  const normMsg = normalizeArabic(rawMessage);
  const origTokens = msgTf.tokens && !hasNegationNearby(rawMessage, regex.source)) {
      patternMatchScore += 1.0;
;
  const expandedUserTokens = expandTokensWithSynonyms(origTokens);

  let keywordMatchWeight = 0;      matchedTerms.add(regex.source);

      const patternTokens = new Set(tokenize(regex.source
  const matchedTerms = new Set();
  (intent.keywords || []).forEach(kw => {
));
      const similarity = jaccardSimilarity(new Set(origTokens), patternTokens);
      if (similarity > bestPatternSimilarity) {
        bestPatternSimilarity = similarity;
      }
    }
  });

      const nkw = normalizeArabic(kw);
    const expandedKwTokens = expandTokensWithSynonyms(tokenize(nkw));
    const matched = [...expandedKwTokens].some(t => expandedUserTokens.has(t) ||const tfidfSim = cosineScore(msgTf.vec, intent.tfidfVector, msgTf.norm, intent normMsg.includes(t));
    if (matched && !hasNegationNearby(rawMessage, nkw.tfidfNorm);

  const style = detectStyleSignals(rawMessage);
  let emphasisBoost = style.hasBasicEmphasis)) {
      const matchingToken = origTokens.find(t => expandedKwTokens.has(t));
      const w = matchingToken ? getSynonymWeight(matchingToken) : 0.9;
      keyword ? 0.05 : 0;
  matchedTerms.forEach(t => {
      if (hasMatchWeight += w;
      matchedTerms.add(nkw);
    }
  });

  let patternEmphasisNearby(rawMessage, t)) emphasisBoost += 0.05;
  });
  
  const questionMatchScore = 0;
  let bestPatternSimilarity = 0;
  (intent.patterns || []Boost = style.isQuestion ? 0.05 : 0;
  const sarcasmPenalty = style.s).forEach(regex => {
    if (regex.test(rawMessage) && !hasNegationNearby(rawarcasm ? -0.05 : 0;

  let contextBoost = 0;
  if (context && Array.isArray(context.history)) {
    for (const item of context.history) {
      constMessage, regex.source)) {
      patternMatchScore += 1.0;
      matchedTerms.add(regex. decay = Math.exp(-0.15 * (item.age || 0));
      const lastIntentObjsource);

      const patternTokens = new Set(tokenize(regex.source));
      const similarity = jaccardSimilarity( = intentIndex.find(i => i.tag === item.tag);
      if (!lastIntentObj) continue;
      if (lastIntentObj.follow_up_intents.includes(intent.tag)) contextBoost += new Set(origTokens), patternTokens);
      if (similarity > bestPatternSimilarity) {
        bestPatternSimilarity = similarity;
      }
    }
  });

  const tfidfSim = cosineScore(msgTf.vec, intent.tfidfVector, msgTf.norm, intent.tfidfNorm);

  const style = detectStyleSignals0.35 * decay;
      else if (lastIntentObj.related_intents.includes(intent.tag(rawMessage);
  let emphasisBoost = style.hasBasicEmphasis ? 0.05 : 0;
  )) contextBoost += 0.12 * decay;
    }
  }

  let adaptiveBoost = 0;matchedTerms.forEach(t => {
      if (hasEmphasisNearby(rawMessage, t)) emphasisBoost += 
  if (userProfile?.intentSuccessCount?.[intent.tag]) {
    const successes = userProfile0.05;
  });
  
  const questionBoost = style.isQuestion ? 0.0.intentSuccessCount[intent.tag];
    adaptiveBoost = Math.min(0.20, successes5 : 0;
  const sarcasmPenalty = style.sarcasm ? -0.05 : 0;

  let contextBoost = 0;
  if (context && Array.isArray(context.history)) { * 0.015);
    const lastUsed = userProfile.intentLastSuccess?.[intent.tag];
    if (lastUsed) {
      const ageDays = (Date.now() - new Date(lastUsed
    for (const item of context.history) {
      const decay = Math.exp(-0.15 * (item.age || 0));
      const lastIntentObj = intentIndex.find(i => i)) / (1000 * 60 * 60 * 24);
      adaptiveBoost.tag === item.tag);
      if (!lastIntentObj) continue;
      if (lastIntentObj *= Math.exp(-0.03 * ageDays);
    }
  }

  const baseWeights.follow_up_intents.includes(intent.tag)) contextBoost += 0.35 * decay = { ...DEFAULT_WEIGHTS, ...weightsOverrides };
  const perIntentAdaptive = adaptiveWeights[intent.;
      else if (lastIntentObj.related_intents.includes(intent.tag)) contextBoost +=tag] || {};
  const wKeywords = perIntentAdaptive.wKeywords || baseWeights.wKeywords;
  const 0.12 * decay;
    }
  }

  let adaptiveBoost = 0;
  if wTfIdf = perIntentAdaptive.wTfIdf || baseWeights.wTfIdf (userProfile?.intentSuccessCount?.[intent.tag]) {
    const successes = userProfile.intentSuccessCount[;
  const wPattern = perIntentAdaptive.wPattern || baseWeights.wPattern;
  const wContext = baseWeights.wContext;

  const kwScore = Math.tanh(keywordMatchWeight / 2.0);intent.tag];
    adaptiveBoost = Math.min(0.20, successes * 0.01
  const patScore = Math.tanh(patternMatchScore / 1.5);
  const tfScore = Math.5);
    const lastUsed = userProfile.intentLastSuccess?.[intent.tag];
    if (lastUsed)max(0, tfidfSim);
  
  const finalScore = (kwScore * wKeywords) + (tfScore * wTfIdf) + (patScore * wPattern) + (contextBoost * w {
      const ageDays = (Date.now() - new Date(lastUsed)) / (1000 *Context) + emphasisBoost + questionBoost + adaptiveBoost + sarcasmPenalty;

  const breakdown = {
    base: 60 * 60 * 24);
      adaptiveBoost *= Math.exp(-0.03 * { count: kwScore * wKeywords, tfidf: tfScore * wTfIdf, pattern: pat ageDays);
    }
  }

  const baseWeights = { ...DEFAULT_WEIGHTS, ...weightsOverrides };Score * wPattern },
    bonuses: { emphasis: emphasisBoost, question: questionBoost, sarcasm: sarcasmPenalty },

  const perIntentAdaptive = adaptiveWeights[intent.tag] || {};
  const wKeywords = perIntentAdaptive.    context: { contextBoost, adaptiveBoost },
    final: Math.min(Math.max(finalScore, 0wKeywords || baseWeights.wKeywords;
  const wTfIdf = perIntentAdaptive.wTf), 1),
  };
  
  const contextSummary = context?.history?.length ? `سياق (${Idf || baseWeights.wTfIdf;
  const wPattern = perIntentAdaptive.wPatterncontext.history.length} دور)` : "لا سياق";
  const reasoning = buildReasoning( || baseWeights.wPattern;
  const wContext = baseWeights.wContext;

  const kwScore = Math.tanh(keywordMatchWeight / 2.0);
  const patScore = Math.tanh(patternintent, breakdown, matchedTerms, contextSummary);

  return { breakdown, matchedTerms, reasoning, score: breakdown.final };MatchScore / 1.5);
  const tfScore = Math.max(0, tfidfSim);

}

export function getTopIntents(rawMessage, options = {}) {
  const topN = options  
  const finalScore = (kwScore * wKeywords) + (tfScore * wTfIdf) + (.topN || DEFAULT_TOP_N;
  const context = options.context || null;
  const userProfilepatScore * wPattern) + (contextBoost * wContext) + emphasisBoost + questionBoost + adaptiveBoost + sarcasmPenalty = options.userProfile || null;
  const minScore = typeof options.minScore === 'number' ? options;

  const breakdown = {
    base: { count: kwScore * wKeywords, tfidf: tf.minScore : 0.08;

  const tokens = tokenize(rawMessage);
  const vecScore * wTfIdf, pattern: patScore * wPattern },
    bonuses: { emphasis: emphasis = {};
  const tokenCounts = tokens.reduce((acc, t) => { acc[t] = (Boost, question: questionBoost, sarcasm: sarcasmPenalty },
    context: { contextBoost, adaptiveBoost },
acc[t] || 0) + 1; return acc; }, {});
  const totalTokens = Math.max(1, tokens.length);
  for (const t in tokenCounts) {
      const tf =    final: Math.min(Math.max(finalScore, 0), 1),
  };
 tokenCounts[t] / totalTokens;
      vec[t] = tf;
  }
  const  
  const contextSummary = context?.history?.length ? `سياق (${context.history.length} دور norm = Math.sqrt(Object.values(vec).reduce((sum, val) => sum + val * val,)` : "لا سياق";
  const reasoning = buildReasoning(intent, breakdown, matchedTerms, context 0)) || 1;
  const msgTf = { vec, norm, tokens };

  constSummary);

  return { breakdown, matchedTerms, reasoning, score: breakdown.final };
}

export function get results = intentIndex.map(intent => {
    const det = scoreIntentDetailed(rawMessage, msgTTopIntents(rawMessage, options = {}) {
  const topN = options.topN || DEFAULT_TOP_Nf, intent, { context, userProfile });
    return {
      tag: intent.tag,
      score;
  const context = options.context || null;
  const userProfile = options.userProfile || null;
  const minScore = typeof options.minScore === 'number' ? options.minScore : 0.0: det.score,
      breakdown: det.breakdown,
      matchedTerms: det.matchedTerms,
8;

  const tokens = tokenize(rawMessage);
  const vec = {};
  const tokenCounts =      reasoning: det.reasoning,
    };
  });

  results.sort((a, b) tokens.reduce((acc, t) => { acc[t] = (acc[t] || 0) => b.score - a.score);

  return results.filter(r => r.score >= minScore). + 1; return acc; }, {});
  const totalTokens = Math.max(1, tokens.lengthslice(0, topN);
}

// ------------------- Feedback / Learning hooks -------------------
export function register);
  for (const t in tokenCounts) {
      const tf = tokenCounts[t] / totalTokens;IntentSuccess(userProfile, tag) {
  if (!userProfile) return;
  
  userProfile.
      vec[t] = tf;
  }
  const norm = Math.sqrt(Object.values(intentSuccessCount = userProfile.intentSuccessCount || {};
  userProfile.intentLastSuccess = userProfile.intentLastSuccessvec).reduce((sum, val) => sum + val * val, 0)) || 1;
  const msgT || {};
  userProfile.intentSuccessCount[tag] = (userProfile.intentSuccessCount[tag] || 0f = { vec, norm, tokens };

  const results = intentIndex.map(intent => {
    const det) + 1;
  userProfile.intentLastSuccess[tag] = new Date().toISOString();

   = scoreIntentDetailed(rawMessage, msgTf, intent, { context, userProfile });
    return {adaptiveWeights[tag] = adaptiveWeights[tag] || {};
  adaptiveWeights[tag].wKeywords = Math
      tag: intent.tag,
      score: det.score,
      breakdown: det.breakdown,
.min(0.9, (adaptiveWeights[tag].wKeywords || DEFAULT_WEIGHTS.wKeywords)      matchedTerms: det.matchedTerms,
      reasoning: det.reasoning,
    };
   + 0.02);
  adaptiveWeights[tag].wTfIdf = Math.max(});

  results.sort((a, b) => b.score - a.score);

  return results0.05, (adaptiveWeights[tag].wTfIdf || DEFAULT_WEIGHTS.wT.filter(r => r.score >= minScore).slice(0, topN);
}

// ----------------fIdf) - 0.005);
  
  saveAdaptiveWeights();
}
