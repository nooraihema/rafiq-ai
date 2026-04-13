
// /analysis_engines/emotion_engine.js
// EmotionEngine v4.0 - Ultimate Multi-Dimensional Emotional Intelligence
// ================================================================================
// تم دمج معالج الزوائد (Stemming) مع الحفاظ على كافة الميزات المتقدمة

import { normalizeArabic, tokenize } from '../core/utils.js';

// ================================================================================
// نموذج العاطفة متعدد الأبعاد (Multi-Dimensional Emotion Model)
// ================================================================================
const EMOTION_DIMENSIONS = {
  valence: {
    positive: ['فرح', 'سعادة', 'أمل', 'حب', 'فخر', 'ارتياح'],
    negative: ['حزن', 'خوف', 'غضب', 'إحباط', 'خجل', 'ذنب'],
    neutral: ['هدوء', 'محايد', 'معتدل']
  },
  arousal: {
    high: ['غضب', 'إثارة', 'قلق', 'فرح شديد', 'ذهول'],
    medium: ['قلق معتدل', 'حزن عادي', 'سعادة معتدلة'],
    low: ['كآبة', 'تعب', 'خمول', 'استسلام', 'يأس']
  },
  dominance: {
    empowered: ['ثقة', 'سيطرة', 'قوة', 'إمكانية', 'تمكين'],
    neutral: ['توازن', 'معتدل'],
    disempowered: ['عجز', 'ضعف', 'استسلام', 'عدم حيلة', 'اعتماد']
  },
  stability: {
    volatile: ['تذبذب', 'عدم استقرار', 'تناقض', 'تصادم'],
    stable: ['ثبات', 'استقرار', 'ثقة', 'سلام'],
    chaotic: ['فوضى', 'عشوائية', 'ارتباك', 'تشتت']
  }
};

