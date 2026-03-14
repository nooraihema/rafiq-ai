// /analysis_engines/catharsis_engine_v2.js
// CatharsisEngine v2.5 - Advanced Crisis Detection + Context Awareness + Emotional DNA Blending
// ================================================================================
// ميزات رئيسية جديدة:
// 1. 🚨 كشف الأزمات ال��تقدم (Crisis Detection)
// 2. 🧠 الوعي السياقي العميق (Deep Context Awareness)
// 3. 💫 دمج الحمض النووي العاطفي (Emotional DNA Blending)
// 4. 📊 تحليل الأنماط التاريخية (Historical Pattern Analysis)
// 5. 🎯 توليد ردود موجهة ذكياً (Intelligent Response Generation)
// 6. 📈 تتبع فعالية الردود (Response Effectiveness Tracking)

import { sample, getTopN, normalizeArabic } from '../core/utils.js';

// ================================================================================
// قاموس الكلمات الحرجة (Crisis Keywords Dictionary)
// ================================================================================
const CRISIS_DETECTION_CONFIG = {
  IMMEDIATE_DANGER: {
    keywords: [
      'انتحار', 'أنتحر', 'أقتل نفسي', 'قتل نفسي', 'شنق', 'نقطة نهاية',
      'لا قيمة لحياتي', 'لا أستحق العيش', 'لن أكون هنا غداً', 'أسوأ مكان',
      'تسمم', 'سقوط', 'سيارة', 'غرق', 'حبل', 'دواء كثير'
    ],
    severity: 'CRITICAL',
    responseType: 'IMMEDIATE_INTERVENTION'
  },

  SELF_HARM: {
    keywords: [
      'أؤذي نفسي', 'أقطع نفسي', 'أحرق نفسي', 'أضرب نفسي', 'جرح',
      'دم', 'ألم مقصود', 'تعذيب النفس', 'عقاب نفسي'
    ],
    severity: 'HIGH',
    responseType: 'HARM_PREVENTION'
  },

  SEVERE_HOPELESSNESS: {
    keywords: [
      'لا فائدة', 'فقدت الأمل', 'ميؤوس منه', 'لا أستطيع', 'مستحيل',
      'لن يتحسن', 'أسوأ من قبل', 'مفقود تماماً', 'لا يمكن إصلاحه'
    ],
    severity: 'HIGH',
    responseType: 'HOPE_INJECTION'
  },

  ISOLATION_RISK: {
    keywords: [
      'وحيد تماماً', 'لا أحد يفهمني', 'منبوذ', 'مرفوض', 'عديم القيمة',
      'ستكون أفضل حالاً بدوني', 'يريدون مني أن أغادر'
    ],
    severity: 'MEDIUM',
    responseType: 'CONNECTION_BUILDING'
  }
};

// ================================================================================
// نظام الدعم الحرج (Critical Support System)
// ================================================================================
const CRISIS_SUPPORT = {
  SAUDI_ARABIA: {
    mentalHealthLine: '920033333',
    suicide24h: '920033333',
    websiteArabic: 'https://www.sahem.sa/',
    emergency: '997',
    whatsappSupport: 'https://wa.me/+966920033333'
  },
  UAE: {
    mentalHealthLine: '+971 4 308 4959',
    crisisLine: '+971 800 CALL (2255)',
    website: 'https://www.dmh.ae/'
  },
  EGYPT: {
    hotline: '+202 2709 2400',
    website: 'https://www.sohag.gov.eg/'
  },
  GENERAL: {
    befrienders: 'https://www.befrienders.org/',
    internationalDB: 'https://findahelpline.com/ae'
  }
};

