// knowledge_base_vΩ1.js
// The Expanded Predictive Mind - vΩ.1
// A comprehensive, modular knowledge base + helper utilities implementing
// the smart suggestions: dynamic intensity, synonym expansion, context memory,
// persona openers/closers, multi-language hints, recovery levels, placeholders, etc.

// Usage: import needed constants and helper functions from this module.
// Example:
// import { CONCEPTS_MAP, detectConcepts, computeIntensity, getMetaRecipe, RESPONSE_TEMPLATES, renderTemplate, PERSONA_PROFILES } from './knowledge_base_vΩ1.js';

/////////////////////
// SECTION: EXPORTS
/////////////////////
export {
  CONCEPTS_MAP,
  INTENSITY_MODIFIERS,
  MOTIVATIONAL_MAP,
  STRATEGIC_RECIPES,
  RESPONSE_TEMPLATES,
  PERSONA_PROFILES,
  RECOVERY_STRATEGIES,
  CONTEXT_DEFAULTS,
  // helper functions
  normalizeText,
  tokenize,
  detectConcepts,
  computeIntensity,
  inferPrimaryNeedFromConcepts,
  clamp,
  registerUserSynonym,
  buildContextSnapshot,
  getMetaRecipe,
  renderTemplate,
  applyPersonaStyle,
  mergeUserConcepts
};

/////////////////////
// SECTION 1: LEXICON + INTENSITY (expandable)
/////////////////////

// Core concepts map: each concept -> { words: [...], intensity: baseIntensity }
// Words are normalized forms. This map is intended to be extended at runtime via registerUserSynonym().
const CONCEPTS_MAP = {
  // Emotional States
  sadness: { words: ["حزن", "متضايق", "مكتئب", "زعلان", "يائس", "محبط", "بكاء", "مخنوق"], intensity: 0.7 },
  anxiety: { words: ["قلق", "متوتر", "خايف", "مضطرب", "قلقان", "متردد", "محتار", "مربك"], intensity: 0.8 },
  anger: { words: ["غضب", "غضبان", "متعصب", "مستفز", "زعلان جدا"], intensity: 0.9 },
  loneliness: { words: ["وحدة", "وحيد", "منعزل", "عايز أحكي", "أفضفض"], intensity: 0.6 },
  joy: { words: ["سعيد", "مبسوط", "فرحان", "مبسوطه"], intensity: 0.8 },
  motivation: { words: ["متحمس", "مستعد", "نشط", "مفعم بالأمل", "عندي طاقة"], intensity: 0.7 },
  confusion: { words: ["مش فاهم", "تلخبطت", "ضايع", "تايه", "مستغرب"], intensity: 0.5 },
  gratitude: { words: ["شكرا", "ممتن", "تقدير", "شكراً"], intensity: 0.6 },

  // Cognitive & Situational Concepts
  decision_making: { words: ["قرار", "اختيار", "حسم", "خيار", "نقطة الاختيار"], intensity: 0.6 },
  problem: { words: ["مشكلة", "صعوبة", "تحدي", "أزمة", "عقبة"], intensity: 0.7 },
  failure: { words: ["فشل", "إخفاق", "خسارة"], intensity: 0.9 },
  goal_setting: { words: ["هدفي", "عايز أحقق", "طموح", "حلم"], intensity: 0.5 },
  reflection: { words: ["بفكر", "تأملت", "نفسي", "ذاتي"], intensity: 0.4 },

  // Domain Concepts
  work_domain: { words: ["شغل", "عمل", "وظيفة", "مدير", "زميل"], intensity: 0.3 },
  relationship_domain: { words: ["علاقة", "حب", "صديق", "عائلة", "شريك"], intensity: 0.3 }
};

// Intensity modifiers: multiply intensity by value when token detected.
// These are applied multiplicatively and aggregated.
const INTENSITY_MODIFIERS = {
  "جدا": 1.5,
  "قوي": 1.4,
  "للغاية": 1.6,
  "بشدة": 1.5,
  "شوية": 0.7,
  "بسيط": 0.6,
  "مش": 1.05, // weak negation small bump (contextual handlers may invert)
  "مش عارف": 1.2,
  // punctuation related handled separately
};

