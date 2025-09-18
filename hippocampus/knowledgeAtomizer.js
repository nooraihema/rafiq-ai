// hippocampus/KnowledgeAtomizer.js v2.0 - Sentient Edition
// "خرافي" - يجمع مفاهيم، متجهات انفعالية متعددة، علاقات سياقية، tags، وثقة عامة.
// يتكامل مع shared/context_tracker.js إن وجد، ويقبل recentMessages عبر options.

import crypto from "crypto";
// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { DEBUG } from "../shared/config.js";
import { normalizeArabic, tokenize, levenshtein } from "../shared/utils.js";
import { CONCEPTS_MAP, INTENSITY_MODIFIERS, MOTIVATIONAL_MAP } from "../knowledge/knowledge_base.js";
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================

// ---------- Tunables ----------
const FUZZY_THRESHOLD = 0.65;         // lower threshold to catch more fuzzy matches (tuneable)
const CONTEXT_WINDOW = 5;             // number of recent messages to include from short-term memory
const MAX_EMOTIONS_RETURN = 6;        // max number of emotions returned in profile
const PUNCTUATION_INTENSITY_BOOST = 1.18;
const REPEATED_CHAR_BOOST = 1.12;
const MAX_INTENSITY = 3.0;

// ---------- Helpers ----------
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
    // This dynamic require might be tricky with ESM, but we keep the logic.
    // The primary way should be passing `recentMessages` in options.
    const contextModule = require("../shared/context_tracker.js");
    if (contextModule && typeof contextModule.getRecentMessages === "function") {
      return contextModule.getRecentMessages({ fingerprint, count: CONTEXT_WINDOW }) || [];
    }
  } catch (e) {
    // module not present or not CommonJS; caller may pass recentMessages in options
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

  // Pre-normalize concept words once
  for (const [concept, data] of Object.entries(CONCEPTS_MAP)) {
    const words = (data.words || []).map(w => normalizeArabic(w));
    let bestScoreForConcept = 0;

    for (const token of tokens) {
      if (!token) continue;
      // exact match
      if (words.includes(token)) {
        bestScoreForConcept = 1.0;
        break;
      }
      // fuzzy
      for (const word of words) {
        const sim = similarityScore(token, word);
        if (sim > bestScoreForConcept) bestScoreForConcept = sim;
      }
    }

    if (bestScoreForConcept >= FUZZY_THRESHOLD) {
      conceptScores.set(concept, parseFloat(bestScoreForConcept.toFixed(3)));
    }
  }

  if (DEBUG) console.log("[Atomizer.v2] Weighted Concepts:", conceptScores);
  return conceptScores;
}

// ---------- Multi-emotion profile builder ----------
// We look up CONCEPTS_MAP[concept].emotions (expected as { fear:0.8, sadness:0.4, ... })
// Fallback: if no emotion map, use CONCEPTS_MAP[concept].intensity as single axis 'arousal'
function buildEmotionProfile(conceptScoresMap) {
  const profile = {}; // emotion -> score accumulator
  let totalWeight = 0;

  for (const [concept, matchScore] of conceptScoresMap.entries()) {
    const meta = CONCEPTS_MAP[concept] || {};
    const emoMap = meta.emotions || null;
    if (emoMap && typeof emoMap === "object") {
      for (const [emo, val] of Object.entries(emoMap)) {
        profile[emo] = (profile[emo] || 0) + (matchScore * (val || 0));
      }
    } else {
      // fallback: treat base intensity as generic 'arousal' axis
      const base = meta.intensity || 0.5;
      profile["arousal"] = (profile["arousal"] || 0) + (matchScore * base);
    }
    totalWeight += matchScore;
  }

  // normalize to 0..1 by dividing by totalWeight (if >0)
  if (totalWeight > 0) {
    for (const k of Object.keys(profile)) {
      profile[k] = parseFloat(clamp01(profile[k] / totalWeight).toFixed(3));
    }
  }

  // ensure at least neutral exists
  if (!Object.keys(profile).length) profile["neutral"] = 1.0;

  // convert to sorted array (emotion, score)
  const sorted = Object.entries(profile).sort((a, b) => b[1] - a[1]).slice(0, MAX_EMOTIONS_RETURN);
  const emotionProfile = {};
  sorted.forEach(([emo, val]) => emotionProfile[emo] = val);
  return emotionProfile;
}

