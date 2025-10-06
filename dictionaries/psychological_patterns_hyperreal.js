

/**
 * dictionaries/psychological_patterns_hyperreal.js
 *
 * Psychological Patterns & Narrative Tensions — Hyperreal Actionable KB (v6.0)
 * Author: Ibrahim Shahat & Noor AI Core
 *
 * Features:
 *  - Rich, bilingual (Arabic-focused) causal patterns and tensions with:
 *    - actionable micro-interventions (step-by-step)
 *    - adaptive probing sequences (multi-turn)
 *    - safety/escalation rules and referral hints
 *    - relationship graph metadata (related concepts, co-occurrence weights)
 *    - monitoring metrics and suggested measurement items
 *    - programmatic helpers: search, recommend, plan generation, simulate probe
 *
 * Design principles:
 *  - Data-first but executable: each entry includes 'how-to' (scripts, prompts, exercises).
 *  - Explainable: each recommendation comes with a short rationale.
 *  - Connectable: keys map to concept IDs from ConceptEngine / Emotion Anchors.
 */

/**
 * @typedef {Object} CausalPatternV6
 * @property {string} pattern_id
 * @property {string[]} trigger_concepts
 * @property {string[]} resulting_concepts
 * @property {string} description
 * @property {number} risk_level
 * @property {string} therapeutic_insight
 * @property {string[]} antidote_concepts
 * @property {string} probing_question
 * @property {Array.<string>} immediate_actions - خطوات فورية يمكن اقتراحها الآن
 * @property {Array.<{title:string, steps:string[]}>} micro_interventions - تمارين قصيرة قابلة للتنفيذ
 * @property {Array.<{metric:string, frequency:string}>} monitoring_metrics - كيف نتابع التحسن
 * @property {Object.<string,number>} cooccurrence_weights - اتصال بالمفاهيم الأخرى (weight 0..1)
 * @property {string[]} recommended_referrals - اقتراحات تحويل (مثل: مستشار/طبيب/خطة طوارئ)
 */

/**
 * @typedef {Object} NarrativeTensionV6
 * @property {string} tension_id
 * @property {{name:string, concepts:string[]}} pole_a
 * @property {{name:string, concepts:string[]}} pole_b
 * @property {string} description
 * @property {string} therapeutic_insight
 * @property {string} mediation_prompt
 * @property {string} example_user_statement
 * @property {string[]} micro_steps_to_balance - خطوات عملية لتقليل الاحتكاك بين القطبين
 * @property {{questionSequence:string[], expectedUserSignals:string[]}} guided_dialogue - multi-turn probes
 * @property {Object.<string,number>} polarity_weights - how strongly each pole correlates with risk/outcome
 */

/* ============================
   1) HYPER-ENRICHED CAUSAL PATTERNS
   ============================ */

