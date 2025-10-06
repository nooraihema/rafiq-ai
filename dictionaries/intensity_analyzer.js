
/**
 * dictionaries/intensity_analyzer.js
 *
 * Intensity Analyzer — Superhuman Emotional Intensity Engine (v5.0)
 * Author: Ibrahim Shahat & Noor AI Core (assistant)
 *
 * Purpose:
 *  - Analyze intensity modifiers in Arabic text with deep contextual awareness.
 *  - Handle layered modifiers, repetition boosting, sarcasm detection,
 *    compound emotions, and provide explainable outputs for downstream systems.
 *
 * Usage:
 *  import IntensityAnalyzerV5 from './dictionaries/intensity_analyzer_v5.js';
 *  const analyzer = new IntensityAnalyzerV5();
 *  const out = analyzer.analyze("أنا مش حزين جدًا، لكن متضايق شوية ومحبط فعلاً");
 *  console.log(out);
 *
 * Notes:
 *  - This is a language-level engine, not a sentiment classifier. Feed it initial
 *    base emotion scores (from Emotional Anchors) if available for best results.
 *  - It exposes hooks to provide affixStripper or initialAnchors.
 */

/* ============================
   Utilities
   ============================ */

function now() { return Date.now(); }
function clamp(v, a=0, b=1) { return Math.max(a, Math.min(b, v)); }
function sum(obj) { return Object.values(obj).reduce((s,v)=>s+v,0); }
function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

// simple Arabic diacritics removal + normalization (light)
function normalizeArabic(text = "") {
  if (!text) return "";
  let s = String(text);
  // normalize alef variants to ا
  s = s.replace(/[إأآا]/g, 'ا');
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/ؤ/g, 'و');
  s = s.replace(/ئ/g, 'ي');
  // remove diacritics
  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '');
  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// tokenize by words and keep 2-3grams for phrase modifiers
function tokenizeWithNgrams(text, { ngrams = [1,2,3] } = {}) {
  const norm = normalizeArabic(text);
  if (!norm) return [];
  const words = norm.split(' ').filter(Boolean);
  const tokens = [];
  for (let n of ngrams) {
    if (n === 1) {
      for (let i=0;i<words.length;i++) tokens.push({ token: words[i], index:i, n });
    } else {
      for (let i=0;i<=words.length-n;i++) {
        tokens.push({ token: words.slice(i,i+n).join(' '), index:i, n });
      }
    }
  }
  // sort tokens by index then n descending (prefer longer ngrams first when matching)
  tokens.sort((a,b) => a.index - b.index || b.n - a.n);
  return { words, tokens };
}

/* ============================
   1) Hierarchical Affective Lexicon
   - modifiers grouped by semantic layers and categories
   - each modifier can be a single word or multi-word phrase
   ============================ */

