
/**
 * dictionaries/generative_responses_engine.js
 *
 * Generative Responses Engine — Dynamic Hybrid Core (v1.0)
 * Author: Ibrahim Shahat & Noor AI (assistant)
 * Purpose: Produce deeply human-like, context-aware, stylistically-varied responses
 *          by fusing psychological concepts, emotional signals, and advanced linguistic rules.
 *
 * Notes:
 * - Designed to be plugged into pipeline: tokens -> EmotionInterpreter/ConceptEngine -> ResponseOrchestrator
 * - Keeps session-level memory to avoid repetition and to learn user style.
 * - Not template-bound: uses template fragments, lexical alchemy, metaphor rules, and rendering policies.
 */

/* ============================================================================
   Utilities
   ============================================================================ */
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a=0, b=1) { return Math.max(a, Math.min(b, v)); }
function now() { return Date.now(); }

/* ============================================================================
   1) Emotional DNA Library
   - Each DNA encodes stylistic parameters controlling rhythm, warmth, abstraction, imagery.
   ============================================================================ */
export const EMOTIONAL_DNA = {
  // Keys are style handles for mixing
  poetic: {
    name: "شاعري-روحي",
    warmth: 0.9,          // 0..1 how affective / intimate
    rhythm: 0.3,          // 0..1 sentence length variance (lower = longer sentences)
    abstraction: 0.8,     // 0..1 use of abstract/metaphoric language
    lexicalDensity: 0.5,  // 0..1 use of rare / evocative words
    directness: 0.3,      // 0..1 direct instruction vs suggestion
    imageryScore: 0.85,   // 0..1 how many metaphors/sensory images
    politeness: 0.95
  },
  grounded: {
    name: "واقعي-عميق",
    warmth: 0.7,
    rhythm: 0.6,
    abstraction: 0.25,
    lexicalDensity: 0.6,
    directness: 0.7,
    imageryScore: 0.25,
    politeness: 0.9
  },
  tender: {
    name: "حنون-همس",
    warmth: 1.0,
    rhythm: 0.4,
    abstraction: 0.4,
    lexicalDensity: 0.35,
    directness: 0.25,
    imageryScore: 0.45,
    politeness: 1.0
  },
  dynamic: {
    // Default hybrid base: used to mix styles at runtime
    name: "ديناميكي-مختلط",
    warmth: 0.8,
    rhythm: 0.5,
    abstraction: 0.5,
    lexicalDensity: 0.5,
    directness: 0.5,
    imageryScore: 0.5,
    politeness: 0.95
  }
};

/* ============================================================================
   2) Lexical Resources: Pools, synonym maps, idioms, micro-metaphors
   - Designed to be extendable (loadable JSON/CSV later).
   ============================================================================ */
export const LEXICAL_POOLS = {
  // core emotion words mapped to variants for mutation
  synonyms: {
    "حزين": ["متألم", "مِثقل القلب", "مهموم"],
    "قلق": ["متوتر", "شايل هم", "مش مرتاح"],
    "تعب": ["إرهاق", "اندفاع تعب", "إنهاك"],
    "وحده": ["عزلة", "غربة داخلية"],
    "خائف": ["مرعوب", "مخاف"],
    "خسران": ["مفقود", "ضائع"]
  },
  // short idioms and safe metaphors to combine
  idioms: [
    "زي موجة بتمر",
    "كأنك في نص عاصفة",
    "نقطة ضوء وسط الظلام",
    "قلبك بيبعتلك إشارات",
    "خد نفس وخلينا نفصل"
  ],
  // micro poetic phrases used as inserts
  microImagery: [
    "صوت بين السطور",
    "ظل بيهمس",
    "نبضة هادئة",
    "نسمة بتمر وتخفف",
    "شعاع صغير"
  ],
  // connectors for sentence orchestration
  connectors: ["وبعدين", "ومع كده", "لكن", "وفي نفس الوقت", "ولو سمحتلي"]
};

/* ============================================================================
   3) Hybrid Concept Fusion
   - Accepts a map of concept scores (from ConceptEngine) + emotional profile
   - Outputs a fused "intent vector" that guides generation.
   ============================================================================ */

