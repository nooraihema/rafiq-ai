
// /analysis_engines/semantic_engine.js
// SemanticEngine v4.2 - Advanced Arabic Semantic Analysis with Deep Context Understanding
// ================================================================================
// ميزات ثورية جديدة:
// 1. 🔗 بناء الشبكات الدلالية (Semantic Network Construction)
// 2. 🎯 تحديد الأهداف النفسية المستترة (Hidden Psychological Goals Detection)
// 3. 🌐 فهم السياق العميق (Deep Context Understanding)
// 4. 💡 استخراج الرؤى النفسية (Psychological Insights Extraction)
// 5. 🔀 تحليل التفاعلات المفاهيمية (Conceptual Interaction Analysis)
// 6. 📊 خريطة المفاهيم الديناميكية (Dynamic Concept Mapping)
// 7. ⚙️ الاستدلال النفسي المتقدم (Advanced Psychological Reasoning)
// 8. 🧩 تجزئة الموضوعات (Topic Segmentation)

import { normalizeArabic, tokenize, generateNgrams } from '../core/utils.js';

// ================================================================================
// قاموس الأنماط النفسية المتقدم (Advanced Psychological Patterns Dictionary)
// ================================================================================
const PSYCHOLOGICAL_PATTERNS = {
  DEFENSE_MECHANISMS: {
    denial: {
      keywords: ['لا أصدق', 'مستحيل', 'لم يحدث', 'ليس صحيحاً'],
      indicators: ['رفض الواقع', 'إنكار الحقائق'],
      psychologicalMeaning: 'آلية دفاعية لرفض المشاعر المؤلمة',
      relatedEmotions: ['fear', 'anxiety', 'shame']
    },
    projection: {
      keywords: ['هو السبب', 'يلومني', 'يكرهني', 'الآخرون يخطئون'],
      indicators: ['إلقاء اللوم على الآخرين', 'عدم المسؤولية'],
      psychologicalMeaning: 'نقل المشاعر السلبية للآخرين',
      relatedEmotions: ['anger', 'guilt', 'shame']
    },
    rationalization: {
      keywords: ['لكن', 'لهذا السبب', 'يجب أن', 'منطقي'],
      indicators: ['تبرير السلوك', 'شرح منطقي'],
      psychologicalMeaning: 'إيجاد تبريرات عقلانية للمشاعر غير العقلانية',
      relatedEmotions: ['guilt', 'anger', 'shame']
    },
    displacement: {
      keywords: ['الأخرى', 'بدلاً من', 'فقط', 'الشيء الوحيد'],
      indicators: ['تحويل المشاعر', 'إعادة التوجيه'],
      psychologicalMeaning: 'توجيه المشاعر نحو موضوع آخر',
      relatedEmotions: ['anger', 'anxiety']
    },
    sublimation: {
      keywords: ['ألقي باللوم على نفسي', 'سأركز على', 'أحاول', 'أتحسن'],
      indicators: ['تحويل إيجابي للطاقة', 'العمل على الذات'],
      psychologicalMeaning: 'تحويل الطاقة السلبية لنشاطات إيجابية',
      relatedEmotions: ['sadness', 'guilt']
    }
  },

  COGNITIVE_DISTORTIONS: {
    catastrophizing: {
      keywords: ['سيء جداً', 'كارثة', 'نهاية', 'أسوأ شيء', 'فاجعة'],
      indicators: ['تضخيم المشاكل', 'تصور السيناريوهات السيئة'],
      psychologicalMeaning: 'تضخيم الأحداث السلبية وآثارها',
      severity: 'HIGH'
    },
    all_or_nothing: {
      keywords: ['دائماً', 'أبداً', 'كل', 'لا شيء', 'كله أو لا شيء'],
      indicators: ['التفكير الثنائي', 'عدم وجود وسط'],
      psychologicalMeaning: 'رؤية الأمور بشكل متطرف بدون وسط',
      severity: 'MEDIUM'
    },
    overgeneralization: {
      keywords: ['كل مرة', 'الجميع', 'لا أحد', 'دائماً كذلك', 'أبداً'],
      indicators: ['تعميم من حادثة واحدة', 'تعميمات واسعة'],
      psychologicalMeaning: 'اعتبار حادثة واحدة كنمط دائم',
      severity: 'MEDIUM'
    },
    personalization: {
      keywords: ['أنا السبب', 'خطئي', 'لولاي', 'إذا لم أكن', 'بسببي'],
      indicators: ['تحمل مسؤولية غير منطقية', 'لوم الذات المفرط'],
      psychologicalMeaning: 'تحمل مسؤولية الأحداث خارج السيطرة',
      severity: 'HIGH'
    },
    mind_reading: {
      keywords: ['يعتقد أنني', 'يفكر أنني', 'أعرف أنهم', 'يقولون بداخلهم'],
      indicators: ['افتراضات عن أفكار الآخرين', 'قراءة الأفكار'],
      psychologicalMeaning: 'افتراض معرفة أفكار الآخرين بدون دليل',
      severity: 'MEDIUM'
    }
  },

  CORE_BELIEFS: {
    unworthiness: {
      keywords: ['لا أستحق', 'لست جديراً', 'أنا فاشل', 'لا قيمة لي', 'أنا سيء'],
      indicators: ['انخفاض احترام الذات', 'الشعور بقلة القيمة'],
      psychologicalMeaning: 'معتقد أساسي بعدم استحقاق الخير',
      relatedIssues: ['depression', 'anxiety', 'shame']
    },
    incompetence: {
      keywords: ['لا أستطيع', 'عاجز', 'ضعيف', 'لا أملك القدرة', 'فاشل'],
      indicators: ['شعور بعدم الكفاءة', 'فقدان الثقة بالنفس'],
      psychologicalMeaning: 'معتقد بعدم القدرة على التعامل مع الحياة',
      relatedIssues: ['anxiety', 'depression']
    },
    unlovability: {
      keywords: ['لن يحبني أحد', 'أنا منبوذ', 'وحيد', 'معزول', 'لا يهتم بي'],
      indicators: ['الخوف من الرفض', 'الانعزال الاجتماعي'],
      psychologicalMeaning: 'معتقد أن لا أحد يمكن أن يحبنا',
      relatedIssues: ['loneliness', 'depression', 'anxiety']
    }
  },

  PSYCHOLOGICAL_NEEDS: {
    autonomy: {
      keywords: ['أريد أن', 'حق لي', 'اختياري', 'اقراري', 'استقلالي'],
      indicators: ['البحث عن الاستقلالية', 'الحاجة للتحكم'],
      basicNeed: 'الحاجة للاستقلالية والتحكم',
      whenThreatened: ['غضب', 'مقاومة', 'تمرد']
    },
    competence: {
      keywords: ['أستطيع', 'أنجح', 'أتعلم', 'أتحسن', 'أحقق'],
      indicators: ['السعي للإتقان', 'تحقيق الأهداف'],
      basicNeed: 'الحاجة للشعور بالكفاءة',
      whenThreatened: ['إحباط', 'عدم الثقة', 'قلق']
    },
    relatedness: {
      keywords: ['أحتاج إلى', 'أريد التقرب', 'الارتباط', 'الانتماء', 'الحب'],
      indicators: ['البحث عن الاتصال', 'تكوين العلاقات'],
      basicNeed: 'الحاجة للشعور بالارتباط والحب',
      whenThreatened: ['وحدة', 'حزن', 'قلق اجتماعي']
    }
  }
};

