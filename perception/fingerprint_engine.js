// fingerprint_engine_v2.js - The Perceptual Lobe (Enhanced v2)
// Purpose: Generate a rich psychological fingerprint with weighted blending,
// multi-need inference, trend detection, diagnostic flags, and mini-learning hints.

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { DEBUG } from '../shared/config.js';
import {
  normalizeArabic,
  tokenize as tokenizeArabic,
  levenshtein as levenshteinDistance
} from '../shared/utils.js';
// utils.js should export:
// - normalizeArabic(text): canonical normalization
// - tokenize(text): returns array of tokens (normalized)
// - levenshtein(a,b): optional small function for fuzzy matching

// ===== بداية الإصلاح النهائي =====
// NOTE: These constants must be exported from the specified knowledge_base.js file.
// The comment has been moved outside the import block to prevent parsing errors on Vercel.
import {
  CONCEPTS_MAP,
  INTENSITY_MODIFIERS,
  MOTIVATIONAL_MAP
} from '../knowledge/knowledge_base.js';
// ===== نهاية الإصلاح النهائي =====
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================


/* ---------------------------
   Configurable thresholds
   --------------------------- */
const FUZZY_THRESHOLD = 0.75; // similarity threshold (0..1) for fuzzy match
const MAX_FUZZY_DISTANCE = 3; // fallback for Levenshtein cutoff
const HIGH_INTENSITY_ALERT = 1.2; // above this -> high intensity flag
const LOOP_REPEAT_THRESHOLD = 3; // if same need repeated >= this -> loop flag

/* ---------------------------
   Helpers: string similarity
   If your utils already provides levenshteinDistance, you can use it.
   Otherwise a small local implementation is provided as fallback.
   --------------------------- */
function _levenshtein(a = '', b = '') {
  // simple iterative Levenshtein (works fine for short Arabic tokens)
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const v0 = new Array(lb + 1).fill(0);
  const v1 = new Array(lb + 1).fill(0);
  for (let j = 0; j <= lb; j++) v0[j] = j;
  for (let i = 0; i < la; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < lb; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= lb; j++) v0[j] = v1[j];
  }
  return v1[lb];
}

function similarityScore(a, b) {
  // returns a similarity in 0..1 (1 = identical)
  if (!a || !b) return 0;
  const lev = (typeof levenshteinDistance === 'function')
    ? levenshteinDistance(a, b)
    : _levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const sim = 1 - lev / maxLen;
  return Math.max(0, Math.min(1, sim));
}

/* ---------------------------
   1) Map message tokens to concepts with weights
   returns Map concept -> score (0..1)
   --------------------------- */
function mapMessageToConceptsWeighted(normalizedMessage) {
  const tokens = tokenizeArabic(normalizedMessage); // array of normalized tokens
  const conceptScores = new Map();
  const unknownTokens = new Set(tokens); // Assume all tokens are unknown initially

  // Loop over concepts from KB
  for (const [concept, conceptData] of Object.entries(CONCEPTS_MAP)) {
    // conceptData may be object {words:[], intensity:0.7} or array in older versions
    const words = Array.isArray(conceptData.words)
      ? conceptData.words
      : (Array.isArray(conceptData) ? conceptData : []);

    // ✅ التطبيع الجديد: نطبّع الكلمات من قاعدة المعرفة قبل الاستخدام
    const normalizedWords = words.map(w => normalizeArabic(w));

    for (const token of tokens) {
      // exact match quick path
      if (normalizedWords.includes(token)) {
        const prev = conceptScores.get(concept) || 0;
        conceptScores.set(concept, Math.max(prev, 1.0)); // full match
        unknownTokens.delete(token); // It's a known token now
        continue;
      }
      
      // fuzzy match check
      let bestSim = 0;
      for (const w of normalizedWords) {
        const sim = similarityScore(token, w);
        if (sim > bestSim) bestSim = sim;
      }

      if (bestSim >= FUZZY_THRESHOLD) {
        const prev = conceptScores.get(concept) || 0;
        // weight by similarity (e.g., 0.8 similarity => 0.8 score)
        conceptScores.set(concept, Math.max(prev, parseFloat(bestSim.toFixed(2))));
        unknownTokens.delete(token); // It's a known token now
      }
    }
  }

  return {
    conceptScores, // Map
    unknownTokens: Array.from(unknownTokens)
  };
}

