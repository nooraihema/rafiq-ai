
// /analysis_engines/emotion_engine.js
// EmotionEngine v3.5 - The Psychodynamic Core (Finalized)
// Responsibility: تحليل العواطف - السطحية، الشدة، التنافر/التنافي، واستنتاج دلائل توجيهية.
// يبقى داخل اختصاصه فقط؛ لا يولّد ردوداً مباشرةً — يزوّد محركات القرار بما يلزم.

import { normalizeArabic } from '../core/utils.js';

export class EmotionEngine {
  /**
   * @param {Object} dictionaries - يتوقع وجود:
   *   - EMOTIONAL_ANCHORS: { EMOTIONAL_DICTIONARY, EmotionInterpreter }
   *   - INTENSITY_ANALYZER: { IntensityAnalyzerV5 }
   */
  constructor(dictionaries = {}) {
    if (!dictionaries.EMOTIONAL_ANCHORS || !dictionaries.INTENSITY_ANALYZER) {
      throw new Error(
        "EmotionEngine v3.5 requires EMOTIONAL_ANCHORS and INTENSITY_ANALYZER dictionaries."
      );
    }

    const EmotionInterpreterClass = dictionaries.EMOTIONAL_ANCHORS.EmotionInterpreter || (dictionaries.EMOTIONAL_ANCHORS.default && dictionaries.EMOTIONAL_ANCHORS.default.EmotionInterpreter);
    const IntensityAnalyzerClass = dictionaries.INTENSITY_ANALYZER.IntensityAnalyzerV5 || (dictionaries.INTENSITY_ANALYZER.default && dictionaries.INTENSITY_ANALYZER.default.IntensityAnalyzerV5);

    if (!EmotionInterpreterClass || !IntensityAnalyzerClass) {
      throw new Error("Required engine classes (EmotionInterpreter, IntensityAnalyzerV5) not found in dictionaries.");
    }

    // Instances
    this.emotionInterpreter = new EmotionInterpreterClass({
      dictionary: dictionaries.EMOTIONAL_ANCHORS.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS
    });

    this.intensityAnalyzer = new IntensityAnalyzerClass({
      seeds: this._prepareSeedsForIntensityAnalyzer(dictionaries.EMOTIONAL_ANCHORS.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS)
    });

    // Tunables
    this.SHIFT_SEGMENT_MIN_TOKENS = 4; // شرط لتقييم الانقسام للنصوص القصيرة
    this.AMBIVALENCE_THRESHOLD = 0.4;
    this.DISSONANCE_NEGATOR_BOOST = 0.3;
  }

  _prepareSeedsForIntensityAnalyzer(emotionalDictionary = {}) {
    const seeds = {};
    for (const [word, data] of Object.entries(emotionalDictionary || {})) {
      const key = normalizeArabic(word);
      seeds[key] = {
        emotions: data.mood_scores || data.emotions || {},
        base: data.intensity || data.base || 0.6
      };
    }
    return seeds;
  }

  /**
   * حساب تباين (variance) كمقياس لثبات المتجه العاطفي.
   * @param {Object.<string, number>} affectVector
   * @returns {number} stabilityScore في [0,1] (1 => ثابت، 0 => متقلب جداً)
   */
  _computeStabilityScore(affectVector = {}) {
    const vals = Object.values(affectVector || {});
    if (!vals.length) return 1.0;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    // نعيد مقياس عكسي للتباين مع تطبيع
    const stability = 1 - Math.min(1, variance * 3); // معامل 3 لتقوية الحساسيات
    return Number(stability.toFixed(3));
  }

  /**
   * يقيس تحول الحالة العاطفية بين النصف الأول والنصف الثاني من النص.
   * يعيد: { shiftDetected: boolean, earlyVector, lateVector, shiftMagnitude }
   */
  _detectEmotionalShift(text, tokens = [], intensityAnalyzerInstance = null) {
    // إذا النص قصير جداً لا نحاول
    if (!tokens || tokens.length < this.SHIFT_SEGMENT_MIN_TOKENS || !intensityAnalyzerInstance || typeof intensityAnalyzerInstance.analyze !== 'function') {
      return { shiftDetected: false, earlyVector: {}, lateVector: {}, shiftMagnitude: 0 };
    }

    const midpoint = Math.floor(tokens.length / 2);
    const earlyText = tokens.slice(0, midpoint).join(' ');
    const lateText = tokens.slice(midpoint).join(' ');

    const early = intensityAnalyzerInstance.analyze(earlyText) || {};
    const late = intensityAnalyzerInstance.analyze(lateText) || {};

    const earlyVec = early.affectVector || {};
    const lateVec = late.affectVector || {};

    // قياس المسافة الإقليدية البسيطة بين المتجهين
    const allKeys = Array.from(new Set([...Object.keys(earlyVec), ...Object.keys(lateVec)]));
    let sumSq = 0;
    for (const k of allKeys) {
      const a = earlyVec[k] || 0;
      const b = lateVec[k] || 0;
      sumSq += Math.pow(a - b, 2);
    }
    const shiftMagnitude = Math.sqrt(sumSq) / Math.sqrt(allKeys.length || 1);
    const shiftDetected = shiftMagnitude > 0.15; // عتبة عملية

    return { shiftDetected, earlyVector: earlyVec, lateVector: lateVec, shiftMagnitude: Number(shiftMagnitude.toFixed(3)) };
  }