export function fuseConcepts(conceptProfile = {}, emotionalProfile = {}) {
  // conceptProfile: { conceptName: score, ... }
  // emotionalProfile: { joy:0.2, sadness:0.9, anxiety:0.6, calming:0.2, ... }
  // Strategy: weight concepts by emotional alignment and produce top K intents.

  // Step 1: normalize input
  const cp = { ...conceptProfile };
  const ep = { ...emotionalProfile };

  // compute concept weights (simple normalization)
  const total = Object.values(cp).reduce((s, v) => s + v, 0) || 1;
  for (const k of Object.keys(cp)) cp[k] = cp[k] / total;

  // Map concept -> primary emotion influence (heuristic map; extendable)
  const conceptEmotionMap = {
    sadness: "sadness",
    anxiety: "anxiety",
    helplessness: "sadness",
    self_blame: "sadness",
    depression_symptom: "sadness",
    anger: "anger",
    guilt: "guilt",
    hope: "hope",
    resilience: "empowering",
    motivation: "empowering",
    loneliness: "loneliness",
    meaning_crisis: "sadness"
  };

  const fused = {};
  for (const [concept, w] of Object.entries(cp)) {
    const primaryEmotion = conceptEmotionMap[concept] || null;
    const emotionScore = primaryEmotion ? (ep[primaryEmotion] || 0.0) : 0.0;
    // weight composition: concept importance * (1 + emotionScore)
    fused[concept] = w * (1 + emotionScore);
  }

  // produce ranked intents
  const ranked = Object.entries(fused)
    .sort((a,b) => b[1]-a[1])
    .map(([k,v]) => ({ concept: k, weight: v }));

  // also compute an overall affect vector (condensed)
  const affectVector = {};
  const affectKeys = ["sadness","anxiety","joy","calming","empowering","loneliness","fear","anger","hope"];
  for (const key of affectKeys) affectVector[key] = clamp(ep[key] || 0);

  return { rankedIntents: ranked.slice(0,5), affectVector };
}

/* ============================================================================
   4) Language Alchemy Rules
   - Rules for combining lexical elements into clauses, choosing metaphors,
     controlling sentence rhythm and mutation.
   ============================================================================ */

function chooseLexicalVariant(word, dna, pools) {
  // Prefer higher-density / poetic variants when lexicalDensity high
  const variants = pools.synonyms[word] || [word];
  // weight selection by dna.lexicalDensity
  if (variants.length === 0) return word;
  const preferPoetic = dna.lexicalDensity > 0.6;
  if (preferPoetic) {
    // bias toward last variants (assumed more poetic)
    return variants[Math.floor((Math.random() ** (1/dna.lexicalDensity)) * variants.length)];
  } else {
    return rand(variants);
  }
}

function maybeInsertImagery(dna, pools) {
  if (Math.random() < dna.imageryScore * 0.6) {
    return rand(pools.microImagery);
  }
  return null;
}

function buildClause(intent, dna, pools, role = "opener") {
  // role: opener / continuation / closer
  // intent: {concept, weight}
  const concept = intent.concept;
  const baseLex = {
    sadness: ["حزين", "متألم", "مهموم"],
    anxiety: ["قلق", "متوتر", "مش مرتاح"],
    self_blame: ["بلوم نفسي", "لوم ذاتي"],
    helplessness: ["مش قادر", "محبط"],
    guilt: ["ذنب", "ندم"],
    hope: ["أمل", "رجاء", "نور"],
    loneliness: ["وحدة", "عزلة"]
  }[concept] || [concept];

  // choose a seed word
  const seed = rand(baseLex);
  const variant = chooseLexicalVariant(seed, dna, pools);
  const imagery = maybeInsertImagery(dna, pools);

  // clause templates (language-level, not fixed templates)
  const templates = {
    opener: [
      () => `${variant} ظاهر إنك حاسس بيه.`,
      () => `باين في كلامك وجود ${variant}.`,
      () => `حاسس إن ${variant} واخد مساحة جواك.`
    ],
    continuation: [
      () => `وده شيء طبيعي جدًا، ومع ذلك ممكن نخد خطوة بسيطة.`,
      () => `لو حابب، نقدر نفصّل السبب سوا.`,
      () => `خلّيه يفضفض شوية، كلمة ورا كلمة بتنفع.`
    ],
    closer: [
      () => `أنا هنا علشان أسمعك وأمشيل معاك الحمل خطوة خطوة.`,
      () => `ما تقلقش، مش لوحدك في ده — نعملي سوا.`,
      () => `نقدر نشتغل على خطوة عملية دلوقت لو حابب.`
    ]
  };

  // assemble
  let clause = rand(templates[role])();
  if (imagery && Math.random() < dna.imageryScore) {
    clause += ` — كأنها ${imagery}.`;
  }
  // sometimes add connector
  if (Math.random() < 0.25) clause = rand(LEXICAL_POOLS.connectors) + "، " + clause;
  return clause;
}