export const CAUSAL_PATTERNS_V6 = [
  {
    pattern_id: "anxiety_feeds_rumination_v6",
    trigger_concepts: ["anxiety", "uncertainty", "future_oriented"],
    resulting_concepts: ["rumination", "catastrophizing", "sleep_disruption"],
    description:
      "حلقة مفرغة: القلق يدفع لالتقاط سيناريوهات مستقبلية سلبية (التخيل الكارثي)، مما يولد مزيدا من اليقظة والتوتر وصعوبة النوم، ما يزيد القلق التالي.",
    risk_level: 1,
    therapeutic_insight:
      "عقلك يحاول حمايتك عبر تكرار السيناريوهات ليتوقع المشاكل — لكن هذا الأسلوب يجعل الاحتمالات تبدو أكبر من حقيقتها. إذا توقفت الحلقة عند نقطة واحدة (ملاحظة بدون حل)، تعود وتكبر.",
    antidote_concepts: ["grounding_technique", "scheduled_worry", "probability_check"],
    probing_question: "إمتى آخر مرة لما فكرت في أسوأ سيناريو وحصل العكس فعلاً؟",
    immediate_actions: [
      "جرب تمرين التنفّس 4-4-6 الآن لخفض اليقظة.",
      "حدّد 10 دقائق لاحقة لوقت 'القلق' بدلاً من التفكير الآن."
    ],
    micro_interventions: [
      {
        title: "جلسة 'وقت القلق' (10 دقائق)",
        steps: [
          "حدد وقتًا ثابتًا اليوم للقلق (مثلاً 7:00 م، 10 دقائق).",
          "خلال هذا الوقت، سُجل كل الأفكار المقلقة في ورقة.",
          "بعد انتهاء الوقت، ضع الورقة جانبًا ولا تسمح للأفكار بالعودة حتى موعد القلق التالي."
        ]
      },
      {
        title: "تقييم الاحتمال (3 خطوات)",
        steps: [
          "اكتب أسوأ نتيجة تتخيلها.",
          "اسأل: ما احتمال حدوث ذلك فعلاً من 0% إلى 100%؟",
          "لو الاحتمال منخفض، اكتب خطة بسيطة للتحكم لو حصلت الحالة."
        ]
      }
    ],
    monitoring_metrics: [
      { metric: "minutes_of_rumination_per_day", frequency: "daily" },
      { metric: "sleep_hours", frequency: "daily" },
      { metric: "subjective_anxiety_score_0_10", frequency: "daily" }
    ],
    cooccurrence_weights: { "sleep_disruption": 0.8, "catastrophizing": 0.9, "avoidance": 0.4 },
    recommended_referrals: ["CBT_coach", "psychiatrist_if_sleep_loss>7days"]
  },

  {
    pattern_id: "people_pleasing_erodes_self_esteem_v6",
    trigger_concepts: ["people_pleasing", "fear_of_rejection"],
    resulting_concepts: ["low_self_esteem", "resentment", "burnout"],
    description:
      "تجاهل الاحتياجات الذاتية مقابل رضا الآخر يُعلم النفس قيمة الذات السلبية تدريجيًا؛ يؤدي لتراكم الاستياء والشعور بالنفاد.",
    risk_level: 1,
    therapeutic_insight:
      "إرضاؤك الدائم للآخرين قد يمنح قبولًا قصير الأمد لكنه يقلّص إحساسك الذاتي بالقيمة. الحماية الحقيقية تبدأ من وضع حدود صغيرة وتجارب نجاحية محددة.",
    antidote_concepts: ["boundary_setting", "values_clarification", "assertiveness"],
    probing_question: "لو قلت 'لا' لمرة واحدة في الأسبوع، إيه اللي ممكن يحصل؟",
    immediate_actions: [
      "حدّد موقفًا بسيطًا تقول فيه 'لا' اليوم (مثلاً: لا لطلب صغير غير مناسب).",
      "اعرف احتياجك الواحد الأهم اليوم واطلبه بصراحة."
    ],
    micro_interventions: [
      {
        title: "تمرين الحدود الصغيرة (3 أيام)",
        steps: [
          "اليوم 1: قول 'لا' في موقف واحد بسيط.",
          "اليوم 2: لاحظ شعورك جسديًا ودوّن الفرق.",
          "اليوم 3: عزز النجاح بصيغة إيجابية: 'أنا حطيت حد وبحترم نفسي'."
        ]
      },
      {
        title: "قائمة القيم (15 دقيقة)",
        steps: [
          "اكتب 6 أشياء تهمك في حياتك.",
          "تصنيف كل منها: هل هذا يندرج تحت 'علاقات' أم 'عمل' أم 'نمو شخصي'؟",
          "اختر قيمة واحدة وقرّر خطوة صغيرة تدعمها هذا الأسبوع."
        ]
      }
    ],
    monitoring_metrics: [
      { metric: "times_said_no_per_week", frequency: "weekly" },
      { metric: "self_compassion_rating_0_10", frequency: "weekly" }
    ],
    cooccurrence_weights: { "social_anxiety": 0.7, "boundary_issues": 0.9 },
    recommended_referrals: ["coach_for_assertiveness", "group_therapy_optional"]
  },

  {
    pattern_id: "compensatory_overworking_v6",
    trigger_concepts: ["achievement", "underlying_insecurity"],
    resulting_concepts: ["burnout", "relationship_strain", "health_decline"],
    description:
      "العمل المفرط كمحاولة لتعويض شعور بالنقص أو لإثبات الذات يؤدي إلى إرهاق طويل وقابلية للانهيار الصحي والعاطفي.",
    risk_level: 2,
    therapeutic_insight:
      "العمل كمصدر وحدة للهوية يضعك على حافة الاحتراق. النجاح الحقيقي يحتاج وقود (راحة، حماية العلاقات، حدود).",
    antidote_concepts: ["self_compassion", "work_life_balance", "meaning_reframing"],
    probing_question: "لو توقفت عن إثبات الذات لمدة أسبوع، بماذا سيتغير شعورك؟",
    immediate_actions: [
      "حدد 2 ساعة يومياً للراحة غير قابلة للمساومة.",
      "أعلن الالتزام لشخص موثوق لمراقبتك (accountability buddy)."
    ],
    micro_interventions: [
      {
        title: "خطة 3 خطوات للحد من الإفراط",
        steps: [
          "تحديد حدود زمنية للعمل اليومي.",
          "طلب مساعدة أو تفويض مهمة واحدة هذا الأسبوع.",
          "تخصيص نشاط استرجاعي (رياضة / لقاء) مرتين أسبوعياً."
        ]
      },
      {
        title: "تمرين إعادة تأطير الدافع (20 دقيقة)",
        steps: [
          "اكتب سببك الأصلي للعمل (بصدق).",
          "سأل نفسك: 'هل هذا الدافع يمدني أو يفرغني؟'",
          "صغ نية جديدة للعمل من منظور 'صحة' بدل 'إثبات'."
        ]
      }
    ],
    monitoring_metrics: [
      { metric: "work_hours_daily", frequency: "daily" },
      { metric: "sleep_quality", frequency: "daily" },
      { metric: "emotional_exhaustion_scale", frequency: "weekly" }
    ],
    cooccurrence_weights: { "sleep_disruption": 0.7, "compensatory_behaviors": 0.8 },
    recommended_referrals: ["occupational_therapist", "physician_if_physical_symptoms"]
  },

  // additional patterns can be programmatically generated or loaded from dataset
];

