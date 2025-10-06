

/**
 * dictionaries/emotional_anchors.js
 * Emotional Anchors Dictionary — Ultimate Edition v5.0
 *
 * - يحتوي قاموساً غنياً بالمراسي العاطفية (words & phrases)
 * - يدعم: mood dimensions متعددة، intensity، derivatives، relations، modifiers، contextual polarity
 * - يقدّم: فهرس (index) سريع، دوال مساعدة لتحليل نص كامل (EmotionInterpreter)
 * - قابل للتعلّم: addAnchor/updateAnchor/learnFromUsage
 *
 * Author: Ibrahim Shahat + Nour AI (assistant)
 * Version: 5.0
 */

/* ===========================
   1) Configuration & Dimensions
   =========================== */

const MOOD_DIMENSIONS = [
  "joy", "sadness", "anxiety", "fear", "anger",
  "empowering", "supportive", "calming",
  "hope", "loneliness", "surprise", "disgust"
];

/* ===========================
   2) Core Lexicon (sample + extensible)
   - For brevity: include many representative entries.
   - You should extend this list from data or annotations.
   =========================== */

export const EMOTIONAL_DICTIONARY = {
  // Positive / Joy & Empowerment
  "سعيد": {
    mood_scores: { joy: 1.0, empowering: 0.5 },
    intensity: 0.9,
    category: "positive",
    expected_reaction: "celebrate",
    ai_empathy_trigger: 0.3,
    root: "س-ع-د",
    derivatives: ["سعيدة", "سعداء", "يسعد"],
    related_terms: ["فرح", "بهجة"],
    context_shiftable: false,
    contextual_polarity: { positive: 0.95, negative: 0.05 },
    modifiers: ["جداً", "للغاية", "نوعًا ما"],
    natural_reply_templates: ["جميل إنك حاسس بالسعادة دي — استمر!"]
  },

  "متحمس": {
    mood_scores: { joy: 0.7, empowering: 0.8, anxiety: 0.1 },
    intensity: 0.8,
    category: "positive",
    expected_reaction: "celebrate",
    ai_empathy_trigger: 0.4,
    root: "ح-م-س",
    derivatives: ["تحمّس", "تحمُّس"],
    related_terms: ["نشاط", "حماس"],
    context_shiftable: false,
    contextual_polarity: { positive: 0.85, negative: 0.15 },
    modifiers: ["جداً", "قليلًا"],
    natural_reply_templates: ["متحمس؟ جميل! شاركني سبب الحماس لو تحب."]
  },

  // Negative / Sadness & Despair
  "حزين": {
    mood_scores: { sadness: 1.0, loneliness: 0.2 },
    intensity: 0.9,
    category: "negative",
    expected_reaction: "comfort",
    ai_empathy_trigger: 0.95,
    root: "ح-ز-ن",
    derivatives: ["حزينة", "يحزن", "محزون"],
    related_terms: ["ألم", "وجع", "أسى"],
    context_shiftable: true,
    contextual_polarity: { positive: 0.05, negative: 0.95 },
    modifiers: ["جداً", "شديداً", "نوعًا ما"],
    natural_reply_templates: [
      "حسيت بالحزن من كلامك — حابب تحكيلنا أكثر؟",
      "أنا معاك، لما تحب تتكلم أنا هنا."
    ]
  },

  "مكتئب": {
    mood_scores: { sadness: 1.0, anxiety: 0.2 },
    intensity: 1.0,
    category: "negative",
    expected_reaction: "comfort",
    ai_empathy_trigger: 1.0,
    root: "ك-أ-ب",
    derivatives: ["اكتئاب", "يكتئب"],
    related_terms: ["كآبة", "انهيار"],
    context_shiftable: false,
    contextual_polarity: { positive: 0.01, negative: 0.99 },
    modifiers: ["جداً", "لمدة طويلة"],
    natural_reply_templates: [
      "أنت مش لوحدك في ده. هل حصل حاجة محددة خلتك تحس كده؟",
      "لو حبيت نساعدك بخطوات عملية قولي."
    ]
  },

  // Anxiety & Fear
  "قلق": {
    mood_scores: { anxiety: 1.0, fear: 0.3 },
    intensity: 0.85,
    category: "negative",
    expected_reaction: "reassure",
    ai_empathy_trigger: 0.85,
    root: "ق-ل-ق",
    derivatives: ["قلقان", "قلقين"],
    related_terms: ["توتر", "اضطراب"],
    context_shiftable: true,
    contextual_polarity: { positive: 0.1, negative: 0.9 },
    modifiers: ["شوي", "كثير"],
    natural_reply_templates: [
      "واضح إنك قلقان — تحب نحاول نفصل سبب القلق شوي؟",
      "جربت أي طرق للاسترخاء قبل كده؟"
    ]
  },

  "خائف": {
    mood_scores: { fear: 1.0, anxiety: 0.7 },
    intensity: 0.9,
    category: "negative",
    expected_reaction: "reassure",
    ai_empathy_trigger: 0.9,
    root: "خ-و-ف",
    derivatives: ["خوف"],
    related_terms: ["فزع", "ذعر"],
    context_shiftable: false,
    contextual_polarity: { positive: 0.02, negative: 0.98 },
    modifiers: ["للغاية", "لوقت طويل"],
    natural_reply_templates: [
      "الخوف شعور طبيعي — تحب توصف اللي خائف منه؟",
      "لو حابب أقدملك خطوات صغيرة للتعامل مع الخوف."
    ]
  },

  // Anger & Frustration
  "غاضب": {
    mood_scores: { anger: 1.0 },
    intensity: 0.9,
    category: "negative",
    expected_reaction: "validate",
    ai_empathy_trigger: 0.8,
    root: "غ-ض-ب",
    derivatives: ["غاضبة", "يغضب"],
    related_terms: ["سخط", "استياء"],
    context_shiftable: true,
    contextual_polarity: { positive: 0.05, negative: 0.95 },
    modifiers: ["جداً", "للغاية"],
    natural_reply_templates: [
      "واضح إنك زعلان جدًا — عايز تحكي السبب؟",
      "أكيد الإحساس ده مزعج، لو حابب نحل الموضوع سوا."
    ]
  },

  // Calm & Supportive
  "سلام": {
    mood_scores: { calming: 1.0, supportive: 0.6 },
    intensity: 0.85,
    category: "positive",
    expected_reaction: "celebrate",
    ai_empathy_trigger: 0.25,
    root: "س-ل-م",
    derivatives: ["سلامة", "مسالم"],
    related_terms: ["هدوء", "راحة"],
    context_shiftable: false,
    contextual_polarity: { positive: 0.98, negative: 0.02 },
    modifiers: [],
    natural_reply_templates: ["جميل إنك حاسس بالسلام — دا شيء مهم جداً."]
  },

  // Mixed / Nostalgia / Longing
  "اشتقت": {
    mood_scores: { sadness: 0.6, joy: 0.3, loneliness: 0.5 },
    intensity: 0.85,
    category: "mixed",
    expected_reaction: "empathize",
    ai_empathy_trigger: 0.9,
    root: "ش-و-ق",
    derivatives: ["اشتياق", "يا اشتياق"],
    related_terms: ["حنين", "فقد"],
    context_shiftable: true,
    contextual_polarity: { positive: 0.5, negative: 0.5 },
    modifiers: ["جداً", "للغاية", "شوي"],
    natural_reply_templates: [
      "الاشتياق شعور مركب — حابب تحكي عن مين أو إيه اللي بتفتقده؟"
    ]
  },

  // Example phrase entry (multi-word)
  "مش طايق نفسي": {
    mood_scores: { sadness: 0.9, anger: 0.4, anxiety: 0.6 },
    intensity: 1.0,
    category: "negative",
    expected_reaction: "comfort",
    ai_empathy_trigger: 1.0,
    root: null,
    derivatives: [],
    related_terms: ["نفور ذاتي", "إحباط شديد"],
    context_shiftable: false,
    contextual_polarity: { positive: 0.01, negative: 0.99 },
    modifiers: [],
    natural_reply_templates: [
      "الكلام ده جرس إنك محتاج دعم حقيقي — أنا هنا لو حبيت تتكلم."
    ]
  },

  // Gratitude / Appreciation
  "شكراً": {
    mood_scores: { supportive: 0.9, joy: 0.4 },
    intensity: 0.7,
    category: "positive",
    expected_reaction: "acknowledge",
    ai_empathy_trigger: 0.2,
    root: "ش-ك-ر",
    derivatives: ["مشكور", "ممتن"],
    related_terms: ["امتنان", "عرفان"],
    context_shiftable: false,
    contextual_polarity: { positive: 0.98, negative: 0.02 },
    modifiers: ["جداً", "كتير"],
    natural_reply_templates: ["على الرحب والسعة ❤️"]
  },

  // ... يمكنك إضافة المزيد من الكلمات هنا (النسخة النهائية في مشروعك يجب أن تشمل آلاف الإدخالات)
};

