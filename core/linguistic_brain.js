// dictionaries/linguistic_brain.js
// Unified Dictionary Hub / Linguistic Brain
// Purpose: واجهة موحدة لكل القواميس — تقدم للـ analysis engines واجهة واحدة غنية بالـ insights
// Content-first: كل الوظائف الأساسية لربط القواميس، تنقية النص، استدعاء محركات الشدة/المفاهيم/الأنماط، وإصدار "Insight" جاهز للاستعمال.

const DEFAULT_OPTIONS = {
  debug: false,
  dictionaryPaths: {
    affixes: './affixes.js',
    emotionalAnchors: './emotional_anchors.js',
    intensityAnalyzer: './intensity_analyzer.js',
    conceptsEngine: './psychological_concepts_engine.js',
    patternsHyperreal: './psychological_patterns_hyperreal.js',
    behaviorValues: './behavior_values_defenses.js',
    generative: './generative_responses_engine.js'
  },
  maxConcepts: 6
};

function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function now() { return Date.now(); }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function normalizeArabicLite(text = "") {
  if (!text) return "";
  let s = String(text);
  s = s.replace(/[إأآا]/g, 'ا');
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  s = s.replace(/ّ/g, '');
  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '');
  s = s.replace(/[“”«»"']/g, '');
  s = s.replace(/\r\n|\n/g, ' ');
  s = s.replace(/[^\S\r\n]+/g, ' ');
  return s.trim();
}
function tokenizeLite(text = "") {
  const n = normalizeArabicLite(text);
  if (!n) return [];
  return n.split(/\s+/).filter(Boolean);
}

export class LinguisticBrain {
  constructor(opts = {}) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, opts);
    this.core = {
      affixes: null,
      emotionalAnchors: null,
      intensityAnalyzerClass: null,
      conceptsEngine: null,
      patternsEngine: null,
      behaviorValues: null,
      generative: null
    };
    this.instances = {
      intensityAnalyzer: null,
      conceptsEngine: null,
      patternsEngine: null
    };
    this.registeredUserSynonyms = {};
    this.memory = {}; // lightweight in-memory store (can be replaced by external)
    this._isInitialized = false;
  }

  // try to import known dictionary modules dynamically (best-effort)
  async init(autoImport = true) {
    if (!autoImport) { this._isInitialized = true; return; }
    const p = this.options.dictionaryPaths;
    const tryImport = async (path) => {
      try {
        // dynamic import - works in modern bundlers/node with ES modules
        const mod = await import(path);
        return mod.default || mod;
      } catch (e) {
        if (this.options.debug) console.warn('LinguisticBrain: import failed', path, e.message || e);
        return null;
      }
    };
    this.core.affixes = await tryImport(p.affixes);
    this.core.emotionalAnchors = await tryImport(p.emotionalAnchors);
    const intensityModule = await tryImport(p.intensityAnalyzer);
    if (intensityModule) {
      // accept class export or default holder
      this.core.intensityAnalyzerClass = intensityModule.IntensityAnalyzerV5 || intensityModule.IntensityAnalyzer || intensityModule.default?.IntensityAnalyzerV5 || intensityModule.default?.IntensityAnalyzer || intensityModule;
      try { this.instances.intensityAnalyzer = (typeof this.core.intensityAnalyzerClass === 'function') ? new this.core.intensityAnalyzerClass({ options: { debug: false } }) : null; } catch(e){}
    }
    const conceptsModule = await tryImport(p.conceptsEngine);
    if (conceptsModule) {
      this.core.conceptsEngine = conceptsModule;
      try {
        const ConceptEngineClass = conceptsModule.ConceptEngine || conceptsModule.default?.ConceptEngine;
        if (ConceptEngineClass) this.instances.conceptsEngine = new ConceptEngineClass(conceptsModule.CONCEPT_DEFINITIONS || {}, conceptsModule.CONCEPT_MAP || {});
      } catch(e){}
    }
    this.core.patternsEngine = await tryImport(p.patternsHyperreal);
    this.core.behaviorValues = await tryImport(p.behaviorValues);
    this.core.generative = await tryImport(p.generative);
    this._isInitialized = true;
    return this;
  }

  // register runtime synonym into emotional anchors map or a target concept
  registerUserSynonym(conceptKey, word, target = 'concepts') {
    this.registeredUserSynonyms[word] = { conceptKey, target, ts: now() };
    if (target === 'concepts' && this.core.conceptsEngine && this.core.conceptsEngine.CONCEPT_MAP) {
      if (!this.core.conceptsEngine.CONCEPT_MAP[word]) {
        // link simple mapping
        this.core.conceptsEngine.CONCEPT_MAP[normalizeArabicLite(word)] = [{ concept: conceptKey, weight: 0.9 }];
      }
    }
    if (target === 'emotionalAnchors' && this.core.emotionalAnchors && this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY) {
      const norm = normalizeArabicLite(word);
      this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY[norm] = this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY[norm] || { mood_scores: {}, intensity: 0.6, category: 'neutral' };
    }
    return true;
  }

  // low-level helpers
  normalize(text) { return normalizeArabicLite(text); }
  tokenize(text) { return tokenizeLite(text); }

  // morphological step (best-effort)
  applyMorphology(tokens = []) {
    if (!this.core.affixes || typeof this.core.affixes === 'object' && !this.core.affixes) return { lemmas: tokens.slice(), tokens };
    try {
      // if affixes module exposes simple functions, use them; otherwise fallback
      if (this.core.affixes && typeof this.core.affixes.stripAffixes === 'function') {
        const lemmas = tokens.map(t => this.core.affixes.stripAffixes(t));
        return { lemmas, tokens };
      }
      // fallback: return tokens as lemmas
      return { lemmas: tokens.slice(), tokens };
    } catch (e) {
      return { lemmas: tokens.slice(), tokens };
    }
  }

  // emotion detection using emotionalAnchors dictionary
  detectEmotionalAnchors(lemmas = [], rawText = "") {
    const anchors = this.core.emotionalAnchors && (this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY || this.core.emotionalAnchors) || {};
    const found = {};
    const wordsSet = new Set(lemmas.map(normalizeArabicLite));
    for (const [k, meta] of Object.entries(anchors)) {
      const nk = normalizeArabicLite(k);
      if (wordsSet.has(nk) || rawText.includes(nk)) {
        const mood = meta.mood_scores || meta.emotions || {};
        const intensity = meta.intensity || meta.base || 0.6;
        for (const [dim, score] of Object.entries(mood)) {
          found[dim] = (found[dim] || 0) + (score * intensity);
        }
      }
    }
    // normalize to 0..1 by max
    const max = Math.max(...Object.values(found), 0.00001);
    const normalized = {};
    for (const [k, v] of Object.entries(found)) normalized[k] = clamp(v / max, 0, 1);
    return { raw: found, normalized };
  }

  // intensity via intensity analyzer if available else primitive fallback
  computeIntensity(rawText = "", seedAnchors = {}) {
    if (this.instances.intensityAnalyzer && typeof this.instances.intensityAnalyzer.analyze === 'function') {
      try {
        const out = this.instances.intensityAnalyzer.analyze(rawText, this.instances.intensityAnalyzer.buildAnchorsFromDictionary ? this.instances.intensityAnalyzer.buildAnchorsFromDictionary(seedAnchors) : seedAnchors);
        // conform to expected structure
        return out;
      } catch (e) {
        if (this.options.debug) console.warn('Intensity analyzer failed', e);
      }
    }
    // fallback heuristic
    const tokens = this.tokenize(rawText);
    let base = 0.1;
    for (const t of tokens) {
      const norm = normalizeArabicLite(t);
      if (this.core.emotionalAnchors && this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY && this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY[norm]) {
        base += (this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY[norm].intensity || 0.6);
      }
      if (this.core.intensityAnalyzerClass && this.core.intensityAnalyzerClass.INTENSITY_MODIFIERS && this.core.intensityAnalyzerClass.INTENSITY_MODIFIERS[norm]) {
        base *= (this.core.intensityAnalyzerClass.INTENSITY_MODIFIERS[norm].multiplier || 1.0);
      }
    }
    base = clamp(base, 0, 3);
    return { affectVector: {}, intensityMap: {}, explanations: [], flags: {}, meta: { fallback: true, baseline: base }, finalIntensity: base };
  }

  // concept detection using conceptsEngine if available
  detectConcepts(lemmas = [], rawText = "") {
    const result = {};
    if (this.instances.conceptsEngine && typeof this.instances.conceptsEngine.analyzeText === 'function') {
      try {
        const r = this.instances.conceptsEngine.analyzeText(rawText || lemmas.join(' '));
        // return profile map
        const profile = r.profile || {};
        return { profile, concepts: r.concepts || [] };
      } catch (e) {
        if (this.options.debug) console.warn('Concept engine failed', e);
      }
    }
    // fallback: simple lookup from common maps if emotionalAnchors contains related_terms or core.conceptsEngine.CONCEPT_MAP exists
    const conceptMap = (this.core.conceptsEngine && this.core.conceptsEngine.CONCEPT_MAP) || {};
    const found = {};
    const textNorm = normalizeArabicLite(rawText);
    for (const [token, mappings] of Object.entries(conceptMap)) {
      const nk = normalizeArabicLite(token);
      if (textNorm.includes(nk)) {
        for (const m of mappings) {
          found[m.concept] = (found[m.concept] || 0) + (m.weight || 0.5);
        }
      }
    }
    return { profile: found, concepts: Object.keys(found).map(k => ({ concept: k, weight: found[k] })) };
  }

  // pattern detection via patternsEngine if present
  detectPatterns(conceptProfile = {}) {
    if (this.core.patternsEngine && typeof this.core.patternsEngine.findPatternsByConcepts === 'function') {
      try {
        const v = this.core.patternsEngine.findPatternsByConcepts(Object.keys(conceptProfile));
        return v;
      } catch (e) {
        if (this.options.debug) console.warn('Patterns engine failed', e);
      }
    }
    // fallback: naive heuristics: map common combos to known patterns
    const heuristics = [];
    if (conceptProfile.anxiety > 0.4 && conceptProfile.rumination > 0.2) heuristics.push({ pattern_id: 'anxiety_feeds_rumination', score: 0.9 });
    if (conceptProfile.people_pleasing > 0.4) heuristics.push({ pattern_id: 'people_pleasing_erodes_self_esteem', score: 0.7 });
    return heuristics;
  }

  // personality / behavior profile synth
  synthesizePersonality(conceptProfile = {}, rawText = "") {
    const bv = this.core.behaviorValues || {};
    const hypotheses = [];
    if (bv && bv.BEHAVIORS) {
      for (const [k, v] of Object.entries(bv.BEHAVIORS)) {
        // check triggers
        const triggers = v.triggers || [];
        for (const t of triggers) {
          if (conceptProfile[t] && conceptProfile[t] > 0.3) {
            hypotheses.push({ behavior: k, confidence: clamp(conceptProfile[t], 0, 1), info: v });
            break;
          }
        }
      }
    } else {
      // simple inference: high anxiety -> avoidant tendency
      if (conceptProfile.anxiety > 0.6) hypotheses.push({ behavior: 'withdrawal_tendency', confidence: clamp(conceptProfile.anxiety, 0.2, 1.0) });
      if (conceptProfile.self_blame > 0.5) hypotheses.push({ behavior: 'self_critical', confidence: clamp(conceptProfile.self_blame, 0.2, 1.0) });
    }
    return { hypotheses };
  }

  // fuse concepts + affect into ranked intents (simple fusion or use patterns engine)
  fuseConceptsAndAffect(conceptProfile = {}, affectVector = {}) {
    // simple weighting: concept weight * (1 + affectDimension)
    const fused = {};
    for (const [concept, weight] of Object.entries(conceptProfile)) {
      let emotionInfluence = 0;
      // map concept -> related emotion if available from conceptsEngine
      try {
        const map = this.core.conceptsEngine && this.core.conceptsEngine.CONCEPT_DEFINITIONS && this.core.conceptsEngine.CONCEPT_DEFINITIONS[concept];
        if (map && map.mood_weights) {
          emotionInfluence = Object.values(map.mood_weights).reduce((s, v) => s + v, 0) / (Object.keys(map.mood_weights).length || 1);
        }
      } catch (e) {}
      const affectBoost = Math.min(1, Object.values(affectVector || {}).reduce((s, v) => s + v, 0));
      fused[concept] = clamp((weight * (1 + emotionInfluence * 0.5 + affectBoost * 0.25)), 0, 10);
    }
    const ranked = Object.entries(fused).sort((a,b)=>b[1]-a[1]).slice(0, this.options.maxConcepts).map(([c,w]) => ({ concept: c, weight: w }));
    return { fused, ranked };
  }

  // produce "suggested directions" (what should be said) as high-level tags (not actual text)
  suggestDirections({ affectVector = {}, conceptProfile = {}, patterns = [], personality = {} } = {}) {
    const suggestions = [];
    // safety first
    const severeSadness = (affectVector.sadness || 0) > 0.85;
    const severeAnxiety = (affectVector.anxiety || 0) > 0.9;
    if (severeSadness) suggestions.push({ key: 'safety_check', reason: 'very_high_sadness' });
    if (severeAnxiety) suggestions.push({ key: 'grounding', reason: 'very_high_anxiety' });
    // pattern-based suggestions
    for (const p of patterns || []) {
      const pid = p.pattern_id || p.pattern || p;
      if (String(pid).includes('rumination')) suggestions.push({ key: 'limit_rumination', reason: pid });
      if (String(pid).includes('people_pleasing')) suggestions.push({ key: 'explore_boundaries', reason: pid });
      if (p.risk_level >= 2) suggestions.push({ key: 'refer_specialist', reason: pid });
    }
    // concept-driven choices
    if ((conceptProfile.self_blame || 0) > 0.4) suggestions.push({ key: 'compassionate_reframe', reason: 'self_blame' });
    if ((conceptProfile.helplessness || 0) > 0.4) suggestions.push({ key: 'empower_small_wins', reason: 'helplessness' });
    // personality hints
    if (personality && personality.hypotheses && personality.hypotheses.find(h => h.behavior === 'self_critical')) suggestions.push({ key: 'gentle_validation', reason: 'self_critical' });
    // default: validation
    if (suggestions.length === 0) suggestions.push({ key: 'validation', reason: 'no_high_priority' });
    return suggestions;
  }

  // main pipeline: analyze message and return comprehensive insight (synchronous facade)
  async analyzeMessage(rawText, opts = {}) {
    if (!this._isInitialized) {
      try { await this.init(true); } catch (e) { /* proceed even if import failed */ }
    }
    const start = now();
    const text = String(rawText || '');
    const normalized = this.normalize(text);
    const tokens = this.tokenize(text);
    const morphology = this.applyMorphology(tokens);
    const lemmas = morphology.lemmas || tokens;
    const emotionalAnchors = this.detectEmotionalAnchors(lemmas, normalized);
    const intensityResult = this.computeIntensity(normalized, this.core.emotionalAnchors && this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY ? this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY : {});
    const conceptDetection = this.detectConcepts(lemmas, normalized);
    const patterns = this.detectPatterns(conceptDetection.profile || {});
    const personality = this.synthesizePersonality(conceptDetection.profile || {}, normalized);
    const fused = this.fuseConceptsAndAffect(conceptDetection.profile || {}, emotionalAnchors.normalized || {});
    const suggestions = this.suggestDirections({ affectVector: emotionalAnchors.normalized || {}, conceptProfile: conceptDetection.profile || {}, patterns: patterns || [], personality });
    const insight = {
      text,
      normalized,
      tokens,
      lemmas,
      morphology,
      emotionalAnchors,
      intensity: intensityResult,
      conceptProfile: conceptDetection.profile || {},
      conceptHits: conceptDetection.concepts || [],
      fusedIntents: fused,
      patterns,
      personality,
      suggestions,
      meta: {
        durationMs: now() - start,
        modulesLoaded: Object.keys(this.core).filter(k => !!this.core[k]),
        initialized: this._isInitialized
      }
    };
    // lightweight memory record per user-less mode (append only)
    (this.memory.recentInsights || (this.memory.recentInsights = [])).push({ ts: now(), insightSummary: { suggestions, topConcepts: fused.ranked.map(x=>x.concept) } });
    if (this.memory.recentInsights.length > 200) this.memory.recentInsights.shift();
    return insight;
  }

  // convenience: quick pipeline for external engines expecting specific fields
  async analyzeAndFormatForResponder(rawText, opts = {}) {
    const insight = await this.analyzeMessage(rawText, opts);
    // produce responder-friendly payload
    const topConcept = insight.fusedIntents.ranked[0] || null;
    const primaryEmotion = insight.emotionalAnchors.normalized && Object.entries(insight.emotionalAnchors.normalized).sort((a,b)=>b[1]-a[1])[0];
    const payload = {
      original: insight.text,
      primaryConcept: topConcept ? topConcept.concept : null,
      primaryConceptScore: topConcept ? topConcept.weight : 0,
      primaryEmotion: primaryEmotion ? { name: primaryEmotion[0], score: primaryEmotion[1] } : null,
      suggestions: insight.suggestions,
      safetyFlags: insight.intensity && insight.intensity.flags ? insight.intensity.flags : {},
      patternHits: insight.patterns
    };
    return payload;
  }

  // utility to merge external anchors or concept maps into the hub at runtime
  mergeExternalDictionary(dictType, dictObj = {}) {
    if (!dictType || !dictObj) return false;
    const t = dictType.toLowerCase();
    if (t.includes('emotion') && this.core.emotionalAnchors && this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY) {
      Object.assign(this.core.emotionalAnchors.EMOTIONAL_ANCHORS_DICTIONARY, dictObj);
      return true;
    }
    if (t.includes('concept') && this.core.conceptsEngine && this.core.conceptsEngine.CONCEPT_MAP) {
      Object.assign(this.core.conceptsEngine.CONCEPT_MAP, dictObj);
      return true;
    }
    if (t.includes('intensity') && this.core.intensityAnalyzerClass && this.core.intensityAnalyzerClass.INTENSITY_MODIFIERS) {
      Object.assign(this.core.intensityAnalyzerClass.INTENSITY_MODIFIERS, dictObj);
      return true;
    }
    // fallback: attach to hub
    this[dictType] = Object.assign(this[dictType] || {}, dictObj);
    return true;
  }
}

// default export convenience
export default LinguisticBrain;