/* ============================================================================
   5) Multi-Style Response Orchestrator
   - High-level class that accepts fused intents + session memory + dna mixing
   - Produces final rendered text in Arabic, avoids repetition, supports variations.
   ============================================================================ */

export class ResponseOrchestrator {
  constructor({
    dnaLibrary = EMOTIONAL_DNA,
    lexicalPools = LEXICAL_POOLS,
    memory = null,            // external session memory object (optional)
    userStyle = null,        // learned user style overrides (optional)
    maxClauses = 3
  } = {}) {
    this.dnaLibrary = dnaLibrary;
    this.lexicalPools = lexicalPools;
    this.memory = memory || new SessionMemory();
    this.userStyle = userStyle || {};
    this.maxClauses = maxClauses;
    // anti-repetition log for current generation
    this._usedPhrases = new Set();
  }

  // choose DNA mixture based on affect vector + user style preferences
  _mixDNA(affectVector = {}, topIntents = []) {
    // base dna = dynamic
    const base = { ...this.dnaLibrary.dynamic };
    // if sadness high -> lean poetic + tender
    if ((affectVector.sadness || 0) > 0.45) {
      // mix poetic + tender
      const p = this.dnaLibrary.poetic;
      const t = this.dnaLibrary.tender;
      return blendDNA(base, p, t, affectVector);
    }
    if ((affectVector.anxiety || 0) > 0.45) {
      const g = this.dnaLibrary.grounded;
      const te = this.dnaLibrary.tender;
      return blendDNA(base, g, te, affectVector);
    }
    if ((affectVector.joy || 0) > 0.4) {
      // playful/bright: mix tender + grounded
      const te = this.dnaLibrary.tender;
      const g = this.dnaLibrary.grounded;
      return blendDNA(base, te, g, affectVector);
    }
    // default: return dynamic adjusted by any userStyle overrides
    return applyUserStyle(base, this.userStyle);
  }

  generate({ conceptProfile = {}, emotionalProfile = {}, context = "" } = {}) {
    // 1. fuse concepts
    const fused = fuseConcepts(conceptProfile, emotionalProfile);
    const topIntents = fused.rankedIntents;
    const affect = fused.affectVector;

    // 2. choose DNA
    const dna = this._mixDNA(affect, topIntents);

    // 3. decide clause count (rhythm & intensity)
    const intensity = Math.max(...Object.values(emotionalProfile || {}), 0);
    const clauseCount = Math.min(this.maxClauses, Math.max(1, Math.round(dna.rhythm * 3 + (intensity > 0.6 ? 1 : 0))));

    // 4. assemble clauses by mixing intents
    const clauses = [];
    for (let i = 0; i < clauseCount; i++) {
      const intent = topIntents[i] || topIntents[0] || { concept: "safety", weight: 0.5 };
      const role = i === 0 ? "opener" : (i === clauseCount -1 ? "closer" : "continuation");
      let clause = buildClause(intent, dna, this.lexicalPools, role);
      // mutate synonyms lightly
      clause = this._mutateInline(clause, dna);
      // ensure not repeated
      clause = this._ensureNovel(clause);
      clauses.push(clause);
    }

    // 5. post-compose into final paragraph(s)
    let final = clauses.join(" ");
    final = this._polish(final, dna);

    // 6. record into memory to reduce repetition
    this.memory.record(final);

    return { text: final, meta: { dna, fused, clauseCount } };
  }

  _mutateInline(text, dna) {
    // replace a few seed words using lexical pools based on dna.lexicalDensity
    for (const [key, variants] of Object.entries(this.lexicalPools.synonyms)) {
      if (text.includes(key) && Math.random() < dna.lexicalDensity * 0.6) {
        text = text.replace(key, rand(variants));
      }
    }
    return text;
  }