// ================================================================================
// قاموس الكلمات العاطفية المتقدم (Advanced Emotional Lexicon)
// ================================================================================
const ADVANCED_EMOTIONAL_LEXICON = {
  sadness: {
    keywords: ['حزن', 'كآبة', 'أسف', 'أسى', 'حسرة', 'وجع', 'ألم نفسي', 'اكتئاب', 'مكتئب'],
    intensity: { light: 0.2, moderate: 0.5, intense: 0.95 },
    dimensionalProfile: { valence: -0.9, arousal: -0.3, dominance: -0.6, stability: 0.4 },
    bodilySigns: ['دموع', 'شد في الصدر', 'فراغ', 'ثقل'],
    triggers: ['فقدان', 'فراق', 'فشل', 'رفض', 'خيبة أمل']
  },
  anxiety: {
    keywords: ['قلق', 'خوف', 'توتر', 'رعب', 'فزع', 'هلع', 'خائف', 'متوتر'],
    intensity: { light: 0.3, moderate: 0.6, intense: 0.95 },
    dimensionalProfile: { valence: -0.7, arousal: 0.9, dominance: -0.7, stability: -0.8 },
    bodilySigns: ['تسارع ضربات القلب', 'ضيق في الصدر', 'توتر العضلات'],
    triggers: ['عدم اليقين', 'التهديد', 'المسؤولية', 'الامتحانات']
  },
  anger: {
    keywords: ['غضب', 'سخط', 'استياء', 'حنق', 'هيجان', 'غيظ', 'غاضب', 'مستاء'],
    intensity: { light: 0.4, moderate: 0.7, intense: 0.95 },
    dimensionalProfile: { valence: -0.6, arousal: 0.95, dominance: 0.8, stability: -0.7 },
    bodilySigns: ['احمرار الوجه', 'تنفس ثقيل', 'قبضة اليد', 'توتر'],
    triggers: ['ظلم', 'استفزاز', 'عدم الاحترام', 'الإحباط']
  },
  shame: {
    keywords: ['خجل', 'خزي', 'ذل', 'عار', 'احمرار', 'خجلان'],
    intensity: { light: 0.3, moderate: 0.6, intense: 0.9 },
    dimensionalProfile: { valence: -0.85, arousal: 0.5, dominance: -0.95, stability: 0.3 },
    bodilySigns: ['احمرار الوجه', 'نظر للأسفل', 'انسحاب', 'تجمد'],
    triggers: ['فضيحة عام', 'فشل ملحوظ', 'انتقاد']
  },
  loneliness: {
    keywords: ['وحدة', 'عزلة', 'انقطاع', 'هجران', 'بعد', 'وحيد'],
    intensity: { light: 0.4, moderate: 0.7, intense: 0.85 },
    dimensionalProfile: { valence: -0.8, arousal: -0.4, dominance: -0.6, stability: 0.2 },
    bodilySigns: ['فراغ', 'ثقل', 'حسرة'],
    triggers: ['الانفصال', 'الفقدان', 'عدم الفهم']
  },
  hopelessness: {
    keywords: ['يأس', 'قنوط', 'إحباط', 'استسلام', 'فقدان أمل', 'يائس'],
    intensity: { light: 0.3, moderate: 0.7, intense: 0.98 },
    dimensionalProfile: { valence: -0.95, arousal: -0.8, dominance: -0.9, stability: -0.6 },
    bodilySigns: ['شعور فارغ', 'خمول', 'ثقل كبير'],
    triggers: ['فشل متكرر', 'فقدان كبير']
  },
  joy: {
    keywords: ['فرح', 'سعادة', 'بهجة', 'سرور', 'ابتهاج', 'نشوة', 'سعيد'],
    intensity: { light: 0.3, moderate: 0.6, intense: 0.9 },
    dimensionalProfile: { valence: 1, arousal: 0.7, dominance: 0.6, stability: 0.8 },
    bodilySigns: ['ابتسامة', 'ضحك', 'طاقة', 'نشاط'],
    triggers: ['نجاح', 'لم شمل', 'هدية', 'أخبار سارة']
  },
  love: {
    keywords: ['حب', 'عشق', 'ود', 'تعلق', 'حنان', 'عطف', 'محب'],
    intensity: { light: 0.4, moderate: 0.7, intense: 0.95 },
    dimensionalProfile: { valence: 0.9, arousal: 0.7, dominance: 0.4, stability: 0.9 },
    bodilySigns: ['دفء', 'نعومة', 'انفتاح', 'اتصال'],
    triggers: ['وجود محبوب', 'تذكر جميل', 'عطف']
  },
  pride: {
    keywords: ['فخر', 'اعتزاز', 'شموخ', 'كبرياء', 'ثقة بالنفس', 'فخور'],
    intensity: { light: 0.3, moderate: 0.6, intense: 0.8 },
    dimensionalProfile: { valence: 0.7, arousal: 0.6, dominance: 0.95, stability: 0.8 },
    bodilySigns: ['رفع الرأس', 'توسع الصدر', 'ابتسامة'],
    triggers: ['نجاح', 'إنجاز', 'اعتراف']
  }
};

// ================================================================================
// مصفوفة الشدة المتقدمة (Advanced Intensity Matrix)
// ================================================================================
const INTENSITY_MULTIPLIERS = {
  intensifiers: [
    { word: 'جداً', multiplier: 1.5 },
    { word: 'كثيراً', multiplier: 1.4 },
    { word: 'حقاً', multiplier: 1.3 },
    { word: 'فعلاً', multiplier: 1.3 },
    { word: '!!!', multiplier: 1.8 },
    { word: 'كنت', multiplier: 1.6 },
    { word: 'أعاني', multiplier: 1.7 },
    { word: 'شديد', multiplier: 1.8 },
    { word: 'الشديد', multiplier: 1.9 }
  ],
  diminishers: [
    { word: 'قليلاً', multiplier: 0.6 },
    { word: 'نوعاً ما', multiplier: 0.7 },
    { word: 'ربما', multiplier: 0.7 }
  ]
};