/* ===========================
   3) Indexing / Fast access structures
   =========================== */

const buildIndex = (dict) => {
  const index = {
    byCategory: {},
    byRoot: {},
    words: new Set()
  };
  for (const [word, meta] of Object.entries(dict)) {
    index.words.add(word);
    // category
    const cat = meta.category || "neutral";
    if (!index.byCategory[cat]) index.byCategory[cat] = new Set();
    index.byCategory[cat].add(word);
    // root
    if (meta.root) {
      if (!index.byRoot[meta.root]) index.byRoot[meta.root] = new Set();
      index.byRoot[meta.root].add(word);
    }
  }
  // convert sets to arrays (shallow)
  for (const k of Object.keys(index.byCategory)) index.byCategory[k] = Array.from(index.byCategory[k]);
  for (const k of Object.keys(index.byRoot)) index.byRoot[k] = Array.from(index.byRoot[k]);
  index.words = Array.from(index.words);
  return index;
};

export const EMOTIONAL_INDEX = buildIndex(EMOTIONAL_DICTIONARY);

/* ===========================
   4) Utilities: tokenization, normalization, affix-stripping hook
   =========================== */

/**
 * normalizeText - basic normalization for Arabic (light)
 * - converts to NFC (not necessary in JS always), removes diacritics optionally,
 *   trims punctuation, lowercases.
 */
