
// ============================================================================
// dictionaries/behavior_values_defenses.js
// Unified Behavioral Patterns, Value Systems & Defense Mechanisms Dictionary
// Ultra-Integrated Edition — High fidelity, ready for production integration.
// Version: 1.0
// ============================================================================

/**
 * Structure overview:
 * - BEHAVIORAL_PATTERNS: أنماط سلوكية قابلة للرصد (name, description, triggers, signals, interventions)
 * - VALUE_SYSTEMS: نظم القيم (value, description, motivating_signals, conflicts, coaching_prompts)
 * - DEFENSE_MECHANISMS: آليات دفاع نفسية (name, type, description, adaptive? boolean, indicators, interventions)
 * - RELATION_MAP: ربط بين السلوك/قيمة/دفاع لتسهيل التحليل متعدد الطبقات
 * - Utilities: index builder, search functions, suggest interventions, conflict resolver
 */

/* ===========================
   1) Behavioral Patterns
   =========================== */
export const BEHAVIORAL_PATTERNS = {
  "avoidant_withdrawal": {
    name: "الانسحاب التجنّبي",
    description: "تجنّب المواجهة أو المواقف الاجتماعية أو المهام المسببة للضغط.",
    triggers: ["خوف من الحكم", "فشل سابق", "قلق أداء"],
    behavioral_signals: ["تأجيل مهام", "تجنب المكالمات", "غياب متكرر عن اجتماعات"],
    typical_duration: "مؤقت ↔ متكرر",
    functions: ["تقليل الضيق مؤقتًا", "تجنب المخاطر الاجتماعية"],
    maladaptive_outcomes: ["تفاقم القلق الاجتماعي", "تدهور العلاقات", "تراكم مهام"],
    suggested_interventions: ["graded_exposure", "behavioural_activation", "social_skills_training"],
    probing_questions: [
      "إمتى بتحس إنك بتفلت من المواقف؟",
      "إيه اللي بيخوفك أكتر: الرضا الذاتي ولا رأي الناس؟"
    ],
    risk_level: 0
  },

  "perfectionistic_procrastination": {
    name: "تسويف نتيجة الكمالية",
    description: "تأجيل العمل بسبب الخوف من النتيجة غير المثالية.",
    triggers: ["ضغط لإنهاء عمل بشكل كامل", "مقارنة بالآخرين", "توقعات خارجية"],
    behavioral_signals: ["تأخير تسليم", "تعديل مفرط", "عدم رضا رغم الأداء الجيد"],
    functions: ["تجنب النقد", "حماية الصورة الذاتية"],
    maladaptive_outcomes: ["فقدان فرص", "إجهاد مستمر"],
    suggested_interventions: ["goal_chunking", "acceptance_exercises", "timeboxing"],
    probing_questions: [
      "لو عملت الشيء بشكل متوسط، حصل إيه؟",
      "إيه أصغر خطوة ممكن تعملها دلوقتي؟"
    ],
    risk_level: 0
  },

  "people_pleasing": {
    name: "إرضاء الآخرين (People-pleasing)",
    description: "فعل ما يرضي الآخرين على حساب الاحتياجات الذاتية لتجنب الصراع أو الكراهية.",
    triggers: ["خوف من الرفض", "تاريخ اجتماعي من التقييم السلبي"],
    behavioral_signals: ["قول نعم متكرر", "التنازل عن الحدود", "الاستياء الداخلي المتراكم"],
    functions: ["الحصول على قبول مؤقت", "تخفيف التوتر الاجتماعي"],
    maladaptive_outcomes: ["احتقانات داخلية", "استنزاف واحتراق"],
    suggested_interventions: ["boundary_training", "assertiveness_skills", "values_clarification"],
    probing_questions: [
      "إمتى آخر مرة قلت لا وكنت مرتاح بعدها؟",
      "إيه اللي ممكن يحصل لو فضلت تعبر عن رأيك؟"
    ],
    risk_level: 0
  },

  "rumination_cycle": {
    name: "دورة التفكير المتكرر (Rumination)",
    description: "الانشغال المتكرر بالأسباب والنتائج السلبية دون الوصول لحل فعال.",
    triggers: ["إحساس بالفشل", "إهتمام مفرط بالتفاصيل", "عزلة"],
    behavioral_signals: ["تفكير لوقت طويل", "صعوبة النوم", "تكرار نفس الأسئلة لنفسك"],
    functions: ["محاولة فهم السبب", "الشعور بالتحكم الوهمي"],
    maladaptive_outcomes: ["زيادة الاكتئاب والقلق", "تعطّل الأداء"],
    suggested_interventions: ["CBT_thought_record", "scheduled_worry_time", "mindfulness_practices"],
    probing_questions: [
      "إيه اللي بتحاول توصله بالتفكير ده؟",
      "هل التفكير ده بيقود لحل عملي؟"
    ],
    risk_level: 1
  },

  "compensatory_overworking": {
    name: "التعويض بالاجتهاد",
    description: "العمل المفرط لتعويض شعور بالنقص أو لإثبات القيمة.",
    triggers: ["شعور بالنقص", "متطلبات مهنية عالية", "مقارنة اجتماعية"],
    behavioral_signals: ["ساعات عمل طويلة", "تضاؤل وقت الراحة", "رفض المساعدة"],
    functions: ["إثبات الذات", "تجنب مواجهة مشاعر الضعف"],
    maladaptive_outcomes: ["احتراق وظيفي", "مشاكل صحية وعائلية"],
    suggested_interventions: ["work-life_boundaries", "value_based_goal_setting", "self_compassion_training"],
    probing_questions: [
      "إيه اللي بتحاول تثبته لنفسك؟",
      "أنت بتشتغل عشان مين فعلاً؟"
    ],
    risk_level: 1
  },

  "emotional_numbing_behaviour": {
    name: "السلوك الخدر العاطفي",
    description: "سلوكيات تقلل من الإحساس كمحاولة للهروب من ألم عاطفي — مثل الإفراط في العمل، الأكل، أو التنفيس عبر شغف مدمر.",
    triggers: ["صدمة سابقة", "تعب نفسي مزمن", "فقد"],
    behavioral_signals: ["قلة تأثر بالمواقف", "انسحاب عاطفي", "زيادة سلوكيات ملء الفراغ"],
    functions: ["تخفيف الألم اللحظي"],
    maladaptive_outcomes: ["فقدان الاتصال العاطفي", "مشاكل صحية"],
    suggested_interventions: ["grounding_exercises", "therapeutic_processing", "gradual_reengagement"],
    probing_questions: [
      "إمتى بتحس إنك مش بتحس؟",
      "إيه الأنشطة اللي بتحس معاها أنك بتتواصل مع نفسك؟"
    ],
    risk_level: 1
  }
};