/////////////////////
// SECTION 2: MOTIVATIONAL CORE
/////////////////////
const MOTIVATIONAL_MAP = {
  safety_and_security: ["anxiety", "failure", "problem"],
  connection_and_belonging: ["loneliness", "relationship_domain"],
  competence_and_mastery: ["work_domain", "goal_setting", "decision_making"],
  understanding_and_meaning: ["reflection", "confusion"],
  gratitude_and_positivity: ["gratitude", "joy"]
};

/////////////////////
// SECTION 3: STRATEGIC RECIPES (stateful functions)
/////////////////////
// Each recipe is a function that accepts (intensity, history, fingerprint, context) and returns an array of instruction objects.
// Instruction: { type: 'validation'|'actionable_step'|..., probability: 0.7, tags: [...], minIntensity?, maxIntensity? }
const STRATEGIC_RECIPES = {
  // decision support (example)
  decision_support: (intensity = 0.5, history = {}, fingerprint = {}, context = {}) => {
    // if user has been stuck on decisions repeatedly, prioritize small actionable steps + reassurance
    const alreadyDiscussed = (history.recent_needs || []).includes("decision_support");
    if (alreadyDiscussed) {
      return [
        { type: "validation", probability: 1.0 },
        { type: "actionable_step", probability: 0.95, tags: ["small_step"] },
        { type: "motivational_statement", probability: 0.6 }
      ];
    }
    // intensity-based branching
    if (intensity > 0.8) {
      return [
        { type: "empathetic_statement", probability: 1.0 },
        { type: "validation", probability: 1.0 },
        { type: "actionable_step", probability: 0.9, tags: ["grounding", "small_step"] }
      ];
    }
    return [
      { type: "validation", probability: 1.0 },
      { type: "clarifying_question", probability: 0.8 }
    ];
  },

  reassurance_and_strategy: (intensity = 0.5, history = {}, fingerprint = {}) => {
    if (intensity > 0.75) {
      return [
        { type: "empathetic_statement", probability: 1.0 },
        { type: "validation", probability: 1.0 },
        { type: "reframing", probability: 0.8 }
      ];
    }
    return [
      { type: "validation", probability: 1.0 },
      { type: "reframing", probability: 0.6 }
    ];
  },

  problem_solving: (intensity = 0.5, history = {}, fingerprint = {}) => {
    return [
      { type: "empathetic_statement", probability: 1.0 },
      { type: "reframing", probability: 0.75 },
      { type: "actionable_step", probability: 0.9, tags: ["problem_breakdown"] }
    ];
  },

  emotional_venting: (intensity = 0.5) => {
    return [
      { type: "empathetic_statement", probability: 1.0 },
      { type: "listening_prompt", probability: 0.9 },
      { type: "validation", probability: 0.8 }
    ];
  },

  default: () => [{ type: "empathetic_statement", probability: 1.0 }, { type: "clarifying_question", probability: 0.5 }]
};

/////////////////////
// SECTION 4: RESPONSE TEMPLATES (with placeholders & variants)
/////////////////////
// Templates can be strings with placeholders like {emotion}, {concept}, {username}, {simple_action}, {history_ref}.
// They can also be functions: (ctx) => [ ...variants ] where ctx contains tags, fingerprint, etc.