export function normalizeText(text, { removeDiacritics = true } = {}) {
  if (!text) return "";
  let s = String(text).trim();
  // basic punctuation removal (keep Arabic letters & spaces and digits)
  s = s.replace(/[^\p{Script=Arabic}\p{L}\p{N}\s']/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (removeDiacritics) {
    // Arabic diacritics Unicode range
    s = s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "");
  }
  return s;
}

/**
 * simpleTokenizer - splits on spaces and keeps phrase n-grams optionally
 * returns array of tokens (words) and also phrase candidates (2-3 grams)
 */
export function simpleTokenizer(text, { ngrams = [1,2,3] } = {}) {
  const norm = normalizeText(text);
  const words = norm.split(" ").filter(Boolean);
  const tokens = new Set();
  // unigrams
  if (ngrams.includes(1)) words.forEach(w => tokens.add(w));
  // bigrams/trigrams
  for (const n of ngrams.filter(x => x > 1)) {
    for (let i=0; i <= words.length - n; i++) {
      tokens.add(words.slice(i, i+n).join(" "));
    }
  }
  return Array.from(tokens);
}

/* ===========================
   5) Emotion Interpreter Class
   - analyzeText(text, options) => aggregated profile
   - supports: modifiers, context shifts, affixStripper callback
   =========================== */