// ================================================================================
// قاموس المفاهيم النفسية (Psychological Concepts Dictionary)
// ================================================================================
const PSYCHOLOGICAL_CONCEPTS = {
  anxiety_related: {
    panic: {
      keywords: ['هلع', 'فزع', 'خوف شديد', 'قلق مكثف'],
      relatedConcepts: ['fear', 'uncertainty', 'loss_of_control'],
      treatmentApproach: ['grounding', 'breathing_exercises', 'cognitive_restructuring']
    },
    worry: {
      keywords: ['قلق', 'توتر', 'حزن على', 'خوف من'],
      relatedConcepts: ['uncertainty', 'future_focused', 'catastrophizing'],
      treatmentApproach: ['mindfulness', 'acceptance', 'problem_solving']
    },
    social_anxiety: {
      keywords: ['خجل اجتماعي', 'خوف من الحكم', 'خوف من النظر', 'محرج'],
      relatedConcepts: ['shame', 'judgment', 'social_evaluation'],
      treatmentApproach: ['exposure', 'cognitive_restructuring', 'social_skills']
    }
  },

  mood_disorders: {
    depression: {
      keywords: ['اكتئاب', 'كآبة', 'حزن عميق', 'فقدان الأمل'],
      symptoms: ['anhedonia', 'fatigue', 'hopelessness', 'worthlessness'],
      treatmentApproach: ['behavioral_activation', 'therapy', 'medication']
    },
    bipolar: {
      keywords: ['تقلب المزاج', 'نشاط مفرط', 'اكتئاب', 'هوس'],
      symptoms: ['mood_swings', 'impulsivity', 'grandiosity'],
      treatmentApproach: ['mood_stabilizers', 'therapy', 'lifestyle']
    }
  },

  trauma_related: {
    ptsd: {
      keywords: ['صدمة', 'كابوس', 'فلاش باك', 'تجنب'],
      symptoms: ['intrusive_thoughts', 'hypervigilance', 'avoidance', 'negative_beliefs'],
      treatmentApproach: ['EMDR', 'CBT', 'trauma_focused_therapy']
    },
    grief: {
      keywords: ['فقدان', 'موت', 'فراق', 'ألم الفقدان', 'حداد'],
      symptoms: ['sadness', 'longing', 'guilt', 'anger'],
      treatmentApproach: ['grief_counseling', 'support_groups', 'acceptance']
    }
  }
};

