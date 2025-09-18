
// hippocampus/KnowledgeAtomizer.js v3.0 - Cognitive Dissonance Edition
// "أقوى نسخة" - يبقي كل قدرات v2.1 + Memory Fusion + Meta-Emotions + Cognitive Dissonance Detector
// Paths expected (relative):
//  - ../shared/config.js
//  - ../shared/utils.js
//  - ../knowledge/knowledge_base.js
//  - ../shared/context_tracker.js (optional, used gracefully)
//  - ../perception/fingerprint_engine.js (optional, used for memory fusion)
//
// Exports:
//   - atomize(rawMessage, options)
// Notes:
//   - Preserves v2.1 implementation intact and appends new capabilities.
//   - No external libraries required.

import crypto from "crypto";
import { DEBUG } from "../shared/config.js";
import { normalizeArabic, tokenize, levenshtein } from "../shared/utils.js";
import { CONCEPTS_MAP, INTENSITY_MODIFIERS, MOTIVATIONAL_MAP } from "../knowledge/knowledge_base.js";

// ---------- Tunables (v3.0) ----------
const FUZZY_THRESHOLD = 0.65;
const CONTEXT_WINDOW = 5;
const MAX_EMOTIONS_RETURN = 6;
const PUNCTUATION_INTENSITY_BOOST = 1.18;
const REPEATED_CHAR_BOOST = 1.12;
const MAX_INTENSITY = 3.0;

// =================================================================
// START: SUBTEXT PATTERNS (from v2.1)
// =================================================================
const SUBTEXT_PATTERNS = {
  seeking_validation: [/لماذا دائمًا/i, /انا فقط اللي/i, /مش معقول/i, /لا أصدق أن/i],
  emotional_masking: [/انا كويس/i, /انا بخير/i, /كله تمام/i, /مفيش حاجة/i],
  catastrophizing: [/اخاف ان/i, /ماذا لو/i, /اتوقع ان/i, /أكيد هيحصل/i],
  ruminating_on_past: [/لو اني فقط/i, /كان يجب ان/i, /لماذا لم/i, /ياريتني/i],
  self_blame: [/انا السبب/i, /بسببي/i, /غلطتي/i, /انا فاشل/i]
};
// =================================================================
// END: SUBTEXT PATTERNS
// =================================================================