/* ============================
   2) HYPER-ENRICHED NARRATIVE TENSIONS
   ============================ */

export const NARRATIVE_TENSIONS_V6 = [
  {
    tension_id: "authenticity_vs_belonging_v6",
    pole_a: { name: "الصدق مع الذات", concepts: ["authenticity", "boundary_setting"] },
    pole_b: { name: "الانتماء والقبول", concepts: ["belonging", "people_pleasing"] },
    description:
      "تمزق بين الرغبة في أن تكون صادقًا مع نفسك والرغبة في أن تنتمي وتُقبل من الآخرين.",
    therapeutic_insight:
      "هذا التوتر ليس خطأً؛ بل هو مؤشر على أن هناك قيمتين متنافرتين بحاجة للاتزان. يمكنك تجربة 'صدق مُدرج'—التعبير عن نفسك بنسبة صغيرة تدريجياً.",
    mediation_prompt: "ما أصغر تعبير عن ذاتك تستطيع مشاركته الآن مع أقل مخاطرة ممكنة؟",
    example_user_statement: "عايز أقول رأيي بس خايف أخسر الناس اللي حواليا.",
    micro_steps_to_balance: [
      "ابدأ بصدق مدروس بنسبة 10% في محادثة آمنة.",
      "قيمة رد الفعل: هل كان مخيفًا فعلاً أم مبالغًا؟",
      "زد الصدق تدريجيًا إذا لم يحدث فقد كبير."
    ],
    guided_dialogue: {
      questionSequence: [
        "إمتى بتحس إنك بتغير نفسك عشان تنتمي؟",
        "هل ده بيأثر على حاجات مهمة في حياتك؟",
        "لو عبرت عن 10% من رأيك الآن، إزاي ممكن نعملها بطريقة تحمي العلاقة؟"
      ],
      expectedUserSignals: ["hesitation", "qualifying_phrases", "seeking_permission"]
    },
    polarity_weights: { authenticity: 0.6, belonging: 0.4 }
  },

  {
    tension_id: "hope_vs_despair_v6",
    pole_a: { name: "الأمل والدافع", concepts: ["hope", "motivation", "resilience"] },
    pole_b: { name: "اليأس والعجز", concepts: ["despair", "helplessness", "depression_symptom"] },
    description:
      "نمذجة التباين بين رغبة في التقدم وسط شعور بالعجز واليأس.",
    therapeutic_insight:
      "وجود أمل حتى لو ضئيل هو دليل على وجود مصادر للتغيير. نبحث عن 'بذور الأمل' ونبني عليها بعمليات صغيرة قابلة للقياس.",
    mediation_prompt: "ما أصغر دليل على تحسّن لاحظته في آخر أسبوع؟",
    example_user_statement: "نفسي أحاول بس كل مرة بخلص نفس الفشل.",
    micro_steps_to_balance: [
      "حدد إنجاز صغير (5 دقائق) يمكن إنجازه اليوم.",
      "سجل النتيجة حتى لو بسيطة.",
      "ربط الشعور بالإنجاز كدليل على قابلية التغيير."
    ],
    guided_dialogue: {
      questionSequence: [
        "في آخر أسبوع، إيه حاجة بسيطة حصلت وكانت أحسن من اللي فات؟",
        "لو خصصت اليوم 10 دقائق لهدف صغير، إيه اللي ممكن تعمله؟",
        "لو عاوز أكتر دعم، تحب نعمل خطة مكونة من 3 خطوات قابلة للقياس؟"
      ],
      expectedUserSignals: ["small_success_recall", "hesitant_commitment", "seeking_structuring_help"]
    },
    polarity_weights: { hope: 0.7, despair: 0.3 }
  }
  // add more tensions with the same schema...
];