export class EmotionInterpreter {
  constructor({
    dictionary = EMOTIONAL_DICTIONARY,
    index = EMOTIONAL_INDEX,
    affixStripper = null, // optional function(word) -> strippedWord
    modifierAmplifiers = { "جداً": 1.25, "للغاية": 1.35, "شوي": 0.8 } // example
  } = {}) {
    this.dictionary = dictionary;
    this.index = index;
    this.affixStripper = affixStripper;
    this.modifierAmplifiers = modifierAmplifiers;
    // stats for adaptive learning
    this.usageStats = {}; // word -> {count, lastSeen, avgIntensity}
  }

  /**
   * findAnchor(word)
   * - tries: exact match -> affixStripper -> fuzzy (simple) -> null
   */
  findAnchor(word) {
    if (!word) return null;
    // exact
    if (this.dictionary[word]) return { key: word, meta: this.dictionary[word], matched: word };
    // affix stripper (if provided)
    if (this.affixStripper) {
      const stripped = this.affixStripper(word);
      if (stripped && this.dictionary[stripped]) return { key: stripped, meta: this.dictionary[stripped], matched: word };
    }
    // simple lowercase normalized search
    const norm = normalizeText(word);
    if (this.dictionary[norm]) return { key: norm, meta: this.dictionary[norm], matched: word };
    // phrase fuzzy: check dictionary keys that include word as substring (cheap)
    for (const key of Object.keys(this.dictionary)) {
      if (key.includes(" ") && key.includes(norm)) {
        return { key, meta: this.dictionary[key], matched: word };
      }
    }
    return null;
  }

  /**
   * applyModifiers(meta, contextTokens)
   * - increases/decreases intensity based on nearby modifiers
   */
  applyModifiers(meta, contextTokens = []) {
    let multiplier = 1.0;
    if (!meta.modifiers || !meta.modifiers.length) return { intensity: meta.intensity, multiplier };

    for (const mod of meta.modifiers) {
      if (contextTokens.includes(mod)) {
        const amp = this.modifierAmplifiers[mod] || 1.2;
        multiplier *= amp;
      }
    }
    // clamp
    const newIntensity = Math.min(1.5, (meta.intensity || 0.5) * multiplier);
    return { intensity: newIntensity, multiplier };
  }

  /**
   * combineProfiles(acc, anchorMeta, weight)
   * - acc: accumulated mood profile map
   * - anchorMeta: anchor meta object with mood_scores & intensity
   * - weight: scalar importance (e.g., phrase match > single word)
   */
  static combineProfiles(acc, anchorMeta, weight = 1.0) {
    const scores = anchorMeta.mood_scores || {};
    const intensity = anchorMeta.intensity || 0.8;
    for (const [dim, val] of Object.entries(scores)) {
      const contribution = (val * intensity * weight);
      acc[dim] = (acc[dim] || 0) + contribution;
    }
    return acc;
  }

  /**
   * normalizeProfile(profile)
   * - transforms accumulated scores to normalized 0..1 (soft)
   */
  static normalizeProfile(profile) {
    const normalized = {};
    const maxVal = Math.max(...Object.values(profile), 0.0001);
    for (const [k,v] of Object.entries(profile)) {
      normalized[k] = Math.min(1.0, v / maxVal);
    }
    return normalized;
  }