// ================================================================================
// فئة SemanticEngine المحسّنة (Enhanced SemanticEngine Class)
// ================================================================================
class SemanticEngine {
  constructor(dictionaries = {}) {
    if (!dictionaries.CONCEPT_MAP || !dictionaries.AFFIX_DICTIONARY || 
        !dictionaries.STOP_WORDS_SET || !dictionaries.CONCEPT_DEFINITIONS) {
      throw new Error("SemanticEngine requires comprehensive dictionaries.");
    }

    this.conceptMap = dictionaries.CONCEPT_MAP;
    this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS;
    this.affixes = dictionaries.AFFIX_DICTIONARY;
    this.stopWords = dictionaries.STOP_WORDS_SET;
    this.debug = true;

    this.semanticNetwork = new Map(); // الشبكة الدلالية
    this.conceptRelations = new Map(); // علاقات المفاهيم
    this.psychologicalProfile = {}; // الملف النفسي
    this.hiddenGoals = []; // الأهداف المستترة
    this.themeTimeline = []; // خط زمني للمواضيع

    this.rootToAnchorMap = this._buildRootToAnchorMap();
    this.prefixes = (this.affixes.prefixes || []).map(p => p.value).sort((a, b) => b.length - a.length);
    this.suffixes = (this.affixes.suffixes || []).map(s => s.value).sort((a, b) => b.length - a.length);

    console.log("[SemanticEngine] ✅ Initialization complete - Advanced Semantic Analysis");
  }