// clamp helper
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

  // apply token-based modifiers
  const tokens = tokenize(normalizedMessage);
  for (const token of tokens) {
    if (INTENSITY_MODIFIERS && INTENSITY_MODIFIERS[token]) {
      intensity *= INTENSITY_MODIFIERS[token];
    }
  }
  // punctuation boosts
  if (/[!؟]{2,}/.test(normalizedMessage)) intensity *= PUNCTUATION_INTENSITY_BOOST;
  if (/(.)\1{2,}/.test(normalizedMessage)) intensity *= REPEATED_CHAR_BOOST;

  // modify by dominant emotion val (if present) to amplify e.g., high-fear signals
  const domVal = Object.values(emotionProfile || {}).slice(0,1)[0] || 0;
  intensity *= (1 + domVal * 0.25);

  intensity = Math.min(intensity, MAX_INTENSITY);
  if (DEBUG) console.log("[Atomizer.v2] intensity:", Number(intensity.toFixed(3)));
  return Number(intensity.toFixed(3));
}

// ---------- Contextual Relation Extraction (improved) ----------
function extractRelations(normalizedMessage, concepts, recentMessages = []) {
  const relations = [];
  // tokens array for scanning
  const tokens = tokenize(normalizedMessage);

  // small lexicons (extendable)
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

  // Utility: find concept containing token (word) using CONCEPTS_MAP words list
  function findConceptByToken(tok) {
    for (const c of concepts) {
      const words = (CONCEPTS_MAP[c] && CONCEPTS_MAP[c].words || []).map(w => normalizeArabic(w));
      if (words.includes(tok)) return c;
    }
    return null;
  }

  // 1) Rule-based patterns in same sentence: [subject] [verb] [object]
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (REL_VERBS[t]) {
      // look left for subject token up to 3 tokens
      let subj = null, obj = null;
      for (let l = 1; l <= 3; l++) {
        const left = tokens[i - l];
        if (!left) break;
        subj = findConceptByToken(left) || subj;
      }
      // look right for object up to 3 tokens
      for (let r = 1; r <= 3; r++) {
        const right = tokens[i + r];
        if (!right) break;
        obj = findConceptByToken(right) || obj;
      }
      if (subj && obj) {
        relations.push({ subject: subj, verb: REL_VERBS[t], object: obj, evidence: [t] });
      } else if (!subj && obj) {
        // maybe subject is pronoun: resolve pronoun from recent context (simple heuristic)
        const pronoun = resolvePronounFromContext(tokens, i, recentMessages);
        if (pronoun && pronoun.subjectConcept) {
          relations.push({ subject: pronoun.subjectConcept, verb: REL_VERBS[t], object: obj, evidence: [t] });
        }
      }
    }
  }

  // 2) Pattern: "انا ... <verb> <concept>" -> subject = "self"
  const pronounIndices = tokens.reduce((acc, tok, idx) => {
    if (["انا", "أنا", "اناا"].includes(tok)) acc.push(idx);
    return acc;
  }, []);
  for (const pi of pronounIndices) {
    // check slice after pronoun
    const slice = tokens.slice(pi + 1, pi + 6);
    for (let j = 0; j < slice.length; j++) {
      const tok = slice[j];
      if (REL_VERBS[tok]) {
        // look for object in subsequent tokens
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

  // 3) Cross-message inference: if recent message mentions a concept then current mentions emotion word -> relate
  for (const rm of (recentMessages || [])) {
    const rnorm = normalizeArabic(rm.text || "");
    const rtoks = tokenize(rnorm);
    for (const c of concepts) {
      const words = (CONCEPTS_MAP[c] && CONCEPTS_MAP[c].words || []).map(w => normalizeArabic(w));
      if (rtoks.some(t => words.includes(t))) {
        // if current message contains emotion-indicating token (fear words etc.)
        const emotionTokens = ["خائف", "قلق", "حزين", "حزن", "غضبان", "زعلان", "مسترخي", "سعيد"];
        const foundEmo = tokens.find(t => emotionTokens.includes(t));
        if (foundEmo) {
          relations.push({ subject: "recent_context", verb: "related_emotion", object: c, evidence: [foundEmo] });
        }
      }
    }
  }

  // deduplicate relations by stringified form
  const uniq = [];
  const seen = new Set();
  for (const r of relations) {
    const key = `${r.subject}|${r.verb}|${r.object}|${(r.evidence||[]).join(",")}`;
    if (!seen.has(key)) { seen.add(key); uniq.push(r); }
  }

  if (DEBUG) console.log("[Atomizer.v2] relations:", uniq);
  return uniq;
}

// Simple pronoun resolver using recent messages
function resolvePronounFromContext(tokens, verbIndex, recentMessages = []) {
  // look into recentMessages from newest to oldest, find message where speaker is 'user' and contains a concept
  try {
    for (let i = (recentMessages || []).length - 1; i >= 0; i--) {
      const rm = recentMessages[i];
      const text = normalizeArabic(rm.text || "");
      const toks = tokenize(text);
      // find a concept in that message
      for (const [concept, data] of Object.entries(CONCEPTS_MAP)) {
        const words = (data.words || []).map(w => normalizeArabic(w));
        if (toks.some(t => words.includes(t))) {
          return { subjectConcept: concept, evidence: [rm.text] };
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// ---------- Tags & motivational signals ----------
function extractTags(normalizedMessage, conceptScoresMap, emotionProfile) {
  const tags = new Set();

  // motivational tags from knowledge base
  const tokens = tokenize(normalizedMessage);
  for (const [tag, concepts] of Object.entries(MOTIVATIONAL_MAP || {})) {
    for (const c of concepts) {
        if (conceptScoresMap.has(c)) {
            tags.add(tag);
            break;
        }
    }
  }

  // resilience detection (simple heuristics)
  const resilienceWords = ["هحاول", "مش هستسلم", "لن اتوقف", "هكمل"];
  for (const w of resilienceWords) if (tokens.includes(normalizeArabic(w))) tags.add("resilience");

  // emotional intensity tag
  const topEmotion = Object.keys(emotionProfile || {})[0] || "";
  if (topEmotion && ["fear", "anger", "sadness", "anxiety"].includes(topEmotion)) tags.add("distress");
  if (topEmotion === "joy") tags.add("positive");

  // concept-based tags (e.g., 'work' concept exists)
  for (const concept of conceptScoresMap.keys()) {
    if (concept.toLowerCase().includes("work") || concept.toLowerCase().includes("شغل")) tags.add("work_related");
  }

  return Array.from(tags);
}

// ---------- Confidence calculation ----------
function computeConfidence(conceptScoresMap, relations, intensity, emotionProfile) {
  // Components:
  // - concept coverage: more concepts matched -> higher
  // - avg match strength
  // - presence of relations
  // - intensity normalized
  const nConcepts = Math.max(0, conceptScoresMap.size);
  const avgMatch = nConcepts ? (Array.from(conceptScoresMap.values()).reduce((a,b)=>a+b,0)/nConcepts) : 0;
  const relFactor = relations.length ? 0.15 : 0.0;
  const intensityFactor = clamp01(intensity / MAX_INTENSITY);
  const emotionSignal = Object.values(emotionProfile || {}).reduce((a,b)=>a+b,0) / Math.max(1, Object.keys(emotionProfile || {}).length);

  // weighted sum
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

// ---------- Main entry: atomize ----------
/**
 * atomize(rawMessage, options)
 * options:
 *   - fingerprint (optional)
 *   - recentMessages: array of { text, timestamp } (optional)
 *   - contextFetch: boolean (if true, will try to fetch via context_tracker)
 */
export function atomize(rawMessage = "", options = {}) {
  if (!rawMessage || typeof rawMessage !== "string") return null;
  if (DEBUG) console.log(`\n--- [Atomizer.v2] Atomizing: ${rawMessage}`);

  const normalizedMessage = normalizeArabic(rawMessage);
  // gather recent context (prefer options.recentMessages, else try fetch)
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

  // Step 6: dominant emotion (top of profile)
  const dominantEmotion = Object.keys(emotionProfile)[0] || "neutral";

  // Step 7: sentiment & confidence
  const sentiment = determineSentiment(intensity, dominantEmotion);
  const confidence = computeConfidence(weightedConcepts, relations, intensity, emotionProfile);

  // Step 8: atom id
  const atomId = sha1Hex(rawMessage + "|" + (options.fingerprint || "anon") + "|" + Date.now());

  // build concepts array with scores & optional metadata
  const conceptsArray = concepts.map(c => ({
    concept: c,
    score: Number(weightedConcepts.get(c).toFixed(3)),
    meta: CONCEPTS_MAP[c] || {}
  }));

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
    tags,
    sentiment,
    confidence
  };

  if (DEBUG) console.log("[Atomizer.v2] Knowledge Atom:", JSON.stringify(knowledgeAtom, null, 2));
  return knowledgeAtom;
}

// ---------- small demo when run directly (node) ----------
// This check might fail if using ES modules without specific config.
// For library use, this part is not critical.
// if (require.main === module) {
//   const testMessage1 = "انا قلقان جدا من الشغل اليوم!!! مش عارف هاعمل ايه";
//   const atom1 = atomize(testMessage1, { fingerprint: "demo_user", recentMessages: [
//     { text: "امبارح المدير زعل مني", timestamp: Date.now() - 1000*60*60*24 },
//     { text: "الراتب متأخر وانا مضغوط", timestamp: Date.now() - 1000*60*60*2 }
//   ]});
//   console.log("ATOM1:", atom1);

//   const testMessage2 = "بحب يوم الجمعه لما اقدر اطلع واهدى، حاسس مبسوط";
//   const atom2 = atomize(testMessage2, { fingerprint: "demo_user" });
//   console.log("ATOM2:", atom2);
// }
