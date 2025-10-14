// /protocols/depression_gateway.js
// Dynamic Protocol for Initial Depression Signals
// This protocol provides a rich, multi-room conversational map
// for engaging with users showing signs of depression, low energy, and sadness.

const protocol = {
  tag: "depression_gateway_dynamic_v3_ultimate",
  core_concept: "محرك ديناميكي متقدم يدمج بين التعاطف، إعادة التأطير، وأدوات عملية؛ قادر على توليد ردود مركبة من أكثر من نية في نفس الوقت حسب السياق النفسي للمستخدم.",

  crisis_intervention_protocol: {
    trigger_keywords: [
      {"word": "انتحار", "weight": 1.0},
      {"word": "أذي نفسي", "weight": 1.0},
      {"word": "مش عايز أعيش", "weight": 1.0},
      {"word": "الموت أريح", "weight": 0.95},
      {"word": "نهاية", "weight": 0.9}
    ],
    immediate_response_gem: "أنا سامعك وباخد كلامك بجدية كاملة 🙏. سلامتك أهم حاجة دلوقتي. لو الأفكار دي قوية عليك، محتاج تكلم حد متخصص فورًا — ناس مدربة موجودة تسمعك وتدعمك 24/7. أرقام خطوط المساعدة: [ضع هنا الموارد المحلية]. تحب أشاركك أقرب جهة متاحة؟",
    action: "HALT_CONVERSATION_AND_DISPLAY_EMERGENCY_RESOURCES"
  },

  memory_hooks: {
    store_user_progress: ["compassion_index", "last_action_completed", "energy_level", "trust_level", "preferred_path"],
    user_preferences: {
      preferred_interaction_style: ["gentle_prompts", "storytelling", "direct_questions"],
      most_effective_rooms: ["venting_room", "kindness_room"],
      topics_of_concern: ["work_stress", "loneliness", "self_criticism"]
    },
    recall_in_next_session_prompt: "مرحبًا {{username}} 🌿، المرة اللي فاتت وقفنا عند '{{preferred_path}}'. حابب نكمّل من نفس النقطة ولا نفتح زاوية جديدة سوا؟"
  },

  nlu: {
    keywords: [
      {"word": "اكتئاب", "weight": 1.0}, {"word": "مكتئب", "weight": 1.0},
      {"word": "حزين", "weight": 0.95}, {"word": "مخنوق", "weight": 0.95},
      {"word": "فاضي", "weight": 0.9}, {"word": "ملل", "weight": 0.8},
      {"word": "معنديش طاقة", "weight": 0.9}, {"word": "مش قادر", "weight": 0.85},
      {"word": "وحيد", "weight": 0.9}, {"word": "صحابي", "weight": 0.7},
      {"word": "الشغل", "weight": 0.7}, {"word": "محبط", "weight": 0.9}
    ],
    sentiment_analysis_config: {
      enabled: true,
      negative_threshold": -0.6,
      action_on_high_negativity": "BOOST_EMPATHY_AND_VALIDATION"
    },
    entity_recognition: {
      enabled: true,
      entities: {
        work_stress: ["شغل", "مدير", "زملاء", "شركة"],
        relationship_issues: ["صحاب", "أهلي", "شريك", "علاقات"],
        loneliness: ["لوحدي", "وحدة", "معنديش حد"]
      }
    }
  },

  dialogue_engine_config: {
    engine_type: "dynamic_multi_gems",
    entry_room: "introduction_room",
    variables: {
      compassion_index: {"initial_value": 0, "max_value": 5},
      energy_level: {"initial_value": 3, "max_value": 5},
      trust_level: {"initial_value": 2, "max_value": 5}
    },
    loop_guard: {
      max_visits_in_a_row": 2,
      escape_hatch_prompt": "ممكن نغيّر زاوية الرؤية ✨. تحب نبدأ من: 'الأفكار'، 'الطاقة'، ولا 'العلاقات'؟"
    }
  },

  conversation_rooms: {
    introduction_room: {
      purpose: "التقاط الشعور الأولي وتقديم التحقق والطمأنة.",
      dynamic_gems_logic: {
        condition: "variables.energy_level <= 2",
        gems_bank: {
          empathy: [
            "واضح إنك مستنزف جدًا… حتى الكلام عامل زي جبل فوق صدرك.",
            "الإحساس ده بيخلي كل حاجة تقيلة بشكل مضاعف."
          ],
          normalization: [
            "ده مش ضعف منك، ده رد فعل طبيعي لجسمك ونفسك لما يتعبوا.",
            "مش غلط توقف وتدي نفسك استراحة."
          ],
          action_prompt: [
            "خلينا ناخد نفس بطيء سوا دلوقتي… كأنك بتدي روحك فرصة تتنفس.",
            "ممكن بس نكون هنا دقيقة واحدة من غير أي ضغط؟"
          ]
        },
        default_gems_bank: {
          empathy: [
            "شايف التقل اللي جواك، وكأنه غيمة سودة مغطيه كل حاجة.",
            "الوحدة أو الإحباط ساعات بيخلوا حتى أبسط حاجة مستحيلة."
          ],
          normalization: [
            "اللي بتحسه مش غريب، ناس كتير بتحس بنفس الطريقة تحت الضغط.",
            "ده مش معناه إنك ضعيف أو 'غلط'، ده بس معناه إنك محتاج دعم."
          ],
          action_prompt: [
            "تحب نبدأ بخطوة صغيرة زي تكتبلي جملة واحدة عن إحساسك الحالي؟",
            "ممكن نجرب تمرين سلام دقيقة واحدة؟"
          ]
        }
      },
      next_room_suggestions: ["kindness_room", "venting_room"]
    },

    kindness_room: {
      purpose: "تعزيز التعاطف مع الذات وكسر جلد النفس.",
      gems_bank: {
        insight: [
          "الصوت اللي بيلومك باستمرار مش صوتك، ده الاكتئاب بيحاول يسيطر.",
          "كتير مننا بيعامل نفسه بقسوة، كأنها عدو مش صديق.",
          "أنت مش فاشل، أنت شخص بيتعامل مع حمل تقيل جدًا."
        ],
        reframe: [
          "لو أعز صاحبك حكى نفس الكلام… هتقوله إيه؟",
          "تخيل إنك بتكتب رسالة دعم لنفسك بدل نقد.",
          "إيه أول جملة حنان ممكن تقولها لشخص بيحبك وهو مكانك؟"
        ],
        action_prompt: [
          "اكتب لنفسك جملة بسيطة فيها لطف، حتى لو 'أنا بستاهل راحة'.",
          "جرب تقول بصوت مسموع كلمة دعم لنفسك.",
          "خلينا نفكر في حاجة صغيرة تقدّمها لنفسك كهدية دلوقتي."
        ]
      },
      next_room_suggestions: ["venting_room"]
    },

    venting_room: {
      purpose: "مساحة للفضفضة الحرة.",
      gems_bank: {
        invitation: [
          "قول اللي جواك حتى لو مش مترتب.",
          "المساحة دي ليك بالكامل… فضفض من غير قلق.",
          "لو عايز تسيب الحمل بالكلام، أنا هنا أسمع."
        ],
        validation: [
          "كل كلمة بتقولها لها قيمتها.",
          "مشاعرك كلها حقيقية ومش 'تفاهة'.",
          "أنا سامعك ومش هحكم عليك."
        ],
        encouragement: [
          "خد وقتك… مفيش استعجال.",
          "إنت مش لوحدك دلوقتي.",
          "الكلام بيخفف، كلمة كلمة بتفرق."
        ]
      },
      next_room_suggestions: ["thread_finding_room"]
    },

    thread_finding_room: {
      purpose: "اختيار محور عملي واحد للتركيز.",
      dynamic_gems_logic: {
        condition: "context.entities.includes('work_stress')",
        gems_bank: {
          opener: ["واضح إن الشغل واخد مساحة كبيرة من تفكيرك."],
          question: ["تحب نركز على إزاي نقلل الحمل ده حتى بنسبة 1%؟"],
          resolution_prompt: ["إيه أول نقطة تحب تبتدي منها في موضوع الشغل؟"]
        },
        default_gems_bank: {
          opener: ["من كل اللي شاركته، خلينا نمسك خيط واحد واضح."],
          question: [
            "تحب نبدأ من الأفكار السلبية المتكررة؟",
            "ولا طاقتك اليومية وإزاي نزودها شوية؟",
            "ولا إحساس الوحدة والعلاقات؟"
          ],
          "resolution_prompt": ["إيه أكتر مسار حاسس إنه محتاجك دلوقتي؟"]
        }
      },
      "is_resolution_point": true
    }
  },

  bridging_logic: {
    on_resolution: {
      mini_celebrations: [
        "👏 مجرد إنك اخترت مسار ده تقدم ضخم.",
        "🌱 خطوة صغيرة لكن مليانة شجاعة.",
        "✨ اختيار الاتجاه بداية التغيير."
      ],
      branching_suggestion: {
        prompt: "تحب نستكشف المسار اللي اخترته؟",
        choices: [
          {"title": "مسار الأفكار", "description": "نتحدى الأفكار السلبية", "target_intent": "skill_cbt_thought_challenging"},
          {"title": "مسار الطاقة", "description": "تجارب صغيرة لتحريك يومك", "target_intent": "skill_behavioral_activation"},
          {"title": "مسار العلاقات", "description": "إعادة بناء مساحة أمان مع نفسك والآخرين", "target_intent": "skill_self_compassion_for_loneliness"}
        ]
      }
    }
  },

  metadata: {
    intent_type: "dynamic_protocol",
    domain: "depression_gateway",
    version: "3.0-ultimate_rich_gems"
  }
};

export default protocol;