// ---------- Helpers (kept full and unchanged where from v2.1) ----------
function sha1Hex(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function similarityScore(a = "", b = "") {
  if (!a || !b) return 0;
  const lev = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const sim = 1 - lev / maxLen;
  return Math.max(0, Math.min(1, sim));
}

// Try to fetch recent messages from shared/context_tracker if available
function fetchRecentContext(fingerprint) {
  try {
    // require dynamically so code works in ESM or CommonJS setups that provide CommonJS modules.
    // If the module is not present, fail silently and return [].
    // eslint-disable-next-line no-eval
    const contextModule = require("../shared/context_tracker.js");
    if (contextModule && typeof contextModule.getRecentMessages === "function") {
      return contextModule.getRecentMessages({ fingerprint, count: CONTEXT_WINDOW }) || [];
    }
  } catch (e) {
    // ignore absence
  }
  return [];
}

// Merge a list of texts into a short snapshot (most recent first)
function buildContextSnapshot(recentMessages = []) {
  if (!recentMessages || !recentMessages.length) return null;
  const slice = recentMessages.slice(-CONTEXT_WINDOW);
  return slice.map(m => ({ text: String(m.text || m), ts: m.timestamp || null }));
}

// ---------- Concept extraction (weighted) ----------
function extractWeightedConcepts(normalizedMessage) {
  const tokens = new Set(tokenize(normalizedMessage));
  const conceptScores = new Map();

  for (const [concept, data] of Object.entries(CONCEPTS_MAP)) {
    const words = (data.words || []).map(w => normalizeArabic(w));
    let bestScoreForConcept = 0;

    for (const token of tokens) {
      if (!token) continue;
      if (words.includes(token)) {
        bestScoreForConcept = 1.0;
        break;
      }
      for (const word of words) {
        const sim = similarityScore(token, word);
        if (sim > bestScoreForConcept) bestScoreForConcept = sim;
      }
    }

    if (bestScoreForConcept >= FUZZY_THRESHOLD) {
      conceptScores.set(concept, parseFloat(bestScoreForConcept.toFixed(3)));
    }
  }

  if (DEBUG) console.log("[Atomizer.v3] Weighted Concepts:", conceptScores);
  return conceptScores;
}

// ---------- Multi-emotion profile builder ----------
function buildEmotionProfile(conceptScoresMap) {
  const profile = {};
  let totalWeight = 0;

  for (const [concept, matchScore] of conceptScoresMap.entries()) {
    const meta = CONCEPTS_MAP[concept] || {};
    const emoMap = meta.emotions || null;
    if (emoMap && typeof emoMap === "object") {
      for (const [emo, val] of Object.entries(emoMap)) {
        profile[emo] = (profile[emo] || 0) + (matchScore * (val || 0));
      }
    } else {
      const base = meta.intensity || 0.5;
      profile["arousal"] = (profile["arousal"] || 0) + (matchScore * base);
    }
    totalWeight += matchScore;
  }

  if (totalWeight > 0) {
    for (const k of Object.keys(profile)) {
      profile[k] = parseFloat(clamp01(profile[k] / totalWeight).toFixed(3));
    }
  }

  if (!Object.keys(profile).length) profile["neutral"] = 1.0;

  const sorted = Object.entries(profile).sort((a, b) => b[1] - a[1]).slice(0, MAX_EMOTIONS_RETURN);
  const emotionProfile = {};
  sorted.forEach(([emo, val]) => emotionProfile[emo] = val);
  return emotionProfile;
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// ---------- Intensity calculation (upgraded) ----------
function calculateIntensity(conceptScoresMap, normalizedMessage, emotionProfile) {
  if (!conceptScoresMap || conceptScoresMap.size === 0) return 0.08;

  let numerator = 0, denom = 0;
  for (const [concept, matchScore] of conceptScoresMap.entries()) {
    const baseIntensity = (CONCEPTS_MAP[concept] && CONCEPTS_MAP[concept].intensity) || 0.5;
    numerator += matchScore * baseIntensity;
    denom += matchScore;
  }
  let intensity = denom > 0 ? numerator / denom : 0.0;

  const tokens = tokenize(normalizedMessage);
  for (const token of tokens) {
    if (INTENSITY_MODIFIERS && INTENSITY_MODIFIERS[token]) {
      intensity *= INTENSITY_MODIFIERS[token];
    }
  }

  if (/[!؟]{2,}/.test(normalizedMessage)) intensity *= PUNCTUATION_INTENSITY_BOOST;
  if (/(.)\1{2,}/.test(normalizedMessage)) intensity *= REPEATED_CHAR_BOOST;

  const domVal = Object.values(emotionProfile || {}).slice(0,1)[0] || 0;
  intensity *= (1 + domVal * 0.25);

  intensity = Math.min(intensity, MAX_INTENSITY);
  if (DEBUG) console.log("[Atomizer.v3] intensity:", Number(intensity.toFixed(3)));
  return Number(intensity.toFixed(3));
}

// ---------- Contextual Relation Extraction (improved) ----------
function extractRelations(normalizedMessage, concepts, recentMessages = []) {
  const relations = [];
  const tokens = tokenize(normalizedMessage);

  const REL_VERBS = {
    "يسبب": "causes",
    "يؤدي": "causes",
    "مرتبط": "related_to",
    "متعلق": "related_to",
    "افكر": "thinks_about",
    "اخاف": "fears",
    "خاف": "fears",
    "اكره": "hates",
    "احب": "loves",
    "ماقدرش": "cannot",
    "لا": "negation"
  };

  function findConceptByToken(tok) {
    for (const c of concepts) {
      const words = (CONCEPTS_MAP[c] && CONCEPTS_MAP[c].words || []).map(w => normalizeArabic(w));
      if (words.includes(tok)) return c;
    }
    return null;
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (REL_VERBS[t]) {
      let subj = null, obj = null;
      for (let l = 1; l <= 3; l++) {
        const left = tokens[i - l];
        if (!left) break;
        subj = findConceptByToken(left) || subj;
      }
      for (let r = 1; r <= 3; r++) {
        const right = tokens[i + r];
        if (!right) break;
        obj = findConceptByToken(right) || obj;
      }
      if (subj && obj) {
        relations.push({ subject: subj, verb: REL_VERBS[t], object: obj, evidence: [t] });
      } else if (!subj && obj) {
        const pronoun = resolvePronounFromContext(tokens, i, recentMessages);
        if (pronoun && pronoun.subjectConcept) {
          relations.push({ subject: pronoun.subjectConcept, verb: REL_VERBS[t], object: obj, evidence: [t] });
        }
      }
    }
  }

  const pronounIndices = tokens.reduce((acc, tok, idx) => {
    if (["انا", "أنا", "اناا"].includes(tok)) acc.push(idx);
    return acc;
  }, []);
  for (const pi of pronounIndices) {
    const slice = tokens.slice(pi + 1, pi + 6);
    for (let j = 0; j < slice.length; j++) {
      const tok = slice[j];
      if (REL_VERBS[tok]) {
        for (let k = j + 1; k < Math.min(slice.length, j + 4); k++) {
          const objTok = slice[k];
          const objConcept = findConceptByToken(objTok);
          if (objConcept) {
            relations.push({ subject: "self", verb: REL_VERBS[tok], object: objConcept, evidence: ["انا", tok] });
          }
        }
      }
    }
  }

  for (const rm of (recentMessages || [])) {
    const rnorm = normalizeArabic(rm.text || "");
    const rtoks = tokenize(rnorm);
    for (const c of concepts) {
      const words = (CONCEPTS_MAP[c] && CONCEPTS_MAP[c].words || []).map(w => normalizeArabic(w));
      if (rtoks.some(t => words.includes(t))) {
        const emotionTokens = ["خائف", "قلق", "حزين", "حزن", "غضبان", "زعلان", "مسترخي", "سعيد"];
        const foundEmo = tokens.find(t => emotionTokens.includes(t));
        if (foundEmo) {
          relations.push({ subject: "recent_context", verb: "related_emotion", object: c, evidence: [foundEmo] });
        }
      }
    }
  }

  const uniq = [];
  const seen = new Set();
  for (const r of relations) {
    const key = `${r.subject}|${r.verb}|${r.object}|${(r.evidence||[]).join(",")}`;
    if (!seen.has(key)) { seen.add(key); uniq.push(r); }
  }

  if (DEBUG) console.log("[Atomizer.v3] relations:", uniq);
  return uniq;
}

// Simple pronoun resolver using recent messages
function resolvePronounFromContext(tokens, verbIndex, recentMessages = []) {
  try {
    for (let i = (recentMessages || []).length - 1; i >= 0; i--) {
      const rm = recentMessages[i];
      const text = normalizeArabic(rm.text || "");
      const toks = tokenize(text);
      for (const [concept, data] of Object.entries(CONCEPTS_MAP)) {
        const words = (data.words || []).map(w => normalizeArabic(w));
        if (toks.some(t => words.includes(t))) {
          return { subjectConcept: concept, evidence: [rm.text] };
        }
      }
    }
  } catch (e) {
    // ignore errors
  }
  return null;
}

// ---------- Tags & motivational signals ----------
function extractTags(normalizedMessage, conceptScoresMap, emotionProfile) {
  const tags = new Set();
  const tokens = tokenize(normalizedMessage);

  for (const [tag, concepts] of Object.entries(MOTIVATIONAL_MAP || {})) {
    for (const c of concepts) {
      if (conceptScoresMap.has(c)) { tags.add(tag); break; }
    }
  }

  const resilienceWords = ["هحاول", "مش هستسلم", "لن اتوقف", "هكمل"];
  for (const w of resilienceWords) if (tokens.includes(normalizeArabic(w))) tags.add("resilience");

  const topEmotion = Object.keys(emotionProfile || {})[0] || "";
  if (topEmotion && ["fear", "anger", "sadness", "anxiety"].includes(topEmotion)) tags.add("distress");
  if (topEmotion === "joy") tags.add("positive");

  for (const concept of conceptScoresMap.keys()) {
    if (concept.toLowerCase().includes("work") || concept.toLowerCase().includes("شغل")) tags.add("work_related");
  }

  return Array.from(tags);
}

// ---------- Confidence calculation ----------
function computeConfidence(conceptScoresMap, relations, intensity, emotionProfile) {
  const nConcepts = Math.max(0, conceptScoresMap.size);
  const avgMatch = nConcepts ? (Array.from(conceptScoresMap.values()).reduce((a,b)=>a+b,0)/nConcepts) : 0;
  const relFactor = relations.length ? 0.15 : 0.0;
  const intensityFactor = clamp01(intensity / MAX_INTENSITY);
  const emotionSignal = Object.values(emotionProfile || {}).reduce((a,b)=>a+b,0) / Math.max(1, Object.keys(emotionProfile || {}).length);
  const raw = 0.45 * clamp01(avgMatch) + 0.2 * clamp01(nConcepts / 5) + 0.15 * relFactor + 0.1 * intensityFactor + 0.1 * clamp01(emotionSignal);
  return Number(clamp01(raw).toFixed(3));
}

// ---------- Sentiment determination ----------
function determineSentiment(intensity, dominantEmotion) {
  if (dominantEmotion === "joy" && intensity > 0.2) return "positive";
  if (["fear","sadness","anger", "anxiety"].includes(dominantEmotion) && intensity > 0.35) return "negative";
  if (intensity < 0.15) return "neutral";
  return "neutral";
}

// =================================================================
// START: Subtext detection (same as v2.1)
// =================================================================
function detectSubtext(normalizedMessage, emotionProfile, recentMessages = []) {
  const subtextIntents = new Set();

  for (const pattern of SUBTEXT_PATTERNS.seeking_validation) {
    if (pattern.test(normalizedMessage)) { subtextIntents.add('seeking_validation'); break; }
  }

  if (SUBTEXT_PATTERNS.emotional_masking.some(p => p.test(normalizedMessage))) {
    let recentNegativeEnergy = 0;
    recentMessages.slice(-2).forEach(msg => {
      try {
        const atom = atomize(msg.text || ""); // may be recursive but safe (small)
        if (atom && atom.sentiment === 'negative') {
          recentNegativeEnergy += atom.intensity;
        }
      } catch (e) {
        // ignore
      }
    });
    if (recentNegativeEnergy > 1.0) { subtextIntents.add('emotional_masking'); }
  }

  for (const pattern of SUBTEXT_PATTERNS.catastrophizing) {
    if (pattern.test(normalizedMessage)) { subtextIntents.add('catastrophizing'); break; }
  }
  for (const pattern of SUBTEXT_PATTERNS.ruminating_on_past) {
    if (pattern.test(normalizedMessage)) { subtextIntents.add('ruminating_on_past'); break; }
  }
  for (const pattern of SUBTEXT_PATTERNS.self_blame) {
    if (pattern.test(normalizedMessage)) { subtextIntents.add('self_blame'); break; }
  }

  if (DEBUG && subtextIntents.size > 0) console.log("[Atomizer.v3] Subtext Intents:", Array.from(subtextIntents));
  return Array.from(subtextIntents);
}
// =================================================================
// END: Subtext detection
// =================================================================

// =================================================================
// START: NEW v3.0 - Memory Fusion (integrate fingerprint history)
// =================================================================
/**
 * Attempts to fetch a fingerprint profile from perception/fingerprint_engine.js
 * and produce memoryMatches: a list of previous atoms/flags that match current concepts or tags.
 */
function fetchFingerprintProfile(fingerprint) {
  try {
    const fpModule = require("../perception/fingerprint_engine.js");
    if (fpModule && typeof fpModule.getProfile === "function") {
      // profile might include: { fingerprint, patterns: [...], longTermFlags: [...], lastSeen, atoms: [...] }
      return fpModule.getProfile(fingerprint);
    }
  } catch (e) {
    // not available - return null
  }
  return null;
}

/**
 * Memory fusion matcher:
 * - compares current concepts/tags against fingerprint profile (if exists)
 * - returns memoryMatches: [{ type: 'topic_repeat'|'masking_pattern'|'chronic_flag', detail, score }]
 */
function matchMemoryAgainstProfile(fingerprintProfile, conceptsArray, tags, emotionProfile) {
  if (!fingerprintProfile) return [];
  const matches = [];

  // simple: if profile has frequentTopics or atoms with same concept keys => topic_repeat
  const profileTopics = fingerprintProfile.frequentTopics || fingerprintProfile.topConcepts || [];
  for (const c of conceptsArray) {
    const cname = c.concept;
    if (profileTopics.includes(cname)) {
      matches.push({ type: "topic_repeat", detail: cname, score: 0.8 });
    }
  }

  // if profile has known masking patterns or flags, and current tags indicate masking => reinforce
  const profileFlags = fingerprintProfile.flags || [];
  if (profileFlags.includes("masking_tendency") && tags.includes("positive")) {
    matches.push({ type: "masking_pattern", detail: "masking_tendency", score: 0.75 });
  }

  // chronic_flag detection - if user has long term 'work_anxiety' flag and current message has work_related tag
  if (profileFlags.includes("work_anxiety") && tags.includes("work_related")) {
    matches.push({ type: "chronic_flag", detail: "work_anxiety", score: 0.9 });
  }

  // return unique matches
  return matches;
}
// =================================================================
// END: Memory Fusion
// =================================================================

// =================================================================
// START: NEW v3.0 - Meta-Emotions & Cognitive Dissonance
// =================================================================
/**
 * detectMetaEmotions:
 * - If the top two emotions are both significant (e.g., fear:0.6, joy:0.5) => ambivalence
 * - Also label mixed emotions (e.g., low-level sadness + low-level anger => 'mixed_negative')
 */
function detectMetaEmotions(emotionProfile) {
  const meta = { ambivalence: false, mixed: false, details: [] };
  const entries = Object.entries(emotionProfile || {});
  if (entries.length < 2) return meta;
  const sorted = entries.sort((a,b)=>b[1]-a[1]);
  const top = sorted[0], second = sorted[1];
  if (top[1] >= 0.45 && second[1] >= 0.35) {
    meta.ambivalence = true;
    meta.details.push({ type: "ambivalence", top: top[0], second: second[0], scores: [top[1], second[1]] });
  }
  // mixed negative
  const negSet = new Set(["fear","sadness","anger","anxiety"]);
  const negScores = sorted.filter(e => negSet.has(e[0])).map(e=>e[1]);
  if (negScores.length >= 2 && avg(negScores) >= 0.25) {
    meta.mixed = true;
    meta.details.push({ type: "mixed_negative", avgScore: avg(negScores) });
  }
  return meta;
}

/**
 * detectCognitiveDissonance:
 * - Compare surface sentiment vs subtextIntents and emotionProfile.
 * - Flags:
 *    - positive_surface_negative_subtext
 *    - masked_emotion (says "I'm fine" but subtext indicates otherwise)
 *    - ambivalence (propagated from meta-emotions)
 */
function detectCognitiveDissonance(sentiment, subtextIntents, emotionProfile, normalizedMessage) {
  const flags = new Set();
  // positive surface but subtext negative
  if (sentiment === "positive" && subtextIntents.some(s => ["self_blame","ruminating_on_past","catastrophizing","emotional_masking"].includes(s))) {
    flags.add("positive_surface_negative_subtext");
  }
  // says "I'm fine" but subtext negative -> masked_emotion
  if (SUBTEXT_PATTERNS.emotional_masking.some(p => p.test(normalizedMessage))
      && subtextIntents.includes("emotional_masking")) {
    flags.add("masked_emotion");
  }
  // ambivalence from meta emotions
  const meta = detectMetaEmotions(emotionProfile);
  if (meta.ambivalence) flags.add("ambivalence");

  // cognitive dissonance if sentiment neutral/positive but intensity high with negative dominant emotion in profile
  const dom = Object.keys(emotionProfile || {})[0] || "";
  const domScore = Object.values(emotionProfile || {})[0] || 0;
  if ((sentiment === "neutral" || sentiment === "positive") && dom && ["fear","sadness","anger","anxiety"].includes(dom) && domScore > 0.4) {
    flags.add("hidden_negative_dissonance");
  }

  return { flags: Array.from(flags), meta };
}
// =================================================================
// END: Meta-Emotions & Cognitive Dissonance
// =================================================================

// ---------- small utilities ----------
function avg(arr = []) { if (!arr || !arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length; }

// ---------- Main entry: atomize (v3.0) ----------
/**
 * atomize(rawMessage, options)
 * options:
 *   - fingerprint (optional)
 *   - recentMessages: array of { text, timestamp } (optional)
 *   - contextFetch: boolean (if true, will try to fetch via context_tracker)
 */
export function atomize(rawMessage = "", options = {}) {
  if (!rawMessage || typeof rawMessage !== "string") return null;
  if (DEBUG) console.log(`\n--- [Atomizer.v3] Atomizing: ${rawMessage} ---`);

  const normalizedMessage = normalizeArabic(rawMessage);
  const recentFromOptions = Array.isArray(options.recentMessages) ? options.recentMessages : [];
  const fetched = (options.contextFetch && options.fingerprint) ? fetchRecentContext(options.fingerprint) : [];
  const recentMessages = (recentFromOptions.length ? recentFromOptions : (fetched || [])).slice(-CONTEXT_WINDOW);
  const contextSnapshot = buildContextSnapshot(recentMessages);

  // Step 1: concepts
  const weightedConcepts = extractWeightedConcepts(normalizedMessage);
  const concepts = Array.from(weightedConcepts.keys());

  // Step 2: emotion profile (multi-dimensional)
  const emotionProfile = buildEmotionProfile(weightedConcepts);

  // Step 3: intensity
  const intensity = calculateIntensity(weightedConcepts, normalizedMessage, emotionProfile);

  // Step 4: relations (use recentMessages for pronoun resolution)
  const relations = extractRelations(normalizedMessage, concepts, recentMessages);

  // Step 5: tags (motivational + heuristics)
  const tags = extractTags(normalizedMessage, weightedConcepts, emotionProfile);

  // Step 6: detect subtext intents
  const subtextIntents = detectSubtext(normalizedMessage, emotionProfile, recentMessages);

  // Step 7: dominant emotion & sentiment & confidence
  const dominantEmotion = Object.keys(emotionProfile)[0] || "neutral";
  const sentiment = determineSentiment(intensity, dominantEmotion);
  const confidence = computeConfidence(weightedConcepts, relations, intensity, emotionProfile);

  // Step 8: atom id
  const atomId = sha1Hex(rawMessage + "|" + (options.fingerprint || "anon") + "|" + Date.now());

  // Step 9: Memory Fusion (fingerprint cross-check)
  const fingerprintProfile = options.fingerprint ? fetchFingerprintProfile(options.fingerprint) : null;
  const conceptsArray = concepts.map(c => ({ concept: c, score: Number(weightedConcepts.get(c).toFixed(3)), meta: CONCEPTS_MAP[c] || {} }));
  const memoryMatches = matchMemoryAgainstProfile(fingerprintProfile, conceptsArray, tags, emotionProfile);

  // Step 10: meta-emotions & dissonance
  const metaEmotions = detectMetaEmotions(emotionProfile);
  const dissonance = detectCognitiveDissonance(sentiment, subtextIntents, emotionProfile, normalizedMessage);

  // Step 11: tags augmentation based on memory matches & dissonance
  const augmentedTags = new Set(tags);
  if (memoryMatches && memoryMatches.length) memoryMatches.forEach(m => augmentedTags.add(m.type));
  if (dissonance.flags && dissonance.flags.length) dissonance.flags.forEach(f => augmentedTags.add(f));

  const knowledgeAtom = {
    atomId,
    sourceText: rawMessage,
    fingerprint: options.fingerprint || null,
    timestamp: new Date().toISOString(),
    contextSnapshot,           // may be null if none
    concepts: conceptsArray,
    emotionProfile,
    dominantEmotion,
    intensity,
    relations,
    tags: Array.from(augmentedTags),
    subtextIntents,
    sentiment,
    confidence,
    fingerprintProfile,        // may be null if none
    memoryMatches,             // array of memory match objects if any
    metaEmotions: metaEmotions,
    dissonanceFlags: dissonance.flags || [],
    dissonanceMeta: dissonance.meta || {}
  };

  if (DEBUG) console.log("[Atomizer.v3] Knowledge Atom:", JSON.stringify(knowledgeAtom, null, 2));
  return knowledgeAtom;
}

// small demo when run directly
if (require.main === module) {
  const testMessage1 = "انا قلقان جدا من الشغل اليوم!!! مش عارف هاعمل ايه";
  const atom1 = atomize(testMessage1, { fingerprint: "demo_user", recentMessages: [
    { text: "امبارح المدير زعل مني", timestamp: Date.now() - 1000*60*60*24 },
    { text: "الراتب متأخر وانا مضغوط", timestamp: Date.now() - 1000*60*60*2 }
  ]});
  console.log("ATOM1:", atom1);

  const testMessage2 = "انا كويس كل حاجة تمام"; // but recent messages negative
  const atom2 = atomize(testMessage2, { fingerprint: "demo_user", recentMessages: [
    { text: "انا زعلان ومش قادر", timestamp: Date.now() - 1000*60*60*3 },
    { text: "مش عايز اكلم حد", timestamp: Date.now() - 1000*60*60*2 }
  ]});
  console.log("ATOM2:", atom2);
}