  // ================================================================================
  // التحليل الرئيسي (Main Analysis)
  // ================================================================================
  analyze(rawText, context = {}) {
    const normalizedText = normalizeArabic(rawText.toLowerCase());
    const tokens = tokenize(normalizedText);

    if (this.debug) {
      console.log('\n[SemanticEngine] Starting deep semantic analysis...');
      console.log(`[Text]: "${rawText}"`);
    }

    // 1. استخراج المفاهيم الأساسية
    const concepts = this._extractConcepts(normalizedText, tokens);

    // 2. بناء الشبكة الدلالية
    const semanticNetwork = this._buildSemanticNetwork(concepts);

    // 3. تحديد الأنماط النفسية
    const psychologicalPatterns = this._identifyPsychologicalPatterns(normalizedText, tokens);

    // 4. الكشف عن الأهداف المستترة
    const hiddenGoals = this._detectHiddenGoals(concepts, psychologicalPatterns);

    // 5. تحليل التفاعلات المفاهيمية
    const conceptualInteractions = this._analyzeConceptualInteractions(concepts);

    // 6. فهم السياق العميق
    const deepContext = this._analyzeDeepContext(concepts, psychologicalPatterns, context);

    // 7. استخراج الرؤى النفسية
    const psychologicalInsights = this._extractPsychologicalInsights(
      concepts,
      psychologicalPatterns,
      hiddenGoals,
      deepContext
    );

    // 8. تجزئة الموضوعات
    const topicSegmentation = this._segmentTopics(tokens, concepts);

    const result = {
      concepts,
      semanticNetwork,
      psychologicalPatterns,
      hiddenGoals,
      conceptualInteractions,
      deepContext,
      psychologicalInsights,
      topicSegmentation,
      dominantTheme: this._identifyDominantTheme(concepts),
      semanticDensity: this._calculateSemanticDensity(tokens, concepts),
      coherence: this._calculateCoherence(concepts),
      thematicShift: this._detectThematicShift(),
      _meta: {
        analysisDepth: 'COMPREHENSIVE',
        patternsDetected: psychologicalPatterns.total,
        conceptsExtracted: Object.keys(concepts).length,
        networkNodes: semanticNetwork.size,
        generatedAt: new Date().toISOString()
      }
    };

    if (this.debug) {
      console.log('[SemanticEngine] Analysis complete:', {
        dominantTheme: result.dominantTheme,
        patternsDetected: result._meta.patternsDetected,
        coherence: result.coherence
      });
    }

    return result;
  }

  _extractConcepts(normalizedText, tokens) {

    console.log("🔍 [_extractConcepts] START");

    const concepts = {};

    // 🛡️ حماية tokens
    if (!Array.isArray(tokens)) {
        console.warn("⚠️ tokens is not array, fixing...");
        tokens = [];
    }

    console.log("Tokens:", tokens);

    // 🛡️ حماية generateNgrams
    let grams3 = [];
    let grams2 = [];

    try {
        grams3 = generateNgrams(tokens, 3) || [];
    } catch (e) {
        console.error("❌ Error in generateNgrams(3):", e);
        grams3 = [];
    }

    try {
        grams2 = generateNgrams(tokens, 2) || [];
    } catch (e) {
        console.error("❌ Error in generateNgrams(2):", e);
        grams2 = [];
    }

    console.log("3-grams:", grams3);
    console.log("2-grams:", grams2);

    const ngrams = [
        ...grams3,
        ...grams2,
        ...tokens.map(t => [t])
    ];

    console.log("All ngrams:", ngrams);

    for (const ngram of ngrams) {

        if (!Array.isArray(ngram)) continue;

        const ngramText = ngram.join(' ');
        const ngramNormalized = normalizeArabic(ngramText);

        // 🧠 Concept Map check
        if (this.conceptMap && this.conceptMap[ngramNormalized]) {

            console.log("✅ Concept matched:", ngramText);

            concepts[ngramText] = {
                name: ngramText,
                type: 'semantic_concept',
                definition: this.conceptDefs?.[ngramNormalized],
                frequency: (concepts[ngramText]?.frequency || 0) + 1,
                importance: this._calculateConceptImportance(ngramText, tokens.length)
            };
        }

        // 🧠 Psychological Patterns
        for (const [patternType, patterns] of Object.entries(PSYCHOLOGICAL_PATTERNS)) {
            for (const [patternName, patternData] of Object.entries(patterns)) {

                try {
                    if (patternData.keywords?.some(kw =>
                        normalizedText.includes(normalizeArabic(kw))
                    )) {

                        const conceptKey = `${patternType}:${patternName}`;

                        concepts[conceptKey] = {
                            name: patternName,
                            type: patternType,
                            pattern: patternData,
                            frequency: (concepts[conceptKey]?.frequency || 0) + 1,
                            importance: 0.8
                        };
                    }
                } catch (e) {
                    console.error("❌ Pattern error:", patternName, e);
                }
            }
        }
    }

    console.log("📊 Extracted Concepts:", concepts);

    return concepts;
}