  /**
   * analyzeText
   * options:
   *   - includeTemplates: boolean -> include suggested response templates
   *   - topK: how many anchors to return
   */
  analyzeText(text, { includeTemplates = true, topK = 5 } = {}) {
    const tokens = simpleTokenizer(text, { ngrams: [1,2,3] });
    const contextTokens = tokens.map(t => normalizeText(t));
    const matches = [];
    let accProfile = {};

    // match tokens to anchors
    for (const token of tokens) {
      const match = this.findAnchor(token);
      if (!match) continue;
      const meta = match.meta;
      // check modifiers in context (window)
      const contextWindow = [];
      // build small window of words around token
      const words = normalizeText(text).split(" ");
      const idx = words.indexOf(normalizeText(token).split(" ")[0]); // approximate
      for (let i = Math.max(0, idx-3); i <= Math.min(words.length-1, idx+3); i++) contextWindow.push(words[i]);

      const { intensity: modIntensity, multiplier } = this.applyModifiers(meta, contextWindow);
      // copy modified meta for combining
      const metaCopy = { ...meta, intensity: modIntensity };
      // weight: longer phrase => higher weight
      const weight = Math.min(2.0, token.split(" ").length);
      // combine
      EmotionInterpreter.combineProfiles(accProfile, metaCopy, weight);
      matches.push({ token, key: match.key, meta: metaCopy, multiplier, weight });
      // record usage stats
      this._recordUsage(match.key, metaCopy.intensity);
    }

    // contextual polarity adjustments (very simple heuristic)
    // If many tokens are 'positive' category, boost positive dims, etc.
    const categoryCounts = {};
    for (const m of matches) {
      const c = (m.meta.category || "neutral");
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    }
    // apply small bias
    if ((categoryCounts["negative"] || 0) > (categoryCounts["positive"] || 0) * 1.5) {
      // bias toward calming/rescue dims
      accProfile["calming"] = (accProfile["calming"] || 0) + 0.5;
    }

    const normalized = EmotionInterpreter.normalizeProfile(accProfile);
    // sort top anchors by intensity*weight
    const anchorsSorted = matches.sort((a,b) => (b.meta.intensity*b.weight) - (a.meta.intensity*a.weight));

    // prepare suggested responses (templates)
    let suggestedResponses = [];
    if (includeTemplates) {
      for (let i = 0; i < Math.min(topK, anchorsSorted.length); i++) {
        const a = anchorsSorted[i];
        if (a.meta.natural_reply_templates && a.meta.natural_reply_templates.length) {
          suggestedResponses.push(...a.meta.natural_reply_templates.map(t => ({ template: t, anchor: a.key })));
        }
      }
      // unique
      suggestedResponses = Array.from(new Map(suggestedResponses.map(s => [s.template, s])).values());
    }

    return {
      rawProfile: accProfile,
      profile: normalized,
      anchors: anchorsSorted.map(a => ({ token: a.token, key: a.key, intensity: a.meta.intensity, weight: a.weight, category: a.meta.category })),
      suggestedResponses,
      categoryCounts
    };
  }

  /* ------------------
     Adaptive / Learning utilities
     ------------------ */

  _recordUsage(key, intensity) {
    const now = Date.now();
    if (!this.usageStats[key]) this.usageStats[key] = { count: 0, lastSeen: now, avgIntensity: 0 };
    const s = this.usageStats[key];
    s.count += 1;
    s.lastSeen = now;
    s.avgIntensity = ((s.avgIntensity * (s.count - 1)) + intensity) / s.count;
  }

  /**
   * addAnchor(word, meta)
   * - add or update anchor in dictionary and rebuild index
   */
  addAnchor(word, meta = {}) {
    if (!word) throw new Error("word required");
    this.dictionary[word] = {
      mood_scores: meta.mood_scores || {},
      intensity: meta.intensity || 0.8,
      category: meta.category || "neutral",
      expected_reaction: meta.expected_reaction || null,
      ai_empathy_trigger: meta.ai_empathy_trigger || 0.5,
      root: meta.root || null,
      derivatives: meta.derivatives || [],
      related_terms: meta.related_terms || [],
      context_shiftable: meta.context_shiftable || false,
      contextual_polarity: meta.contextual_polarity || { positive: 0.5, negative: 0.5 },
      modifiers: meta.modifiers || [],
      natural_reply_templates: meta.natural_reply_templates || []
    };
    // rebuild index (cheap)
    this.index = buildIndex(this.dictionary);
    return true;
  }

  updateAnchor(word, updates = {}) {
    if (!this.dictionary[word]) throw new Error("anchor not found");
    this.dictionary[word] = { ...this.dictionary[word], ...updates };
    this.index = buildIndex(this.dictionary);
    return this.dictionary[word];
  }