/* ===========================
   2) Value Systems (قواعد وقيم داخلية)
   =========================== */
export const VALUE_SYSTEMS = {
  "autonomy": {
    value: "الاستقلالية (Autonomy)",
    description: "الرغبة في اتخاذ قرارات شخصية والاعتماد على النفس.",
    motivating_signals: ["اختيار مهني مستقل", "رفض الأوامر الظالمة", "التمسك بالحدود الشخصية"],
    conflict_with: ["belonging", "obedience"],
    coaching_prompts: [
      "إيه الحدود اللي محتاج تحطها عشان تحس باستقلالك؟",
      "أين يمكنك اتخاذ قرار صغير اليوم لصالح نفسك؟"
    ],
    practical_exercises: ["decision_exercise", "boundary_scripts"]
  },

  "belonging": {
    value: "الانتماء (Belonging)",
    description: "الرغبة في القبول والاتصال الاجتماعي.",
    motivating_signals: ["الانخراط في مجموعات", "تقارب مع الأصدقاء", "حس بالخجل عند الرفض"],
    conflict_with: ["autonomy", "authenticity"],
    coaching_prompts: [
      "إمتى بتحس إنك فعلاً منتمٍ؟",
      "هل بتغير من نفسك عشان تنتمي؟ وهل ده بيخليك سعيد؟"
    ],
    practical_exercises: ["relationship_mapping", "authenticity_practice"]
  },

  "achievement": {
    value: "الانجاز/التميز (Achievement)",
    description: "التحفيز نحو الأداء، النجاح، والتقدم المهني/الشخصي.",
    motivating_signals: ["سعي للأهداف", "قضاء وقت على التعلم", "المقاييس الذاتية"],
    conflict_with: ["rest", "relationships"],
    coaching_prompts: [
      "إيه أهم إنجاز نفسك دلوقتي؟",
      "كيف تعرف إن إنجازك بيفيد حياتك الحقيقية؟"
    ],
    practical_exercises: ["goal_crafting", "progress_reflection"]
  },

  "security": {
    value: "الأمن/الاستقرار (Security)",
    description: "السعي للاستقرار المالي، العاطفي، والصحي.",
    motivating_signals: ["تحفظ في المخاطرة", "الادخار", "تفضيل الروتين"],
    conflict_with: ["adventure", "autonomy"],
    coaching_prompts: [
      "إيه معنى الأمان بالنسبة لك؟",
      "هل الأمان اللي تطمح له فعلاً ممكن يتحقق؟"
    ],
    practical_exercises: ["risk_assessment", "safety_plan"]
  },

  "authenticity": {
    value: "الصدق مع الذات (Authenticity)",
    description: "الحاجة لأن تكون حقيقيًا في التعبير عن الذات دون تنميق.",
    motivating_signals: ["البحث عن صداقات حقيقية", "رفض التظاهر", "التعبير الحر"],
    conflict_with: ["belonging_when_costly", "social_comfort"],
    coaching_prompts: [
      "أين بتخاف تكون صريح؟",
      "إيه اللي ممكن يتغير لو عبرت عن نفسك بصدق؟"
    ],
    practical_exercises: ["values_declaration", "honest_dialogue"]
  }
};