/* ---------------------------
   2) Calculate emotional intensity (weighted blending)
   - Uses CONCEPTS_MAP[concept].intensity as base weight
   - Blends concept score * base intensity
   - Applies modifiers (INTENSITY_MODIFIERS), punctuation, repeats, numeric emphasis, temporal cues
   --------------------------- */
function calculateEmotionalIntensityWeighted(conceptScoresMap, normalizedMessage) {
  const entries = Array.from(conceptScoresMap.entries()); // [ [concept, score], ... ]
  if (entries.length === 0) return 0.0;

  // Weighted sum: sum(score * baseIntensity) / sum(score)
  let numerator = 0;
  let denom = 0;
  for (const [concept, matchScore] of entries) {
    const baseIntensity = (CONCEPTS_MAP[concept] && CONCEPTS_MAP[concept].intensity) || 0.5;
    const weight = matchScore; // importance of concept based on match similarity
    numerator += weight * baseIntensity;
    denom += weight;
  }
  let intensity = denom > 0 ? numerator / denom : 0.0; // base intensity between 0..1 (approx)

  // Tokens for modifier detection
  const tokens = tokenizeArabic(normalizedMessage);

  // Apply intensity modifiers multiplicatively for emphasis words
  for (const token of tokens) {
    const mod = INTENSITY_MODIFIERS[token];
    if (typeof mod === 'number') {
      intensity *= mod;
    }
  }

  // Repeated characters increase intensity (e.g., "ااااه")
  if (/(.)\1{2,}/.test(normalizedMessage)) {
    intensity *= 1.2;
  }

  // Excess punctuation (e.g., "!!!" "؟؟؟")
  if (/[!؟]{2,}/.test(normalizedMessage)) {
    intensity *= 1.15;
  }

  // Numeric emphasis (e.g., "100%" or "محتاجه 100%")
  if (/\d+%?/.test(normalizedMessage)) {
    intensity *= 1.1;
  }

  // Temporal emphasis: words like "من يومين", "من زمان", "من شهور"
  // A simple heuristic: presence of يم/يوم/اسبوع/شهر/سنة increases intensity slightly
  if (/\b(يوم|أمس|منذ|من يوم|يومين|أسبوع|شهر|سنة)\b/.test(normalizedMessage)) {
    intensity *= 1.05;
  }

  // Clamp intensity to a sane upper bound (we allow >1.0 but cap)
  const CLAMP_MAX = 2.5;
  if (intensity > CLAMP_MAX) intensity = CLAMP_MAX;

  return parseFloat(intensity.toFixed(2));
}

/* ---------------------------
   3) Infer ranked needs (return array sorted by score)
   - uses MOTIVATIONAL_MAP: need -> [concepts]
   - we weight need score by sum(conceptScore * conceptBaseIntensity)
   --------------------------- */
function inferRankedNeeds(conceptScoresMap) {
  const needScores = {};

  for (const [need, relatedConcepts] of Object.entries(MOTIVATIONAL_MAP)) {
    let score = 0;
    let weightSum = 0;
    for (const concept of relatedConcepts) {
      const matchScore = conceptScoresMap.get(concept) || 0;
      const baseIntensity = (CONCEPTS_MAP[concept] && CONCEPTS_MAP[concept].intensity) || 0.5;
      const contribution = matchScore * baseIntensity;
      score += contribution;
      weightSum += matchScore;
    }
    // Normalize by weightSum if present to avoid bias toward needs with many concepts
    const normalized = weightSum > 0 ? score / weightSum : 0;
    needScores[need] = parseFloat(normalized.toFixed(3));
  }

  // Convert to sorted array of {need, score}
  const ranked = Object.entries(needScores)
    .map(([need, score]) => ({ need, score }))
    .filter(n => n.score > 0) // keep positive scoring needs
    .sort((a, b) => b.score - a.score);

  return ranked;
}

/* ---------------------------
   4) Detect secondary emotions (multi-emotion array)
   - returns array of {concept, score, baseIntensity}
   --------------------------- */