export const HIERARCHICAL_MODIFIERS = {
  amplifiers: {
    degree: {
      // ordinary amplifiers
      "جدا": { multiplier: 1.5, examples:["حزين جدا","خائف جدا"], notes:"degree amplifier" },
      "جداً": { multiplier: 1.5 },
      "للغاية": { multiplier: 1.8 },
      "بشدة": { multiplier: 1.6 },
      "قوي": { multiplier: 1.45 },
      "بكل قوتي": { multiplier: 1.9 },
      "بشکل رهيب": { multiplier: 1.9 }, // variant common mistakes
      "للغاية": { multiplier: 1.8 },
      "لدرجة لا تطاق": { multiplier: 2.2 }
    },
    certainty: {
      "فعلاً": { multiplier: 1.4 },
      "حقيقي": { multiplier: 1.4 },
      "بالتأكيد": { multiplier: 1.3 },
      "عن جد": { multiplier: 1.3 },
      "بلا شك": { multiplier: 1.35 }
    },
    identity_emphasis: { // "أنا فعلًا" type
      "أنا فعلاً": { multiplier: 1.4 },
      "بنفسي": { multiplier: 1.2 }
    },
    emotional_contagion: {
      "من كل قلبي": { multiplier: 1.8 },
      "بكل كياني": { multiplier: 1.9 },
      "بعمق": { multiplier: 1.6 }
    },
    temporal_intensity: {
      "طول الوقت": { multiplier: 1.6 },
      "دائماً": { multiplier: 1.5 },
      "مافيش يوم": { multiplier: 1.6 }
    }
  },

  diminishers: {
    degree: {
      "شوية": { multiplier: 0.7 },
      "قليلا": { multiplier: 0.7 },
      "قليلاً": { multiplier: 0.7 },
      "نوعاً ما": { multiplier: 0.85 },
      "إلى حد ما": { multiplier: 0.85 },
      "بعض الشيء": { multiplier: 0.8 },
      "مش كتير": { multiplier: 0.6 }
    },
    hedge: {
      "يمكن": { multiplier: 0.9 },
      "ربما": { multiplier: 0.9 },
      "أحياناً": { multiplier: 0.9 }
    },
    minimizer: {
      "بالكاد": { multiplier: 0.4 },
      "قليلاً فقط": { multiplier: 0.5 }
    }
  },

  negators: {
    basic: {
      "مش": { multiplier: 0.05, invert: true },
      "لا": { multiplier: 0.05, invert: true },
      "لم": { multiplier: 0.0, invert: true },
      "لن": { multiplier: 0.0, invert: true },
      "ما": { multiplier: 0.1, invert: true },
      "بدون": { multiplier: 0.2, invert: true }
    },
    contrastive: { // phrases that flip or attenuate differently
      "مش بس": { multiplier: 0.9, mode: "contrast_add" }, // "مش بس ... كمان" -> contrast additive
      "لكن": { multiplier: 0.95, mode: "contrast" }
    }
  },

  sarcasm_triggers: {
    // indicators that the sentence may be sarcastic or ironic.
    // these don't directly multiply intensities but flag polarity flip heuristics.
    "آه طبعًا": { sarcasmWeight: 0.9 },
    "أكيد": { sarcasmWeight: 0.5 },
    "طبعًا": { sarcasmWeight: 0.5 },
    "يا سلام": { sarcasmWeight: 0.8 },
    "يعني إيه": { sarcasmWeight: 0.4 },
    // emoji-based sarcasm hints are handled in tokens (e.g., 😂)
  },

  repetition_markers: {
    // words indicating repetition or emphasis by repetition
    "مرة": { repFactor: 1.1 },
    "كتير": { repFactor: 1.2 },
    "دايمًا": { repFactor: 1.4 }
  }
};

/* ============================
   2) Base emotion seeds (example)
   - These represent tokens that carry base emotion weights (could be replaced by EmotionAnchors)
   - Structure: token -> { emotion: {dim:score,...}, baseIntensity }
   ============================ */

export const EXAMPLE_EMOTION_SEEDS = {
  "حزين": { emotions: { sadness: 1.0 }, base: 0.9 },
  "مكتئب": { emotions: { sadness: 1.0, loneliness:0.4 }, base: 1.0 },
  "قلق": { emotions: { anxiety:1.0 }, base: 0.85 },
  "خائف": { emotions: { fear:1.0 }, base: 0.9 },
  "غاضب": { emotions: { anger:1.0 }, base: 0.9 },
  "متحمس": { emotions: { joy:0.8, empowering:0.4 }, base: 0.7 },
  "مبسوط": { emotions: { joy:1.0 }, base: 0.8 },
  "اشتقت": { emotions: { loneliness:0.7, sadness:0.4 }, base: 0.75 }
};

/* ============================
   3) Core Engine
   ============================ */

export class IntensityAnalyzerV5 {
  constructor({
    modifiers = HIERARCHICAL_MODIFIERS,
    seeds = EXAMPLE_EMOTION_SEEDS,
    options = {}
  } = {}) {
    this.modifiers = modifiers;
    this.seeds = seeds;
    this.options = Object.assign({
      repetitionCap: 2.5,       // maximum multiplier from repetition
      globalCap: 3.0,           // maximum final multiplier applied to any single seed
      sarcasmSensitivity: 0.6,  // how aggressively to detect sarcasm
      debug: false
    }, options);

    // flatten modifier lookup for quick matching (phrase keys normalized)
    this._flattenedModifiers = this._buildFlattenedModifiers();
  }

  _log(...args) { if (this.options.debug) console.log('[IntensityV5]', ...args); }

  _buildFlattenedModifiers() {
    const flat = {};
    for (const groupName of Object.keys(this.modifiers)) {
      const group = this.modifiers[groupName];
      for (const layer of Object.keys(group)) {
        const layerObj = group[layer];
        for (const phrase of Object.keys(layerObj)) {
          flat[normalizeArabic(phrase)] = Object.assign({ __group: groupName, __layer: layer, __phrase: phrase }, deepClone(layerObj[phrase]));
        }
      }
    }
    return flat;
  }