/* ===========================
   3) Defense Mechanisms (آليات الدفاع النفسية)
   =========================== */
export const DEFENSE_MECHANISMS = {
  "denial": {
    name: "الإنكار (Denial)",
    type: "primitive",
    description: "رفض إدراك واقع مؤلم أو الشعور به.",
    adaptive: false,
    indicators: ["تقليل المشكلة لفظياً", "نفي الحقائق الواضحة"],
    short_term_function: "يحمي من الصدمة الفورية",
    long_term_risk: ["عدم مواجهة المشاكل", "تأخر طلب المساعدة"],
    suggested_interventions: ["gentle_reality_testing", "psychoeducation", "supportive_confrontation"],
    probing_questions: [
      "هل في جزء جواك بيقول إن الموضوع مش حصل؟",
      "لو اقتربت لفترة قصيرة من الحقيقة، إيه اللي ممكن تلاحظه؟"
    ],
    severity: 1
  },

  "projection": {
    name: "الإسقاط (Projection)",
    type: "immature",
    description: "إرجاع المشاعر أو الدوافع الشخصية على الآخرين.",
    adaptive: false,
    indicators: ["اتهام الآخرين بمشاعرك", "تفسير سلوكهم كعدواني دون دليل"],
    short_term_function: "تخفيف التوتر الداخلي",
    long_term_risk: ["توتر في العلاقات", "سوء فهم مستمر"],
    suggested_interventions: ["mentalization_training", "empathy_building", "self_reflection_prompts"],
    probing_questions: [
      "هل في احتمال إن الشعور اللي بتشوفه في الآخر جواك؟",
      "إمتى آخر مرة حسيت بالشعور ده جواك؟"
    ],
    severity: 1
  },

  "rationalization": {
    name: "التبرير العقلي (Rationalization)",
    type: "common",
    description: "اختراع أسباب منطقية لتبرير سلوك غير مرغوب.",
    adaptive: false,
    indicators: ["أعذار متكررة", "تمييع المسؤولية"],
    short_term_function: "الحفاظ على صورة الذات",
    long_term_risk: ["عدم تعلم من الأخطاء"],
    suggested_interventions: ["evidence_examination", "accountability_partner", "CBT_restructuring"],
    probing_questions: [
      "إيه الدليل اللي يدعم التفسير اللي بتقوله لنفسك؟",
      "لو حاولت تحكي القصة لشخص محايد، حيقول إيه؟"
    ],
    severity: 0
  },

  "reaction_formation": {
    name: "التحول التفاعلي (Reaction Formation)",
    type: "defensive",
    description: "إظهار سلوك معاكس لمشاعر حقيقية لصدها أو إخفائها.",
    adaptive: false,
    indicators: ["حب مبالغ فيه لشيء بتكرهه داخليًا", "تحولات مفاجئة في السلوك"],
    short_term_function: "حماية الهوية الذاتية المؤلمة",
    long_term_risk: ["ازدواجية داخلية", "انسحاب اجتماعي"],
    suggested_interventions: ["exploratory_therapy", "authenticity_exercises"],
    probing_questions: [
      "هل أحيانًا بتحس إن رد فعلك مش مضبوط لأن داخليًا بتحس بعكسه؟",
      "لو سمحت لنفسك بالصدق، حيحصل إيه؟"
    ],
    severity: 0
  },

  "suppression": {
    name: "الكبت الإرادي (Suppression)",
    type: "mature",
    description: "تأجيل أو تهدئة المشاعر بشكل واعٍ لأجل التعامل مع مهمة مؤقتاً.",
    adaptive: true,
    indicators: ["تأجيل التفكير في المشكلة مؤقتًا", "القدرة على التركيز رغم الضيق"],
    short_term_function: "الحفاظ على الأداء الوظيفي",
    long_term_risk: ["تراكم مشاعر إذا ما عولجت لاحقًا"],
    suggested_interventions: ["scheduled_processing", "emotional_checkins", "self-care_planning"],
    probing_questions: [
      "هل بتأجل الشعور ده عشان تقدر تشتغل؟",
      "إمتى ناوي تتعامل مع اللي ما أجلته؟"
    ],
    severity: 0
  },

  "sublimation": {
    name: "التصريف البناء (Sublimation)",
    type: "mature",
    description: "تحويل الدوافع أو المشاعر إلى أنشطة اجتماعية مقبولة أو بناءة.",
    adaptive: true,
    indicators: ["تحويل الطاقة للرياضة أو الفن أو العمل", "إيجاد معنى في النشاط"],
    short_term_function: "توجيه الطاقة نحو إنتاجية",
    long_term_benefit: ["نمو شخصي", "إشباع طويل الأمد"],
    suggested_interventions: ["creative_outlet_development", "meaning_based_goals"],
    probing_questions: [
      "إزاي ممكن تحول الشعور ده لحاجة مفيدة؟",
      "هل في نشاط بيخلي الشعور يخف ويبقى له معنى؟"
    ],
    severity: 0
  }
};