  /**
   * learnFromUsage(suggestedLabeling)
   * - suggestedLabeling: { text, correctedAnchors: [{word, meta}], userFeedback: {good:bool, corrections:...} }
   * - simple function to add new anchors or adjust intensity based on feedback
   */
  learnFromUsage({ text, correctedAnchors = [], userFeedback = {} } = {}) {
    // add corrected anchors
    for (const ca of correctedAnchors) {
      if (!this.dictionary[ca.word]) {
        this.addAnchor(ca.word, ca.meta || {});
      } else {
        // adjust intensity slightly toward observed
        const cur = this.dictionary[ca.word];
        cur.intensity = Math.max(0.1, Math.min(1.0, (cur.intensity + (ca.meta.intensity || cur.intensity)) / 2));
      }
    }
    // adjust usage stats if negative feedback
    if (userFeedback && userFeedback.good === false && userFeedback.anchor) {
      const key = userFeedback.anchor;
      if (this.dictionary[key]) {
        // reduce intensity slightly
        this.dictionary[key].intensity = Math.max(0.1, this.dictionary[key].intensity * 0.9);
      }
    }
    this.index = buildIndex(this.dictionary);
    return true;
  }

  /* ------------------
     Export helpers
     ------------------ */

  exportFlattenedList() {
    return Object.entries(this.dictionary).map(([word, meta]) => ({ word, ...meta }));
  }
}

/* ===========================
   6) Example affixStripper (optional)
   - This is a simple implementation; in production use a real morphological analyzer.
   =========================== */

export function simpleAffixStripper(word) {
  if (!word) return word;
  // common prefixes and suffixes (very coarse)
  const prefixes = ["ال", "و", "ف", "ب", "ك", "ل", "س", "سوف", "أ"];
  const suffixes = ["ون", "ين", "ات", "ان", "ة", "ه", "ها", "نا", "ي", "كم", "كن", "تما", "تم", "تن", "وا", "ا", "نَّ", "نْ"];
  let w = word;
  // strip prefixes (one pass)
  for (const p of prefixes) {
    if (w.startsWith(p) && w.length - p.length >= 2) { w = w.slice(p.length); break; }
  }
  // strip suffixes
  for (const s of suffixes) {
    if (w.endsWith(s) && w.length - s.length >= 2) { w = w.slice(0, -s.length); break; }
  }
  return w;
}

/* ===========================
   7) Convenience exports
   =========================== */

export const ALL_ANCHORS_LIST = Object.entries(EMOTIONAL_DICTIONARY).map(([word, data]) => ({ word, ...data }));

export default {
  EMOTIONAL_DICTIONARY,
  EMOTIONAL_INDEX,
  MOOD_DIMENSIONS,
  EmotionInterpreter,
  normalizeText,
  simpleTokenizer,
  simpleAffixStripper,
  ALL_ANCHORS_LIST
};


---

شرح سريع لطريقة الاستخدام (أمثلة)

1. استيراد وإنشاء محلل:



import { EmotionInterpreter, simpleAffixStripper } from './dictionaries/emotional_anchors_v5.js';

const interpreter = new EmotionInterpreter({
  affixStripper: simpleAffixStripper
});

const result = interpreter.analyzeText("أنا حزين جدا ومكتئب وحاسس بالوحدة");
console.log(result.profile);           // البروفايل العاطفي الموزون
console.log(result.suggestedResponses); // قوالب ردود جاهزة

2. إضافة مرسى جديد (تعلم تدريجي):



interpreter.addAnchor("مكسور", {
  mood_scores: { sadness: 0.95 },
  intensity: 0.9,
  category: "negative",
  natural_reply_templates: ["حسيت إنك مكسور — حابب تشارك اللي حصل؟"]
});

3. تصدير قائمة مسطحة:



const flat = interpreter.exportFlattenedList();

