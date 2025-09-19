// fingerprint_engine_v9.js - The Perceptual Lobe (State-Aware v9)
// Purpose: Generate a rich psychological fingerprint.
// Adds: Inference for communication style, core need, and urgency to support the v9 engine.

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { DEBUG } from '../shared/config.js';
import {
  normalizeArabic,
  tokenize as tokenizeArabic,
  levenshtein as levenshteinDistance
} from '../shared/utils.js';
import {
  CONCEPTS_MAP,
  INTENSITY_MODIFIERS,
  MOTIVATIONAL_MAP
} from '../knowledge/knowledge_base.js';
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================


/* ---------------------------
   Configurable thresholds
   --------------------------- */
const FUZZY_THRESHOLD = 0.75;
const MAX_FUZZY_DISTANCE = 3;
const HIGH_INTENSITY_ALERT = 1.2;
const LOOP_REPEAT_THRESHOLD = 3;

/* ---------------------------
   Helpers: string similarity
   --------------------------- */
function _levenshtein(a = '', b = '') {
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
   --------------------------- */
function mapMessageToConceptsWeighted(normalizedMessage) {
  const tokens = tokenizeArabic(normalizedMessage);
  const conceptScores = new Map();
  const unknownTokens = new Set(tokens);
  for (const [concept, conceptData] of Object.entries(CONCEPTS_MAP)) {
    const words = Array.isArray(conceptData.words)
      ? conceptData.words
      : (Array.isArray(conceptData) ? conceptData : []);
    const normalizedWords = words.map(w => normalizeArabic(w));
    for (const token of tokens) {
      if (normalizedWords.includes(token)) {
        const prev = conceptScores.get(concept) || 0;
        conceptScores.set(concept, Math.max(prev, 1.0));
        unknownTokens.delete(token);
        continue;
      }
      let bestSim = 0;
      for (const w of normalizedWords) {
        const sim = similarityScore(token, w);
        if (sim > bestSim) bestSim = sim;
      }
      if (bestSim >= FUZZY_THRESHOLD) {
        const prev = conceptScores.get(concept) || 0;
        conceptScores.set(concept, Math.max(prev, parseFloat(bestSim.toFixed(2))));
        unknownTokens.delete(token);
      }
    }
  }
  return {
    conceptScores,
    unknownTokens: Array.from(unknownTokens)
  };
}

/* ---------------------------
   2) Calculate emotional intensity (weighted blending)
   --------------------------- */
function calculateEmotionalIntensityWeighted(conceptScoresMap, normalizedMessage) {
  const entries = Array.from(conceptScoresMap.entries());
  if (entries.length === 0) return 0.0;
  let numerator = 0;
  let denom = 0;
  for (const [concept, matchScore] of entries) {
    const baseIntensity = (CONCEPTS_MAP[concept] && CONCEPTS_MAP[concept].intensity) || 0.5;
    const weight = matchScore;
    numerator += weight * baseIntensity;
    denom += weight;
  }
  let intensity = denom > 0 ? numerator / denom : 0.0;
  const tokens = tokenizeArabic(normalizedMessage);
  for (const token of tokens) {
    const mod = INTENSITY_MODIFIERS[token];
    if (typeof mod === 'number') {
      intensity *= mod;
    }
  }
  if (/(.)\1{2,}/.test(normalizedMessage)) {
    intensity *= 1.2;
  }
  if (/[!؟]{2,}/.test(normalizedMessage)) {
    intensity *= 1.15;
  }
  if (/\d+%?/.test(normalizedMessage)) {
    intensity *= 1.1;
  }
  if (/\b(يوم|أمس|منذ|من يوم|يومين|أسبوع|شهر|سنة)\b/.test(normalizedMessage)) {
    intensity *= 1.05;
  }
  const CLAMP_MAX = 2.5;
  if (intensity > CLAMP_MAX) intensity = CLAMP_MAX;
  return parseFloat(intensity.toFixed(2));
}

/* ---------------------------
   3) Infer ranked needs (return array sorted by score)
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
    const normalized = weightSum > 0 ? score / weightSum : 0;
    needScores[need] = parseFloat(normalized.toFixed(3));
  }
  const ranked = Object.entries(needScores)
    .map(([need, score]) => ({ need, score }))
    .filter(n => n.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked;
}

/* ---------------------------
   4) Detect secondary emotions (multi-emotion array)
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
  arr.sort((a, b) => b.weighted - a.weighted);
  return arr;
}

// =================================================================
// START: [V9 UPGRADE] NEW PERCEPTUAL ANALYSIS FUNCTIONS
// =================================================================

/**
 * [V9 UPGRADE] Infers the user's communication style.
 * This is crucial for the "Listen First" philosophy.
 * @returns {string} e.g., 'venting', 'questioning', 'requesting'
 */
function inferCommunicationStyle(rawMessage, rankedNeeds) {
    const msg = rawMessage.toLowerCase();
    
    // Check for direct requests first
    if (/\b(عايز|أداة|تمرين|حل|طريقة|ساعدني|مساعدة)\b/.test(msg)) {
        return 'requesting_tool';
    }
    
    // Check for questions
    if (/[؟?]\s*$|\b(كيف|هل|ماذا|ليه|إيه)\b/.test(msg)) {
        return 'questioning';
    }

    // Check if the dominant need is about understanding
    const topNeed = rankedNeeds.length > 0 ? rankedNeeds[0].need : null;
    if (topNeed === 'understanding' || topNeed === 'clarity') {
        return 'seeking_clarity';
    }

    // Default to venting if none of the above match
    return 'venting';
}

/**
 * [V9 UPGRADE] Determines the primary inferred need for the v9 engine.
 * This combines ranked needs with communication style.
 * @returns {string} e.g., 'validation', 'guidance', 'clarification'
 */
function determinePrimaryInferredNeed(communicationStyle, rankedNeeds) {
    const topMotivationalNeed = rankedNeeds.length > 0 ? rankedNeeds[0].need : 'general_support';

    switch (communicationStyle) {
        case 'venting':
            return 'validation'; // If the user is just expressing emotion, the primary need is to be heard.
        case 'requesting_tool':
            return 'guidance';   // A direct request for help needs guidance.
        case 'questioning':
            return 'clarification'; // A question needs an answer.
        case 'seeking_clarity':
            return 'clarification';
        default:
            return topMotivationalNeed; // Fallback to the motivationally-derived need.
    }
}

/**
 * [V9 UPGRADE] Calculates a simple urgency score based on keywords.
 * @returns {number} A score typically between 0 and 1.
 */
function calculateUrgencyScore(rawMessage, intensity) {
    let score = 0;
    const msg = rawMessage;

    // Keywords that indicate urgency
    const urgencyWords = {
        'فورا': 0.4, 'حالاً': 0.4, 'ضروري': 0.3, 'جدا': 0.1,
        'مش قادر': 0.5, 'مش مستحمل': 0.5, 'بموت': 0.6
    };
    
    for (const [word, value] of Object.entries(urgencyWords)) {
        if (msg.includes(word)) {
            score += value;
        }
    }
    
    // High intensity is a strong indicator of urgency
    score += (intensity > 1.0) ? (intensity - 1.0) * 0.5 : 0;
    
    return Math.min(1.0, parseFloat(score.toFixed(2))); // Clamp at 1.0
}

// =================================================================
// END: [V9 UPGRADE] NEW PERCEPTUAL ANALYSIS FUNCTIONS
// =================================================================

/* ---------------------------
   5) Trend detection & diagnostic flags (Original Function)
   --------------------------- */
function analyzeTrendAndDiagnostics(fingerprintCandidate, contextState = {}) {
  const diagnostics = {
    flags: [],
    trend: 'stable',
    loopDetected: false,
    miniLearningHints: []
  };
  const { intensity, primaryNeed } = fingerprintCandidate; // [V9 UPGRADE] Note: primaryNeed is now the motivational one.
  const history = contextState.history || [];
  const N = 5;
  const recent = history.slice(-N);
  const recentIntensities = recent.map(h => h.intensity || 0);
  const recentAvg = recentIntensities.length > 0
    ? recentIntensities.reduce((s, x) => s + x, 0) / recentIntensities.length
    : 0;
  if (recentAvg > 0) {
    const delta = intensity - recentAvg;
    if (delta > 0.08) diagnostics.trend = 'increasing';
    else if (delta < -0.08) diagnostics.trend = 'decreasing';
    else diagnostics.trend = 'stable';
  } else {
    diagnostics.trend = 'stable';
  }
  if (intensity >= HIGH_INTENSITY_ALERT) {
    diagnostics.flags.push('high_intensity');
  }
  const needHistory = recent.map(h => h.primaryNeed).filter(Boolean);
  const sameCount = needHistory.filter(n => n === primaryNeed).length;
  if (sameCount >= LOOP_REPEAT_THRESHOLD) {
    diagnostics.flags.push('repetition_loop');
    diagnostics.loopDetected = true;
  }
  if (fingerprintCandidate.unknownTokens && fingerprintCandidate.unknownTokens.length > 0) {
    diagnostics.miniLearningHints = fingerprintCandidate.unknownTokens.slice(0, 10);
    if (diagnostics.miniLearningHints.length > 0) {
      diagnostics.flags.push('unknown_tokens_detected');
    }
  }
  return diagnostics;
}

/* ---------------------------
   6) Main generator: assemble full fingerprint (Upgraded for v9)
   --------------------------- */
export function generateFingerprintV2(rawMessage, contextState = {}) {
  const norm = normalizeArabic(rawMessage || '');
  if (DEBUG) console.log('Normalized message:', norm);

  const { conceptScores, unknownTokens } = mapMessageToConceptsWeighted(norm);
  const intensity = calculateEmotionalIntensityWeighted(conceptScores, norm);
  const rankedNeeds = inferRankedNeeds(conceptScores);
  const secondaryEmotions = detectSecondaryEmotions(conceptScores);
  const primaryConcept = (secondaryEmotions.length > 0) ? secondaryEmotions[0].concept : 'neutral';
  const primaryEmotionWeighted = (secondaryEmotions.length > 0) ? secondaryEmotions[0].weighted : 0.0;
  
  // [V9 UPGRADE] Calling the new analysis functions
  const communicationStyle = inferCommunicationStyle(rawMessage, rankedNeeds);
  const inferredNeed = determinePrimaryInferredNeed(communicationStyle, rankedNeeds);
  const urgencyScore = calculateUrgencyScore(rawMessage, intensity);

  const topMotivationalNeed = (rankedNeeds.length > 0) ? rankedNeeds[0].need : 'general_support';
  const fingerprintCandidate = {
    intensity,
    primaryNeed: topMotivationalNeed, // Use motivational need for trend analysis
    unknownTokens
  };
  const diagnostics = analyzeTrendAndDiagnostics(fingerprintCandidate, contextState);

  const conceptsArray = [];
  for (const [concept, matchScore] of conceptScores.entries()) {
    const baseIntensity = (CONCEPTS_MAP[concept] && CONCEPTS_MAP[concept].intensity) || 0.5;
    conceptsArray.push({
      concept, matchScore: parseFloat(matchScore.toFixed(3)),
      baseIntensity, weighted: parseFloat((matchScore * baseIntensity).toFixed(3))
    });
  }
  conceptsArray.sort((a, b) => b.weighted - a.weighted);

  const emotions = conceptsArray.slice(0, 5).map(c => ({
    type: c.concept,
    intensity: c.weighted
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
    intensity: intensity,
    
    // [V9 UPGRADE] The old 'chosenPrimaryNeed' is now split into more descriptive fields.
    rankedMotivationalNeeds: rankedNeeds, 
    chosenPrimaryNeed: topMotivationalNeed, // Kept for backward compatibility / trend analysis
    
    // [V9 UPGRADE] New core fields for the v9 dialogue engine
    inferredNeed: inferredNeed, // The most important field for the engine now
    communicationStyle: communicationStyle,
    urgencyScore: urgencyScore,
    
    diagnostics,
    context: contextState
  };

  if (DEBUG) console.log('🧠 Generated Fingerprint v9:', fingerprint);
  return fingerprint;
}

/* ---------------------------
   Optional: helper to update short-term context with new fingerprint
   --------------------------- */
export function updateContextWithFingerprint(contextState = {}, fingerprint) {
  if (!contextState.history) contextState.history = [];
  contextState.history.push({
    timestamp: fingerprint.timestamp,
    primaryNeed: fingerprint.chosenPrimaryNeed,
    intensity: fingerprint.intensity,
    concepts: fingerprint.concepts.map(c => c.concept)
  });
  const MAX_HISTORY = 50;
  if (contextState.history.length > MAX_HISTORY) {
    contextState.history = contextState.history.slice(-MAX_HISTORY);
  }
  contextState.last_needs = contextState.history.map(h => h.primaryNeed).slice(-10);
  contextState.last_intensities = contextState.history.map(h => h.intensity).slice(-10);
  return contextState;
}

/* ---------------------------
   Mini-learning hook
   --------------------------- */
export function extractMiniLearningCandidates(fingerprint, options = {}) {
  const tokens = fingerprint.diagnostics.miniLearningHints || [];
  const candidates = tokens.filter(t => t && t.length >= 2 && !/^[.,!?؟]+$/.test(t));
  return candidates;
}

/* ---------------------------
   Export summary helper for quick debugging
   --------------------------- */
export function summarizeFingerprint(fp) {
  return {
    ts: fp.timestamp,
    msg: fp.originalMessage,
    norm: fp.normalizedMessage,
    // [V9 UPGRADE] Updated summary to show the new important fields
    inferredNeed: fp.inferredNeed,
    style: fp.communicationStyle,
    urgency: fp.urgencyScore,
    primaryEmotion: fp.primaryEmotion,
    intensity: fp.intensity,
    primaryMotivationalNeed: fp.chosenPrimaryNeed,
    topConcepts: fp.concepts.slice(0, 3).map(c => `${c.concept}(${c.weighted})`),
    flags: fp.diagnostics.flags,
    trend: fp.diagnostics.trend
  };
}