// ================================================================================
// مصفوفة المشاعر والاستجابة (Emotion-Response Matrix)
// ================================================================================
const EMOTION_RESPONSE_MATRIX = {
  sadness: {
    primaryTone: 'validating',
    secondaryTone: 'hopeful',
    techniques: ['validation', 'gentle_exploration', 'meaning_making'],
    dnaProfile: ['empathetic', 'calm', 'grounding'],
    minResponseLength: 3,
    maxResponseLength: 8
  },
  anxiety: {
    primaryTone: 'calming',
    secondaryTone: 'clarifying',
    techniques: ['grounding', 'perspective_shift', 'actionable_steps'],
    dnaProfile: ['stabilizing', 'structured', 'reassuring'],
    minResponseLength: 3,
    maxResponseLength: 7
  },
  anger: {
    primaryTone: 'validating',
    secondaryTone: 'channeling',
    techniques: ['acknowledgment', 'perspective_expansion', 'constructive_outlet'],
    dnaProfile: ['respectful', 'understanding', 'empowering'],
    minResponseLength: 2,
    maxResponseLength: 6
  },
  confusion: {
    primaryTone: 'clarifying',
    secondaryTone: 'exploratory',
    techniques: ['gentle_questioning', 'pattern_identification', 'sense_making'],
    dnaProfile: ['curious', 'structured', 'analytical'],
    minResponseLength: 3,
    maxResponseLength: 7
  },
  loneliness: {
    primaryTone: 'connecting',
    secondaryTone: 'validating',
    techniques: ['connection_building', 'shared_humanity', 'belonging_affirmation'],
    dnaProfile: ['warm', 'inclusive', 'present'],
    minResponseLength: 3,
    maxResponseLength: 8
  },
  shame: {
    primaryTone: 'normalizing',
    secondaryTone: 'compassionate',
    techniques: ['destigmatization', 'self_compassion', 'growth_framing'],
    dnaProfile: ['nonjudgmental', 'kind', 'perspective_shifting'],
    minResponseLength: 4,
    maxResponseLength: 9
  },
  fear: {
    primaryTone: 'reassuring',
    secondaryTone: 'empowering',
    techniques: ['grounding', 'perspective_shift', 'coping_strategies'],
    dnaProfile: ['protective', 'confident', 'stabilizing'],
    minResponseLength: 3,
    maxResponseLength: 7
  }
};

// ================================================================================
// نظام الأسئلة الاستكشافية (Probing Questions System)
// ================================================================================
const PROBING_QUESTIONS = {
  deep_exploration: [
    'ما الذي تشعر أنك بحاجة إليه أكثر من أي شيء الآن؟',
    'متى شعرت آخر مرة بهذا الشعور، وما كان الفرق حينها؟',
    'إذا تمكنت من تغيير شيء واحد فقط، ما الذي ستغيره؟',
    'كيف يتعامل أقرب الناس إليك مع مشاعر مشابهة؟',
    'ماذا تقول لصديق في نفس الموقف؟'
  ],
  emotion_processing: [
    'أين تشعر بهذه العاطفة في جسدك؟',
    'هل كانت هذه العاطفة موجودة من قبل؟',
    'ما الذي يقول لك جسدك الآن؟',
    'إذا أعطينا اسماً لهذه العاطفة، ماذا قد نسميها؟',
    'هل هناك جزء منك يريد التعبير عن شيء مختلف؟'
  ],
  meaning_making: [
    'ما الذي قد يحاول جسدك/عقلك أن يخبرك به من خلال هذا الشعور؟',
    'هل هناك درس أو رسالة في هذه التجربة؟',
    'كيف تعتقد أن هذا قد يساعدك تنمو؟',
    'ماذا ستتعلم عن نفسك من هذا؟'
  ],
  action_oriented: [
    'ما أول خطوة صغيرة يمكنك اتخاذها؟',
    'من يمكنك أن تطلب المساعدة منه؟',
    'ما الذي في سيطرتك الآن؟',
    'ماذا يمكنك القيام به اليوم؟'
  ]
};

