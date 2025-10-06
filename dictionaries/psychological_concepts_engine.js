// ============================================================================
// 📘 dictionaries/psychological_concepts_engine.js
// Psychological Concepts Engine (Definitive Edition v9.0)
// @version 9.0
// ============================================================================

/**
 * @typedef {'is_a_type_of' | 'often_co_occurs_with' | 'can_lead_to' | 'antonym_of'} ConceptLinkType
 */

/**
 * @typedef {Object} ConceptLink
 * @property {string} concept - The target concept's key.
 * @property {ConceptLinkType} type - The nature of the relationship.
 */

/**
 * @typedef {Object} ConceptDefinition
 * @property {string[]} tags
 * @property {string} description
 * @property {string} example_phrase - جملة واقعية توضح المفهوم.
 * @property {Object.<string, number>} mood_weights
 * @property {string[]} interventions
 * @property {string[]} probing_questions
 * @property {ConceptLink[]} links - شبكة العلاقات مع المفاهيم الأخرى.
 * @property {number} [risk_level=0]
 */

export const CONCEPT_DEFINITIONS = {

  // --------------------------------------------------------------------------
  // 🩵 المشاعر الأساسية (Core Emotions)
  // --------------------------------------------------------------------------
  "sadness": {
    tags: ["emotion", "core", "loss"],
    description: "حالة من الحزن أو الأسى نتيجة فقد أو خيبة أمل.",
    example_phrase: "أشعر بحزن عميق اليوم ولا أعرف السبب.",
    mood_weights: { supportive: 1.0 },
    interventions: ["journaling", "self_compassion", "behavioral_activation"],
    probing_questions: ["ما أكثر ما يؤلمك الآن؟", "هل هناك شيء فقدته وتشعر بغيابه؟"],
    links: [
      { concept: "joy", type: "antonym_of" },
      { concept: "grief", type: "is_a_type_of" },
      { concept: "loneliness", type: "often_co_occurs_with" }
    ],
    risk_level: 0
  },
  "anxiety": {
    tags: ["emotion", "future_oriented", "tension"],
    description: "شعور بالقلق أو التوتر تجاه أمر غير مؤكد.",
    example_phrase: "عندي قلق مستمر من المقابلة القادمة.",
    mood_weights: { calming: 1.0, supportive: 0.4 },
    interventions: ["deep_breathing", "mindfulness", "cognitive_restructuring"],
    probing_questions: ["ما هو أكثر شيء يقلقك الآن؟", "ماذا يقول لك عقلك عن المستقبل؟"],
    links: [
      { concept: "calmness", type: "antonym_of" },
      { concept: "catastrophizing", type: "can_lead_to" }
    ],
    risk_level: 0
  },

  // --------------------------------------------------------------------------
  // 💭 الأنماط المعرفية (Cognitive Patterns)
  // --------------------------------------------------------------------------
  "self_blame": {
    tags: ["cognition", "distortion", "self_criticism"],
    description: "ميل الشخص لتحميل نفسه المسؤولية عن أحداث سلبية خارجة عن سيطرته.",
    example_phrase: "أشعر أن كل ما حدث هو خطئي أنا.",
    mood_weights: { supportive: 1.3 },
    interventions: ["evidence_examination", "self_compassion"],
    probing_questions: ["هل تملك دليلًا على أنك المسؤول فعلًا؟", "لو كان صديقك مكانك، هل كنت ستحكم عليه بنفس الطريقة؟"],
    links: [
      { concept: "self_acceptance", type: "antonym_of" },
      { concept: "guilt", type: "often_co_occurs_with" },
      { concept: "cognitive_distortion", type: "is_a_type_of" }
    ],
    risk_level: 0
  },
  "helplessness": {
    tags: ["state", "learned_response", "inaction"],
    description: "شعور بأن لا شيء يمكن تغييره أو السيطرة عليه، مما يؤدي إلى الاستسلام.",
    example_phrase: "أشعر أني عاجز تمامًا والدنيا مقفلة في وجهي.",
    mood_weights: { supportive: 1.4, empowering: 0.9 },
    interventions: ["focus_on_small_wins", "problem_solving", "identify_choices"],
    probing_questions: ["ما الشيء الصغير الذي ما زال بإمكانك التحكم فيه؟", "هل مررت بموقف مشابه وتجاوزته من قبل؟"],
    links: [
      { concept: "empowerment", type: "antonym_of" },
      { concept: "depression_symptom", type: "often_co_occurs_with" },
      { concept: "stagnation", type: "can_lead_to" }
    ],
    risk_level: 1
  },

  // --------------------------------------------------------------------------
  // 💬 الميتا-وعي والوجودية (Metacognitive & Existential Concepts)
  // --------------------------------------------------------------------------
  "meaning_crisis": {
    tags: ["existential", "identity", "purpose"],
    description: "شعور عميق بفقدان المعنى أو الاتجاه أو الهدف في الحياة.",
    example_phrase: "أشعر أن حياتي فارغة وبلا معنى.",
    mood_weights: { supportive: 1.0, reflective: 0.8 },
    interventions: ["value_exploration", "purpose_mapping", "journaling"],
    probing_questions: ["ما الذي كان يمنحك الإحساس بالمعنى سابقًا؟", "ما الذي تتمنى أن يعطي لحياتك معنى الآن؟"],
    links: [
      { concept: "purposefulness", type: "antonym_of" },
      { concept: "depression_symptom", type: "often_co_occurs_with" },
      { concept: "identity_confusion", type: "often_co_occurs_with" }
    ],
    risk_level: 1
  },
  // ... (تم تطبيق نفس الهيكل على باقي المفاهيم)
};

