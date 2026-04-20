
/**
 * 🧠 المفهوم: الاكتئاب (Depression)
 * المسار: rafiq_soul/depression.js
 * الإصدار: 7.1
 */

export const DEPRESSION_CORE = {
  id: "depression_major",
  version: "7.1",

  // ======================================================
  // 🧭 تعريف التكامل مع المحركات
  // ======================================================
  integration: {
    analysis_engine: {
      consumes: [
        "linguistic_generator",
        "signal_extractor",
        "cognitive_geometry",
        "neural_links",
        "activation_model"
      ],
      produces: [
        "activation_score",
        "detected_signals",
        "matched_patterns",
        "confidence_level"
      ]
    },

    response_engine: {
      consumes: [
        "activation_score",
        "confidence_level",
        "detected_signals",
        "neural_links"
      ],
      produces: [
        "final_response",
        "response_type"
      ]
    }
  },

  // ======================================================
  // 1. محرك التجذير والتكاثر اللغوي
  // ======================================================
  linguistic_generator: {
    input: "raw_text",

    roots: ["كأب", "حزن", "ضيق", "فقد", "موت", "يأس"],

    morph_patterns: {
      "إفتعال": "اكتئاب، اختناق، انطواء",
      "مُفتعل": "مكتئب، مختنق، منعزل",
      "فعل": "حزن، ضيق، يأس",
      "فعيل": "حزين، ضيق، قتيل",
      "أفعل": "أضيق، أحزن، أصعب"
    },

    auto_multipliers: {
      subject_starts: ["أنا", "حاسس إني", "بقيت", "روحي", "قلبي", "الدنيا"],
      state_seeds: ["مكتئب", "حزين", "مخنوق", "مطفي", "يائس", "ضايع"],
      intensity_tails: ["جداً", "خالص", "موت", "لأبعد حد", "بقالي فترة", "فوق طاقتي"]
    },

    output: {
      generated_tokens: [],
      expanded_patterns: []
    }
  },

  // ======================================================
  // 1.5 استخراج الإشارات (Bridge Layer)
  // ======================================================
  signal_extractor: {
    input: "tokens",

    detect: {
      self_reference: ["أنا", "نفسي"],
      intensity: ["جداً", "موت", "فوق طاقتي"],
      temporal: ["بقالي", "زمان", "الفترة دي"],
      negation: ["مش", "مفيش"]
    },

    output: {
      detected_signals: [],
      signal_strength: 0
    }
  },

  // ======================================================
  // 2. شبكة الربط العصبي
  // ======================================================
  neural_links: {
    triggers_activation: {
      "anxiety": 0.6,
      "self_blame": 0.8,
      "insomnia": 0.7,
      "meaninglessness": 0.9
    },

    inhibitors: {
      "joy_high": 0.9,
      "motivation": 0.8
    },

    output: {
      influenced_states: [],
      modulation_factor: 1.0
    }
  },

  // ======================================================
  // 3. تحليل الإحداثيات والزمن
  // ======================================================
  cognitive_geometry: {
    input: ["tokens", "signals"],

    vad_coordinates: { v: -0.95, a: -0.85, d: -0.90 },

    time_focus: "past_dominant",
    locus_of_control: "external_negative",

    domain_weights: {
      "self": 1.0,
      "social": 0.8,
      "future": 0.9
    },

    output: {
      vad_vector: {},
      temporal_weight: 1.0,
      domain_vector: {}
    }
  },

  // ======================================================
  // 4. نموذج التفعيل (قرار التحليل)
  // ======================================================
  activation_model: {
    input: [
      "generated_tokens",
      "detected_signals",
      "vad_vector",
      "neural_links"
    ],

    scoring: {
      direct_match: 2,
      pattern_match: 1,
      signal_boost: 1.5,
      neural_influence: 0.5
    },

    threshold: 3,

    output: {
      activation_score: 0,
      confidence_level: 0,
      is_active: false
    }
  },

  // ======================================================
  // 5. محرك الردود المتكاثرة
  // ======================================================
  response_alchemy: {
    input: ["activation_score", "confidence_level"],

    layer_1_validation: [
      "أنا سامع الثقل اللي في كلامك عن {seed}..",
      "واضح إن {subject} شايل حمل كبير فوق طاقته..",
      "إحساس الـ {seed} لما بيتمكن مننا بيبقى كأنه ضباب مغطي كل حاجة.."
    ],

    layer_2_bridge: [
      "والحقيقة إن الـ {seed} دايماً بيجيب معاه {linked_concept}، وده اللي بيخليك تحس بـ {symptom}..",
      "كأن عقلك بيحاول يحميك بالانعزال ده، بس النتيجة إن الـ {linked_concept} بيزيد.."
    ],

    layer_3_reframe: [
      "تفتكر الوجع ده رسالة من روحك إنك محتاج مساحة أمان أكتر؟",
      "أوقات الاكتئاب بيكون 'استراحة إجبارية' للنفس لأنها قاومت كتير.."
    ],

    layer_4_action: [
      "مش طالب منك تغير كل ده دلوقتي، إيه رأيك بس نتنفس سوا لدقيقة؟",
      "ممكن نحدد حاجة واحدة بس صغيرة جداً تعملها لنفسك النهاردة؟"
    ],

    output: {
      response_blocks: []
    }
  },

  // ======================================================
  // 6. التحكم في الرد (حسب شدة الحالة)
  // ======================================================
  response_control: {
    input: ["activation_score"],

    by_activation: {
      low: ["layer_1_validation"],
      medium: ["layer_1_validation", "layer_3_reframe"],
      high: ["layer_1_validation", "layer_2_bridge", "layer_4_action"]
    },

    output: {
      selected_layers: []
    }
  },

  // ======================================================
  // 7. البروتوكولات السريرية
  // ======================================================
  clinical_protocols: {
    logic: "CBT_DBT_Hybrid",

    detect_negation_flip: true,

    safety_check: {
      critical_tokens: ["انتحار", "أنهي حياتي", "سكينة", "سم", "موت"],
      action: "ACTIVATE_CRISIS_PROTOCOL"
    }
  },

  // ======================================================
  // 📤 الخرج النهائي للمفهوم (للربط مع المحركات)
  // ======================================================
  final_output_contract: {
    analysis: [
      "activation_score",
      "confidence_level",
      "detected_signals"
    ],
    response: [
      "response_blocks",
      "selected_layers"
    ]
  }
};
