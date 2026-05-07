
/**
 * 🧠 المفهوم: الاكتئاب (Depression)
 * المسار: rafiq_soul/depression.js
 * الإصدار: 9.0-UltraCognitive Core (Full Stack Psy-Engine)
 */

export const DEPRESSION_CORE = {
  id: "depression_major",
  version: "9.0",

  // ======================================================
  // 🧭 تعريف التكامل الموحد (Unified Integration)
  // ======================================================
  integration: {
    analysis_engine: {
      consumes: [
        "linguistic_generator",
        "signal_extractor",
        "cognitive_geometry",
        "neural_links",
        "activation_model",
        "defensive_armor",
        "somatic_mapping",
        "meta_cognition_layer",      // جديد
        "context_memory_layer",      // جديد
        "uncertainty_model"          // جديد
      ],
      produces: [
        "activation_score",
        "detected_signals",
        "matched_patterns",
        "detected_defense",
        "somatic_load",
        "confidence_level",
        "meta_state_profile",        // جديد
        "context_weight",            // جديد
        "risk_estimation"            // جديد
      ]
    },

    response_engine: {
      consumes: [
        "activation_score",
        "confidence_level",
        "detected_signals",
        "detected_defense",
        "narrative_archetype",
        "identity_profile",
        "conversational_signature",
        "meta_state_profile",        // جديد
        "risk_estimation"            // جديد
      ],
      produces: [
        "final_response",
        "response_type",
        "defense_break_strategy",
        "emotional_tone",
        "response_trace",            // جديد (Explainability)
        "adaptive_style",            // جديد
        "safety_layer_state"         // جديد
      ]
    }
  },

  // ======================================================
  // 🧠 طبقة الميتا كوجنيشن (Meta Cognition Layer)
  // ======================================================
  meta_cognition_layer: {
    self_awareness_depth: "high",
    emotion_reasoning_bridge: true,
    thought_observer: true,

    distortions_detected: {
      catastrophizing: 0.0,
      over_generalization: 0.0,
      mind_reading: 0.0,
      emotional_fusion: 0.0
    },

    correction_logic: {
      gentle_reframe: true,
      avoid_invalidating_user: true,
      preserve_emotional_truth: true
    }
  },

  // ======================================================
  // 🧠 الذاكرة السياقية (Context Memory Layer)
  // ======================================================
  context_memory_layer: {
    short_term_window: 6,
    emotional_tracking: true,

    memory_fields: [
      "user_emotion_flow",
      "topic_repetition",
      "stress_accumulation",
      "positive_moments"
    ],

    compression_logic: "semantic_summarization"
  },

  // ======================================================
  // ⚖️ نموذج عدم اليقين (Uncertainty Model)
  // ======================================================
  uncertainty_model: {
    confidence_factors: {
      signal_strength: 0.4,
      linguistic_clarity: 0.3,
      somatic_alignment: 0.2,
      contradiction_check: 0.1
    },

    output: {
      confidence_level: 0.0,
      ambiguity_flag: false,
      need_clarification: false
    }
  },

  // ======================================================
  // 🧠 الهوية النفسية
  // ======================================================
  identity_profile: {
    emotional_signature: "heavy_empty_hopeless",
    cognitive_style: "negative_filtering",
    behavioral_tendency: "withdrawal",
    energy_profile: "collapsed",
    communication_pressure: "low_slow_soft"
  },

  // ======================================================
  // 🧩 تحسين النماذج السردية
  // ======================================================
  narrative_archetypes: {
    the_martyr: {
      pattern: "التضحية + لوم الذات + انتظار المقابل المفقود",
      core_need: "Recognition",
      alchemy_tweak: "Focus on Self-Worth",
      risk_level: "medium"
    },
    the_void: {
      pattern: "فراغ + عدم جدوى + غياب المعنى",
      core_need: "Existence Validation",
      alchemy_tweak: "Focus on Presence",
      risk_level: "high"
    },
    the_fallen_hero: {
      pattern: "مقارنة بالماضي + انهيار القيمة الذاتية",
      core_need: "Acceptance",
      alchemy_tweak: "Self Compassion",
      risk_level: "medium"
    }
  },

  // ======================================================
  // 🛡️ الدفاعات النفسية (Expanded)
  // ======================================================
  defensive_armor: {
    intellectualization: {
      detect: ["منطقياً", "كيميا", "تحليل", "دراسة"],
      response_strategy: "GENTLE_EMOTIONAL_PULL"
    },
    minimization: {
      detect: ["عادي", "مش مهم", "كل الناس"],
      response_strategy: "VALIDATION_ENFORCEMENT"
    },
    humor_deflection: {
      detect: ["😂", "هههه", "بهزر"],
      response_strategy: "SINCERITY_ANCHOR"
    },
    silence_withdrawal: {               // جديد
      detect: ["..."],
      response_strategy: "SAFE_OPENING"
    }
  },

  // ======================================================
  // 🧘 الجسد + الإشارة العصبية
  // ======================================================
  somatic_mapping: {
    indicators: {
      weight: ["تقيل", "مكبل", "مشدود"],
      constriction: ["خنقة", "ضيق", "ضغط"],
      collapse: ["مفيش طاقة", "منهار"],
      numbing: ["مش حاسس", "فارغ"]
    },

    interoception_model: {   // جديد
      body_awareness_score: 0.0,
      disconnection_level: 0.0
    }
  },

  // ======================================================
  // 🧠 الشبكة العصبية (Enhanced)
  // ======================================================
  neural_links: {
    triggers_activation: {
      anxiety: 0.6,
      self_blame: 0.8,
      insomnia: 0.7,
      meaninglessness: 0.9,
      isolation: 1.0
    },
    inhibitors: {
      joy_high: 0.9,
      motivation: 0.8,
      social_support: 1.0
    }
  },

  // ======================================================
  // 📊 نموذج التفعيل (Normalized Scoring)
  // ======================================================
  activation_model: {
    scoring: {
      direct_match: 2.0,
      morph_match: 1.5,
      somatic_boost: 1.8,
      defense_penalty: -0.5,
      neural_influence: 0.5,
      context_boost: 0.7,     // جديد
      emotional_drift: 0.6     // جديد
    },
    normalization: true,
    threshold: 3.0
  },

  // ======================================================
  // 🧠 كيمياء الرد (Ultra Layered System)
  // ======================================================
  response_alchemy: {
    layer_0_defense_break: {
      intellectualization: "خلينا نحس قبل ما نفسر...",
      humor_deflection: "واضح إن في حاجة أعمق من الهزار ده...",
      minimization: "الإحساس اللي جواك مش صغير..."
    },

    layer_1_validation: [
      "أنا حاسس بثقل اللي جواك...",
      "واضح إن في حمل تقيل...",
      "الإحساس ده مش بسيط..."
    ],

    layer_2_bridge: [
      "ده ممكن يخلّي العقل يدخل في دائرة {linked_concept}...",
      "واللي بيزود إحساس {symptom}..."
    ],

    layer_3_reframe: [
      "ممكن يكون ده تعبير عن إرهاق داخلي مش ضعف...",
      "مش لازم تقاوم لوحدك..."
    ],

    layer_4_action: [
      "نفس واحد بس دلوقتي...",
      "خطوة صغيرة جدًا تكفي..."
    ],

    layer_5_presence: [   // جديد
      "أنا معاك هنا دلوقتي بدون حكم...",
      "مش لازم تشرح كل حاجة..."
    ]
  },

  // ======================================================
  // 🧯 نظام الأمان (Expanded Crisis System)
  // ======================================================
  clinical_protocols: {
    logic: "CBT_DBT_Hybrid",

    crisis_escalation_levels: {   // جديد
      level_1: "emotional_distress",
      level_2: "psychological_risk",
      level_3: "self_harm_thoughts"
    },

    safety_check: {
      critical_tokens: [
        "انتحار",
        "أنهي حياتي",
        "أموت نفسي",
        "سم",
        "سكينة",
        "أختفي"
      ],
      action: "ACTIVATE_CRISIS_PROTOCOL",
      response_mode: "IMMEDIATE_STABILIZATION"
    }
  },

  // ======================================================
  // 📤 الخرج النهائي
  // ======================================================
  final_output_contract: {
    analysis: [
      "activation_score",
      "confidence_level",
      "risk_estimation",
      "meta_state_profile"
    ],
    response: [
      "response_trace",
      "final_response",
      "adaptive_style"
    ]
  }
};