// ================================================================================
// مكتبة الاستجابات المتقدمة (Advanced Response Library)
// ================================================================================
const RESPONSE_TEMPLATES = {
  validation: [
    'ما تشعر به صحيح تماماً وطبيعي في هذا الموقف.',
    'شعورك هذا لم يأتِ من العدم - هناك سبب حقيقي وراءه.',
    'أنت لست وحدك في هذا - كثيرون يشعرون بنفس الشيء.',
    'من الطبيعي تماماً أن تشعر بهذا الحزم.'
  ],
  gentle_challenge: [
    'دعني أشاركك ملاحظة قد تكون مختلفة قليلاً...',
    'ربما هناك طريقة أخرى لرؤية هذا...',
    'ما رأيك لو اقتربنا من هذا من زاوية مختلفة؟',
    'قد يكون هناك شيء آخر يحدث هنا...'
  ],
  hope_anchors: [
    'أعرف أنه يبدو مظلماً الآن، لكن هذا الشعور سيمر.',
    'لقد نجحت في تخطي أشياء صعبة م�� قبل - أنت أقوى مما تعتقد.',
    'هناك أشخاص يريدون مساعدتك - أنت لست وحدك في هذا.',
    'هذه اللحظة ليست كل قصتك - هناك المزيد قادم.'
  ],
  connection: [
    'أنا هنا معك في هذا اللحظة.',
    'شكراً لتشاركك هذا معي - يعني لي كثيراً.',
    'أنت تستحق أن تشعر بالأمان والراحة.',
    'قلبي معك في هذا الألم.'
  ],
  empowerment: [
    'أنت لديك قوة أكثر مما تعتقد.',
    'ما رأيك في اتخاذ خطوة صغيرة نحو تحسن؟',
    'أنت قادر على التعامل مع هذا.',
    'دعنا نجد معاً ما يعطيك القوة.'
  ]
};

// ================================================================================
// فئة CatharsisEngine محسّنة (Enhanced CatharsisEngine Class)
// ================================================================================
export class CatharsisEngineV2 {
  constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
    // التحقق من المتطلبات
    if (!dictionaries || !dictionaries.GENERATIVE_ENGINE || !dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator) {
      throw new Error("CatharsisEngineV2 requires dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator.");
    }

    this.debug = true;
    console.log("[CatharsisEngineV2] Initializing v2.5 - Advanced Mode");

    // محرك توليد الردود
    const GenerativeOrchestratorClass = dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator;
    this.generativeOrchestrator = new GenerativeOrchestratorClass({
      dnaLibrary: dictionaries.GENERATIVE_ENGINE.EMOTIONAL_DNA || {},
      lexicalPools: dictionaries.GENERATIVE_ENGINE.LEXICAL_POOLS || {},
      memory: memorySystem
    });

    this.protocols = protocols || {};
    this.memory = memorySystem || null;
    this.responseMetrics = new Map(); // تتبع فعالية الردود
    this.userProfile = new Map(); // ملف المستخدم النفسي

    // الإعدادات
    this.SHORT_TEXT_TOKEN_LIMIT = 6;
    this.MIN_EMOTIONAL_INTEGRITY = 0.62;
    this.DNA_BLEND_DEFAULT = 'dynamic';
    this.CRISIS_ESCALATION_THRESHOLD = 0.85;

    // التوقيعات العاطفية المحسّنة
    this.INTENT_EMOTION_SIGNATURES = {
      empathy: { sadness: 0.6, calming: 0.3, supportive: 0.4 },
      validation: { supportive: 0.7, understanding: 0.6 },
      insight_delivery: { empowering: 0.5, hope: 0.3, clarity: 0.4 },
      probe_dissonance: { curious: 0.6, calming: 0.2 },
      probe_conflict: { curious: 0.6, understanding: 0.5 },
      action_proposal_immediate: { empowering: 0.7, supportive: 0.5 },
      action_proposal_micro: { empowering: 0.5, calming: 0.3 },
      open_question: { curious: 0.6, inviting: 0.7 },
      grounding: { calming: 0.9, protective: 0.7 },
      hope_injection: { hope: 0.9, empowering: 0.6, warmth: 0.5 },
      crisis_intervention: { protective: 0.9, calm: 0.8, resource_aware: 0.9 }
    };