/* ============================
   3) Relationship Graph Metadata
   - Build lightweight graph helpers that connect patterns, tensions, concepts.
   ============================ */

export function buildRelationshipGraph(patterns = CAUSAL_PATTERNS_V6, tensions = NARRATIVE_TENSIONS_V6) {
  const nodes = {}; // key -> { id, type, labels, concepts }
  const edges = []; // { from, to, weight, label }

  // add pattern nodes
  for (const p of patterns) {
    nodes[p.pattern_id] = { id: p.pattern_id, type: "pattern", labels: [p.description], concepts: p.trigger_concepts.concat(p.resulting_concepts) };
    // edges from triggers -> pattern
    for (const tc of p.trigger_concepts) edges.push({ from: tc, to: p.pattern_id, weight: 0.9, label: "triggers" });
    // edges from pattern -> results
    for (const rc of p.resulting_concepts) edges.push({ from: p.pattern_id, to: rc, weight: 0.9, label: "results_in" });
    // cooccurrences
    for (const [k,v] of Object.entries(p.cooccurrence_weights || {})) edges.push({ from: p.pattern_id, to: k, weight: v, label: "cooccurs" });
  }

  // add tension nodes
  for (const t of tensions) {
    nodes[t.tension_id] = { id: t.tension_id, type: "tension", labels: [t.description], concepts: t.pole_a.concepts.concat(t.pole_b.concepts) };
    edges.push({ from: t.pole_a.name, to: t.tension_id, weight: 0.8, label: "poleA" });
    edges.push({ from: t.pole_b.name, to: t.tension_id, weight: 0.8, label: "poleB" });
  }

  return { nodes, edges };
}

/* ============================
   4) Programmatic Helpers & Engines
   ============================ */

/**
 * findPatternsByConcepts
 * - input: array of concept keys (strings)
 * - returns: ranked list of patterns that are triggered by those concepts
 */
export function findPatternsByConcepts(concepts = [], patterns = CAUSAL_PATTERNS_V6) {
  const scores = [];
  for (const p of patterns) {
    let score = 0;
    for (const c of concepts) {
      if (p.trigger_concepts.includes(c)) score += 2;
      if (p.resulting_concepts.includes(c)) score += 1;
      // bonus if cooccurrence_weights contains c
      if (p.cooccurrence_weights && p.cooccurrence_weights[c]) score += p.cooccurrence_weights[c];
    }
    if (score > 0) scores.push({ pattern: p, score });
  }
  return scores.sort((a,b)=>b.score - a.score).map(s=>s.pattern);
}

