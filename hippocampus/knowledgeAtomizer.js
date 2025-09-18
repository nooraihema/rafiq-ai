// hippocampus/KnowledgeAtomizer.js v3.0 - The True Unified Mind (No-Abbreviation)
// "النسخة النهائية الكاملة" - تدمج القوة التحليلية لـ v3.0 
// مع الحفاظ على الهيكل الكامل والتفصيلي للكود الأصلي الذي صممته أنت، دون أي اختصار.

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

// ---------- Helpers (kept full and unchanged as you wrote them) ----------
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

function fetchRecentContext(fingerprint) {
  try {
    const contextModule = require("../shared/context_tracker.js");
    if (contextModule && typeof contextModule.getRecentMessages === "function") {
      return contextModule.getRecentMessages({ fingerprint, count: CONTEXT_WINDOW }) || [];
    }
  } catch (e) {
    // ignore absence
  }
  return [];
}

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

  const REL_VERBS = { "يسبب": "causes", "يؤدي": "causes", "مرتبط": "related_to", "متعلق": "related_to", "افكر": "thinks_about", "اخاف": "fears", "خاف": "fears", "اكره": "hates", "احب": "loves", "ماقدرش": "cannot", "لا": "negation" };

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

  const pronounIndices = tokens.reduce((acc, tok, idx) => { if (["انا", "أنا", "اناا"].includes(tok)) acc.push(idx); return acc; }, []);
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
  } catch (e) {}
  return null;
}

// ---------- Tags & motivational signals ----------
function extractTags(normalizedMessage, conceptScoresMap, emotionProfile) {
  const tags = new Set();
  const tokens = tokenize(normalizedMessage);
  for (const [tag, concepts] of Object.entries(MOTIVATIONAL_MAP || {})) {
    if (concepts.some(c => conceptScoresMap.has(c))) tags.add(tag);
  }
  const resilienceWords = ["هحاول", "مش هستسلم", "لن اتوقف", "هكمل"];
  if (resilienceWords.some(w => tokens.includes(normalizeArabic(w)))) tags.add("resilience");
  const topEmotion = Object.keys(emotionProfile || {})[0] || "";
  if (["fear", "anger", "sadness", "anxiety"].includes(topEmotion)) tags.add("distress");
  if (topEmotion === "joy") tags.add("positive");
  if (conceptScoresMap.has("work_domain")) tags.add("work_related");
  return Array.from(tags);
}

// ---------- Confidence calculation ----------
function computeConfidence(conceptScoresMap, relations, intensity, emotionProfile) {
  const nConcepts = conceptScoresMap.size;
  const avgMatch = nConcepts ? (Array.from(conceptScoresMap.values()).reduce((a,b)=>a+b,0)/nConcepts) : 0;
  const raw = 0.45*clamp01(avgMatch) + 0.2*clamp01(nConcepts/5) + 0.15*(relations.length ? 0.15 : 0) + 0.1*clamp01(intensity/MAX_INTENSITY) + 0.1*clamp01(avg(Object.values(emotionProfile)));
  return Number(clamp01(raw).toFixed(3));
}

// ---------- Sentiment determination ----------
function determineSentiment(intensity, dominantEmotion) {
  if (dominantEmotion === "joy" && intensity > 0.2) return "positive";
  if (["fear","sadness","anger", "anxiety"].includes(dominantEmotion) && intensity > 0.35) return "negative";
  return "neutral";
}

// ---------- Subtext detection ----------
function detectSubtext(normalizedMessage, emotionProfile, recentMessages = []) {
  const subtextIntents = new Set();
  for (const key in SUBTEXT_PATTERNS) {
    if (SUBTEXT_PATTERNS[key].some(p => p.test(normalizedMessage))) {
        if (key === 'emotional_masking') {
            const recentNegativity = recentMessages.slice(-2).reduce((acc, msg) => {
                try {
                    // Prevent infinite recursion by passing an option to disable subtext detection in this inner call
                    const atom = atomize(msg.text || "", { disableSubtext: true, recentMessages: [] });
                    return acc + (atom?.sentiment === 'negative' ? atom.intensity : 0);
                } catch (e) { return acc; }
            }, 0);
            if (recentNegativity > 1.0) subtextIntents.add('emotional_masking');
        } else {
            subtextIntents.add(key);
        }
    }
  }
  if (DEBUG && subtextIntents.size > 0) console.log("[Atomizer.v3] Subtext Intents:", Array.from(subtextIntents));
  return Array.from(subtextIntents);
}

// =================================================================
// START: ADDED v3.0 - Meta-Cognitive Layer
// =================================================================

function memoryFusion(conceptsArray, tags, options = {}) {
    const memoryMatches = [];
    const memoryProfile = options.memoryProfile || null; 
    if (!memoryProfile) return memoryMatches;

    const chronicTopics = memoryProfile.chronicTopics || [];
    for (const concept of conceptsArray) {
        if (chronicTopics.includes(concept.concept)) {
            memoryMatches.push({ type: "chronic_topic_match", detail: concept.concept, score: 0.9 });
        }
    }
    
    const behavioralFlags = memoryProfile.behavioralFlags || [];
    if (behavioralFlags.includes("tendency_to_self_blame") && tags.includes("self_blame")) {
        memoryMatches.push({ type: "behavioral_pattern_match", detail: "self_blame", score: 0.8 });
    }

    if (DEBUG && memoryMatches.length) console.log("[Atomizer.v3] Memory Fusion Matches:", memoryMatches);
    return memoryMatches;
}