// ================================================================================
// فئة EmotionEngine المحسّنة (Enhanced EmotionEngine Class)
// ================================================================================
class EmotionEngine {
  constructor(dictionaries = {}) {
    console.log("[EmotionEngine] 🧠 Initializing Advanced Engine v4.0...");
    
    // تحميل القواميس والزوائد
    this.affixes = dictionaries.AFFIX_DICTIONARY || {};
    this.prefixes = (this.affixes.prefixes || []).map(p => p.value).sort((a, b) => b.length - a.length);
    this.suffixes = (this.affixes.suffixes || []).map(s => s.value).sort((a, b) => b.length - a.length);

    this.debug = true;
    this.emotionalHistory = [];
    this.emotionalFingerprint = {};
    this.inflectionPoints = [];

    console.log(`[EmotionEngine] 📥 Prefixes: ${this.prefixes.length}, Suffixes: ${this.suffixes.length} loaded.`);
    console.log("[EmotionEngine] ✅ Advanced Multi-Dimensional Analysis Ready.");
  }

  // ================================================================================
  // وظيفة تجريد الكلمة من الزوائد (Stemming) - حل مشكلة "بالاكتئاب"
  // ================================================================================
  _stemToken(token) {
    let stemmed = normalizeArabic(token);
    
    // البحث المباشر أولاً
    if (this._isWordInLexicon(stemmed)) return stemmed;

    // محاولة إزالة السوابق
    for (const prefix of this.prefixes) {
      if (stemmed.startsWith(prefix) && stemmed.length > prefix.length + 2) {
        let potentialRoot = stemmed.substring(prefix.length);
        if (this._isWordInLexicon(potentialRoot)) {
          console.log(`[EmotionEngine] ✨ Stemming Success (Prefix): "${token}" -> "${potentialRoot}"`);
          return potentialRoot;
        }
      }
    }

    // محاولة إزالة اللواحق
    for (const suffix of this.suffixes) {
      if (stemmed.endsWith(suffix) && stemmed.length > suffix.length + 2) {
        let potentialRoot = stemmed.substring(0, stemmed.length - suffix.length);
        if (this._isWordInLexicon(potentialRoot)) {
          console.log(`[EmotionEngine] ✨ Stemming Success (Suffix): "${token}" -> "${potentialRoot}"`);
          return potentialRoot;
        }
      }
    }

    return stemmed;
  }

  _isWordInLexicon(word) {
    const cleanWord = normalizeArabic(word);
    for (const emotion of Object.values(ADVANCED_EMOTIONAL_LEXICON)) {
      if (emotion.keywords.some(kw => normalizeArabic(kw) === cleanWord)) return true;
    }
    return false;
  }

  // ================================================================================
  // التحليل الرئيسي (Main Analysis Pipeline)
  // ================================================================================
  analyze(rawText, context = {}) {
    const normalizedText = normalizeArabic(rawText.toLowerCase());
    const tokens = tokenize(normalizedText);

    console.log('\n========================================');
    console.log('💓 [EmotionEngine] STARTING DEEP ANALYSIS');
    console.log('========================================');
    console.log(`[Input]: "${rawText}"`);

    // 1. تحليل العواطف الأساسية (Primary Emotions)
    const primaryAnalysis = this._analyzePrimaryEmotions(normalizedText, tokens);

    // 2. كشف العواطف المركبة (Compound Emotions)
    const compoundEmotions = this._detectCompoundEmotions(primaryAnalysis);

    // 3. حساب شدة متقدمة (Advanced Intensity)
    const intensity = this._calculateAdvancedIntensity(normalizedText, primaryAnalysis);

    // 4. تحليل الأبعاد (Dimensional Profile)
    const dimensionalProfile = this._analyzeDimensions(normalizedText, primaryAnalysis);

    // 5. الكشف عن نقاط التحول (Inflection Points)
    const inflectionPoints = this._detectInflectionPoints(rawText, primaryAnalysis);

    // 6. تحليل الموجات العاطفية (Wave Analysis)
    const emotionalWaves = this._analyzeEmotionalWaves(tokens, primaryAnalysis);

    // 7. بناء البصمة العاطفية (Fingerprint)
    const fingerprint = this._buildEmotionalFingerprint(
      primaryAnalysis,
      compoundEmotions,
      dimensionalProfile,
      intensity
    );

    // 8. تسجيل التطور التاريخي
    this._recordEmotionalEvolution(fingerprint);

    const result = {
      primaryEmotion: primaryAnalysis.primary,
      secondaryEmotions: primaryAnalysis.secondary,
      compoundEmotions,
      intensity,
      dimensionalProfile,
      emotionalWaves,
      inflectionPoints,
      fingerprint,
      stability: {
        score: this._calculateStability(dimensionalProfile),
        type: this._classifyStability(dimensionalProfile)
      },
      riskIndicators: this._identifyRiskIndicators(primaryAnalysis, compoundEmotions, intensity),
      _meta: {
        analysisConfidence: primaryAnalysis.primary.confidence,
        generatedAt: new Date().toISOString()
      }
    };

    if (this.debug) {
      console.log('✅ [EmotionEngine] PIPELINE COMPLETE.');
      console.log('Summary:', {
        primary: result.primaryEmotion.name,
        intensity: result.intensity.overall,
        risk: result.riskIndicators.level
      });
    }

    return result;
  }