/* ===========================
   4) Relation Map (علاقات ذكية بين الكيانات)
   =========================== */
export const RELATION_MAP = {
  // behavioral -> related concepts (values, defenses)
  "avoidant_withdrawal": {
    relates_to_values: ["security", "belonging"],
    often_with_defenses: ["suppression", "denial"]
  },
  "people_pleasing": {
    relates_to_values: ["belonging", "authenticity"],
    often_with_defenses: ["reaction_formation", "rationalization"]
  },
  "rumination_cycle": {
    relates_to_values: ["achievement", "meaning"],
    often_with_defenses: ["projection", "rationalization"]
  },
  "compensatory_overworking": {
    relates_to_values: ["achievement", "security"],
    often_with_defenses: ["sublimation", "suppression"]
  }
};

/* ===========================
   5) Utilities: Indexing & Smart Search
   =========================== */

const buildUnifiedIndex = () => {
  const index = {
    behaviors: {},
    values: {},
    defenses: {},
    byKeyword: {}
  };

  // index behaviors
  for (const [k,v] of Object.entries(BEHAVIORAL_PATTERNS)) {
    index.behaviors[k] = v;
    // keywords from name + triggers + signals
    const keywords = [k, ...(v.triggers||[]), ...(v.behavioral_signals||[])];
    for (const kw of keywords) {
      const key = kw.toString();
      if (!index.byKeyword[key]) index.byKeyword[key] = { behaviors: new Set(), values: new Set(), defenses: new Set() };
      index.byKeyword[key].behaviors.add(k);
    }
  }

  // index values
  for (const [k,v] of Object.entries(VALUE_SYSTEMS)) {
    index.values[k] = v;
    const keywords = [k, ...(v.motivating_signals||[])];
    for (const kw of keywords) {
      const key = kw.toString();
      if (!index.byKeyword[key]) index.byKeyword[key] = { behaviors: new Set(), values: new Set(), defenses: new Set() };
      index.byKeyword[key].values.add(k);
    }
  }

  // index defenses
  for (const [k,v] of Object.entries(DEFENSE_MECHANISMS)) {
    index.defenses[k] = v;
    const keywords = [k, ...(v.indicators||[])];
    for (const kw of keywords) {
      const key = kw.toString();
      if (!index.byKeyword[key]) index.byKeyword[key] = { behaviors: new Set(), values: new Set(), defenses: new Set() };
      index.byKeyword[key].defenses.add(k);
    }
  }

  // convert sets to arrays
  for (const k of Object.keys(index.byKeyword)) {
    index.byKeyword[k].behaviors = Array.from(index.byKeyword[k].behaviors);
    index.byKeyword[k].values = Array.from(index.byKeyword[k].values);
    index.byKeyword[k].defenses = Array.from(index.byKeyword[k].defenses);
  }

  return index;
};

export const UNIFIED_INDEX = buildUnifiedIndex();