function detectSecondaryEmotions(conceptScoresMap) {
  const arr = [];
  for (const [concept, score] of conceptScoresMap.entries()) {
    const baseIntensity = (CONCEPTS_MAP[concept] && CONCEPTS_MAP[concept].intensity) || 0.5;
    arr.push({
      concept,
      matchScore: score,
      baseIntensity,
      weighted: parseFloat((score * baseIntensity).toFixed(3))
    });
  }
  // sort by weighted importance
  arr.sort((a, b) => b.weighted - a.weighted);
  return arr;
}

/* ---------------------------
   5) Trend detection & diagnostic flags
   - uses contextState: { history: [{timestamp, primaryNeed, intensity, concepts }], last_needs: [...], last_emotions: [...] }
   - returns: {trend: 'increasing'|'decreasing'|'stable', flags: {...}}
   --------------------------- */
function analyzeTrendAndDiagnostics(fingerprintCandidate, contextState = {}) {
  const diagnostics = {
    flags: [],
    trend: 'stable',
    loopDetected: false,
    miniLearningHints: []
  };

  const { intensity, primaryNeed } = fingerprintCandidate;
  const history = contextState.history || [];

  // Trend analysis: compare current intensity to average of last N intensities
  const N = 5;
  const recent = history.slice(-N);
  const recentIntensities = recent.map(h => h.intensity || 0);
  const recentAvg = recentIntensities.length > 0
    ? recentIntensities.reduce((s, x) => s + x, 0) / recentIntensities.length
    : 0;

  if (recentAvg > 0) {
    const delta = intensity - recentAvg;
    const pct = Math.abs(delta) / recentAvg;
    if (delta > 0.08) diagnostics.trend = 'increasing';
    else if (delta < -0.08) diagnostics.trend = 'decreasing';
    else diagnostics.trend = 'stable';
  } else {
    diagnostics.trend = 'stable';
  }

  // High intensity flag
  if (intensity >= HIGH_INTENSITY_ALERT) {
    diagnostics.flags.push('high_intensity');
  }

  // Loop detection: check if same primaryNeed repeated many times in recent history
  const needHistory = recent.map(h => h.primaryNeed).filter(Boolean);
  const sameCount = needHistory.filter(n => n === primaryNeed).length;
  if (sameCount >= LOOP_REPEAT_THRESHOLD) {
    diagnostics.flags.push('repetition_loop');
    diagnostics.loopDetected = true;
  }

  // Mini-learning hint: unknown tokens present, suggest adding to lexicon
  if (fingerprintCandidate.unknownTokens && fingerprintCandidate.unknownTokens.length > 0) {
    diagnostics.miniLearningHints = fingerprintCandidate.unknownTokens.slice(0, 10); // up to 10
    // Only suggest if unknownTokens appear significant (not tiny stopwords)
    if (diagnostics.miniLearningHints.length > 0) {
      diagnostics.flags.push('unknown_tokens_detected');
    }
  }

  return diagnostics;
}

/* ---------------------------
   6) Main generator: assemble full fingerprint
   returns object with:
   - timestamp, originalMessage, normalizedMessage
   - concepts: map -> array of {concept, matchScore, baseIntensity, weighted}
   - emotions: primary + secondary array
   - rankedNeeds: [{need, score}, ...]
   - chosenPrimaryNeed: top need or 'general_support'
   - intensity (number)
   - diagnostics: flags/trend/miniLearningHints
   - context: contextState (echo)
   --------------------------- */