/**
 * recommendAntidotesAndPlan
 * - Given detected patterns (ids) and a severity map, return a combined actionable plan
 * - Plan: immediate actions (safety), short micro-interventions (1-3 steps), monitoring items, escalation hints
 */
export function recommendAntidotesAndPlan(detectedPatternIds = [], severityMap = {}, patterns = CAUSAL_PATTERNS_V6) {
  const plan = {
    immediate: [],
    microInterventions: [],
    monitoring: [],
    rationale: [],
    escalation: []
  };

  for (const pid of detectedPatternIds) {
    const p = patterns.find(x=>x.pattern_id === pid);
    if (!p) continue;
    // add immediate actions (unique)
    for (const ia of p.immediate_actions || []) if (!plan.immediate.includes(ia)) plan.immediate.push(ia);
    // add micro interventions (merge unique by title)
    for (const mi of p.micro_interventions || []) if (!plan.microInterventions.find(x=>x.title===mi.title)) plan.microInterventions.push(mi);
    // add monitoring metrics
    for (const m of p.monitoring_metrics || []) if (!plan.monitoring.find(x=>x.metric===m.metric)) plan.monitoring.push(m);
    // rationale
    plan.rationale.push({ pattern: pid, text: p.therapeutic_insight });
    // escalation: if severity high or pattern risk_level high
    const sev = severityMap[pid] || 0;
    if (p.risk_level >= 2 || sev >= 2) {
      plan.escalation.push({
        pattern: pid,
        reason: `high risk (pattern risk=${p.risk_level}, severity=${sev})`,
        suggestion: (p.recommended_referrals && p.recommended_referrals.length) ? p.recommended_referrals[0] : "Consider mental health professional referral"
      });
    }
  }

  // compress and suggest order: immediate -> microInterventions sorted by shortest first
  plan.microInterventions.sort((a,b)=>a.steps.length - b.steps.length);
  return plan;
}

/**
 * generateTherapeuticScript
 * - Creates a short script the assistant can say to introduce the intervention and ask for consent.
 * - Returns: { intro: string, permissionQuestion: string, steps: string[] }
 */
export function generateTherapeuticScript(patternId, patterns = CAUSAL_PATTERNS_V6) {
  const p = patterns.find(x=>x.pattern_id === patternId);
  if (!p) return null;
  const intro = `أنا لاحظت نمط اسمه "${p.pattern_id.replace(/_/g,' ')}" — ${p.description}.`;
  const insight = `معلومة مهمة: ${p.therapeutic_insight}`;
  const permission = `لو تحب نجرب مع بعض تمرين صغير ممكن يساعد — تحب نجرب دلوقتي؟`;
  const steps = (p.micro_interventions && p.micro_interventions.length) ? p.micro_interventions[0].steps : p.immediate_actions || [];
  return { intro, insight, permission, steps };
}

/**
 * simulateGuidedProbe
 * - For a given tension, returns a multi-turn probe sequence the assistant can use.
 * - stateful simulation: returns the next question given previous replies (simple heuristics).
 */
export function simulateGuidedProbe(tensionId, userReplies = [], tensions = NARRATIVE_TENSIONS_V6) {
  const t = tensions.find(x=>x.tension_id === tensionId);
  if (!t) return null;
  const seq = t.guided_dialogue?.questionSequence || (t.guided_dialogue ? t.guided_dialogue.questionSequence : []);
  const nextIndex = Math.min(userReplies.length, seq.length - 1);
  const nextQuestion = seq[nextIndex] || t.mediation_prompt || seq[seq.length - 1];
  // heuristics for branching: if user reply contains 'لا' or 'مش' treat as resistance and suggest gentle reframe
  const last = userReplies[userReplies.length - 1] || "";
  const resistance = /(^|\s)(لا|مش|مستحيل|أبدًا)/.test(last);
  return {
    nextQuestion,
    guidance: resistance ? "لاحظت مقاومة — استخدم تأكيد عاطفي ثم سؤال بسيط" : "استمر في السؤال التالي",
    progress: { asked: userReplies.length, total: seq.length }
  };
}