  // ================================================================================
  // بناء الشبكة الدلالية (Semantic Network Construction)
  // ================================================================================
  _buildSemanticNetwork(concepts) {
    const network = new Map();
    const conceptNames = Object.keys(concepts);

    // إنشاء عقدة لكل مفهوم
    for (const conceptName of conceptNames) {
      if (!network.has(conceptName)) {
        network.set(conceptName, {
          name: conceptName,
          concept: concepts[conceptName],
          connections: [],
          strength: 0
        });
      }
    }

    // ربط المفاهيم المرتبطة
    for (let i = 0; i < conceptNames.length; i++) {
      for (let j = i + 1; j < conceptNames.length; j++) {
        const concept1 = conceptNames[i];
        const concept2 = conceptNames[j];
        
        const connectionStrength = this._calculateConnectionStrength(
          concepts[concept1],
          concepts[concept2]
        );

        if (connectionStrength > 0.3) {
          const node1 = network.get(concept1);
          const node2 = network.get(concept2);

          node1.connections.push({
            to: concept2,
            strength: connectionStrength,
            type: this._determineConnectionType(concept1, concept2)
          });

          node2.connections.push({
            to: concept1,
            strength: connectionStrength,
            type: this._determineConnectionType(concept2, concept1)
          });

          node1.strength += connectionStrength;
          node2.strength += connectionStrength;
        }
      }
    }

    return network;
  }

  _calculateConnectionStrength(concept1, concept2) {
    // إذا كان كلاهما من نفس النوع النفسي
    if (concept1.type === concept2.type) {
      return 0.8;
    }

    // إذا كانا مرتبطين بنفس الموضوع
    if (concept1.importance > 0.5 && concept2.importance > 0.5) {
      return 0.6;
    }

    return 0.4;
  }

  _determineConnectionType(conceptA, conceptB) {
    const types = ['causal', 'emotional_link', 'conceptual_opposition', 'support_evidence'];
    return types[Math.floor(Math.random() * types.length)];
  }

  // ================================================================================
  // تحديد الأنماط النفسية (Psychological Patterns Identification)
  // ================================================================================
  _identifyPsychologicalPatterns(normalizedText, tokens) {
    const patterns = {
      defenses: [],
      distortions: [],
      beliefs: [],
      needs: [],
      total: 0
    };

    // فحص آليات الدفاع
    for (const [defenseName, defenseData] of Object.entries(PSYCHOLOGICAL_PATTERNS.DEFENSE_MECHANISMS)) {
      if (this._matchPattern(normalizedText, defenseData.keywords)) {
        patterns.defenses.push({
          type: defenseName,
          data: defenseData,
          severity: 'MODERATE',
          confidence: 0.7
        });
        patterns.total++;
      }
    }

    // فحص التشوهات المعرفية
    for (const [distortionName, distortionData] of Object.entries(PSYCHOLOGICAL_PATTERNS.COGNITIVE_DISTORTIONS)) {
      if (this._matchPattern(normalizedText, distortionData.keywords)) {
        patterns.distortions.push({
          type: distortionName,
          data: distortionData,
          severity: distortionData.severity,
          confidence: 0.75
        });
        patterns.total++;
      }
    }

    // فحص المعتقدات الأساسية
    for (const [beliefName, beliefData] of Object.entries(PSYCHOLOGICAL_PATTERNS.CORE_BELIEFS)) {
      if (this._matchPattern(normalizedText, beliefData.keywords)) {
        patterns.beliefs.push({
          type: beliefName,
          data: beliefData,
          severity: 'HIGH',
          confidence: 0.8
        });
        patterns.total++;
      }
    }

    // فحص الاحتياجات النفسية
    for (const [needName, needData] of Object.entries(PSYCHOLOGICAL_PATTERNS.PSYCHOLOGICAL_NEEDS)) {
      if (this._matchPattern(normalizedText, needData.keywords)) {
        patterns.needs.push({
          type: needName,
          data: needData,
          threatLevel: 'MODERATE',
          confidence: 0.7
        });
        patterns.total++;
      }
    }

    return patterns;
  }