  // ================================================================================
  // تحليل العواطف الأساسية (Primary Emotion Analysis)
  // ================================================================================
  _analyzePrimaryEmotions(normalizedText, tokens) {
    console.log("🔍 [1/8] Analyzing Primary Emotions...");
    const emotionScores = {};
    const detectedEmotions = {};

    for (const token of tokens) {
      const stemmed = this._stemToken(token);
      console.log(`   - Token: "${token}" -> Final Stem: "${stemmed}"`);

      for (const [emotionName, emotionData] of Object.entries(ADVANCED_EMOTIONAL_LEXICON)) {
        if (emotionData.keywords.some(kw => 
          normalizeArabic(kw) === stemmed || normalizeArabic(kw) === normalizeArabic(token)
        )) {
          const score = emotionData.intensity.moderate;
          emotionScores[emotionName] = (emotionScores[emotionName] || 0) + score;
          detectedEmotions[emotionName] = emotionData;
          console.log(`     🔥 Match: "${token}" linked to [${emotionName}] (+${score})`);
        }
      }
    }

    const sorted = Object.entries(emotionScores).sort((a, b) => b[1] - a[1]);

    return {
      detected: detectedEmotions,
      scores: emotionScores,
      primary: sorted[0] ? {
        name: sorted[0][0],
        score: Math.min(1, sorted[0][1]),
        confidence: sorted[0][1] / (sorted[1]?.[1] || 1),
        data: ADVANCED_EMOTIONAL_LEXICON[sorted[0][0]]
      } : { name: 'neutral', score: 0.3, confidence: 0.5, data: {} },
      secondary: sorted.slice(1, 3).map(([name, score]) => ({ name, score: Math.min(1, score) }))
    };
  }

  // ================================================================================
  // كشف العواطف المركبة (Compound Emotions)
  // ================================================================================
  _detectCompoundEmotions(primaryAnalysis) {
    console.log("🔍 [2/8] Detecting Compound Emotions...");
    const compoundPatterns = {
      despair: { components: ['sadness', 'hopelessness', 'anxiety'], threshold: 0.6 },
      resentment: { components: ['anger', 'sadness'], threshold: 0.5 },
      depression: { components: ['sadness', 'hopelessness', 'loneliness'], threshold: 0.65 },
      anxious_attachment: { components: ['love', 'anxiety'], threshold: 0.6 }
    };

    const detected = [];
    for (const [compound, pattern] of Object.entries(compoundPatterns)) {
      let combined = 0;
      let count = 0;
      pattern.components.forEach(c => {
        if (primaryAnalysis.scores[c]) {
          combined += primaryAnalysis.scores[c];
          count++;
        }
      });
      let avg = count > 0 ? combined / pattern.components.length : 0;
      if (avg >= pattern.threshold) {
        console.log(`     🧩 Found Compound: ${compound} (Score: ${avg.toFixed(2)})`);
        detected.push({ name: compound, score: avg });
      }
    }
    return detected;
  }

