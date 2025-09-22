// intent_engine.js v17.0 - The Flexible Strategic Planner
// This version includes the final, robust logic for session-aware protocol management.
// It prioritizes continuing an active conversation over starting a new one.
// ALL ORIGINAL FUNCTIONS ARE PRESERVED.

import fs from "fs";
import path from "path";
// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { DEBUG } from '../shared/config.js';
import {
  normalizeArabic,
  tokenize,
  levenshtein,
  hasNegationNearby,
  hasEmphasisNearby
} from '../shared/utils.js';
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================


// ------------------- Configuration -------------------
const INTENTS_DIRS = [
  path.join(process.cwd(), "intents_new") // Focused on the final, processed directory.
];

// Compatibility Fix: Use DATA_DIR from config, assuming it's correctly set up there.
// We get DATA_DIR from config.js, so direct definition here is redundant if config is imported.
import { DATA_DIR } from '../shared/config.js';
const ADAPTIVE_WEIGHTS_FILE = path.join(DATA_DIR, "adaptive_weights.json");
const SYNONYMS_FILE = path.join(process.cwd(), "knowledge", "synonyms.json"); // Updated path

const DEFAULT_WEIGHTS = {
  wKeywords: 0.55,
  wTfIdf: 0.12,
  wPattern: 0.20,
  wContext: 0.25,
};
const DEFAULT_TOP_N = 3;
const PRIORITY_BOOST_FACTOR = 0.08;
const FINGERPRINT_BOOST_FACTOR = 0.35; // The weight of the fingerprint's opinion

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
    let loadedCount = 0;
    for (const key in parsed) {
      if (key.startsWith('__') || key.startsWith('مفهوم_') || !Array.isArray(parsed[key])) {
          continue; 
      }
      const normalKey = normalizeArabic(key);
      const vals = parsed[key].map(v => normalizeArabic(String(v)));
      const group = [normalKey, ...vals];
      group.forEach((w) => {
        synonymData.map[w] = group;
        const distance = levenshtein(w, normalKey);
        const base = (w === normalKey) ? 1.0 : Math.max(0.75, 1 - (distance / Math.max(3, normalKey.length)));
        synonymData.weights[w] = parseFloat(base.toFixed(2));
      });
      loadedCount++;
    }
    if (DEBUG) console.log(`📚 Engine Synonym Loader: Loaded ${loadedCount} synonym groups.`);
  } catch (e) {
    console.error("❌ Error processing synonym data in Intent Engine:", e.message);
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

  const docsTokens = raw.map(it => {
    const keywordsText = (it.nlu?.keywords || []).map(k => k.word || '').join(' ');
    const patternsText = (it.patterns || []).join(' ');
    const allText = `${keywordsText} ${patternsText}`;
    return tokenize(allText);
  });

  const df = {};
  docsTokens.forEach(tokens => {
    new Set(tokens).forEach(t => df[t] = (df[t] || 0) + 1);
  });
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

    const processedKeywords = (it.nlu?.keywords || []).map(k => ({
        text: normalizeArabic(k.word),
        weight: k.weight || 1.0
    }));

    return {
      tag: it.tag || `intent_${idx}`,
      full_intent: it,
      keywords: processedKeywords,
      patterns: compiledPatterns,
      priority_score: it.priority_score || 0,
      related_intents: [],
      tfidfVector: vec,
      tfidfNorm: Math.sqrt(sq) || 1,
    };
  });

  tagToIdx = {};
  intentIndex.forEach((it, i) => tagToIdx[it.tag] = i);

  autoLinkIntents();

  if (DEBUG) {
    console.log(`🚀 Engine v15.1 (Integrated Mind - Fixed) indexed successfully.`);
    console.log(`📂 Total intents loaded: ${intentIndex.length}.`);
    const sampleTags = Object.keys(tagToIdx).slice(0, 10);
    console.log(`📌 Sample Tags: [${sampleTags.join(", ")}]...`);
  }
}

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
  if (breakdown.base) lines.push(`- وزن الكلمات: ${breakdown.base.count.toFixed(3)}, وزن TF-IDF: ${breakdown.base.tfidf.toFixed(3)}, وزن الأنماط: ${breakdown.base.pattern.toFixed(3)}`);
  const bonuses = [];
  if (breakdown.bonuses.emphasis) bonuses.push(`تشديد: ${breakdown.bonuses.emphasis.toFixed(3)}`);
  if (breakdown.bonuses.question) bonuses.push(`سؤال: ${breakdown.bonuses.question.toFixed(3)}`);
  if (breakdown.bonuses.priority) bonuses.push(`أولوية: ${breakdown.bonuses.priority.toFixed(3)}`);
  if (breakdown.bonuses.fingerprint) bonuses.push(`بصمة نفسية: ${breakdown.bonuses.fingerprint.toFixed(3)}`);
  if (bonuses.length) lines.push(`- مكافآت: ${bonuses.join(" | ")}`);
  if (breakdown.context) lines.push(`- سياق/تعلم: سياق سابق: ${breakdown.context.contextBoost.toFixed(3)}, تعلم ذاتي: ${breakdown.context.adaptiveBoost.toFixed(3)}`);
  if (contextSummary) lines.push(`- ملخص السياق: ${contextSummary}`);
  lines.push(`النتيجة النهائية: ثقة ${breakdown.final.toFixed(3)}`);
  return lines.join("\n");
}