  _ensureNovel(text) {
    // try small transformations if text seen before
    if (!this._usedPhrases.has(text) && !this.memory.seen(text)) {
      this._usedPhrases.add(text);
      return text;
    }
    // make transformations: swap connectors, substitute microImagery, rephrase slightly
    let t = text;
    // swap connector
    for (const c of LEXICAL_POOLS.connectors) {
      if (t.includes(c) && Math.random() < 0.6) {
        t = t.replace(c, rand(LEXICAL_POOLS.connectors.filter(x=>x!==c)));
        if (!this.memory.seen(t)) { this._usedPhrases.add(t); return t; }
      }
    }
    // replace imagery
    for (const img of LEXICAL_POOLS.microImagery) {
      if (t.includes(img) && Math.random() < 0.6) {
        t = t.replace(img, rand(LEXICAL_POOLS.microImagery.filter(x=>x!==img)));
        if (!this.memory.seen(t)) { this._usedPhrases.add(t); return t; }
      }
    }
    // fallback: append a short empathetic token
    t = t + " " + rand(["❤️","🤍","✨","🌙"]);
    this._usedPhrases.add(t);
    return t;
  }

  _polish(text, dna) {
    // basic punctuation polish, ensure spacing and polite closures depending on dna.politeness
    text = text.replace(/\s+/g, " ").trim();
    // if high warmth, ensure an empathetic closer exists
    if (dna.warmth > 0.8 && !/(❤️|🤍|🌙|✨)$/.test(text)) {
      text += " " + rand(["❤️","🤍","🌙"]);
    }
    return text;
  }
}

/* ============================================================================
   6) Session Memory (simple local memory, replaceable with DB)
   - stores last N responses and user style preferences, avoids repetition
   ============================================================================ */
export class SessionMemory {
  constructor({ capacity = 40 } = {}) {
    this.capacity = capacity;
    this.history = []; // { text, ts }
    this.userStyle = {}; // e.g., prefersShortResponses: true, tonePreference: 'tender'
  }

  record(text) {
    this.history.push({ text, ts: now() });
    if (this.history.length > this.capacity) this.history.shift();
  }

  seen(text) {
    return this.history.some(h => h.text === text);
  }

  last(n=1) {
    return this.history.slice(-n).map(h=>h.text);
  }

  setUserStyle(style = {}) {
    this.userStyle = { ...this.userStyle, ...style };
  }

  getUserStyle() { return this.userStyle; }
}

/* ============================================================================
   7) DNA blending & helpers
   ============================================================================ */
function blendDNA(base, a, b, affect = {}) {
  // Weighted average: base + a*(sadness/0.5) + b*(anxiety/0.5) etc.
  // Simple heuristic: if sadness dominant -> favor 'a'; if anxiety dominant -> favor 'b'
  const sadness = clamp(affect.sadness || 0);
  const anxiety = clamp(affect.anxiety || 0);
  const joy = clamp(affect.joy || 0);
  const wA = sadness + (joy*0.1);
  const wB = anxiety + (joy*0.05);
  const total = 1 + wA + wB;
  const out = {};
  for (const k of Object.keys(base)) {
    out[k] = (base[k] + (a[k]||0)*wA + (b[k]||0)*wB) / total;
  }
  return applyUserStyle(out, {});
}

function applyUserStyle(dna, userStyle = {}) {
  // userStyle can nudge dna params: e.g. { warmth:+0.1, abstraction:-0.2 }
  const out = { ...dna };
  for (const [k,v] of Object.entries(userStyle)) {
    if (out[k] !== undefined) out[k] = clamp(out[k] + v, 0, 1);
  }
  return out;
}

/* ============================================================================
   8) Quick Integration Helper
   - convenience function to run full pipeline in one call (for prototyping)
   ============================================================================ */

export function generateResponseFromPipeline({
  conceptProfile = {},     // e.g., { anxiety: 0.8, helplessness: 0.2 }
  emotionalProfile = {},   // e.g., { anxiety:0.8, sadness:0.6, calming:0.1 }
  context = "",
  memory = null,
  userStyle = {}
} = {}) {
  const orchestrator = new ResponseOrchestrator({ memory, userStyle });
  const out = orchestrator.generate({ conceptProfile, emotionalProfile, context });
  return out; // { text, meta }
}

/* ============================================================================
   9) Exports
   ============================================================================ */

export default {
  EMOTIONAL_DNA,
  LEXICAL_POOLS,
  fuseConcepts,
  ResponseOrchestrator,
  SessionMemory,
  generateResponseFromPipeline
};