const RESPONSE_TEMPLATES = {
  validation: (ctx) => [
    `أتفهم تمامًا شعورك بـ {emotion}.`,
    `من الطبيعي أن تشعر هكذا عندما تواجه {concept}.`,
    ctx.username ? `يا ${ctx.username}، إحساسك هنا مفهوم جدًا.` : null
  ].filter(Boolean),

  empathetic_statement: (ctx) => [
    `يبدو أن التعامل مع {concept} أمر صعب جدًا عليك.`,
    `أنا هنا لأسمعك بخصوص {concept}.`,
    `هذا يبدو مؤلمًا، وشجاعتك في مشاركته شيء مهم.`
  ],

  reframing: (ctx) => [
    `بدلاً من رؤية هذا كـ {concept}، هل يمكننا رؤيته كفرصة لـ {positive_concept}؟`,
    `ماذا لو كانت هذه التجربة تعلمك شيئًا مهمًا عن نفسك؟`
  ],

  actionable_step: (ctx) => {
    // prioritize tag-driven suggestions
    if (ctx.tags && ctx.tags.includes("cbt")) {
      return ["كتمرين CBT، ما رأيك أن تجرب كتابة الأفكار التلقائية لمدة 5 دقائق؟"];
    }
    if (ctx.tags && ctx.tags.includes("small_step")) {
      return ["خطوة صغيرة وسهلة الآن: جرّب تحديد خيار واحد يمكنك تنفيذه في الـ 10 دقائق القادمة."];
    }
    if (ctx.tags && ctx.tags.includes("goal_setting")) {
      return ["لنجعل هذا الهدف قابلاً للتحقيق. ما هي أصغر خطوة يمكنك اتخاذها الآن؟"];
    }
    return ["خطوة بسيطة يمكنك تجربتها هي {simple_action}."];
  },

  clarifying_question: (ctx) => [
    "ما هو أكثر جزء صعب في هذا الموقف بالنسبة لك؟",
    "ما الذي يمنعك من اتخاذ القرار الآن؟",
    "هل يمكنك توضيح ما تقصده بـ {concept}؟"
  ],

  listening_prompt: (ctx) => [
    "أنا هنا أسمعك. أكمل.",
    "خذ وقتك. أنا معك.",
    "أخبرني المزيد عندما تكون مستعدًا."
  ],

  positive_acknowledgement: (ctx) => [
    "هذا رائع! أنا فخور بك لاتخاذك هذه الخطوة.",
    "من الجميل جدًا أنك ترى الأمور بهذه الطريقة."
  ],

  motivational_statement: (ctx) => [
    "كل خطوة صغيرة هي تقدم.",
    "لديك القوة لتجاوز هذا.",
    "أنا أؤمن بقدرتك على تحقيق هذا."
  ],

  meta_question: (ctx) => [
    "يبدو أننا نعود إلى نفس النقطة. ما الذي تعتقد أنه يمنعنا من التقدم؟",
    "ما الذي نجربه مختلف هذه المرة قد يُحدث تغييرًا بسيطًا؟"
  ],

  // fallback generator for unknown fragment types
  fallback: (ctx) => ["أنا أسمعك. هل يمكنك أن تخبرني المزيد؟"]
};

/////////////////////
// SECTION 5: PERSONAS (openers/closers/styles/weights)
/////////////////////
const PERSONA_PROFILES = {
  the_listener: {
    fragmentWeights: { listening_prompt: 1.5, empathetic_statement: 1.3, actionable_step: 0.6, validation: 1.1 },
    style: (text, ctx = {}) => `💜 ${text}`,
    opener: "I’m here to listen.",
    closer: "خذ وقتك. أنا هنا متى ما احتجت."
  },
  the_guide: {
    fragmentWeights: { actionable_step: 1.6, motivational_statement: 1.4, listening_prompt: 0.6 },
    style: (text, ctx = {}) => `🚀 ${text}`,
    opener: "لنبدأ بخطوة صغيرة.",
    closer: "لننطلق! أخبرني بالتقدم لاحقًا."
  },
  the_wise_friend: {
    fragmentWeights: { reframing: 1.4, validation: 1.2, motivational_statement: 1.0 },
    style: (text, ctx = {}) => `تذكّر: ${text}`,
    opener: "كصديق، انا جنبك.",
    closer: "دائمًا هنا لو احتجت نصيحة."
  },

  // =================================================================
  // START: [V9 UPGRADE] NEW PERSONA DEFINITIONS FOR THE V9 ENGINE
  // =================================================================
  the_empathetic_listener: {
    name: "المستمع المتعاطف",
    description: "يركز على الاستماع والتحقق من صحة المشاعر ومنح مساحة آمنة للتعبير. يتجنب القفز إلى الحلول.",
    tone: "gentle, validating, non-judgmental, calm",
    prefix: "💜 ",
    suffix: ""
  },
  the_wise_guide: {
    name: "المرشد الحكيم",
    description: "يقدم رؤى وأدوات عملية بلغة بسيطة ومشجعة. يركز على تمكين المستخدم لاتخاذ خطوات عملية.",
    tone: "encouraging, practical, clear, supportive",
    prefix: "💡 ",
    suffix: ""
  },
  the_calm_instructor: {
    name: "المرشد الهادئ",
    description: "يقدم تعليمات واضحة ومباشرة للتمارين (مثل تمارين التهدئة). نبرته هادئة ومطمئنة.",
    tone: "calm, direct, reassuring, simple",
    prefix: "🧘 ",
    suffix: ""
  }
  // =================================================================
  // END: [V9 UPGRADE] NEW PERSONA DEFINITIONS
  // =================================================================
};