  /**
   * analyze(text, [initialAnchors])
   * - text: raw user text (Arabic)
   * - initialAnchors (optional): map token-> base emotion seeds (e.g., from EmotionalAnchors)
   *
   * Returns:
   * {
   *   affectVector: { sadness:0.4, anxiety:0.2, ... },
   *   intensityMap: { tokenIndex: { token, base, multiplier, final } },
   *   explanations: [ ... ],
   *   flags: { sarcasmDetected: bool, repetitionBoost: number, modifiersApplied: [...] }
   * }
   */
  analyze(text, initialAnchors = {}) {
    const startTs = now();
    const norm = normalizeArabic(text);
    const { words, tokens } = tokenizeWithNgrams(norm, { ngrams: [1,2,3] });

    // Merge seeds: prefer provided initialAnchors otherwise internal seeds
    const seedLookup = { ...this.seeds, ...initialAnchors };

    // Step A: find emotion-bearing tokens (seeds)
    const seedMatches = []; // { token, index, seedMeta }
    for (let i=0;i<words.length;i++) {
      const w = words[i];
      if (seedLookup[w]) {
        seedMatches.push({ token: w, index:i, meta: deepClone(seedLookup[w]) });
      }
    }

    // Step B: find modifiers matched (prefer longer ngrams; tokens already sorted by index & n)
    const modifierMatches = []; // { phrase, index, info }
    const usedTokenIndexes = new Set();
    for (const t of tokens) {
      const key = normalizeArabic(t.token);
      const mod = this._flattenedModifiers[key];
      if (!mod) continue;
      // ensure we don't overlap previously consumed word tokens in multi-word match
      let conflict = false;
      for (let k=0;k<t.n;k++) if (usedTokenIndexes.has(t.index + k)) conflict = true;
      if (conflict) continue;
      // accept match
      modifierMatches.push({ phrase: t.token, index: t.index, n: t.n, info: mod });
      for (let k=0;k<t.n;k++) usedTokenIndexes.add(t.index + k);
    }

    // Step C: compute repetition statistics (word-level)
    const repCounts = {};
    for (const m of seedMatches) {
      repCounts[m.token] = (repCounts[m.token] || 0) + 1;
    }
    // repetition boost factor (exponential but capped)
    const repetitionBoosts = {};
    for (const [token, cnt] of Object.entries(repCounts)) {
      if (cnt <= 1) repetitionBoosts[token] = 1.0;
      else {
        // exponential scaling: baseFactor ^ (cnt -1)
        const baseFactor = 1.25;
        const boost = Math.min(this.options.repetitionCap, Math.pow(baseFactor, cnt - 1));
        repetitionBoosts[token] = boost;
      }
    }

    // Step D: sarcasm heuristic: look for sarcasm triggers or emoji+contradiction patterns
    let sarcasmScore = 0;
    // check explicit sarcasm phrases in flattened modifiers
    for (const mm of modifierMatches) {
      if (mm.info.__group === 'sarcasm_triggers') sarcasmScore = Math.max(sarcasmScore, mm.info.sarcasmWeight || 0);
    }
    // emojis indicating sarcasm or laughter after negative statements increase sarcasm
    if (norm.match(/😂|😅|🤣|🙂|😏/)) {
      // simple heuristic: if negative seed exists + laughing emoji => sarcasm likely
      const negativeSeedPresent = seedMatches.some(s => {
        const e = Object.keys(s.meta.emotions || {});
        return e.some(dim => ['sadness','anger','guilt','fear','loneliness'].includes(dim));
      });
      if (negativeSeedPresent) sarcasmScore = Math.max(sarcasmScore, 0.6);
    }

    // Step E: Build intensity map: for each seed match, compute applied multipliers
    const intensityMap = {}; // key: index -> { token, base, appliedMultipliers:[], repetitionBoost, final }
    for (const s of seedMatches) {
      const idx = s.index;
      const token = s.token;
      const base = clamp(s.meta.base || 0.5, 0, 2.0);
      const applied = [];
      let totalMultiplier = 1.0;

      // find modifiers in scope near this seed:
      // strategy: consider modifiers within +/- 3 tokens, and phrases that declared scope (previous/next)
      for (const mm of modifierMatches) {
        const modIdxStart = mm.index;
        const modIdxEnd = mm.index + mm.n - 1;
        const distance = (idx < modIdxStart) ? (modIdxStart - idx) : (idx - modIdxEnd);
        // proximity weighting: closer modifiers have stronger effect
        const proximityWeight = clamp(1.0 - (distance / 4), 0.0, 1.0); // distance 0 => 1, distance>=4 => 0
        // check modality of modifier: next/previous/default handling
        const info = mm.info;
        const phrase = mm.phrase;
        // default multiplier (if exists)
        let m = info.multiplier !== undefined ? info.multiplier : 1.0;
        // handle 'invert' (negator) specially:
        if (info.invert) {
          // negator intended for next token typically: if mod is before seed (mod index < seed index) apply
          if (modIdxEnd < idx) {
            // strong negation effect; treat multiplier multiplicatively but with logic
            applied.push({ phrase, reason: 'negator_before', rawMult: m, proximity: proximityWeight });
            totalMultiplier *= m;
          } else if (modIdxStart > idx) {
            // negator after seed - can be rare in Arabic; apply if close
            if (distance <= 1) {
              applied.push({ phrase, reason: 'negator_after', rawMult: m, proximity: proximityWeight });
              totalMultiplier *= m;
            }
          } else {
            // overlapping - treat as strong negation
            applied.push({ phrase, reason: 'negator_overlap', rawMult: m, proximity: proximityWeight });
            totalMultiplier *= m;
          }
        } else if (info.mode === 'contrast' || info.mode === 'contrast_add') {
          // contrastive words adjust interpretation rather than hard multiply
          applied.push({ phrase, reason: info.mode, rawMult: m, proximity: proximityWeight });
          // contrast_add slightly increases nuance rather than simple multiply
          totalMultiplier *= (1 + (m - 1) * proximityWeight * 0.6);
        } else {
          // regular amplifier/diminisher
          // apply weight by proximity and conceivable type (temporal/emotional_contagion stronger)
          const layerBoost = (info.__group === 'amplifiers') ? 1.0 : ((info.__group === 'diminishers') ? 1.0 : 1.0);
          const adjMult = 1 + ((m - 1) * proximityWeight * layerBoost);
          applied.push({ phrase, reason: 'proximity_applied', rawMult: m, proximity: proximityWeight, adjMult });
          totalMultiplier *= adjMult;
        }
      } // end modifierMatches loop

      // Step E2: apply repetition boost if any
      const repBoost = repetitionBoosts[token] || 1.0;
      if (repBoost > 1.0) {
        applied.push({ phrase: `repetition(${token})`, reason: 'repetition', rawMult: repBoost });
        totalMultiplier *= repBoost;
      }

      // Step E3: apply sarcasm flip heuristics
      let sarcasmApplied = false;
      if (sarcasmScore > this.options.sarcasmSensitivity) {
        // If sarcasm likely and seed is negative, reduce actual negative intensity and mark flag
        const seedEmotions = Object.keys(s.meta.emotions || {});
        const negativeSeed = seedEmotions.some(d => ['sadness','anger','guilt','fear','loneliness'].includes(d));
        if (negativeSeed) {
          // sarcasm reduces literalness: push multiplier toward 0.6 - 0.9 depending on sarcasmScore
          const sarcMult = clamp(1.0 - (sarcasmScore - 0.2), 0.5, 0.95);
          applied.push({ phrase: 'sarcasm_adjustment', reason: 'sarcasm', rawMult: sarcMult, sarcasmScore });
          totalMultiplier *= sarcMult;
          sarcasmApplied = true;
        } else {
          // sarcastic positive => invert and treat as negative indicator: reduce and flip sign via meta flag
          const sarcMult = clamp(0.4 + (1 - sarcasmScore)*0.6, 0.4, 1.0);
          applied.push({ phrase: 'sarcasm_positive_flip', reason: 'sarcasm_positive', rawMult: sarcMult, sarcasmScore });
          totalMultiplier *= sarcMult;
          sarcasmApplied = true;
        }
      }

      // Step E4: cap total multiplier
      totalMultiplier = clamp(totalMultiplier, 0.0, this.options.globalCap);

      // final intensity = base * totalMultiplier
      let finalIntensity = clamp(base * totalMultiplier, 0.0, this.options.globalCap);

      // store
      intensityMap[idx] = {
        token,
        base,
        applied,
        repetitionBoost: repBoost,
        sarcasmApplied,
        totalMultiplier,
        finalIntensity
      };
    } // end seedMatches

    // Step F: aggregate affect vector from intensityMap and seed emotion maps
    const rawAffect = {}; // accumulate weighted emotion dims
    for (const [idx, info] of Object.entries(intensityMap)) {
      const seed = seedMatches.find(s => s.index === parseInt(idx));
      if (!seed) continue;
      const weight = info.finalIntensity || seed.meta.base || 0;
      for (const [dim, val] of Object.entries(seed.meta.emotions || {})) {
        rawAffect[dim] = (rawAffect[dim] || 0) + (val * weight);
      }
    }

    // normalize affect vector to 0..1 scale using soft normalization
    const maxVal = Math.max(...Object.values(rawAffect), 0.00001);
    const affectVector = {};
    for (const dim of Object.keys(rawAffect)) {
      affectVector[dim] = clamp(rawAffect[dim] / maxVal, 0, 1);
    }

    // Step G: detect compound emotions (if multiple top dims are present)
    const sortedAffects = Object.entries(affectVector).sort((a,b) => b[1]-a[1]);
    const compound = [];
    if (sortedAffects.length >= 2 && sortedAffects[0][1] > 0.15 && sortedAffects[1][1] > 0.12) {
      compound.push(sortedAffects[0][0], sortedAffects[1][0]);
    } else if (sortedAffects.length === 1 && sortedAffects[0][1] > 0.15) {
      compound.push(sortedAffects[0][0]);
    }

    // Step H: produce explanations and flags
    const explanations = [];
    for (const [idx, info] of Object.entries(intensityMap)) {
      explanations.push({
        index: parseInt(idx),
        token: info.token,
        base: info.base,
        multiplier: info.totalMultiplier,
        final: info.finalIntensity,
        appliedPhrases: info.applied.map(a => ({ phrase: a.phrase || a.reason, raw: a.rawMult || a.adjMult || null, reason: a.reason }))
      });
    }

    const flags = {
      sarcasmDetected: sarcasmScore > this.options.sarcasmSensitivity,
      sarcasmScore,
      repetitionBoostSummary: repetitionBoosts,
      modifiersFound: modifierMatches.map(m => ({ phrase: m.phrase, info: m.info, index: m.index }))
    };

    const endTs = now();
    const meta = {
      durationMs: endTs - startTs,
      seedMatchesCount: seedMatches.length,
      modifierMatchesCount: modifierMatches.length
    };

    return {
      text: text,
      affectVector,
      intensityMap,
      explanations,
      flags,
      meta
    };
  }