// ------------------- Multi-intent detection & scoring -------------------
function scoreIntentDetailed(rawMessage, msgTf, intent, options = {}) {
  const { context = null, userProfile = null, weightsOverrides = {}, fingerprint = null } = options;
  const normMsg = normalizeArabic(rawMessage);
  const origTokens = msgTf.tokens || [];
  const expandedUserTokens = expandTokensWithSynonyms(origTokens);

  let keywordMatchWeight = 0;
  const matchedTerms = new Set();
  
  (intent.keywords || []).forEach(kw => {
    const expandedKwTokens = expandTokensWithSynonyms(tokenize(kw.text));
    const matched = [...expandedKwTokens].some(t => expandedUserTokens.has(t) || normMsg.includes(t));
    
    if (matched && !hasNegationNearby(rawMessage, kw.text)) {
      const matchingToken = origTokens.find(t => expandedKwTokens.has(t));
      const synonymWeight = matchingToken ? getSynonymWeight(matchingToken) : 0.9;
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

  // ===== بداية الإصلاح =====
  // This old context logic is now superseded by ContextTracker and fingerprint.
  // This block is now removed to prevent syntax errors from empty loops.
  let contextBoost = 0;
  
  let adaptiveBoost = 0;
  if (userProfile?.intentSuccessCount?.[intent.tag]) {
      const successes = userProfile.intentSuccessCount[intent.tag];
      adaptiveBoost = Math.min(0.20, successes * 0.015);
  }
  // ===== نهاية الإصلاح =====

  let fingerprintBoost = 0;
  if (fingerprint && fingerprint.chosenPrimaryNeed && intent.full_intent?.context_tags) {
      const intentNeeds = Object.values(intent.full_intent.context_tags).flat();
      const fingerprintConcepts = fingerprint.concepts?.map(c => c.concept) || [];
      const hasMatch = intentNeeds.some(need => fingerprintConcepts.includes(need) || need === fingerprint.chosenPrimaryNeed);
      if (hasMatch) {
          // Boost is now also weighted by the fingerprint's overall intensity
          fingerprintBoost = FINGERPRINT_BOOST_FACTOR * (fingerprint.intensity || 1.0);
      }
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

  const priorityBoost = (intent.priority_score || 0) * PRIORITY_BOOST_FACTOR;

  const finalScore = (kwScore * wKeywords) + (tfScore * wTfIdf) + (patScore * wPattern) + (contextBoost * wContext) + emphasisBoost + questionBoost + adaptiveBoost + sarcasmPenalty + priorityBoost + fingerprintBoost;

  const breakdown = {
    base: { count: kwScore * wKeywords, tfidf: tfScore * wTfIdf, pattern: patScore * wPattern },
    bonuses: { emphasis: emphasisBoost, question: questionBoost, sarcasm: sarcasmPenalty, priority: priorityBoost, fingerprint: fingerprintBoost },
    context: { contextBoost, adaptiveBoost },
    final: Math.min(Math.max(finalScore, 0), 1),
  };

  const contextSummary = context?.history?.length ? `سياق (${context.history.length} دور)` : "لا سياق";
  const reasoning = buildReasoning(intent, breakdown, matchedTerms, contextSummary);

  return { breakdown, matchedTerms: [...matchedTerms], reasoning, score: breakdown.final };
}

// --- MODIFICATION: Renamed for internal use. This is your original, powerful function. ---
function getTopIntentsInternal(rawMessage, options = {}) {
  const topN = options.topN || DEFAULT_TOP_N;
  const context = options.context || null;
  const userProfile = options.userProfile || null;
  const minScore = typeof options.minScore === 'number' ? options.minScore : 0.08;
  const fingerprint = options.fingerprint || null;

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
    const det = scoreIntentDetailed(rawMessage, msgTf, intent, { context, userProfile, fingerprint });
    return {
      tag: intent.tag,
      score: det.score,
      full_intent: intent.full_intent,
      breakdown: det.breakdown,
      matchedTerms: det.matchedTerms,
      reasoning: det.reasoning,
    };
  });

  results.sort((a, b) => b.score - a.score);

  return results.filter(r => r.score >= minScore).slice(0, topN);
}


// --- [THE GRAND UPGRADE: The Flexible Strategic Planner v3.0] ---
/* ==================================================================
   NEW EXPORTED FUNCTION: findActiveProtocol
   This is the new brain. It uses your powerful matching engine and adds
   a robust strategic layer that respects active conversations.
   ================================================================== */
export function findActiveProtocol(rawMessage, fingerprint, context, userProfile) {
    const msgTf = { tokens: tokenize(rawMessage) }; // Simplified for relevance check

    // --- RULE 1: Prioritize the active conversation above all else ---
    if (context && context.active_intent && context.state) {
        if (DEBUG) console.log(`STRATEGIC PLANNER: Found active protocol in session: "${context.active_intent}".`);
        
        const activeProtocolIndex = tagToIdx[context.active_intent];
        if (activeProtocolIndex !== undefined) {
            const activeProtocolIntent = intentIndex[activeProtocolIndex];
            
            // We'll be "loyal" to the active conversation unless the user strongly signals a change.
            const allNewIntents = getTopIntentsInternal(rawMessage, { fingerprint, context, userProfile });
            const bestNewIntent = allNewIntents[0];
            
            // Condition to interrupt: A *different* intent has a *significantly higher* score.
            const shouldInterrupt = bestNewIntent && 
                                    bestNewIntent.tag !== context.active_intent && 
                                    bestNewIntent.score > 0.75; // High threshold for interruption

            if (!shouldInterrupt) {
                if (DEBUG) console.log(`PLANNER DECISION: Continuing active protocol "${context.active_intent}" from state "${context.state}".`);
                return {
                    protocol_found: true,
                    protocol_tag: context.active_intent,
                    full_intent: activeProtocolIntent.full_intent,
                    initial_context: {
                        state: context.state,
                        turn_counter: context.turn_counter || 0
                    }
                };
            }
        }
    }

    // --- RULE 2: If no conversation is active, find the best new protocol ---
    if (DEBUG) console.log("STRATEGIC PLANNER: No active protocol or interruption triggered. Searching for a new one.");
    const topIntents = getTopIntentsInternal(rawMessage, { fingerprint, context, userProfile });
    const bestProtocolCandidate = topIntents.find(i => i.score > 0.55 && i.full_intent.dialogue_flow);

    if (bestProtocolCandidate) {
        const protocol = bestProtocolCandidate.full_intent;
        let entryState = protocol.dialogue_flow.entry_point;
        
        const hasStrongEmotion = (fingerprint?.primaryEmotion?.type || 'neutral') !== 'neutral';
        if (hasStrongEmotion && protocol.dialogue_flow.layers.L0_Validation) {
            entryState = 'L0_Validation';
        }
        
        if (DEBUG) console.log(`PLANNER DECISION: Activating NEW protocol "${bestProtocolCandidate.tag}" at state "${entryState}".`);
        return {
            protocol_found: true,
            protocol_tag: bestProtocolCandidate.tag,
            full_intent: protocol,
            initial_context: {
                state: entryState,
                turn_counter: 0
            }
        };
    }
    
    // --- RULE 3: If nothing works, recommend the orchestra fallback ---
    if (DEBUG) console.log(`PLANNER DECISION: No suitable protocol found. Recommending orchestra fallback.`);
    const topIntentsForFallback = getTopIntentsInternal(rawMessage, { fingerprint, context, userProfile });
    return { 
        protocol_found: false,
        top_raw_intent: topIntentsForFallback[0] || null 
    };
}


// ------------------- Feedback / Learning hooks (Preserved) -------------------
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

// --- MODIFICATION: The old export is kept for backward compatibility, but new code should use findActiveProtocol ---
export { getTopIntentsInternal as getTopIntents };
