// intent_engine.js v12.0 - The Practical Sage
// Re-architected for robust and accurate matching of core intents.

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

// ------------------- Configuration (Adjusted Weights) -------------------
const INTENTS_DIRS = [ path.join(process.cwd(), "intents"), path.join(process.cwd(), "api", "intents") ];
const ADAPTIVE_WEIGHTS_FILE = path.join(process.cwd(), "data", "adaptive_weights.json");
const SYNONYMS_FILE = path.join(process.cwd(), "synonyms.json");

const DEFAULT_WEIGHTS = {
  wPattern: 0.60,      // Pattern matches are now the most important
  wKeywords: 0.30,     // Keyword matches are second
  wTfIdf: 0.05,        // TF-IDF is now for subtle context, not primary matching
  wContext: 0.15,      // Context is still important for flow
};
const DEFAULT_TOP_N = 3;

// ------------------- Internal State, Utilities, Synonym Engine, Intent Loading (No major changes needed in structure) -------------------
let intentIndex = [];
export let tagToIdx = {};
let synonymData = { map: {}, weights: {} };
let adaptiveWeights = {};

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
      const arr = Array.isArray(j.intents) ? j.intents : (Array.isArray(j) ? j : []);
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

  const docsTokens = raw.map(it => tokenize([...(it.patterns || []), ...(it.keywords || [])].join(" ")));
  const df = {};
  docsTokens.forEach(tokens => { new Set(tokens).forEach(t => df[t] = (df[t] || 0) + 1); });
  const N = Math.max(1, docsTokens.length);
  const idf = {};
  Object.keys(df).forEach(t => idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1);

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
    
    // Keep original patterns for direct matching, and also compile regex versions.
    const originalPatterns = (it.patterns || []);
    const compiledPatterns = originalPatterns.map(p => {
      try {
        const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(esc, 'i');
      } catch (e) {
        if (DEBUG) console.warn("Invalid pattern", p, e.message || e);
        return null;
      }
    }).filter(Boolean);

    return {
      tag: it.tag || it.intent || `intent_${idx}`,
      responses: it.responses || [],
      response_constructor: it.response_constructor || null,
      safety: (it.safety_protocol || "").toUpperCase(),
      keywords: (it.keywords || []).map(normalizeArabic),
      originalPatterns: originalPatterns.map(normalizeArabic), // Store normalized original patterns
      patterns: compiledPatterns, // Store compiled regexes
      follow_up_intents: it.follow_up_intents || [],
      related_intents: Array.isArray(it.related_intents) ? it.related_intents.slice() : [],
      tfidfVector: vec,
      tfidfNorm: Math.sqrt(sq) || 1,
    };
  });

  tagToIdx = {};
  intentIndex.forEach((it, i) => tagToIdx[it.tag] = i);
  autoLinkIntents();
  if (DEBUG) console.log(`🚀 Engine v12.0 (Practical Sage) indexed successfully. Total Intents: ${intentIndex.length}`);
}


// --- Scoring Engine v12.0 (Re-architected for Accuracy) ---
function detectStyleSignals(rawMessage) {
    const tokens = tokenize(rawMessage);
    const isQuestion = /[\?؟]$/.test(rawMessage.trim()) || /^\s*(هل|متى|لماذا|أين|كيف|من|ما|كم)\b/.test(rawMessage.trim());
    return { isQuestion, tokens };
}

function loadAdaptiveWeights() {
    const aw = safeReadJson(ADAPTIVE_WEIGHTS_FILE);
    adaptiveWeights = aw && typeof aw === 'object' ? aw : {};
    if (DEBUG) console.log(`Loaded ${Object.keys(adaptiveWeights).length} adaptive weight rules.`);
}

function saveAdaptiveWeights() {
    safeWriteJson(ADAPTIVE_WEIGHTS_FILE, adaptiveWeights);
}