  /**
   * تحليل التنافر المعرفي بين السطح (ما يقوله المستخدم) والمضمون (ما تلتقطه الشدة).
   * ارتكز على النسخة السابقة لكن مع حساسية أعلى وتفسيرات أكثر.
   */
  _analyzeCognitiveDissonance(surfaceAnalysis = {}, intensityAnalysis = {}) {
    const flags = new Set();
    let dissonanceScore = 0;

    const surfaceProfile = surfaceAnalysis.profile || surfaceAnalysis.rawProfile || surfaceAnalysis.emotions || {};
    const finalAffectVector = intensityAnalysis.affectVector || {};

    // Guard: ensure structures exist
    const explanations = intensityAnalysis.explanations || [];
    const flagsObj = intensityAnalysis.flags || {};

    // Dissonance A: strong negation (مثال: "مش حزين بالمرة" لكن توجد إشارات قوية للحزن)
    const negatorApplied = explanations.some(e =>
      Array.isArray(e.appliedPhrases) && e.appliedPhrases.some(p => (p.reason || "").toLowerCase().includes('negator'))
    );
    const strongSurface = Object.values(surfaceProfile || {}).some(v => v >= 0.8);
    if (negatorApplied && strongSurface) {
      flags.add('strong_negation');
      dissonanceScore += this.DISSONANCE_NEGATOR_BOOST;
    }

    // Dissonance B: positive masking negative
    const positiveSurface = Object.keys(surfaceProfile || {}).some(e => ['joy', 'hope', 'empowering', 'supportive'].includes(e));
    const negativeCore = Object.entries(finalAffectVector || {}).some(([e, score]) => ['sadness', 'anxiety', 'anger', 'fear'].includes(e) && score > 0.25);
    if (positiveSurface && negativeCore) {
      flags.add('positive_masking_negative');
      dissonanceScore += 0.45;
    }

    // Dissonance C: Ambivalence - وجود عواطف متضاربة بقوة عالية
    const sortedAffects = Object.entries(finalAffectVector || {}).sort((a, b) => b[1] - a[1]);
    if (sortedAffects.length >= 2 && sortedAffects[0][1] > this.AMBIVALENCE_THRESHOLD && sortedAffects[1][1] > this.AMBIVALENCE_THRESHOLD) {
      const top = sortedAffects[0][0];
      const runner = sortedAffects[1][0];
      // أزواج صراع نموذجية
      const conflictPairs = [['joy', 'sadness'], ['anger', 'calming'], ['fear', 'empowering'], ['hope', 'despair']];
      if (conflictPairs.some(pair => pair.includes(top) && pair.includes(runner))) {
        flags.add('ambivalence');
        dissonanceScore += 0.55;
      } else {
        // general emotional conflict
        flags.add('emotional_conflict');
        dissonanceScore += 0.35;
      }
    }

    // Dissonance D: sarcasm detection proxy (إذا كشف المحلل الشدّة سخرية)
    if (flagsObj && flagsObj.sarcasmDetected) {
      flags.add('possible_sarcasm');
      dissonanceScore += 0.25;
    }

    // clamp
    dissonanceScore = Math.min(1.0, dissonanceScore);

    return { flags: Array.from(flags), dissonanceScore: Number(dissonanceScore.toFixed(3)) };
  }