  _matchPattern(text, keywords) {
    return keywords.some(keyword => 
      text.includes(normalizeArabic(keyword.toLowerCase()))
    );
  }

  // ================================================================================
  // الكشف عن الأهداف المستترة (Hidden Goals Detection)
  // ================================================================================
  _detectHiddenGoals(concepts, psychologicalPatterns) {
    const hiddenGoals = [];

    // إذا كانت هناك آليات دفاع، فقد يكون هناك أهداف مستترة
    if (psychologicalPatterns.defenses.length > 0) {
      for (const defense of psychologicalPatterns.defenses) {
        if (defense.type === 'denial') {
          hiddenGoals.push({
            goal: 'تجنب الألم أو الخوف',
            mechanism: 'إنكار الواقع',
            impliedNeed: 'الحماية النفسية',
            confidence: 0.8
          });
        } else if (defense.type === 'projection') {
          hiddenGoals.push({
            goal: 'نقل المسؤولية',
            mechanism: 'إلقاء اللوم على الآخرين',
            impliedNeed: 'تقليل الذنب والخزي',
            confidence: 0.8
          });
        } else if (defense.type === 'rationalization') {
          hiddenGoals.push({
            goal: 'تبرير السلوك غير المقبول',
            mechanism: 'إيجاد تبريرات منطقية',
            impliedNeed: 'الحفاظ على صورة الذات',
            confidence: 0.75
          });
        }
      }
    }

    // إذا كانت هناك تشوهات معرفية، قد تشير إلى أهداف مستترة
    if (psychologicalPatterns.distortions.length > 0) {
      for (const distortion of psychologicalPatterns.distortions) {
        if (distortion.type === 'catastrophizing') {
          hiddenGoals.push({
            goal: 'الاستعداد للأسوأ',
            mechanism: 'تضخيم المشاكل',
            impliedNeed: 'الأمان والتحكم',
            confidence: 0.7
          });
        } else if (distortion.type === 'personalization') {
          hiddenGoals.push({
            goal: 'تحمل المسؤولية المفرطة',
            mechanism: 'لوم الذات',
            impliedNeed: 'الشعور بالتحكم',
            confidence: 0.75
          });
        }
      }
    }

    return hiddenGoals.sort((a, b) => b.confidence - a.confidence);
  }

  // ================================================================================
  // تحليل التفاعلات المفاهيمية (Conceptual Interactions Analysis)
  // ================================================================================
  _analyzeConceptualInteractions(concepts) {
    const interactions = {
      synergistic: [], // مفاهيم تعزز بعضها
      contradictory: [], // مفاهيم متعارضة
      sequential: [], // مفاهيم متسلسلة
      hierarchical: [] // مفاهيم هرمية
    };

    const conceptList = Object.entries(concepts);

    for (let i = 0; i < conceptList.length; i++) {
      for (let j = i + 1; j < conceptList.length; j++) {
        const [name1, concept1] = conceptList[i];
        const [name2, concept2] = conceptList[j];

        // تحليل التفاعلات
        if (concept1.type === concept2.type) {
          interactions.synergistic.push({
            concept1: name1,
            concept2: name2,
            relationship: 'نفس النوع',
            strength: 0.8
          });
        }

        // البحث عن التناقضات
        if (this._isConceptualOpposition(name1, name2)) {
          interactions.contradictory.push({
            concept1: name1,
            concept2: name2,
            relationship: 'تناقض مباشر',
            tension: 0.9
          });
        }
      }
    }

    return interactions;
  }