/////////////////////
// SECTION 6: RECOVERY STRATEGIES (multi-level)
/////////////////////
const RECOVERY_STRATEGIES = {
  low_confidence_fallback: [
    "لم أفهم قصدك تمامًا، هل يمكنك التوضيح بجملة مختلفة؟",
    "أعتقد أنني لم أفهم بشكل صحيح. هل يمكنك شرح المزيد من التفاصيل؟"
  ],
  repetitive_loop_breaker: [
    "يبدو أننا نعود إلى نفس النقطة. ما رأيك أن نناقش هذا من زاوية مختلفة تمامًا؟",
    "أشعر أننا لم نحقق تقدمًا. هل نأخذ استراحة قصيرة من هذا الموضوع ونتحدث عن شيء آخر؟"
  ],
  user_frustration_deescalation: [
    "أنا آسف جدًا إذا كانت إجاباتي غير مفيدة. أنا ما زلت أتعلم. سأحاول أن أفهمك بشكل أفضل.",
    "أتفهم إحباطك. شكرًا لك على سعة صدرك. كيف يمكنني أن أساعدك بشكل أفضل الآن؟"
  ]
};

/////////////////////
// SECTION 7: CONTEXT TRACKER DEFAULTS (short-term memory format)
/////////////////////
const CONTEXT_DEFAULTS = {
  last_need: null,
  recent_needs: [], // queue of last N needs
  emotion_trend: [], // array of recent intensities
  topics_discussed: [], // keywords or concepts
  last_action_suggested: null,
  is_stuck_in_loop: false
};

/////////////////////
// SECTION 8: UTILITY FUNCTIONS
/////////////////////

/**
 * normalizeText - basic normalization for Arabic + latin fallback
 * - lowercases, trims, replaces common punctuation, collapses spaces
 */