function detectMetaEmotions(emotionProfile) {
    const meta = { ambivalence: false, mixed_negative: false, details: [] };
    const sorted = Object.entries(emotionProfile || {}).sort((a,b)=>b[1]-a[1]);
    if (sorted.length < 2) return meta;
    
    const [top, second] = sorted;
    const negEmotions = new Set(["fear", "sadness", "anger", "anxiety"]);

    if (top[1] > 0.4 && second[1] > 0.3 && negEmotions.has(top[0]) !== negEmotions.has(second[0])) {
        meta.ambivalence = true;
        meta.details.push({ type: "ambivalence", emotions: [top[0], second[0]], scores: [top[1], second[1]] });
    }
    
    if (sorted.filter(([emo, score]) => negEmotions.has(emo) && score > 0.2).length >= 2) {
        meta.mixed_negative = true;
    }

    return meta;
}

function detectCognitiveDissonance(sentiment, subtextIntents, metaEmotions) {
    const flags = new Set();
    if (sentiment !== 'negative' && subtextIntents.some(s => s !== 'seeking_validation')) {
        flags.add("dissonance_stated_vs_subtext");
    }
    if (metaEmotions.ambivalence) {
        flags.add("dissonance_ambivalent_emotions");
    }
    
    if (DEBUG && flags.size > 0) console.log("[Atomizer.v3] Dissonance Flags:", Array.from(flags));
    return Array.from(flags);
}
// =================================================================
// END: ADDED v3.0 - Meta-Cognitive Layer
// =================================================================


// ---------- Main entry: atomize (v3.0 - The True Unified Mind) ----------
export function atomize(rawMessage = "", options = {}) {
  if (!rawMessage || typeof rawMessage !== "string") return null;
  if (DEBUG) console.log(`\n--- [Atomizer.v3] Atomizing: ${rawMessage} ---`);

  // --- Setup & Context (from your code) ---
  const normalizedMessage = normalizeArabic(rawMessage);
  const recentFromOptions = Array.isArray(options.recentMessages) ? options.recentMessages : [];
  const fetched = (options.contextFetch && options.fingerprint) ? fetchRecentContext(options.fingerprint) : [];
  const recentMessages = (recentFromOptions.length ? recentFromOptions : (fetched || [])).slice(-CONTEXT_WINDOW);
  const contextSnapshot = buildContextSnapshot(recentMessages);

  // --- Core Analysis Pipeline (from your code) ---
  const weightedConcepts = extractWeightedConcepts(normalizedMessage);
  const concepts = Array.from(weightedConcepts.keys());
  const emotionProfile = buildEmotionProfile(weightedConcepts);
  const intensity = calculateIntensity(weightedConcepts, normalizedMessage, emotionProfile);
  const relations = extractRelations(normalizedMessage, concepts, recentMessages);
  const tags = extractTags(normalizedMessage, weightedConcepts, emotionProfile);
  
  // Subtext detection is now conditional to prevent infinite loops
  const subtextIntents = options.disableSubtext ? [] : detectSubtext(normalizedMessage, emotionProfile, recentMessages);

  const dominantEmotion = Object.keys(emotionProfile)[0] || "neutral";
  const sentiment = determineSentiment(intensity, dominantEmotion);
  const confidence = computeConfidence(weightedConcepts, relations, intensity, emotionProfile);

  // --- Meta-Cognitive Analysis Pipeline (ADDED) ---
  const memoryMatches = memoryFusion(concepts.map(c => ({concept: c})), tags, options);
  const metaEmotions = detectMetaEmotions(emotionProfile);
  const dissonanceFlags = detectCognitiveDissonance(sentiment, subtextIntents, metaEmotions);

  // --- Final Assembly (from your code, augmented) ---
  const atomId = sha1Hex(rawMessage + "|" + (options.fingerprint || "anon") + "|" + Date.now());
  const conceptsArray = concepts.map(c => ({
    concept: c,
    score: weightedConcepts.get(c),
    meta: CONCEPTS_MAP[c] || {}
  }));
  
  const augmentedTags = new Set(tags);
  memoryMatches.forEach(m => augmentedTags.add(m.type));
  dissonanceFlags.forEach(f => augmentedTags.add(f));

  const knowledgeAtom = {
    atomId,
    version: "3.0-Final",
    sourceText: rawMessage,
    fingerprint: options.fingerprint || null,
    timestamp: new Date().toISOString(),
    contextSnapshot,
    concepts: conceptsArray,
    emotionProfile,
    dominantEmotion,
    intensity,
    relations,
    tags: Array.from(augmentedTags),
    subtextIntents,
    sentiment,
    confidence,
    memoryMatches,
    metaEmotions,
    dissonanceFlags
  };

  if (DEBUG) console.log("[Atomizer.v3] Final Knowledge Atom:", JSON.stringify(knowledgeAtom, null, 2));
  return knowledgeAtom;
}

// small demo when run directly (from your code)
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