export function scoreIntentDetailed(rawMessage, msgTf, intent, options = {}) {
  const { context = null, userProfile = null } = options;
  const normMsg = normalizeArabic(rawMessage);
  const origTokens = msgTf.tokens;

  const matchedTerms = new Set();
  
  // --- 1. Certainty Score: Direct Pattern Matching (Highest Priority) ---
  let certaintyBoost = 0;
  if (intent.originalPatterns) {
      for (const p_text of intent.originalPatterns) {
          if (normMsg.includes(p_text)) {
              const lengthRatio = Math.min(normMsg.length, p_text.length) / Math.max(normMsg.length, p_text.length);
              if (lengthRatio > 0.85) { // If message is very similar in length to a pattern
                  certaintyBoost = 0.6; // HUGE bonus for a direct, precise match
                  matchedTerms.add(p_text);
                  break; // Found a strong match, no need to check other patterns
              }
          }
      }
  }

  // --- 2. Keyword Matching (Direct and Synonym) ---
  let keywordMatchWeight = 0;
  (intent.keywords || []).forEach(kw => {
    const nkw = normalizeArabic(kw);
    if (normMsg.includes(nkw) && !hasNegationNearby(rawMessage, nkw)) {
        keywordMatchWeight += 1.0;
        matchedTerms.add(nkw);
    } else {
        const expandedKwTokens = expandTokensWithSynonyms(tokenize(nkw));
        const matchingToken = origTokens.find(t => expandedKwTokens.has(t));
        if (matchingToken && !hasNegationNearby(rawMessage, nkw)) {
            keywordMatchWeight += getSynonymWeight(matchingToken) * 0.7;
            matchedTerms.add(nkw);
        }
    }
  });

  const tfidfSim = cosineScore(msgTf.vec, intent.tfidfVector, msgTf.norm, intent.tfidfNorm);

  // --- 3. Re-balanced Bonuses ---
  const tagWords = new Set((intent.tag || "").split('_'));
  const tagMatchCount = origTokens.filter(token => tagWords.has(token)).length;
  const tagBonus = tagMatchCount > 0 ? 0.10 * tagMatchCount : 0;

  let emphasisBoost = 0;
  if (hasEmphasisNearby(rawMessage, rawMessage)) {
      emphasisBoost = 0.05;
  }
  
  // Context and Adaptive boosts remain as subtle influencers
  let contextBoost = 0;
  if (context && Array.isArray(context.history)) {
    for (const item of context.history) {
      const decay = Math.exp(-0.15 * (item.age || 0));
      const lastIntentObj = intentIndex.find(i => i.tag === item.tag);
      if (!lastIntentObj) continue;
      if (lastIntentObj.follow_up_intents.includes(intent.tag)) contextBoost += 0.20 * decay;
      else if (lastIntentObj.related_intents.includes(intent.tag)) contextBoost += 0.10 * decay;
    }
  }

  let adaptiveBoost = 0;
  if (userProfile?.intentSuccessCount?.[intent.tag]) {
    const successes = userProfile.intentSuccessCount[intent.tag];
    adaptiveBoost = Math.min(0.15, successes * 0.01);
    const lastUsed = userProfile.intentLastSuccess?.[intent.tag];
    if (lastUsed) {
      const ageDays = (Date.now() - new Date(lastUsed)) / (1000 * 60 * 60 * 24);
      adaptiveBoost *= Math.exp(-0.03 * ageDays);
    }
  }

  // --- 4. Final Score with New Weights ---
  const baseWeights = { ...DEFAULT_WEIGHTS };
  const kwScore = Math.tanh(keywordMatchWeight / 3.0);
  const tfScore = Math.max(0, tfidfSim);
  
  const finalScore = (kwScore * baseWeights.wKeywords) + 
                     (tfScore * baseWeights.wTfIdf) +
                     certaintyBoost +
                     tagBonus + 
                     emphasisBoost + 
                     contextBoost + 
                     adaptiveBoost;

  const breakdown = {
      base: { certainty: certaintyBoost, keyword: kwScore * baseWeights.wKeywords, tfidf: tfScore * baseWeights.wTfIdf },
      bonuses: { tag: tagBonus, emphasis: emphasisBoost },
      context: { context: contextBoost, adaptive: adaptiveBoost },
      final: Math.min(finalScore, 1.0),
  };
  
  const reasoning = `Final Score: ${breakdown.final.toFixed(3)}. Certainty: ${certaintyBoost.toFixed(2)}`;
  
  return { breakdown, matchedTerms: [...matchedTerms], reasoning, score: breakdown.final };
}

export function getTopIntents(rawMessage, options = {}) {
  const topN = options.topN || DEFAULT_TOP_N;
  const context = options.context || null;
  const userProfile = options.userProfile || null;
  const minScore = typeof options.minScore === 'number' ? options.minScore : 0.10;

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
  adaptiveWeights[tag].wKeywords = Math.min(0.9, (adaptiveWeights[tag].wKeywords || DEFAULT_WEIGHTS.wKeywords) + 0.01);
  adaptiveWeights[tag].wTfIdf = Math.max(0.05, (adaptiveWeights[tag].wTfIdf || DEFAULT_WEIGHTS.wTfIdf) - 0.005);
  
  saveAdaptiveWeights();
}