/* ============================
   5) Safety & Escalation Rules
   - High-level detection rules that other modules can call.
   ============================ */

/**
 * simpleRiskEvaluator
 * - Given: affectVector (e.g., { sadness:0.8, anxiety:0.6 }), intensityMap, patternHits
 * - Returns: { riskLevel: 0|1|2, reasons: [] }
 */
export function simpleRiskEvaluator({ affectVector = {}, intensityMap = {}, patternHits = [] } = {}) {
  let score = 0;
  const reasons = [];

  // major flags
  if ((affectVector.sadness || 0) > 0.9) { score += 2; reasons.push("very high sadness"); }
  if ((affectVector.anxiety || 0) > 0.9) { score += 1.5; reasons.push("very high anxiety"); }
  // check for words like suicidal ideation in intensityMap tokens (simple keyword check)
  const tokens = Object.values(intensityMap || {}).map(i=>i.token).join(' ');
  if (/انتحار|موت نفسي|عايز أموت|ماقدرش أعيش/.test(tokens)) { score += 5; reasons.push("suicidal_ideation_terms"); }

  // pattern hits: if any high-risk pattern present
  for (const ph of patternHits) {
    if (ph.risk_level >= 2) { score += 2; reasons.push(`pattern_high_risk:${ph.pattern_id}`); }
    else if (ph.risk_level === 1) { score += 1; reasons.push(`pattern_med_risk:${ph.pattern_id}`); }
  }

  // map to discrete risk level
  let riskLevel = 0;
  if (score >= 5) riskLevel = 2;
  else if (score >= 2) riskLevel = 1;
  else riskLevel = 0;

  return { riskLevel, score, reasons };
}

/* ============================
   6) Utility: merging with other dictionaries
   - Build anchors from emotional anchors structure (expected external)
   ============================ */

export function mapPatternsToAnchors(patterns = CAUSAL_PATTERNS_V6, anchorDict = {}) {
  // anchorDict: { word: { mood_scores: {...}, intensity:0.8 } }
  const map = {};
  for (const p of patterns) {
    for (const tc of p.trigger_concepts) {
      // find anchor words that map to tc concept (simple matching by key)
      for (const [word, meta] of Object.entries(anchorDict)) {
        if ((meta.tags || []).includes(tc) || (meta.related_terms || []).includes(tc) || (meta.root === tc)) {
          if (!map[tc]) map[tc] = new Set();
          map[tc].add(word);
        }
      }
    }
  }
  // convert sets to arrays
  const out = {};
  for (const k of Object.keys(map)) out[k] = Array.from(map[k]);
  return out;
}

/* ============================
   7) Example: quick pipeline helper
   - Given: conceptsDetected (from ConceptEngine), affectVector (from IntensityAnalyzer),
   - Returns: plan and suggested script
   ============================ */

export function quickTherapeuticPlan({ conceptsDetected = [], affectVector = {}, intensityMap = {} } = {}) {
  // find relevant patterns by concepts
  const patterns = findPatternsByConcepts(conceptsDetected);
  // recommend plan
  const patternIds = patterns.map(p=>p.pattern_id);
  const severityMap = {};
  for (const p of patterns) severityMap[p.pattern_id] = p.risk_level;
  const plan = recommendAntidotesAndPlan(patternIds, severityMap);
  // evaluate risk
  const riskEval = simpleRiskEvaluator({ affectVector, intensityMap, patternHits: patterns });
  // generate script for top pattern if exists
  const topPattern = patterns[0];
  const script = topPattern ? generateTherapeuticScript(topPattern.pattern_id) : null;

  return { patterns, plan, riskEval, script };
}

/* ============================
   8) Exports
   ============================ */

export default {
  CAUSAL_PATTERNS_V6,
  NARRATIVE_TENSIONS_V6,
  buildRelationshipGraph,
  findPatternsByConcepts,
  recommendAntidotesAndPlan,
  generateTherapeuticScript,
  simulateGuidedProbe,
  simpleRiskEvaluator,
  mapPatternsToAnchors,
  quickTherapeuticPlan
};