export function generateFingerprintV2(rawMessage, contextState = {}) {
  const norm = normalizeArabic(rawMessage || '');
  if (DEBUG) console.log('Normalized message:', norm);

  // Step 1: Map tokens -> concepts (with fuzzy)
  const { conceptScores, unknownTokens } = mapMessageToConceptsWeighted(norm);

  // Step 2: Calculate intensity (weighted blending)
  const intensity = calculateEmotionalIntensityWeighted(conceptScores, norm);

  // Step 3: Ranked needs
  const rankedNeeds = inferRankedNeeds(conceptScores); // array [{need, score}, ...]

  // Desired primary need is the top ranked need (if present)
  const chosenPrimaryNeed = (rankedNeeds.length > 0) ? rankedNeeds[0].need : 'general_support';

  // Step 4: Secondary emotions detailed
  const secondaryEmotions = detectSecondaryEmotions(conceptScores); // sorted array

  // Primary emotion concept: top-weighted concept if any, else 'neutral'
  const primaryConcept = (secondaryEmotions.length > 0) ? secondaryEmotions[0].concept : 'neutral';
  const primaryEmotionWeighted = (secondaryEmotions.length > 0) ? secondaryEmotions[0].weighted : 0.0;

  // Step 5: Trend and diagnostics
  const fingerprintCandidate = {
    intensity,
    primaryNeed: chosenPrimaryNeed,
    unknownTokens
  };
  const diagnostics = analyzeTrendAndDiagnostics(fingerprintCandidate, contextState);

  // Build final structured concepts array (for external use)
  const conceptsArray = [];
  for (const [concept, matchScore] of conceptScores.entries()) {
    const baseIntensity = (CONCEPTS_MAP[concept] && CONCEPTS_MAP[concept].intensity) || 0.5;
    conceptsArray.push({
      concept,
      matchScore: parseFloat(matchScore.toFixed(3)),
      baseIntensity,
      weighted: parseFloat((matchScore * baseIntensity).toFixed(3))
    });
  }
  // sort by weighted descending
  conceptsArray.sort((a, b) => b.weighted - a.weighted);

  // prepare emotions array (primary + top 3 secondary)
  const emotions = conceptsArray.slice(0, 5).map(c => ({
    type: c.concept,
    intensity: c.weighted // relative importance (not clamped to 1)
  }));

  const fingerprint = {
    timestamp: new Date().toISOString(),
    originalMessage: rawMessage,
    normalizedMessage: norm,
    concepts: conceptsArray,
    emotions,
    primaryEmotion: {
      type: primaryConcept,
      intensity: parseFloat(primaryEmotionWeighted.toFixed(3))
    },
    intensity: intensity, // global intensity scalar
    rankedNeeds, // array of {need, score}
    chosenPrimaryNeed,
    diagnostics,
    context: contextState // echo short-term memory
  };

  if (DEBUG) console.log('🧠 Generated Fingerprint v2:', fingerprint);
  return fingerprint;
}

/* ---------------------------
   Optional: helper to update short-term context with new fingerprint
   This is useful for ContextTracker integration (not mandatory here).
   Example usage:
     contextState.history.push({
       timestamp: fp.timestamp,
       primaryNeed: fp.chosenPrimaryNeed,
       intensity: fp.intensity,
       concepts: fp.concepts.map(c=>c.concept)
     });
---------------------------- */
export function updateContextWithFingerprint(contextState = {}, fingerprint) {
  if (!contextState.history) contextState.history = [];
  contextState.history.push({
    timestamp: fingerprint.timestamp,
    primaryNeed: fingerprint.chosenPrimaryNeed,
    intensity: fingerprint.intensity,
    concepts: fingerprint.concepts.map(c => c.concept)
  });
  // keep history size bounded
  const MAX_HISTORY = 50;
  if (contextState.history.length > MAX_HISTORY) {
    contextState.history = contextState.history.slice(-MAX_HISTORY);
  }
  // track last_needs, last_emotions for convenience
  contextState.last_needs = contextState.history.map(h => h.primaryNeed).slice(-10);
  contextState.last_intensities = contextState.history.map(h => h.intensity).slice(-10);
  return contextState;
}

/* ---------------------------
   Mini-learning hook (developer can call to persist unknown tokens)
   - returns tokens that are good candidates to add to CONCEPTS_MAP
---------------------------- */
export function extractMiniLearningCandidates(fingerprint, options = {}) {
  const tokens = fingerprint.diagnostics.miniLearningHints || [];
  // filter out very short tokens or punctuation
  const candidates = tokens.filter(t => t && t.length >= 2 && !/^[.,!?؟]+$/.test(t));
  // developer can manually review these and map them later
  return candidates;
}

/* ---------------------------
   Export summary helper for quick debugging
---------------------------- */
export function summarizeFingerprint(fp) {
  return {
    ts: fp.timestamp,
    msg: fp.originalMessage,
    norm: fp.normalizedMessage,
    primaryEmotion: fp.primaryEmotion,
    intensity: fp.intensity,
    primaryNeed: fp.chosenPrimaryNeed,
    topConcepts: fp.concepts.slice(0, 5).map(c => `${c.concept}(${c.weighted})`),
    flags: fp.diagnostics.flags,
    trend: fp.diagnostics.trend
  };
}```