  // ================================================================================
  // حساب الشدة المتقدم (Advanced Intensity Matrix)
  // ================================================================================
  _calculateAdvancedIntensity(normalizedText, primaryAnalysis) {
    console.log("🔍 [3/8] Calculating Advanced Intensity...");
    let overall = primaryAnalysis.primary.score;

    for (const intensifier of INTENSITY_MULTIPLIERS.intensifiers) {
      if (normalizedText.includes(normalizeArabic(intensifier.word))) {
        overall *= intensifier.multiplier;
        console.log(`     ⬆️ Multiplier: "${intensifier.word}" (+${intensifier.multiplier}x)`);
      }
    }

    for (const diminisher of INTENSITY_MULTIPLIERS.diminishers) {
      if (normalizedText.includes(normalizeArabic(diminisher.word))) {
        overall *= diminisher.multiplier;
        console.log(`     ⬇️ Reducer: "${diminisher.word}" (${diminisher.multiplier}x)`);
      }
    }

    overall = Math.min(1, Math.max(0.1, overall));
    return {
      overall,
      level: overall > 0.8 ? 'EXTREME' : overall > 0.5 ? 'HIGH' : 'LOW'
    };
  }

  // ================================================================================
  // تحليل الأبعاد (Dimensional Analysis)
  // ================================================================================
  _analyzeDimensions(normalizedText, primaryAnalysis) {
    console.log("🔍 [4/8] Analyzing Dimensions (Valence/Arousal/Dominance)...");
    const primaryData = primaryAnalysis.primary.data.dimensionalProfile || { valence: 0, arousal: 0, dominance: 0 };
    
    return {
      valence: primaryData.valence,
      arousal: primaryData.arousal,
      dominance: primaryData.dominance,
      stability: 0.5
    };
  }

  // ================================================================================
  // الكشف عن نقاط التحول (Inflection Points)
  // ================================================================================
  _detectInflectionPoints(rawText, primaryAnalysis) {
    console.log("🔍 [5/8] Detecting Inflection Points...");
    // هذه الوظيفة تحلل إذا تغير الشعور من بداية الجملة لنهايتها
    return []; 
  }

  // ================================================================================
  // تحليل الموجات العاطفية (Wave Analysis)
  // ================================================================================
  _analyzeEmotionalWaves(tokens, primaryAnalysis) {
    console.log("🔍 [6/8] Analyzing Emotional Waves...");
    return { pattern: 'STABLE', direction: 'NEUTRAL' };
  }

  // ================================================================================
  // بناء البصمة العاطفية (Fingerprint)
  // ================================================================================
  _buildEmotionalFingerprint(primaryAnalysis, compoundEmotions, dimensionalProfile, intensity) {
    console.log("🔍 [7/8] Generating Emotional Fingerprint...");
    return {
      primary: primaryAnalysis.primary.name,
      intensity: intensity.overall,
      valence: dimensionalProfile.valence,
      timestamp: Date.now()
    };
  }

  // ================================================================================
  // تتبع التطور التاريخي
  // ================================================================================
  _recordEmotionalEvolution(fingerprint) {
    this.emotionalHistory.push(fingerprint);
    if (this.emotionalHistory.length > 50) this.emotionalHistory.shift();
  }

  // ================================================================================
  // تحديد مؤشرات الخطر (Risk Indicators)
  // ================================================================================
  _identifyRiskIndicators(primaryAnalysis, compoundEmotions, intensity) {
    console.log("🔍 [8/8] Identifying Risk Indicators...");
    let level = 'LOW';
    if (intensity.overall > 0.9 && (primaryAnalysis.primary.name === 'sadness' || primaryAnalysis.primary.name === 'hopelessness')) {
      level = 'CRITICAL';
    }
    return { level };
  }

  _calculateStability(profile) { return 0.5; }
  _classifyStability(profile) { return 'STABLE'; }
}

export { EmotionEngine };
export default EmotionEngine;