  /* ============================
     Utilities: helper to build initialAnchors from a provided anchors dict
     - This function maps an anchors dictionary (word->meta) to seed format expected
     ============================ */
  buildAnchorsFromDictionary(anchorsDict = {}) {
    const out = {};
    for (const [word, meta] of Object.entries(anchorsDict)) {
      const norm = normalizeArabic(word);
      out[norm] = {
        emotions: meta.mood_scores || meta.emotions || {},
        base: meta.intensity || meta.base || 0.8
      };
    }
    return out;
  }
}

/* ============================
   4) Example usage (commented)
   ============================ */

/*
import IntensityAnalyzerV5 from './dictionaries/intensity_analyzer_v5.js';

const analyzer = new IntensityAnalyzerV5({ options: { debug:true } });

// example with internal seeds
const out1 = analyzer.analyze("أنا مش حزين جدًا، لكن متضايق شوية ومحبط فعلاً");
console.log(JSON.stringify(out1, null, 2));

// example with external Emotion Anchors
const anchors = {
  "محبط": { mood_scores:{ sadness:1.0, anger:0.2 }, intensity: 0.9 },
  "متضايق": { mood_scores:{ sadness:0.8 }, intensity: 0.7 }
};
const initialAnchors = analyzer.buildAnchorsFromDictionary(anchors);
const out2 = analyzer.analyze("أنا مش محبط خالص.. ده تعبان بس", initialAnchors);
console.log(JSON.stringify(out2, null, 2));
*/

/* ============================
   5) Unified export
   ============================ */

export default {
  HIERARCHICAL_MODIFIERS,
  EXAMPLE_EMOTION_SEEDS,
  IntensityAnalyzerV5
};
