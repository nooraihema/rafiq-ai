
// /analysis_engines/emotion_engine.js
// EmotionEngine v3.7 - Advanced Multi-Dimensional Emotional Analysis
// ================================================================================
// ميزات جديدة ثورية:
// 1. 🎭 تحليل العواطف متعددة الأبعاد (Multi-Dimensional Emotion Analysis)
// 2. 💔 الكشف عن العواطف المركبة (Compound Emotions Detection)
// 3. 🔄 تتبع تطور العاطفة (Emotion Evolution Tracking)
// 4. 🎯 مصفوفة الشدة المتقدمة (Advanced Intensity Matrix)
// 5. 🧬 بصمة عاطفية فريدة (Unique Emotional Fingerprint)
// 6. ⚡ كشف نقاط التحول العاطفي (Emotional Inflection Points)
// 7. 🌊 تحليل الموجات العاطفية (Emotional Wave Analysis)

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
    keywords: ['حزن', 'كآبة', 'أسف', 'أسى', 'حسرة', 'وجع', 'ألم نفسي'],
    intensity: { light: 0.2, moderate: 0.5, intense: 0.95 },
    dimensionalProfile: { valence: -0.9, arousal: -0.3, dominance: -0.6, stability: 0.4 },
    bodilySigns: ['دموع', 'شد في الصدر', 'فراغ', 'ثقل'],
    triggers: ['فقدان', 'فراق', 'فشل', 'رفض', 'خيبة أمل']
  },

  anxiety: {
    keywords: ['قلق', 'خوف', 'توتر', 'رعب', 'فزع', 'هلع'],
    intensity: { light: 0.3, moderate: 0.6, intense: 0.95 },
    dimensionalProfile: { valence: -0.7, arousal: 0.9, dominance: -0.7, stability: -0.8 },
    bodilySigns: ['تسارع ضربات القلب', 'ضيق في الصدر', 'توتر العضلات'],
    triggers: ['عدم اليقين', 'التهديد', 'المسؤولية', 'الامتحانات']
  },

  anger: {
    keywords: ['غضب', 'سخط', 'استياء', 'حنق', 'هيجان', 'غيظ'],
    intensity: { light: 0.4, moderate: 0.7, intense: 0.95 },
    dimensionalProfile: { valence: -0.6, arousal: 0.95, dominance: 0.8, stability: -0.7 },
    bodilySigns: ['احمرار الوجه', 'تنفس ثقيل', 'قبضة اليد', 'توتر'],
    triggers: ['ظلم', 'استفزاز', 'عدم الاحترام', 'الإحباط']
  },

  shame: {
    keywords: ['خجل', 'خزي', 'ذل', 'عار', 'احمرار'],
    intensity: { light: 0.3, moderate: 0.6, intense: 0.9 },
    dimensionalProfile: { valence: -0.85, arousal: 0.5, dominance: -0.95, stability: 0.3 },
    bodilySigns: ['احمرار الوجه', 'نظر للأسفل', 'انسحاب', 'تجمد'],
    triggers: ['فضيحة عام', 'فشل ملحوظ', 'انتقاد']
  },

  loneliness: {
    keywords: ['وحدة', 'عزلة', 'انقطاع', 'هجران', 'بعد'],
    intensity: { light: 0.4, moderate: 0.7, intense: 0.85 },
    dimensionalProfile: { valence: -0.8, arousal: -0.4, dominance: -0.6, stability: 0.2 },
    bodilySigns: ['فراغ', 'ثقل', 'حسرة'],
    triggers: ['الانفصال', 'الفقدان', 'عدم الفهم']
  },

  hopelessness: {
    keywords: ['يأس', 'قنوط', 'إحباط', 'استسلام', 'فقدان أمل'],
    intensity: { light: 0.3, moderate: 0.7, intense: 0.98 },
    dimensionalProfile: { valence: -0.95, arousal: -0.8, dominance: -0.9, stability: -0.6 },
    bodilySigns: ['شعور فارغ', 'خمول', 'ثقل كبير'],
    triggers: ['فشل متكرر', 'فقدان كبير']
  },

  joy: {
    keywords: ['فرح', 'سعادة', 'بهجة', 'سرور', 'ابتهاج', 'نشوة'],
    intensity: { light: 0.3, moderate: 0.6, intense: 0.9 },
    dimensionalProfile: { valence: 1, arousal: 0.7, dominance: 0.6, stability: 0.8 },
    bodilySigns: ['ابتسامة', 'ضحك', 'طاقة', 'نشاط'],
    triggers: ['نجاح', 'لم شمل', 'هدية', 'أخبار سارة']
  },

  love: {
    keywords: ['حب', 'عشق', 'ود', 'تعلق', 'حنان', 'عطف'],
    intensity: { light: 0.4, moderate: 0.7, intense: 0.95 },
    dimensionalProfile: { valence: 0.9, arousal: 0.7, dominance: 0.4, stability: 0.9 },
    bodilySigns: ['دفء', 'نعومة', 'انفتاح', 'اتصال'],
    triggers: ['وجود محبوب', 'تذكر جميل', 'عطف']
  },

  pride: {
    keywords: ['فخر', 'اعتزاز', 'شموخ', 'كبرياء', 'ثقة بالنفس'],
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
    { word: 'أعاني', multiplier: 1.7 }
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
export class EmotionEngine {
  constructor(dictionaries = {}) {
    if (!dictionaries.EMOTIONAL_ANCHORS || !dictionaries.INTENSITY_ANALYZER) {
      throw new Error(
        "EmotionEngine requires EMOTIONAL_ANCHORS and INTENSITY_ANALYZER dictionaries."
      );
    }

    const EmotionInterpreterClass = 
      dictionaries.EMOTIONAL_ANCHORS.EmotionInterpreter || 
      (dictionaries.EMOTIONAL_ANCHORS.default?.EmotionInterpreter);
    
    const IntensityAnalyzerClass = 
      dictionaries.INTENSITY_ANALYZER.IntensityAnalyzerV5 || 
      (dictionaries.INTENSITY_ANALYZER.default?.IntensityAnalyzerV5);

    if (!EmotionInterpreterClass || !IntensityAnalyzerClass) {
      throw new Error("Required engine classes not found in dictionaries.");
    }

    this.emotionInterpreter = new EmotionInterpreterClass({
      dictionary: dictionaries.EMOTIONAL_ANCHORS.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS
    });

    this.intensityAnalyzer = new IntensityAnalyzerClass({
      seeds: this._prepareSeedsForIntensityAnalyzer(
        dictionaries.EMOTIONAL_ANCHORS.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS
      )
    });

    this.debug = true;
    this.emotionalHistory = [];
    this.emotionalFingerprint = {};
    this.inflectionPoints = [];
    
    console.log("[EmotionEngine] ✅ Initialization complete - Advanced Multi-Dimensional Analysis");
  }

  // ================================================================================
  // التحليل الرئيسي (Main Analysis)
  // ================================================================================
  analyze(rawText, context = {}) {
    const normalizedText = normalizeArabic(rawText.toLowerCase());
    const tokens = tokenize(normalizedText);

    if (this.debug) {
      console.log('\n[EmotionEngine] Starting advanced analysis...');
      console.log(`[Text]: "${rawText}"`);
    }

    // 1. تحليل الأبعاد الأساسية
    const primaryAnalysis = this._analyzePrimaryEmotions(normalizedText, tokens);

    // 2. كشف العواطف المركبة
    const compoundEmotions = this._detectCompoundEmotions(primaryAnalysis);

    // 3. حساب شدة متقدمة
    const intensity = this._calculateAdvancedIntensity(normalizedText, primaryAnalysis);

    // 4. تحليل الأبعاد متعددة
    const dimensionalProfile = this._analyzeDimensions(normalizedText, primaryAnalysis);

    // 5. الكشف عن نقاط التحول
    const inflectionPoints = this._detectInflectionPoints(rawText, primaryAnalysis);

    // 6. تحليل الموجات العاطفية
    const emotionalWaves = this._analyzeEmotionalWaves(tokens, primaryAnalysis);

    // 7. بناء البصمة العاطفية
    const fingerprint = this._buildEmotionalFingerprint(
      primaryAnalysis,
      compoundEmotions,
      dimensionalProfile,
      intensity
    );

    // 8. تتبع التطور التاريخي
    this._recordEmotionalEvolution(fingerprint);

    // النتيجة النهائية
    const result = {
      primaryEmotion: primaryAnalysis.primary,
      secondaryEmotions: primaryAnalysis.secondary,
      compoundEmotions,
      intensity: {
        overall: intensity.overall,
        byEmotion: intensity.byEmotion,
        factors: intensity.factors,
        trend: intensity.trend,
        level: intensity.level
      },
      dimensionalProfile,
      emotionalWaves,
      inflectionPoints,
      fingerprint,
      stability: {
        score: this._calculateStability(dimensionalProfile),
        type: this._classifyStability(dimensionalProfile),
        volatility: this._calculateVolatility(tokens, primaryAnalysis)
      },
      riskIndicators: this._identifyRiskIndicators(primaryAnalysis, compoundEmotions, intensity),
      recommendations: this._generateRecommendations(primaryAnalysis, compoundEmotions, intensity),
      _meta: {
        textLength: rawText.length,
        tokenCount: tokens.length,
        emotionalDensity: tokens.length > 0 ? 
          (Object.values(primaryAnalysis.detected).length / tokens.length) : 0,
        analysisConfidence: this._calculateConfidence(primaryAnalysis),
        generatedAt: new Date().toISOString()
      }
    };

    if (this.debug) {
      console.log('[EmotionEngine] Analysis complete:', {
        primary: result.primaryEmotion?.name,
        intensity: result.intensity.overall,
        stability: result.stability.score
      });
    }

    return result;
  }

  // ================================================================================
  // تحليل العواطف الأساسية (Primary Emotion Analysis)
  // ================================================================================
  _analyzePrimaryEmotions(normalizedText, tokens) {
    const emotionScores = {};
    const detectedEmotions = {};
    const emotionOccurrences = {};

    for (const token of tokens) {
      for (const [emotionName, emotionData] of Object.entries(ADVANCED_EMOTIONAL_LEXICON)) {
        if (emotionData.keywords.some(kw => 
          normalizeArabic(kw).includes(normalizeArabic(token)) ||
          normalizeArabic(token).includes(normalizeArabic(kw))
        )) {
          const baseScore = emotionData.intensity.moderate;
          emotionScores[emotionName] = (emotionScores[emotionName] || 0) + baseScore;
          detectedEmotions[emotionName] = emotionData;
          emotionOccurrences[emotionName] = (emotionOccurrences[emotionName] || 0) + 1;
        }
      }
    }

    const sortedEmotions = Object.entries(emotionScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      detected: detectedEmotions,
      scores: emotionScores,
      occurrences: emotionOccurrences,
      primary: sortedEmotions[0] ? {
        name: sortedEmotions[0][0],
        score: Math.min(1, sortedEmotions[0][1]),
        confidence: sortedEmotions[0][1] / (sortedEmotions[1]?.[1] || 0.1),
        data: ADVANCED_EMOTIONAL_LEXICON[sortedEmotions[0][0]]
      } : {
        name: 'neutral',
        score: 0.5,
        confidence: 0.5,
        data: {}
      },
      secondary: sortedEmotions.slice(1, 3).map(([name, score]) => ({
        name,
        score: Math.min(1, score),
        data: ADVANCED_EMOTIONAL_LEXICON[name]
      }))
    };
  }

  // ================================================================================
  // كشف العواطف المركبة (Compound Emotions Detection)
  // ================================================================================
  _detectCompoundEmotions(primaryAnalysis) {
    const compoundPatterns = {
      despair: {
        components: ['sadness', 'hopelessness', 'anxiety'],
        threshold: 0.6,
        description: 'حالة من اليأس واستشعار عدم جدوى المحاولة'
      },
      resentment: {
        components: ['anger', 'sadness'],
        threshold: 0.5,
        description: 'شعور متراكم من الغضب والخيبة'
      },
      depression: {
        components: ['shame', 'loneliness', 'hopelessness'],
        threshold: 0.65,
        description: 'حالة عميقة من الكآبة والانقطاع'
      },
      confusion: {
        components: ['anxiety', 'sadness'],
        threshold: 0.55,
        description: 'حالة من الارتباك والتشتت الذهني'
      },
      anxious_attachment: {
        components: ['love', 'anxiety'],
        threshold: 0.6,
        description: 'خوف من فقدان شخص محبوب'
      },
      wounded_pride: {
        components: ['pride', 'anger'],
        threshold: 0.55,
        description: 'شعور بالإهانة والغضب من الانتقاص'
      }
    };

    const detected = [];

    for (const [compound, pattern] of Object.entries(compoundPatterns)) {
      let combinedScore = 0;
      let componentCount = 0;

      for (const component of pattern.components) {
        const score = primaryAnalysis.scores[component] || 0;
        combinedScore += score;
        if (score > 0) componentCount++;
      }

      const avgScore = componentCount > 0 ? combinedScore / componentCount : 0;

      if (avgScore >= pattern.threshold) {
        detected.push({
          name: compound,
          score: avgScore,
          components: pattern.components.filter(c => primaryAnalysis.scores[c]),
          description: pattern.description,
          intensity: avgScore > 0.8 ? 'intense' : avgScore > 0.65 ? 'moderate' : 'mild'
        });
      }
    }

    return detected.sort((a, b) => b.score - a.score);
  }

  // ================================================================================
  // حساب الشدة المتقدم (Advanced Intensity Calculation)
  // ================================================================================
  _calculateAdvancedIntensity(normalizedText, primaryAnalysis) {
    const byEmotion = {};
    const factors = [];

    for (const [emotion, score] of Object.entries(primaryAnalysis.scores)) {
      let adjustedScore = score;

      for (const intensifier of INTENSITY_MULTIPLIERS.intensifiers) {
        if (normalizedText.includes(normalizeArabic(intensifier.word.toLowerCase()))) {
          adjustedScore *= intensifier.multiplier;
          factors.push({
            type: 'intensifier',
            word: intensifier.word,
            effect: `+${Math.round((intensifier.multiplier - 1) * 100)}%`
          });
        }
      }

      for (const diminisher of INTENSITY_MULTIPLIERS.diminishers) {
        if (normalizedText.includes(normalizeArabic(diminisher.word.toLowerCase()))) {
          adjustedScore *= diminisher.multiplier;
          factors.push({
            type: 'diminisher',
            word: diminisher.word,
            effect: `${Math.round((diminisher.multiplier - 1) * 100)}%`
          });
        }
      }

      byEmotion[emotion] = Math.min(1, adjustedScore);
    }

    const overallIntensity = Math.max(...Object.values(byEmotion), 0.3);

    return {
      overall: overallIntensity,
      byEmotion,
      factors,
      level: overallIntensity > 0.8 ? 'EXTREME' : 
             overallIntensity > 0.65 ? 'HIGH' : 
             overallIntensity > 0.45 ? 'MODERATE' : 'LOW',
      trend: this._calculateIntensityTrend(primaryAnalysis)
    };
  }

  // ================================================================================
  // تحليل الأبعاد المتعددة (Multi-Dimensional Profile Analysis)
  // ================================================================================
  _analyzeDimensions(normalizedText, primaryAnalysis) {
    const profile = {
      valence: this._calculateValence(primaryAnalysis),
      arousal: this._calculateArousal(primaryAnalysis),
      dominance: this._calculateDominance(primaryAnalysis),
      overall_classification: ''
    };

    profile.overall_classification = this._classifyEmotionalState(profile);

    return profile;
  }

  _calculateValence(primaryAnalysis) {
    let positiveScore = 0;
    let negativeScore = 0;

    const positive = ['joy', 'love', 'pride'];
    const negative = ['sadness', 'anger', 'anxiety', 'shame', 'loneliness', 'hopelessness'];

    for (const emotion of positive) {
      positiveScore += primaryAnalysis.scores[emotion] || 0;
    }

    for (const emotion of negative) {
      negativeScore += primaryAnalysis.scores[emotion] || 0;
    }

    const valence = (positiveScore - negativeScore) / 
                    (positiveScore + negativeScore || 1);

    return {
      score: valence,
      type: valence > 0.2 ? 'positive' : valence < -0.2 ? 'negative' : 'neutral',
      positiveEnergy: positiveScore,
      negativeEnergy: negativeScore
    };
  }

  _calculateArousal(primaryAnalysis) {
    const highArousal = ['anger', 'anxiety', 'joy'];
    const lowArousal = ['sadness', 'hopelessness'];

    let highScore = 0;
    let lowScore = 0;

    for (const emotion of highArousal) {
      highScore += primaryAnalysis.scores[emotion] || 0;
    }

    for (const emotion of lowArousal) {
      lowScore += primaryAnalysis.scores[emotion] || 0;
    }

    const arousal = (highScore - lowScore) / (highScore + lowScore || 1);

    return {
      score: arousal,
      type: arousal > 0.3 ? 'high' : arousal < -0.3 ? 'low' : 'moderate',
      activation: highScore
    };
  }

  _calculateDominance(primaryAnalysis) {
    const empowered = ['pride', 'anger', 'joy'];
    const disempowered = ['shame', 'hopelessness', 'anxiety', 'sadness'];

    let empScore = 0;
    let disScore = 0;

    for (const emotion of empowered) {
      empScore += primaryAnalysis.scores[emotion] || 0;
    }

    for (const emotion of disempowered) {
      disScore += primaryAnalysis.scores[emotion] || 0;
    }

    const dominance = (empScore - disScore) / (empScore + disScore || 1);

    return {
      score: dominance,
      type: dominance > 0.2 ? 'empowered' : dominance < -0.2 ? 'disempowered' : 'balanced',
      empowerment: empScore,
      disempowerment: disScore
    };
  }

  _calculateStability(dimensionalProfile) {
    const values = Object.values(dimensionalProfile).filter(v => typeof v === 'number');
    if (values.length === 0) return 0.5;

    const variance = values.reduce((sum, v) => sum + Math.pow(v, 2), 0) / values.length;
    return 1 - Math.sqrt(variance);
  }

  // ================================================================================
  // الكشف عن نقاط التحول (Inflection Points Detection)
  // ================================================================================
  _detectInflectionPoints(rawText, primaryAnalysis) {
    const inflectionPoints = [];
    const sentences = rawText.split(/[.!?]+/);

    let previousEmotion = null;
    let sentenceIndex = 0;

    for (const sentence of sentences) {
      if (!sentence.trim()) continue;

      const normalizedSentence = normalizeArabic(sentence.toLowerCase());
      const tokens = tokenize(normalizedSentence);
      
      let dominantEmotion = null;
      let maxScore = 0;

      for (const [emotion, score] of Object.entries(primaryAnalysis.scores)) {
        if (tokens.some(t => ADVANCED_EMOTIONAL_LEXICON[emotion]?.keywords.some(
          kw => normalizeArabic(kw).includes(normalizeArabic(t))
        ))) {
          if (score > maxScore) {
            dominantEmotion = emotion;
            maxScore = score;
          }
        }
      }

      if (previousEmotion && dominantEmotion !== previousEmotion && maxScore > 0.3) {
        inflectionPoints.push({
          sentenceIndex,
          from: previousEmotion,
          to: dominantEmotion,
          position: sentence.trim(),
          significance: maxScore
        });
      }

      previousEmotion = dominantEmotion;
      sentenceIndex++;
    }

    return inflectionPoints;
  }

  // ================================================================================
  // تحليل الموجات العاطفية (Emotional Wave Analysis)
  // ================================================================================
  _analyzeEmotionalWaves(tokens, primaryAnalysis) {
    const waves = [];
    const windowSize = 5;

    for (let i = 0; i < tokens.length; i += windowSize) {
      const window = tokens.slice(i, i + windowSize);
      let windowScore = 0;
      let emotionName = null;

      for (const token of window) {
        for (const [emotion, score] of Object.entries(primaryAnalysis.scores)) {
          const data = ADVANCED_EMOTIONAL_LEXICON[emotion];
          if (data?.keywords.some(kw => 
            normalizeArabic(kw).includes(normalizeArabic(token))
          )) {
            windowScore += score;
            emotionName = emotion;
          }
        }
      }

      if (windowScore > 0) {
        waves.push({
          position: i,
          emotion: emotionName,
          intensity: Math.min(1, windowScore),
          frequency: window.length
        });
      }
    }

    return {
      waves,
      pattern: this._identifyWavePattern(waves),
      momentum: this._calculateMomentum(waves),
      direction: this._calculateDirection(waves)
    };
  }

  _identifyWavePattern(waves) {
    if (waves.length < 2) return 'STABLE';

    const intensities = waves.map(w => w.intensity);
    const changes = [];

    for (let i = 1; i < intensities.length; i++) {
      changes.push(intensities[i] - intensities[i - 1]);
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

    if (avgChange > 0.1) return 'ESCALATING';
    if (avgChange < -0.1) return 'DE_ESCALATING';
    return 'FLUCTUATING';
  }

  _calculateMomentum(waves) {
    if (waves.length < 2) return 0;

    const lastThree = waves.slice(-3);
    let momentum = 0;

    for (let i = 1; i < lastThree.length; i++) {
      momentum += (lastThree[i].intensity - lastThree[i - 1].intensity);
    }

    return momentum / lastThree.length;
  }

  _calculateDirection(waves) {
    if (waves.length === 0) return 'NEUTRAL';

    const firstQuarter = waves.slice(0, Math.ceil(waves.length / 4));
    const lastQuarter = waves.slice(Math.floor(waves.length * 0.75));

    const firstAvg = firstQuarter.reduce((sum, w) => sum + w.intensity, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((sum, w) => sum + w.intensity, 0) / lastQuarter.length;

    if (lastAvg > firstAvg + 0.1) return 'ESCALATING';
    if (lastAvg < firstAvg - 0.1) return 'IMPROVING';
    return 'STABLE';
  }

  // ================================================================================
  // بناء البصمة العاطفية (Emotional Fingerprint)
  // ================================================================================
  _buildEmotionalFingerprint(primaryAnalysis, compoundEmotions, dimensionalProfile, intensity) {
    return {
      timestamp: Date.now(),
      primaryEmotion: primaryAnalysis.primary.name,
      primaryIntensity: intensity.overall,
      secondaryEmotions: primaryAnalysis.secondary.map(e => e.name),
      compoundEmotions: compoundEmotions.map(c => c.name),
      dimensionalVector: {
        valence: dimensionalProfile.valence.score,
        arousal: dimensionalProfile.arousal.score,
        dominance: dimensionalProfile.dominance.score
      },
      classification: dimensionalProfile.overall_classification,
      uniqueId: this._generateFingerprintId()
    };
  }

  _generateFingerprintId() {
    return `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ================================================================================
  // تتبع التطور التاريخي (Historical Evolution Tracking)
  // ================================================================================
  _recordEmotionalEvolution(fingerprint) {
    this.emotionalHistory.push(fingerprint);
    
    if (this.emotionalHistory.length > 50) {
      this.emotionalHistory.shift();
    }

    this._updateEmotionalFingerprint();
  }

  _updateEmotionalFingerprint() {
    if (this.emotionalHistory.length === 0) return;

    const recent = this.emotionalHistory.slice(-10);
    const emotions = {};

    recent.forEach(fp => {
      emotions[fp.primaryEmotion] = (emotions[fp.primaryEmotion] || 0) + 1;
    });

    this.emotionalFingerprint = {
      dominantEmotion: Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0],
      emotionFrequency: emotions,
      stability: this._calculateHistoricalStability(recent),
      trend: this._calculateHistoricalTrend(recent)
    };
  }

  _calculateHistoricalStability(records) {
    const emotions = records.map(r => r.primaryIntensity);
    const mean = emotions.reduce((a, b) => a + b, 0) / emotions.length;
    const variance = emotions.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / emotions.length;
    
    return 1 - Math.sqrt(variance);
  }

  _calculateHistoricalTrend(records) {
    if (records.length < 2) return 'INSUFFICIENT_DATA';

    const firstHalf = records.slice(0, Math.floor(records.length / 2));
    const secondHalf = records.slice(Math.floor(records.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.primaryIntensity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.primaryIntensity, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.1) return 'DETERIORATING';
    if (secondAvg < firstAvg - 0.1) return 'IMPROVING';
    return 'STABLE';
  }

  // ================================================================================
  // تحديد مؤشرات الخطر (Risk Indicators)
  // ================================================================================
  _identifyRiskIndicators(primaryAnalysis, compoundEmotions, intensity) {
    const indicators = [];
    const riskFactors = [];

    const criticalEmotions = ['hopelessness', 'despair'];
    for (const emotion of criticalEmotions) {
      if ((primaryAnalysis.scores[emotion] || 0) > 0.6) {
        riskFactors.push({
          factor: emotion,
          severity: 'CRITICAL',
          score: primaryAnalysis.scores[emotion]
        });
      }
    }

    if (intensity.overall > 0.85) {
      riskFactors.push({
        factor: 'HIGH_INTENSITY',
        severity: 'HIGH',
        score: intensity.overall
      });
    }

    const dangerousCompounds = ['despair', 'depression'];
    for (const compound of compoundEmotions) {
      if (dangerousCompounds.includes(compound.name) && compound.intensity === 'intense') {
        riskFactors.push({
          factor: compound.name,
          severity: 'CRITICAL',
          score: compound.score
        });
      }
    }

    const volatility = this._calculateVolatility({}, primaryAnalysis);
    if (volatility > 0.7) {
      riskFactors.push({
        factor: 'HIGH_VOLATILITY',
        severity: 'MEDIUM',
        score: volatility
      });
    }

    return {
      level: riskFactors.some(f => f.severity === 'CRITICAL') ? 'CRITICAL' :
             riskFactors.some(f => f.severity === 'HIGH') ? 'HIGH' :
             riskFactors.some(f => f.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW',
      factors: riskFactors,
      score: Math.max(...riskFactors.map(f => f.score), 0),
      requiresIntervention: riskFactors.length > 0
    };
  }

  _calculateVolatility(tokens, primaryAnalysis) {
    const scores = Object.values(primaryAnalysis.scores);
    if (scores.length < 2) return 0;

    const mean = scores.reduce((a, b) => a + b) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

    return Math.sqrt(variance);
  }

  // ================================================================================
  // توليد التوصيات (Generate Recommendations)
  // ================================================================================
  _generateRecommendations(primaryAnalysis, compoundEmotions, intensity) {
    const recommendations = [];

    const emotionRecommendations = {
      sadness: [
        'حاول الاتصال بصديق أو شخص قريب',
        'قم بنشاط بسيط تستمتع به'
      ],
      anxiety: [
        'جرب تقنيات الاسترخاء (breathing exercises)',
        'قم بنشاط جسدي'
      ],
      anger: [
        'خذ استراحة من الموقف الحالي',
        'مارس نشاطاً جسدياً'
      ],
      shame: [
        'تذكر أن جميع الناس يخطئون',
        'تحدث مع شخص تثق به'
      ],
      loneliness: [
        'حاول الاتصال بشخص تحبه',
        'انضم لنشاط اجتماعي'
      ]
    };

    const primaryEmotion = primaryAnalysis.primary.name;
    const emotionRecs = emotionRecommendations[primaryEmotion];
    
    if (emotionRecs) {
      recommendations.push(...emotionRecs.slice(0, 2).map(rec => ({
        type: 'EMOTION_SPECIFIC',
        recommendation: rec,
        priority: 'HIGH'
      })));
    }

    if (intensity.overall > 0.8) {
      recommendations.push({
        type: 'INTENSITY_BASED',
        recommendation: 'شدة المشاعر مرتفعة جداً - فكر في طلب دعم مهني',
        priority: 'CRITICAL'
      });
    }

    recommendations.push({
      type: 'GENERAL',
      recommendation: 'حاول التركيز على ما هو في سيطرتك',
      priority: 'MEDIUM'
    });

    return recommendations;
  }

  // ================================================================================
  // وظائف مساعدة (Helper Functions)
  // ================================================================================
  _prepareSeedsForIntensityAnalyzer(emotionalDictionary = {}) {
    const seeds = {};
    
    for (const [emotion, data] of Object.entries(ADVANCED_EMOTIONAL_LEXICON)) {
      for (const keyword of data.keywords) {
        const key = normalizeArabic(keyword.toLowerCase());
        seeds[key] = {
          emotions: { [emotion]: data.intensity.moderate },
          base: data.intensity.moderate
        };
      }
    }

    return seeds;
  }

  _classifyEmotionalState(profile) {
    const v = profile.valence.score;
    const a = profile.arousal.score;

    if (v > 0.3 && a > 0.3) return 'HAPPY_EXCITED';
    if (v > 0.3 && a < -0.3) return 'CONTENT_RELAXED';
    if (v < -0.3 && a > 0.3) return 'ANGRY_ANXIOUS';
    if (v < -0.3 && a < -0.3) return 'SAD_DEPRESSED';
    
    return 'NEUTRAL';
  }

  _classifyStability(dimensionalProfile) {
    const stability = this._calculateStability(dimensionalProfile);

    if (stability > 0.7) return 'HIGHLY_STABLE';
    if (stability > 0.5) return 'RELATIVELY_STABLE';
    if (stability > 0.3) return 'SOMEWHAT_VOLATILE';
    return 'HIGHLY_VOLATILE';
  }

  _calculateConfidence(primaryAnalysis) {
    if (!primaryAnalysis.primary) return 0;
    return primaryAnalysis.primary.confidence;
  }

  _calculateIntensityTrend(primaryAnalysis) {
    if (this.emotionalHistory.length < 2) return 'NO_HISTORY';

    const recent = this.emotionalHistory.slice(-1)[0];
    const previous = this.emotionalHistory.slice(-2, -1)[0];

    if (!recent || !previous) return 'NO_COMPARISON';

    if (recent.primaryIntensity > previous.primaryIntensity + 0.1) return 'INCREASING';
    if (recent.primaryIntensity < previous.primaryIntensity - 0.1) return 'DECREASING';
    return 'STABLE';
  }
}

// التصدير المزدوج لضمان عمل الاستيراد بكل الطرق
export { EmotionEngine }; 
export default EmotionEngine;