// ============================================================================
// 🧭 Weighted Language Map (Expanded)
// ============================================================================
export const CONCEPT_MAP = {
  // Sadness & Related
  "حزين": [{ concept: "sadness", weight: 1.0 }],
  "زعلان": [{ concept: "sadness", weight: 0.9 }],
  "ضيق": [{ concept: "sadness", weight: 0.8 }, { concept: "anxiety", weight: 0.5 }],
  "مكتئب": [{ concept: "depression_symptom", weight: 1.0 }],
  "قلبي واجعني": [{ concept: "sadness", weight: 0.9 }, { concept: "grief", weight: 0.6 }],

  // Helplessness & Related
  "يائس": [{ concept: "helplessness", weight: 1.0 }],
  "عاجز": [{ concept: "helplessness", weight: 1.0 }],
  "مستسلم": [{ concept: "helplessness", weight: 0.8 }, { concept: "inaction", weight: 0.5 }],
  "الدنيا مقفلة": [{ concept: "helplessness", weight: 1.0 }, { concept: "catastrophizing", weight: 0.4 }],

  // Existential & Identity
  "مش لاقي معنى": [{ concept: "meaning_crisis", weight: 1.0 }],
  "حياتي فاضية": [{ concept: "meaning_crisis", weight: 0.9 }],
  "تايه": [{ concept: "identity_confusion", weight: 0.8 }, { concept: "helplessness", weight: 0.5 }],
  "مش عارف أنا مين": [{ concept: "identity_confusion", weight: 1.0 }],
  
  // ... (إضافة المزيد من الكلمات والعبارات)
};

// ============================================================================
// 🚀 Concept Engine Core (Enhanced)
// ============================================================================
export class ConceptEngine {
  constructor(definitions = CONCEPT_DEFINITIONS, map = CONCEPT_MAP) {
    this.definitions = definitions;
    this.map = map;
  }

  analyzeText(text) {
    // In a real scenario, use a more advanced tokenizer that handles phrases
    const tokens = text.split(/\s+/);
    const profile = {};
    const foundConcepts = [];

    // This logic should be expanded to match phrases from CONCEPT_MAP
    for (const token of tokens) {
      const mappings = this.map[token];
      if (mappings) {
        for (const mapping of mappings) {
          profile[mapping.concept] = (profile[mapping.concept] || 0) + mapping.weight;
          foundConcepts.push({
            token,
            concept: mapping.concept,
            weight: mapping.weight,
            details: this.definitions[mapping.concept]
          });
        }
      }
    }
    return { profile, concepts: foundConcepts };
  }

  /**
   * Recommends next steps for the top N most relevant concepts.
   * @param {Object} profile - The concept profile from analyzeText.
   * @param {number} [top_n=1] - Number of top concepts to generate recommendations for.
   * @returns {any[]}
   */
  recommendNextSteps(profile, top_n = 1) {
    if (!Object.keys(profile).length) return [];

    const sortedConcepts = Object.entries(profile).sort((a, b) => b[1] - a[1]);
    const recommendations = [];

    for (let i = 0; i < Math.min(top_n, sortedConcepts.length); i++) {
      const [conceptKey, score] = sortedConcepts[i];
      const details = this.definitions[conceptKey];
      if (details) {
        recommendations.push({
          concept: conceptKey,
          score: score,
          recommended_interventions: details.interventions || [],
          suggested_questions: details.probing_questions || [],
          links: details.links || [],
          risk_level: details.risk_level || 0
        });
      }
    }
    return recommendations;
  }
}

export default { CONCEPT_DEFINITIONS, CONCEPT_MAP, ConceptEngine };
```