  /**
   * المحور الرئيسي: تحليل نص وإخراج بروفايل عاطفي غني داخل اختصاص EmotionEngine فقط.
   * @param {string} text
   * @param {Object} opts - { previousEmotion: {name,score} , tokens: optional pre-tokenized array }
   * @returns {Object} emotionProfile
   */
  analyze(text = '', opts = {}) {
    if (!text || typeof text !== 'string') return null;

    const normalizedText = normalizeArabic(text);
    // محاولة استخدام tokenization من intensity analyzer إن وُجد، وإلا نفصل ببساطة
    let tokens = [];
    try {
      tokens = (this.intensityAnalyzer && typeof this.intensityAnalyzer.tokenize === 'function')
        ? this.intensityAnalyzer.tokenize(normalizedText)
        : normalizedText.split(/\s+/).filter(Boolean);
    } catch (e) {
      tokens = normalizedText.split(/\s+/).filter(Boolean);
    }

    // Layer 1: Surface Analysis
    let surfaceAnalysis = {};
    try {
      surfaceAnalysis = this.emotionInterpreter.analyzeText(normalizedText) || {};
    } catch (e) {
      surfaceAnalysis = { profile: {}, rawProfile: {}, detailsError: true };
    }

    // Layer 2: Intensity / Nuance Analysis
    let intensityAnalysis = {};
    try {
      intensityAnalysis = this.intensityAnalyzer.analyze(normalizedText) || {};
    } catch (e) {
      intensityAnalysis = { affectVector: {}, explanations: [], flags: {}, meta: { fallback: true }, finalIntensity: 0.0 };
    }

    // Layer 3: Dissonance
    const dissonanceAnalysis = this._analyzeCognitiveDissonance(surfaceAnalysis, intensityAnalysis);

    // Stability
    const finalAffectVector = intensityAnalysis.affectVector || {};
    const stabilityScore = this._computeStabilityScore(finalAffectVector);

    // Emotional shift inside text
    const shiftAnalysis = this._detectEmotionalShift(normalizedText, tokens, this.intensityAnalyzer);

    // Primary / Secondary emotions
    const sortedAffects = Object.entries(finalAffectVector || {}).sort((a, b) => b[1] - a[1]);
    const primaryEmotion = sortedAffects[0] ? { name: sortedAffects[0][0], score: Number(sortedAffects[0][1].toFixed(3)) } : { name: 'neutral', score: 0 };
    const secondaryEmotion = (sortedAffects[1] && sortedAffects[1][1] > 0.2) ? { name: sortedAffects[1][0], score: Number(sortedAffects[1][1].toFixed(3)) } : null;

    // compare with previous emotion if provided (contextual comparison)
    const previousEmotion = opts.previousEmotion || null;
    let rapidChange = false;
    if (previousEmotion && previousEmotion.name && previousEmotion.name !== primaryEmotion.name) {
      const delta = Math.abs((previousEmotion.score || 0) - (primaryEmotion.score || 0));
      if (delta > 0.35) rapidChange = true;
    }

    // Recommendations generation (domain-limited: produce directives not text)
    const recommendations = new Set();
    if (dissonanceAnalysis.dissonanceScore > 0.5) recommendations.add('PROBE_FOR_HIDDEN_FEELINGS');
    if (primaryEmotion.name === 'anger' && primaryEmotion.score > 0.6) recommendations.add('VALIDATE_ANGER_BEFORE_SOLVING');
    if (primaryEmotion.name === 'sadness' && primaryEmotion.score > 0.7) recommendations.add('OFFER_PRESENCE_AND_SUPPORT');
    if (secondaryEmotion && secondaryEmotion.name === 'anxiety' && secondaryEmotion.score > 0.5) recommendations.add('SIMPLE_GROUNDING_EXERCISE');
    if (shiftAnalysis.shiftDetected) recommendations.add('CHECK_FOR_AMBIGUOUS_TRANSITION');
    if (rapidChange) recommendations.add('INQUIRE_RECENT_CONTEXT_CHANGES');
    if (!recommendations.size) recommendations.add('DEFAULT_VALIDATION');

    // Confidence score: توازن بين قوة العاطفة وانخفاض التنافر
    const baseConfidence = primaryEmotion.score || intensityAnalysis.finalIntensity || 0;
    const confidenceScore = Math.max(0, Math.min(1, baseConfidence * (1 - dissonanceAnalysis.dissonanceScore) * stabilityScore));

    // flags summary
    const flags = {
      sarcasm: Boolean(intensityAnalysis.flags && intensityAnalysis.flags.sarcasmDetected),
      repetition: Boolean(intensityAnalysis.flags && intensityAnalysis.flags.repetitionBoostSummary && Object.keys(intensityAnalysis.flags.repetitionBoostSummary).length > 0),
      dissonanceFlags: dissonanceAnalysis.flags || [],
      rapidChange,
      shiftDetected: shiftAnalysis.shiftDetected || false
    };

    // Build final profile (staying within responsibility: analysis only)
    const profile = {
      primaryEmotion,
      secondaryEmotion,
      affectVector: finalAffectVector,
      stabilityScore: Number(stabilityScore.toFixed(3)),
      dissonance: dissonanceAnalysis,
      shift: shiftAnalysis,
      intensity: (intensityAnalysis.meta && intensityAnalysis.meta.fallback) ? intensityAnalysis.finalIntensity : (intensityAnalysis.finalIntensity || primaryEmotion.score || 0),
      flags,
      recommendations: Array.from(recommendations),
      confidenceScore: Number(confidenceScore.toFixed(3)),
      _meta: {
        surface: surfaceAnalysis,
        intensity: intensityAnalysis,
        tokensLength: tokens.length,
        previousEmotion
      }
    };

    return profile;
  }
}

export default EmotionEngine;

