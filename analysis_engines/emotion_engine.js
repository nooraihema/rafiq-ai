
// /analysis_engines/emotion_engine.js
// EmotionEngine v3.8 - Advanced Multi-Dimensional Emotional Analysis (Enhanced Arabic Support)
// ================================================================================

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
    keywords: ['حزن', 'كآبة', 'أسف', 'أسى', 'حسرة', 'وجع', 'ألم نفسي', 'اكتئاب'],
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
    this.debug = true;
    console.log("[EmotionEngine] ⚙️ Initializing with dictionaries...");

    // تحميل قواميس الزوائد للتعامل مع "بالاكتئاب"
    this.affixes = dictionaries.AFFIX_DICTIONARY || {};
    this.prefixes = (this.affixes.prefixes || []).map(p => p.value).sort((a, b) => b.length - a.length);
    this.suffixes = (this.affixes.suffixes || []).map(s => s.value).sort((a, b) => b.length - a.length);

    console.log(`[EmotionEngine] 📥 Loaded ${this.prefixes.length} prefixes and ${this.suffixes.length} suffixes.`);

    const EmotionInterpreterClass = 
      dictionaries.EMOTIONAL_ANCHORS?.EmotionInterpreter || 
      (dictionaries.EMOTIONAL_ANCHORS?.default?.EmotionInterpreter);
    
    const IntensityAnalyzerClass = 
      dictionaries.INTENSITY_ANALYZER?.IntensityAnalyzerV5 || 
      (dictionaries.INTENSITY_ANALYZER?.default?.IntensityAnalyzerV5);

    if (EmotionInterpreterClass) {
        this.emotionInterpreter = new EmotionInterpreterClass({
            dictionary: dictionaries.EMOTIONAL_ANCHORS.EMOTIONAL_DICTIONARY || dictionaries.EMOTIONAL_ANCHORS
        });
    }

    if (IntensityAnalyzerClass) {
        this.intensityAnalyzer = new IntensityAnalyzerClass({
            seeds: this._prepareSeedsForIntensityAnalyzer()
        });
    }

    this.emotionalHistory = [];
    this.emotionalFingerprint = {};
    
    console.log("[EmotionEngine] ✅ Initialization complete - Advanced Multi-Dimensional Analysis Ready");
  }

  // ================================================================================
  // وظيفة تجريد الكلمة (Stemming) - مفتاح حل مشكلة "بالاكتئاب"
  // ================================================================================
  _stemToken(token) {
    let stemmed = normalizeArabic(token);
    
    // محاولة إزالة السوابق
    for (const prefix of this.prefixes) {
      if (stemmed.startsWith(prefix) && stemmed.length > prefix.length + 2) {
        let potentialRoot = stemmed.substring(prefix.length);
        // نتحقق إذا كان الجذر الناتج موجود في قاموسنا العاطفي
        if (this._isWordInLexicon(potentialRoot)) {
          console.log(`[EmotionEngine] ✨ Prefix Stripped: "${token}" -> "${potentialRoot}"`);
          return potentialRoot;
        }
      }
    }

    // محاولة إزالة اللواحق
    for (const suffix of this.suffixes) {
      if (stemmed.endsWith(suffix) && stemmed.length > suffix.length + 2) {
        let potentialRoot = stemmed.substring(0, stemmed.length - suffix.length);
        if (this._isWordInLexicon(potentialRoot)) {
          console.log(`[EmotionEngine] ✨ Suffix Stripped: "${token}" -> "${potentialRoot}"`);
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
  // التحليل الرئيسي (Main Analysis)
  // ================================================================================
  analyze(rawText, context = {}) {
    const normalizedText = normalizeArabic(rawText.toLowerCase());
    const tokens = tokenize(normalizedText);

    console.log('\n💓 [EmotionEngine] STARTING PIPELINE...');
    console.log(`[Input Text]: "${rawText}"`);
    console.log(`[Tokens]: [${tokens.join(', ')}]`);

    // 1. تحليل العواطف الأساسية (مع استخدام الـ Stemming)
    const primaryAnalysis = this._analyzePrimaryEmotions(normalizedText, tokens);

    // 2. كشف العواطف المركبة
    const compoundEmotions = this._detectCompoundEmotions(primaryAnalysis);

    // 3. حساب شدة متقدمة
    const intensity = this._calculateAdvancedIntensity(normalizedText, primaryAnalysis);

    // 4. تحليل الأبعاد متعددة
    const dimensionalProfile = this._analyzeDimensions(normalizedText, primaryAnalysis);

    // 5. بناء النتيجة
    const result = {
      primaryEmotion: primaryAnalysis.primary,
      secondaryEmotions: primaryAnalysis.secondary,
      compoundEmotions,
      intensity: intensity,
      dimensionalProfile,
      stability: this._calculateStability(dimensionalProfile),
      _meta: {
        analysisConfidence: primaryAnalysis.primary.confidence,
        timestamp: new Date().toISOString()
      }
    };

    if (this.debug) {
      console.log('✅ [EmotionEngine] Pipeline Complete.');
      console.log('Result Summary:', {
        detected: result.primaryEmotion.name,
        score: result.primaryEmotion.score,
        intensity: result.intensity.overall
      });
    }

    return result;
  }

  // ================================================================================
  // تحليل العواطف الأساسية المحسّن
  // ================================================================================
  _analyzePrimaryEmotions(normalizedText, tokens) {
    console.log("🔍 [EmotionEngine] Running Primary Analysis...");
    const emotionScores = {};
    const detectedEmotions = {};

    for (const token of tokens) {
      // تجربة الكلمة كما هي، ثم تجربة جذرها
      const stemmedToken = this._stemToken(token);
      const searchPool = [normalizeArabic(token), stemmedToken];

      console.log(`  - Analyzing Token: "${token}" (Stemmed: "${stemmedToken}")`);

      for (const [emotionName, emotionData] of Object.entries(ADVANCED_EMOTIONAL_LEXICON)) {
        for (const kw of emotionData.keywords) {
          const normalizedKW = normalizeArabic(kw);
          
          if (searchPool.includes(normalizedKW)) {
            const baseScore = emotionData.intensity.moderate;
            emotionScores[emotionName] = (emotionScores[emotionName] || 0) + baseScore;
            detectedEmotions[emotionName] = emotionData;
            console.log(`    🔥 MATCH FOUND: "${token}" linked to [${emotionName}] (Score +${baseScore})`);
          }
        }
      }
    }

    const sortedEmotions = Object.entries(emotionScores)
      .sort((a, b) => b[1] - a[1]);

    const primary = sortedEmotions[0] ? {
        name: sortedEmotions[0][0],
        score: Math.min(1, sortedEmotions[0][1]),
        confidence: sortedEmotions[0][1] / (sortedEmotions[1]?.[1] || 1),
        data: ADVANCED_EMOTIONAL_LEXICON[sortedEmotions[0][0]]
      } : {
        name: 'neutral',
        score: 0.3,
        confidence: 0.5,
        data: {}
      };

    console.log(`  🎯 Primary Detected: ${primary.name} (${primary.score})`);

    return {
      detected: detectedEmotions,
      scores: emotionScores,
      primary,
      secondary: sortedEmotions.slice(1, 3).map(([name, score]) => ({
        name,
        score: Math.min(1, score),
        data: ADVANCED_EMOTIONAL_LEXICON[name]
      }))
    };
  }

  // ================================================================================
  // كشف العواطف المركبة
  // ================================================================================
  _detectCompoundEmotions(primaryAnalysis) {
    const compoundPatterns = {
      despair: { components: ['sadness', 'hopelessness'], threshold: 0.5 },
      resentment: { components: ['anger', 'sadness'], threshold: 0.5 },
      depression: { components: ['sadness', 'hopelessness', 'loneliness'], threshold: 0.6 }
    };

    const detected = [];
    for (const [compound, pattern] of Object.entries(compoundPatterns)) {
      let combinedScore = 0;
      pattern.components.forEach(c => combinedScore += (primaryAnalysis.scores[c] || 0));
      let avg = combinedScore / pattern.components.length;
      
      if (avg >= pattern.threshold) {
        console.log(`  🧩 Compound Emotion Detected: ${compound} (Score: ${avg})`);
        detected.push({ name: compound, score: avg });
      }
    }
    return detected;
  }

  // ================================================================================
  // حساب الشدة المتقدم (يتأثر بكلمات مثل "جداً" و "الشديد")
  // ================================================================================
  _calculateAdvancedIntensity(normalizedText, primaryAnalysis) {
    let overallIntensity = primaryAnalysis.primary.score;
    console.log(`📊 [EmotionEngine] Calculating Intensity. Starting with base: ${overallIntensity}`);

    for (const intensifier of INTENSITY_MULTIPLIERS.intensifiers) {
      if (normalizedText.includes(normalizeArabic(intensifier.word))) {
        overallIntensity *= intensifier.multiplier;
        console.log(`    ⬆️ Intensifier: "${intensifier.word}" (+${intensifier.multiplier}x)`);
      }
    }

    for (const diminisher of INTENSITY_MULTIPLIERS.diminishers) {
      if (normalizedText.includes(normalizeArabic(diminisher.word))) {
        overallIntensity *= diminisher.multiplier;
        console.log(`    ⬇️ Diminisher: "${diminisher.word}" (${diminisher.multiplier}x)`);
      }
    }

    overallIntensity = Math.min(1, Math.max(0.1, overallIntensity));
    console.log(`  📈 Final Calculated Intensity: ${overallIntensity}`);

    return {
      overall: overallIntensity,
      level: overallIntensity > 0.8 ? 'EXTREME' : overallIntensity > 0.5 ? 'HIGH' : 'LOW'
    };
  }

  _analyzeDimensions(normalizedText, primaryAnalysis) {
    // حساب Valence (إيجابي/سلبي)
    let valence = 0;
    if (primaryAnalysis.primary.data.dimensionalProfile) {
        valence = primaryAnalysis.primary.data.dimensionalProfile.valence;
    }

    return {
      valence: valence,
      arousal: primaryAnalysis.primary.data.dimensionalProfile?.arousal || 0,
      stability: 0.5
    };
  }

  _calculateStability(dimensionalProfile) {
    return 0.5; // قيمة افتراضية للتبسيط
  }

  _prepareSeedsForIntensityAnalyzer() {
    return {};
  }
}

// التصدير النهائي
export { EmotionEngine };
export default EmotionEngine;