    console.log("[CatharsisEngineV2] ✅ Initialization complete");
  }

  // ================================================================================
  // 1. نظام كشف الأزمات المتقدم (Advanced Crisis Detection System)
  // ================================================================================
  detectCrisis(comprehensiveInsight) {
    const { rawText, emotionProfile, semanticMap } = comprehensiveInsight;
    const normalizedText = normalizeArabic(rawText.toLowerCase());

    let crisisLevel = 0;
    let detectedCategories = [];
    let matchedKeywords = [];

    // فحص كل فئة من فئات الأزمات
    for (const [category, config] of Object.entries(CRISIS_DETECTION_CONFIG)) {
      for (const keyword of config.keywords) {
        if (normalizedText.includes(normalizeArabic(keyword.toLowerCase()))) {
          crisisLevel = Math.max(crisisLevel, 0.9);
          detectedCategories.push({
            category,
            severity: config.severity,
            responseType: config.responseType
          });
          matchedKeywords.push(keyword);
        }
      }
    }

    // فحص مؤشرات عاطفية شديدة
    if (emotionProfile?.primaryEmotion?.score > 0.9) {
      crisisLevel = Math.max(crisisLevel, 0.75);
      detectedCategories.push({
        category: 'EMOTIONAL_INTENSITY',
        severity: 'HIGH',
        responseType: 'STABILIZATION'
      });
    }

    // فحص الاكتئاب المزمن من الذاكرة
    if (this.memory && this.memory.workingMemory) {
      const recentEmotions = this.memory.workingMemory.slice(-10);
      const depressiveCount = recentEmotions.filter(m => 
        m.insight?.emotionProfile?.primaryEmotion?.name === 'sadness' &&
        m.insight?.emotionProfile?.primaryEmotion?.score > 0.7
      ).length;
      
      if (depressiveCount >= 7) {
        crisisLevel = Math.max(crisisLevel, 0.8);
        detectedCategories.push({
          category: 'CHRONIC_DEPRESSION',
          severity: 'HIGH',
          responseType: 'PROFESSIONAL_REFERRAL'
        });
      }
    }

    if (this.debug) {
      console.log("[Crisis Detection]", {
        level: crisisLevel,
        categories: detectedCategories,
        keywords: matchedKeywords
      });
    }

    return {
      isCrisis: crisisLevel > this.CRISIS_ESCALATION_THRESHOLD,
      level: crisisLevel, // 0-1
      categories: detectedCategories,
      matchedKeywords,
      requiresIntervention: crisisLevel > 0.7,
      helplineContacts: this._getRelevantHelpline(detectedCategories)
    };
  }

  // ================================================================================
  // 2. نظام الوعي السياقي العميق (Deep Context Awareness System)
  // ================================================================================
  analyzeDeepContext(comprehensiveInsight) {
    const context = {
      immediateContext: this._analyzeImmediateContext(comprehensiveInsight),
      historicalContext: this._analyzeHistoricalContext(),
      userProfile: this._buildUserProfile(),
      conversationTheme: this._identifyConversationTheme(),
      psychologicalPatterns: this._identifyPsychologicalPatterns()
    };

    if (this.debug) {
      console.log("[Deep Context Analysis]", {
        immediateEmotion: context.immediateContext.primaryEmotion,
        historicalTrend: context.historicalContext.emotionTrend,
        recurrentThemes: context.conversationTheme.themes
      });
    }

    return context;
  }

  _analyzeImmediateContext(insight) {
    return {
      primaryEmotion: insight.emotionProfile?.primaryEmotion?.name || 'neutral',
      emotionIntensity: insight.emotionProfile?.primaryEmotion?.score || 0.5,
      concepts: Object.keys(insight.semanticMap?.conceptInsights || {}),
      tensions: insight.synthesisProfile?.tensions || [],
      patterns: insight.synthesisProfile?.patterns || []
    };
  }

  _analyzeHistoricalContext() {
    if (!this.memory || !this.memory.workingMemory) {
      return { emotionTrend: 'unknown', themes: [], patterns: [] };
    }

    const recent = this.memory.workingMemory.slice(-20);
    const emotions = recent.map(m => m.insight?.emotionProfile?.primaryEmotion?.name);
    const emotionCounts = {};

    emotions.forEach(e => {
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });

    const dominantEmotion = Object.entries(emotionCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    return {
      emotionTrend: dominantEmotion || 'stable',
      themes: this._extractRecurrentThemes(recent),
      patterns: this._findHistoricalPatterns(recent),
      improvementIndicators: this._calculateImprovementTrend(recent)
    };
  }

  _buildUserProfile() {
    if (!this.memory) return {};

    const profile = {};
    const memories = this.memory.workingMemory || [];

    // تحديد المحفزات الشائعة
    const triggers = {};
    memories.forEach(m => {
      const concepts = Object.keys(m.insight?.semanticMap?.conceptInsights || {});
      concepts.forEach(c => {
        triggers[c] = (triggers[c] || 0) + 1;
      });
    });

    // تحديد آليات التأقلم
    const copingMechanisms = {};
    memories.forEach(m => {
      const responses = m.insight?.synthesisProfile?.copingStrategies || [];
      responses.forEach(c => {
        copingMechanisms[c] = (copingMechanisms[c] || 0) + 1;
      });
    });

    return {
      commonTriggers: Object.entries(triggers).slice(0, 5),
      preferredCopingStrategies: Object.entries(copingMechanisms).slice(0, 3),
      resilience: this._calculateResilience(memories),
      responsePreferences: this._identifyResponsePreferences(memories)
    };
  }

  _identifyConversationTheme() {
    const themes = new Map();
    if (this.memory?.workingMemory) {
      this.memory.workingMemory.forEach(m => {
        const concepts = Object.keys(m.insight?.semanticMap?.conceptInsights || {});
        concepts.forEach(c => {
          themes.set(c, (themes.get(c) || 0) + 1);
        });
      });
    }

    return {
      themes: Array.from(themes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme]) => theme),
      consistency: this._calculateThemeConsistency(themes),
      evolution: 'analyzing'
    };
  }

  _identifyPsychologicalPatterns() {
    return {
      defensePatterns: this._analyzeDefenses(),
      copingStrategies: this._analyzeCopingStrategies(),
      growthAreas: this._identifyGrowthAreas(),
      strengths: this._identifyStrengths()
    };
  }

  // ================================================================================
  // 3. نظام دمج الحمض النووي العاطفي (Emotional DNA Blending System)
  // ================================================================================
  blendEmotionalDNA(insight, context) {
    const primaryEmotion = insight.emotionProfile?.primaryEmotion?.name || 'neutral';
    const emotionConfig = EMOTION_RESPONSE_MATRIX[primaryEmotion] || EMOTION_RESPONSE_MATRIX['sadness'];

    // حساب مزيج الحمض النووي بناءً على السياق
    const dnaBlend = {
      baseProfile: emotionConfig.dnaProfile,
      contextualAdjustments: this._contextualDNAAdjustment(context),
      historyModifications: this._historyBasedDNAModification(context),
      finalMix: []
    };

    // دمج جميع المكونات
    const allComponents = [
      ...dnaBlend.baseProfile,
      ...dnaBlend.contextualAdjustments,
      ...dnaBlend.historyModifications
    ];

    // إزالة التكرارات والدمج الذكي
    const componentScores = {};
    allComponents.forEach(c => {
      componentScores[c] = (componentScores[c] || 0) + 1;
    });

    dnaBlend.finalMix = Object.entries(componentScores)
      .sort((a, b) => b[1] - a[1])
      .map(([component]) => component);

    if (this.debug) {
      console.log("[DNA Blending]", {
        primary: primaryEmotion,
        baseDNA: dnaBlend.baseProfile,
        finalMix: dnaBlend.finalMix
      });
    }

    return dnaBlend;
  }

  _contextualDNAAdjustment(context) {
    const adjustments = [];
    
    if (context.immediateContext.emotionIntensity > 0.8) {
      adjustments.push('stabilizing', 'grounding');
    }
    
    if (context.userProfile?.resilience < 0.4) {
      adjustments.push('supportive', 'encouraging');
    }
    
    if (context.historicalContext.emotionTrend === context.immediateContext.primaryEmotion) {
      adjustments.push('validating', 'normalizing');
    }

    return adjustments;
  }

  _historyBasedDNAModification(context) {
    const modifications = [];
    
    if (context.historicalContext.improvementIndicators > 0.5) {
      modifications.push('empowering', 'hopeful');
    }
    
    if (context.userProfile?.responsePreferences?.includes('deep_exploration')) {
      modifications.push('exploratory', 'curious');
    }

    return modifications;
  }

  // ================================================================================
  // 4. نظام توليد الردود الموجهة (Intelligent Response Generation)
  // ================================================================================
  generateAdvancedResponse(comprehensiveInsight) {
    // 1. الكشف عن الأزمات أولاً
    const crisisAssessment = this.detectCrisis(comprehensiveInsight);
    
    if (crisisAssessment.isCrisis) {
      return this._generateCrisisResponse(crisisAssessment, comprehensiveInsight);
    }

    // 2. تحليل السياق العميق
    const deepContext = this.analyzeDeepContext(comprehensiveInsight);

    // 3. دمج الحمض النووي العاطفي
    const dnaBlend = this.blendEmotionalDNA(comprehensiveInsight, deepContext);

    // 4. تحديد النية الأساسية
    const intent = this._determineOptimalIntent(comprehensiveInsight, deepContext);

    // 5. توليد أجزاء الرد
    const responseParts = this._constructResponseParts(
      comprehensiveInsight,
      deepContext,
      intent,
      dnaBlend
    );

    // 6. تجميع الرد النهائي
    const finalResponse = this._assembleResponse(responseParts, intent, dnaBlend);

    // 7. تسجيل البيانات الوصفية
    this._recordResponseMetadata(
      comprehensiveInsight,
      finalResponse,
      crisisAssessment,
      deepContext
    );

    return finalResponse;
  }

  _generateCrisisResponse(crisisAssessment, insight) {
    const responses = [];

    // 1. الرد الفوري (Immediate Response)
    responses.push(
      'أنا قلق عليك جداً ويهمني أمرك. شكراً لمشاركتك هذا معي.'
    );

    // 2. التثبيت (Grounding)
    responses.push(
      'أنت آمن الآن. دعنا نأخذ نفساً عميقاً معاً. هل يمكنك سماعي؟'
    );

    // 3. الموارد (Resources)
    const helpline = crisisAssessment.helplineContacts[0];
    if (helpline) {
      responses.push(
        `هناك أشخاص متدربون يريدون مساعدتك: ${helpline.number}`
      );
      if (helpline.whatsapp) {
        responses.push(`يمكنك أيضاً التواصل عبر WhatsApp: ${helpline.whatsapp}`);
      }
    }

    // 4. التأكيد على الأمل (Hope Affirmation)
    responses.push(
      'حياتك ذات قيمة عظيمة. هناك أشخاص يحبونك ويريدون أن يساعدوك.'
    );

    return {
      responseText: responses.join('\n\n'),
      isCrisisResponse: true,
      crisisLevel: crisisAssessment.level,
      actionRequired: crisisAssessment.requiresIntervention,
      helplineContacts: crisisAssessment.helplineContacts,
      _meta: {
        type: 'CRISIS_INTERVENTION',
        generatedAt: new Date().toISOString(),
        severity: crisisAssessment.categories[0]?.severity || 'HIGH'
      }
    };
  }

  _determineOptimalIntent(insight, context) {
    const emotionName = insight.emotionProfile?.primaryEmotion?.name || 'neutral';
    const emotionIntensity = insight.emotionProfile?.primaryEmotion?.score || 0.5;
    const hasConflict = insight.synthesisProfile?.topTension?.strength > 0.6;
    const hasPattern = insight.synthesisProfile?.topPattern !== null;

    let intent = 'empathy';

    if (hasConflict && emotionIntensity > 0.7) {
      intent = 'probe_dissonance';
    } else if (emotionIntensity > 0.85) {
      intent = 'grounding';
    } else if (hasPattern && context.historicalContext.emotionTrend !== emotionName) {
      intent = 'insight_delivery';
    } else if (context.conversationTheme.consistency < 0.3) {
      intent = 'open_question';
    } else if (context.userProfile?.resilience > 0.6) {
      intent = 'action_proposal_immediate';
    }

    return intent;
  }

  _constructResponseParts(insight, context, intent, dnaBlend) {
    const parts = {
      opening: this._generateOpening(insight, intent, dnaBlend),
      validation: this._generateValidation(insight, dnaBlend),
      exploration: this._generateExploration(insight, context),
      insight: this._generateInsight(insight, context),
      actionable: this._generateActionableContent(insight, context),
      closing: this._generateClosing(insight, intent)
    };

    return parts;
  }

  _generateOpening(insight, intent, dnaBlend) {
    const emotionName = insight.emotionProfile?.primaryEmotion?.name || 'neutral';
    const templates = {
      empathy: [
        'أفهم تماماً ما تشعر به الآن.',
        'شعورك هذا حقيقي وصحيح.',
        'أنا هنا، وأستمع إليك بكل تركيز.'
      ],
      grounding: [
        'أولاً، أنت آمن الآن.',
        'دعنا نهدئ نفسنا قليلاً معاً.',
        'أنت هنا، والآن، وأنت بأمان.'
      ],
      insight_delivery: [
        'رأيت شيئاً قد يكون مهماً...',
        'دعني أشارك معك ملاحظة...',
        'قد يكون هناك طريقة مختلفة لرؤية هذا...'
      ],
      action_proposal_immediate: [
        'أعتقد أن لديك القوة لاتخاذ خطوة الآن.',
        'ماذا لو جربنا شيئاً صغيراً معاً؟',
        'أنت قادر على هذا - دعني أساعدك.'
      ]
    };

    const templateList = templates[intent] || templates.empathy;
    return sample(templateList);
  }

  _generateValidation(insight, dnaBlend) {
    const templates = RESPONSE_TEMPLATES.validation;
    return sample(templates);
  }

  _generateExploration(insight, context) {
    if (Math.random() < 0.6) {
      const questions = PROBING_QUESTIONS.deep_exploration;
      return 'دعني أسأل: ' + sample(questions);
    }
    return '';
  }

  _generateInsight(insight, context) {
    if (insight.synthesisProfile?.topTension) {
      return `أرى هنا صراعاً بين ${insight.synthesisProfile.topTension.pole_a.name} و${insight.synthesisProfile.topTension.pole_b.name}.`;
    }
    if (insight.synthesisProfile?.topPattern) {
      return `هناك نمط أرى أنه يظهر بشكل متكرر في حياتك.`;
    }
    return '';
  }

  _generateActionableContent(insight, context) {
    const emotionName = insight.emotionProfile?.primaryEmotion?.name || 'neutral';
    const techniques = EMOTION_RESPONSE_MATRIX[emotionName]?.techniques || [];
    
    if (techniques.length > 0) {
      const technique = sample(techniques);
      const suggestions = {
        grounding: 'جرب التركيز على حواسك الخمس - ما تراه، تسمعه، تشعر به؟',
        gentle_exploration: 'دعنا نستكشف هذا ببطء وبرفق.',
        perspective_shift: 'هل يمكنك رؤية هذا من وجهة نظر مختلفة؟',
        action_oriented: 'ما أول خطوة صغيرة يمكنك اتخاذها؟',
        self_compassion: 'تحدث إلى نفسك كما تتحدث إلى صديق محبوب.'
      };

      return suggestions[technique] || '';
    }

    return '';
  }

  _generateClosing(insight, intent) {
    const closings = [
      'أنا هنا لك - دائماً.',
      'أنت لست وحدك في هذا.',
      'نحن سنعبر هذا معاً.',
      'أنت أقوى مما تعتقد.',
      'هناك أمل - حتى لو لم تشعر به الآن.'
    ];

    return sample(closings);
  }

  _assembleResponse(parts, intent, dnaBlend) {
    const responseArray = [];

    // تجميع الأجزاء بترتيب منطقي
    if (parts.opening) responseArray.push(parts.opening);
    if (parts.validation) responseArray.push(parts.validation);
    if (parts.exploration) responseArray.push(parts.exploration);
    if (parts.insight) responseArray.push(parts.insight);
    if (parts.actionable) responseArray.push(parts.actionable);
    if (parts.closing) responseArray.push(parts.closing);

    // فلترة الأجزاء الفارغة
    const finalResponse = responseArray
      .filter(part => part && part.trim().length > 0)
      .join('\n\n');

    return {
      responseText: finalResponse || 'أنا هنا معك. شكراً لثقتك بي.',
      intent,
      emotionalDNA: dnaBlend.finalMix,
      _meta: {
        type: 'ADVANCED_RESPONSE',
        generatedAt: new Date().toISOString(),
        partsUsed: Object.keys(parts).filter(k => parts[k]),
        confidence: 0.85
      }
    };
  }

  // ================================================================================
  // 5. وظائف مساعدة (Helper Functions)
  // ================================================================================
  _getRelevantHelpline(categories) {
    if (categories.some(c => c.severity === 'CRITICAL')) {
      return [
        {
          name: 'الخط الساخن السعودي للصحة النفسية',
          number: '920033333',
          available24h: true,
          whatsapp: 'https://wa.me/+966920033333'
        },
        {
          name: 'الطوارئ',
          number: '997',
          available24h: true
        }
      ];
    }

    return [
      {
        name: 'منصة ساهم للدعم النفسي',
        website: 'https://www.sahem.sa/',
        available24h: true
      },
      {
        name: 'Befrienders',
        website: 'https://www.befrienders.org/',
        international: true
      }
    ];
  }

  _extractRecurrentThemes(memories) {
    const themes = {};
    memories.forEach(m => {
      const concepts = Object.keys(m.insight?.semanticMap?.conceptInsights || {});
      concepts.forEach(c => {
        themes[c] = (themes[c] || 0) + 1;
      });
    });

    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);
  }

  _findHistoricalPatterns(memories) {
    return [];
  }

  _calculateImprovementTrend(memories) {
    if (memories.length < 2) return 0;
    const recent = memories.slice(-5);
    const older = memories.slice(-10, -5);

    const recentScore = recent.reduce((sum, m) => 
      sum + (1 - (m.insight?.emotionProfile?.primaryEmotion?.score || 0.5)), 0
    ) / recent.length;

    const olderScore = older.reduce((sum, m) => 
      sum + (1 - (m.insight?.emotionProfile?.primaryEmotion?.score || 0.5)), 0
    ) / older.length;

    return Math.max(-1, Math.min(1, recentScore - olderScore));
  }

  _calculateResilience(memories) {
    if (memories.length < 5) return 0.5;

    const emotionStability = 1 - (
      memories.reduce((sum, m) => {
        const score = m.insight?.emotionProfile?.primaryEmotion?.score || 0.5;
        return sum + Math.abs(score - 0.5);
      }, 0) / memories.length
    );

    return emotionStability;
  }

  _identifyResponsePreferences(memories) {
    return ['deep_exploration'];
  }

  _calculateThemeConsistency(themes) {
    if (themes.size === 0) return 0;
    const values = Array.from(themes.values());
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return 1 - (variance / (mean * mean || 1));
  }

  _analyzeDefenses() {
    return [];
  }

  _analyzeCopingStrategies() {
    return [];
  }

  _identifyGrowthAreas() {
    return [];
  }

  _identifyStrengths() {
    return [];
  }

  _recordResponseMetadata(insight, response, crisisAssessment, context) {
    const metadata = {
      timestamp: new Date().toISOString(),
      emotion: insight.emotionProfile?.primaryEmotion?.name,
      intent: response.intent,
      crisisLevel: crisisAssessment.level,
      responseLength: response.responseText.length,
      dnaUsed: response.emotionalDNA
    };

    this.responseMetrics.set(Date.now(), metadata);
  }

  // ================================================================================
  // واجهة التوافق مع النسخة السابقة (Backward Compatibility Interface)
  // ================================================================================
  async generateResponse(comprehensiveInsight) {
    try {
      return this.generateAdvancedResponse(comprehensiveInsight);
    } catch (e) {
      console.error("[CatharsisEngineV2] Error in response generation:", e);
      return {
        responseText: 'أنا هنا معك - كيف يمكنني مساعدتك؟',
        _meta: {
          error: e.message,
          fallback: true
        }
      };
    }
  }
}

export default CatharsisEngineV2;