function normalizeText(text = "") {
  if (!text) return "";
  // basic replacements (extend as needed)
  let s = String(text);
  s = s.replace(/\r\n|\n/g, " ");
  s = s.replace(/[“”«»"']/g, "");
  s = s.replace(/[،،]/g, ",");
  s = s.replace(/[؟]/g, "؟");
  s = s.replace(/[^\S\r\n]+/g, " "); // collapse whitespace
  s = s.trim().toLowerCase();
  return s;
}

/**
 * tokenize - split normalized text into tokens (words)
 */
function tokenize(normalized) {
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

/**
 * detectConcepts - returns Set of concept keys found in message
 * - uses normalized tokens and CONCEPTS_MAP words (also normalized)
 */
function detectConcepts(rawMessage) {
  const norm = normalizeText(rawMessage);
  const tokens = new Set(tokenize(norm));
  const found = new Set();

  for (const [concept, data] of Object.entries(CONCEPTS_MAP)) {
    for (const w of data.words) {
      const normW = normalizeText(w);
      // check exact token or phrase presence in normalized text
      if (tokens.has(normW) || norm.includes(` ${normW} `) || norm.startsWith(`${normW} `) || norm.endsWith(` ${normW}`)) {
        found.add(concept);
        break;
      }
    }
  }
  return found;
}

/**
 * computeIntensity - aggregate base intensities & apply modifiers + punctuation
 * - concepts: Set<string>
 * - rawMessage: string
 * returns number in [0, +inf), recommended to clamp later
 */
function computeIntensity(concepts, rawMessage) {
  const norm = normalizeText(rawMessage);
  const tokens = tokenize(norm);

  if (!concepts || concepts.size === 0) {
    // still check for intensity modifiers (e.g., "انا مضايق جدا")
    let baseline = 0.1;
    for (const t of tokens) {
      if (INTENSITY_MODIFIERS[t]) baseline *= INTENSITY_MODIFIERS[t];
    }
    // punctuation emphasis
    if (/[!؟]{2,}/.test(rawMessage)) baseline *= 1.3;
    return parseFloat(baseline.toFixed(2));
  }

  // average base intensities
  let total = 0;
  concepts.forEach(c => {
    const base = CONCEPTS_MAP[c]?.intensity || 0.4;
    total += base;
  });
  let intensity = total / concepts.size;

  // apply multiplicative modifiers for tokens
  for (const t of tokens) {
    if (INTENSITY_MODIFIERS[t]) {
      intensity *= INTENSITY_MODIFIERS[t];
    }
  }

  // punctuation emphasis
  if (/[!؟]{2,}/.test(rawMessage)) intensity *= 1.25;

  // repeated characters (e.g., "ااا") -> extra boost
  if (/(.)\1{2,}/.test(rawMessage)) intensity *= 1.15;

  // clamp reasonable range and round
  intensity = clamp(intensity, 0.0, 2.5);
  return parseFloat(intensity.toFixed(2));
}

/**
 * inferPrimaryNeedFromConcepts - votes on motivational needs given concept set
 */
function inferPrimaryNeedFromConcepts(concepts) {
  const needScores = {};
  for (const need in MOTIVATIONAL_MAP) {
    needScores[need] = 0;
  }
  concepts.forEach(c => {
    for (const [need, conceptList] of Object.entries(MOTIVATIONAL_MAP)) {
      if (conceptList.includes(c)) needScores[need] += 1;
    }
  });
  // pick highest
  let best = "understanding_and_meaning";
  let max = -1;
  for (const [need, score] of Object.entries(needScores)) {
    if (score > max) {
      max = score;
      best = need;
    }
  }
  // if nothing matched return default 'understanding_and_meaning' or 'competence_and_mastery' as fallback
  return max > 0 ? best : "understanding_and_meaning";
}

/**
 * clamp - helper to clamp numeric values
 */
function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * registerUserSynonym - dynamically add synonyms/words to CONCEPTS_MAP at runtime
 * - conceptKey must exist in CONCEPTS_MAP
 */
function registerUserSynonym(conceptKey, newWord) {
  if (!CONCEPTS_MAP[conceptKey]) {
    // create new concept entry with default intensity
    CONCEPTS_MAP[conceptKey] = { words: [normalizeText(newWord)], intensity: 0.5 };
    return true;
  }
  const norm = normalizeText(newWord);
  if (!CONCEPTS_MAP[conceptKey].words.includes(norm)) {
    CONCEPTS_MAP[conceptKey].words.push(norm);
  }
  return true;
}

/**
 * mergeUserConcepts - merge an external concept map (for batch imports)
 */
function mergeUserConcepts(externalMap = {}) {
  for (const [k, v] of Object.entries(externalMap)) {
    if (!CONCEPTS_MAP[k]) {
      CONCEPTS_MAP[k] = { words: Array.isArray(v.words) ? v.words.map(normalizeText) : [], intensity: v.intensity || 0.5 };
    } else {
      // merge words and optionally adjust intensity (simple avg)
      const existing = new Set(CONCEPTS_MAP[k].words.map(normalizeText));
      for (const w of (v.words || [])) existing.add(normalizeText(w));
      CONCEPTS_MAP[k].words = Array.from(existing);
      if (v.intensity) {
        CONCEPTS_MAP[k].intensity = clamp((CONCEPTS_MAP[k].intensity + v.intensity) / 2, 0.0, 1.5);
      }
    }
  }
  return true;
}

/**
 * buildContextSnapshot - creates a lightweight context snapshot for use by recipes
 */
function buildContextSnapshot(userId = null, conversationState = {}) {
  // conversationState expected to contain fields like recent_needs, emotion_trend, topics_discussed
  return {
    userId,
    last_need: conversationState.last_need || null,
    recent_needs: conversationState.recent_needs || [],
    emotion_trend: conversationState.emotion_trend || [],
    topics_discussed: conversationState.topics_discussed || [],
    last_action_suggested: conversationState.last_action_suggested || null,
    is_stuck_in_loop: conversationState.is_stuck_in_loop || false
  };
}

/**
 * getMetaRecipe - wrapper to pick recipe based on inferred need and context
 * Accepts fingerprint object: { primaryNeed, primaryEmotion: { intensity }, concepts: [...] }, history/context
 */
function getMetaRecipe(fingerprint = {}, history = {}, personaKey = "the_listener") {
  const needKey = fingerprint.primaryNeed || "default";
  const recipeFn = STRATEGIC_RECIPES[needKey] || STRATEGIC_RECIPES["default"];
  const intensity = fingerprint.primaryEmotion?.intensity || 0.5;
  // call recipe function with intensity & history & fingerprint
  try {
    return recipeFn(intensity, history || {}, fingerprint, buildContextSnapshot(null, history || {}));
  } catch (err) {
    // fallback
    return STRATEGIC_RECIPES["default"](intensity, history, fingerprint);
  }
}

/**
 * renderTemplate - fill placeholders in a template string or template function
 * ctx may contain: username, fingerprint, tags, simple_action, positive_concept, history_ref
 */
function renderTemplate(template, ctx = {}) {
  if (!template) return "";
  // if template is a function, call it to get variants array, then pick one
  let templates = [];
  if (typeof template === "function") {
    templates = template(ctx) || [];
  } else if (Array.isArray(template)) {
    templates = template;
  } else {
    templates = [String(template)];
  }
  // pick a random variant
  const candidate = templates[Math.floor(Math.random() * templates.length)] || "";
  let t = String(candidate);

  // placeholders replacements (extend as needed)
  const replacements = {
    "{emotion}": ctx.fingerprint?.primaryEmotion?.type || ctx.emotion || "مشاعر مختلطة",
    "{concept}": (ctx.fingerprint?.concepts && ctx.fingerprint.concepts[0]) || ctx.concept || "هذا الموقف",
    "{username}": ctx.username || "",
    "{simple_action}": ctx.simple_action || "تنفيذ خطوة بسيطة الآن",
    "{positive_concept}": ctx.positive_concept || "تعلّم ونمو",
    "{history_ref}": ctx.history_ref || ""
  };

  for (const [ph, val] of Object.entries(replacements)) {
    t = t.split(ph).join(val);
  }

  return t;
}

/**
 * applyPersonaStyle - wrap/modify text according to persona's style function and optionally prepend opener/append closer
 */
function applyPersonaStyle(text, personaKey = "the_listener", ctx = {}) {
  const persona = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES["the_listener"];
  let out = text;
  try {
    out = persona.style ? persona.style(out, ctx) : out;
  } catch (err) {
    // fallback no style
  }
  // optionally include opener if context says it's the start of conversation
  if (ctx.showOpener && persona.opener) out = `${persona.opener} ${out}`;
  if (ctx.showCloser && persona.closer) out = `${out} ${persona.closer}`;
  return out;
}

/////////////////////
// SECTION 9: EXAMPLE HIGH-LEVEL FLOW (helper pseudo functions)
// These are small helpers you can call from your composition engine to integrate the KB.
/////////////////////

/**
 * highLevelAnalyzeMessage - convenience function that runs detection + intensity + need inference
 * returns fingerprint-like object.
 */
function highLevelAnalyzeMessage(rawMessage, conversationState = {}) {
  const norm = normalizeText(rawMessage);
  const concepts = detectConcepts(norm); // Set
  const intensity = computeIntensity(concepts, rawMessage);
  const primaryNeed = inferPrimaryNeedFromConcepts(concepts);
  const primaryEmotion = {
    type: [...concepts][0] || "neutral",
    intensity
  };
  const fingerprint = {
    timestamp: new Date().toISOString(),
    originalMessage: rawMessage,
    normalized: norm,
    concepts: Array.from(concepts),
    primaryEmotion,
    primaryNeed,
    contextSnapshot: buildContextSnapshot(null, conversationState)
  };
  return fingerprint;
}

/*
  END OF knowledge_base_vΩ1.js
  - This file is intentionally self-contained and designed to be extended at runtime.
  - Recommended next steps when integrating:
    1. On each incoming message: call highLevelAnalyzeMessage() to get fingerprint.
    2. Use getMetaRecipe(fingerprint, history) to get strategic recipe.
    3. Gather templates (RESPONSE_TEMPLATES + intent-level templates) and pick fragments.
    4. Use renderTemplate() with ctx={fingerprint, tags, username, simple_action,...} for each fragment.
    5. Join fragments, then apply applyPersonaStyle(...).
    6. Update conversationState/context memory: push primaryNeed to recent_needs, append intensity to emotion_trend, etc.
*/