/**
 * smartLookup(token)
 * - يبحث في الفهرس عن تطابق مباشر أو شبه مباشر (partial includes)
 * - يعيد نتائج مجمعة من السلوك/قيمة/دفاع
 */
export function smartLookup(token) {
  if (!token) return null;
  const direct = UNIFIED_INDEX.byKeyword[token];
  if (direct) return direct;

  // partial search (cheap)
  const results = { behaviors: new Set(), values: new Set(), defenses: new Set() };
  const t = token.toString().toLowerCase();
  for (const [k, v] of Object.entries(UNIFIED_INDEX.byKeyword)) {
    if (k.toLowerCase().includes(t) || t.includes(k.toLowerCase())) {
      (v.behaviors||[]).forEach(b => results.behaviors.add(b));
      (v.values||[]).forEach(val => results.values.add(val));
      (v.defenses||[]).forEach(d => results.defenses.add(d));
    }
  }
  return {
    behaviors: Array.from(results.behaviors),
    values: Array.from(results.values),
    defenses: Array.from(results.defenses)
  };
}

/* ===========================
   6) High-level helper: analyzeUserProfile(tokens)
   - input: array of normalized tokens (strings)
   - output: aggregated insights (top behaviors, values, defenses, suggested interventions)
   =========================== */

export function analyzeUserProfile(tokens = [], { topK = 3 } = {}) {
  const tally = { behaviors: {}, values: {}, defenses: {} };
  for (const token of tokens) {
    const res = smartLookup(token);
    if (!res) continue;
    for (const b of res.behaviors) tally.behaviors[b] = (tally.behaviors[b]||0) + 1;
    for (const v of res.values) tally.values[v] = (tally.values[v]||0) + 1;
    for (const d of res.defenses) tally.defenses[d] = (tally.defenses[d]||0) + 1;
  }

  const top = (obj) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0, topK).map(x=>({ key: x[0], score: x[1] }));
  const topBehaviors = top(tally.behaviors);
  const topValues = top(tally.values);
  const topDefenses = top(tally.defenses);

  // gather suggested interventions (de-duplicated)
  const interventions = new Set();
  for (const b of topBehaviors) {
    const arr = BEHAVIORAL_PATTERNS[b.key]?.suggested_interventions || [];
    arr.forEach(i => interventions.add(i));
  }
  for (const d of topDefenses) {
    const arr = DEFENSE_MECHANISMS[d.key]?.suggested_interventions || [];
    arr.forEach(i => interventions.add(i));
  }
  // value-aligned coaching prompts
  const coaching_prompts = [];
  for (const v of topValues) {
    const prompts = VALUE_SYSTEMS[v.key]?.coaching_prompts || [];
    coaching_prompts.push(...prompts);
  }

  return {
    topBehaviors,
    topValues,
    topDefenses,
    suggested_interventions: Array.from(interventions),
    coaching_prompts: Array.from(new Set(coaching_prompts))
  };
}

/* ===========================
   7) Adaptive learning hooks (lightweight)
   - recordObservation(entityKey, type, feedback) -> adjusts internal severity/weighting
   =========================== */

export const ADAPTIVE_STATE = {
  observations: {} // e.g. { "avoidant_withdrawal": { count: 3, lastSeen: 12345678 } }
};

export function recordObservation(key, type = "behavior") {
  const storeKey = `${type}:${key}`;
  if (!ADAPTIVE_STATE.observations[storeKey]) ADAPTIVE_STATE.observations[storeKey] = { count: 0, lastSeen: null };
  ADAPTIVE_STATE.observations[storeKey].count += 1;
  ADAPTIVE_STATE.observations[storeKey].lastSeen = Date.now();
  return ADAPTIVE_STATE.observations[storeKey];
}

export function adjustSeverity(key, type = "defense", delta = 0.1) {
  let target;
  if (type === "defense") target = DEFENSE_MECHANISMS[key];
  else if (type === "behavior") target = BEHAVIORAL_PATTERNS[key];
  else if (type === "value") target = VALUE_SYSTEMS[key];
  if (!target) return false;
  target.risk_level = Math.max(0, Math.min(2, (target.risk_level || 0) + delta));
  return target.risk_level;
}

/* ===========================
   8) Exports (Unified default)
   =========================== */

export default {
  BEHAVIORAL_PATTERNS,
  VALUE_SYSTEMS,
  DEFENSE_MECHANISMS,
  RELATION_MAP,
  UNIFIED_INDEX,
  smartLookup,
  analyzeUserProfile,
  recordObservation,
  adjustSeverity,
  ADAPTIVE_STATE
};