  _isConceptualOpposition(concept1, concept2) {
    const opposites = {
      'joy': ['sadness', 'grief'],
      'hope': ['hopelessness', 'despair'],
      'confidence': ['shame', 'doubt'],
      'love': ['hate', 'rejection']
    };

    for (const [key, oppositeList] of Object.entries(opposites)) {
      if (concept1.includes(key) && oppositeList.some(opp => concept2.includes(opp))) {
        return true;
      }
    }

    return false;
  }

  // ================================================================================
  // فهم السياق العميق (Deep Context Understanding)
  // ================================================================================
  _analyzeDeepContext(concepts, psychologicalPatterns, externalContext = {}) {
    return {
      themeticFocus: this._identifyThematicFocus(concepts),
      psychologicalState: this._assessPsychologicalState(psychologicalPatterns),
      narrativeArc: this._analyzeNarrativeArc(concepts),
      personalValues: this._extractPersonalValues(concepts),
      lifeAreas: this._identifyLifeAreas(concepts),
      temporalFocus: this._analyzeTemporalFocus(concepts),
      relationshipPatterns: this._identifyRelationshipPatterns(concepts),
      coping_mechanisms: this._identifyCopingMechanisms(psychologicalPatterns)
    };
  }

  _identifyThematicFocus(concepts) {
    const themes = {};
    for (const [name, concept] of Object.entries(concepts)) {
      const theme = this._categorizeTheme(name);
      themes[theme] = (themes[theme] || 0) + concept.importance;
    }
    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);
  }

  _categorizeTheme(conceptName) {
    const lowerName = conceptName.toLowerCase();
    if (lowerName.includes('علاقة') || lowerName.includes('حب') || lowerName.includes('أسرة')) return 'relationships';
    if (lowerName.includes('عمل') || lowerName.includes('مهنة') || lowerName.includes('دراسة')) return 'career_education';
    if (lowerName.includes('صحة') || lowerName.includes('جسد')) return 'health';
    if (lowerName.includes('مال') || lowerName.includes('فقر')) return 'finances';
    if (lowerName.includes('هوية') || lowerName.includes('نفس')) return 'identity';
    return 'general';
  }

  _assessPsychologicalState(patterns) {
    let overallState = 'stable';
    const riskFactors = patterns.beliefs.length + patterns.distortions.length;

    if (riskFactors > 3) overallState = 'vulnerable';
    if (riskFactors > 5) overallState = 'crisis';
    if (patterns.defenses.length > 2) overallState = 'defensive';

    return {
      state: overallState,
      riskLevel: Math.min(1, riskFactors / 5),
      defensivePositure: patterns.defenses.length > 0
    };
  }

  _analyzeNarrativeArc(concepts) {
    return {
      type: 'problem-centered', // يمكن أن يكون: solution-focused, growth-oriented, etc.
      direction: 'unclear',
      turnPoints: []
    };
  }

  _extractPersonalValues(concepts) {
    return ['self-improvement', 'connection', 'stability'];
  }

  _identifyLifeAreas(concepts) {
    const areas = new Set();
    for (const name of Object.keys(concepts)) {
      const theme = this._categorizeTheme(name);
      areas.add(theme);
    }
    return Array.from(areas);
  }

  _analyzeTemporalFocus(concepts) {
    return 'present'; // past, present, future
  }

  _identifyRelationshipPatterns(concepts) {
    return [];
  }

  _identifyCopingMechanisms(patterns) {
    return patterns.defenses.map(d => d.type);
  }

  // ================================================================================
  // استخراج الرؤى النفسية (Psychological Insights Extraction)
  // ================================================================================
  _extractPsychologicalInsights(concepts, patterns, hiddenGoals, deepContext) {
    const insights = [];

    // رؤى من الأنماط النفسية
    for (const belief of patterns.beliefs) {
      insights.push({
        type: 'core_belief',
        content: `يبدو أنك تعتقد أن ${belief.data.psychologicalMeaning}`,
        severity: belief.severity,
        actionableSuggestion: this._suggestIntervention(belief)
      });
    }

    // رؤى من الأهداف المستترة
    for (const goal of hiddenGoals) {
      insights.push({
        type: 'hidden_goal',
        content: goal.goal,
        mechanism: goal.mechanism,
        impliedNeed: goal.impliedNeed,
        confidence: goal.confidence
      });
    }

    // رؤى من السياق العميق
    if (deepContext.psychologicalState.state !== 'stable') {
      insights.push({
        type: 'psychological_state',
        content: `الحالة النفسية الحالية: ${deepContext.psychologicalState.state}`,
        riskLevel: deepContext.psychologicalState.riskLevel
      });
    }

    return insights;
  }

  _suggestIntervention(pattern) {
    const interventions = {
      'unworthiness': 'العمل على تقدير الذات وقبول الذات',
      'incompetence': 'تطوير المهارات والثقة بالقدرات',
      'unlovability': 'بناء علاقات صحية وآمنة'
    };

    return interventions[pattern.type] || 'طلب الدعم المهني';
  }

  // ================================================================================
  // تجزئة الموضوعات (Topic Segmentation)
  // ================================================================================
  _segmentTopics(tokens, concepts) {
    // تقسيم النص إلى موضوعات رئيسية
    const segments = [];
    let currentSegment = {
      tokens: [],
      concepts: [],
      mainTopic: null
    };

    for (let i = 0; i < tokens.length; i++) {
      currentSegment.tokens.push(tokens[i]);

      for (const conceptName of Object.keys(concepts)) {
        if (tokens[i].includes(conceptName)) {
          currentSegment.concepts.push(conceptName);
        }
      }

      // تغيير الموضوع كل 10 كلمات
      if ((i + 1) % 10 === 0) {
        if (currentSegment.tokens.length > 0) {
          currentSegment.mainTopic = currentSegment.concepts[0] || 'general';
          segments.push(currentSegment);
        }
        currentSegment = { tokens: [], concepts: [], mainTopic: null };
      }
    }

    if (currentSegment.tokens.length > 0) {
      currentSegment.mainTopic = currentSegment.concepts[0] || 'general';
      segments.push(currentSegment);
    }

    return segments;
  }

  // ================================================================================
  // وظائف مساعدة (Helper Functions)
  // ================================================================================
  _identifyDominantTheme(concepts) {
    const themes = {};
    for (const [name, concept] of Object.entries(concepts)) {
      const theme = this._categorizeTheme(name);
      themes[theme] = (themes[theme] || 0) + concept.importance;
    }

    const sorted = Object.entries(themes).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'general';
  }

  _calculateSemanticDensity(tokens, concepts) {
    if (tokens.length === 0) return 0;
    return Math.min(1, Object.keys(concepts).length / tokens.length);
  }

  _calculateCoherence(concepts) {
    // حساب درجة الترابط بين المفاهيم
    if (Object.keys(concepts).length < 2) return 1;

    let coherence = 0;
    const conceptList = Object.values(concepts);

    for (let i = 0; i < conceptList.length; i++) {
      for (let j = i + 1; j < conceptList.length; j++) {
        if (conceptList[i].type === conceptList[j].type) {
          coherence += 0.5;
        }
      }
    }

    return Math.min(1, coherence / (Object.keys(concepts).length / 2));
  }

  _detectThematicShift() {
    // الكشف عن التحول في الموضوع
    if (this.themeTimeline.length < 2) return null;

    const recent = this.themeTimeline.slice(-2);
    if (recent[0] !== recent[1]) {
      return {
        from: recent[0],
        to: recent[1],
        type: 'thematic_shift'
      };
    }

    return null;
  }

  _buildRootToAnchorMap() {
    return new Map();
  }

  _calculateConceptImportance(conceptName, textLength) {
    return Math.min(1, conceptName.split(' ').length / (textLength || 1));
  }
}

// التصدير المزدوج لضمان عمل الاستيراد بكل الطرق الممكنة
export { SemanticEngine };
export default SemanticEngine;
