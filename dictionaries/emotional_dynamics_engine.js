// ============================================================================
// 💞 dictionaries/emotional_dynamics_engine.js
// Emotional Dynamics Engine (Definitive Edition v7.0)
// This engine interprets the interplay of core emotions to understand complex emotional states.
// @author Ibrahim Shahat & Gemini
// @version 7.0
// ============================================================================

/**
 * @typedef {'low' | 'medium' | 'high'} IntensityLevel
 */

/**
 * @typedef {Object} EmotionalState
 * @property {string} name - اسم الحالة الشعورية المركبة.
 * @property {string[]} core_emotions - المشاعر الأساسية المكونة للحالة.
 * @property {string} description - وصف لتجربة الشعور.
 * @property {IntensityLevel} intensity_level - شدة الحالة وتأثيرها المحتمل.
 * @property {string} dialogue_prompt - جملة مثالية ليبدأ بها الذكاء الاصطناعي الحوار.
 * @property {string[]} triggers - المواقف الشائعة التي تثير الحالة.
 * @property {string[]} regulation_strategies - استراتيجيات عملية لتنظيم الشعور.
 * @property {string[]} transformation_paths - مسارات النمو والتحول من هذه الحالة.
 * @property {string} user_affirmation - توكيد ذاتي يمكن للمستخدم ترديده للتعافي.
 */

export const EMOTIONAL_DYNAMICS = {
  "bittersweet": {
    name: "مرارة ممزوجة بالحنين",
    core_emotions: ["sadness", "gratitude", "joy"],
    description: "شعور معقد يجمع بين حزن على انتهاء شيء جميل وامتنان عميق لوجوده.",
    intensity_level: "low",
    dialogue_prompt: "يبدو أنك تنظر إلى ذكرى جميلة لكنها مؤلمة بعض الشيء في نفس الوقت، هذا شعور عميق جدًا.",
    triggers: ["تخرج", "نهاية علاقة بشكل جيد", "تذكر شخص عزيز راحل"],
    regulation_strategies: ["mindful_reflection", "gratitude_journaling", "creative_expression"],
    transformation_paths: ["acceptance", "inner_peace"],
    user_affirmation: "أنا ممتن لكل اللحظات الجميلة التي شكلتني، وأتقبل رحيلها بسلام."
  },
  "resentful_sadness": {
    name: "حزن مع استياء",
    core_emotions: ["sadness", "anger"],
    description: "شعور بالحزن الممزوج بغضب مكبوت أو خيبة أمل تجاه شخص أو موقف سبب الألم.",
    intensity_level: "medium",
    dialogue_prompt: "أشعر من كلامك أن حزنك ليس مجرد حزن، بل هو مصحوب بشعور بالظلم أو الغضب. هذا المزيج مرهق جدًا.",
    triggers: ["خيانة", "خذلان", "ظلم متكرر"],
    regulation_strategies: ["journaling_for_release", "assertive_communication_practice", "physical_activity"],
    transformation_paths: ["forgiveness", "boundary_setting"],
    user_affirmation: "من حقي أن أشعر بالغضب تجاه ما آلمني، وسأختار أن أحرر نفسي منه لأشفى."
  },
  "anxious_attachment": {
    name: "ارتباط قلق",
    core_emotions: ["fear", "anxiety", "longing"],
    description: "خوف عميق من الهجر أو الفقد، مرتبط برغبة قوية في الحصول على الطمأنينة من الآخر.",
    intensity_level: "high",
    dialogue_prompt: "هذا الخوف من أن يتركك شخص تهتم به يمكن أن يكون مؤلمًا ومسيطراً. لست وحدك من يشعر به.",
    triggers: ["تأخر في الرد", "شعور بالبعد العاطفي", "تاريخ من العلاقات غير المستقرة"],
    regulation_strategies: ["self_soothing_techniques", "reality_checking", "building_self_worth"],
    transformation_paths: ["secure_attachment", "emotional_independence"],
    user_affirmation: "أماني الحقيقي ينبع من داخلي، وحبي لنفسي هو أساس علاقاتي الصحية."
  },
  "burnout": {
    name: "الإنهاك النفسي (الاحتراق)",
    core_emotions: ["exhaustion", "detachment", "helplessness", "sadness"],
    description: "حالة من الإرهاق الجسدي والعاطفي والذهني نتيجة للضغط النفسي المزمن.",
    intensity_level: "high",
    dialogue_prompt: "يبدو أن طاقتك قد استُنزفت بالكامل، وأنك وصلت إلى مرحلة من الإنهاك. من المهم جدًا أن نتوقف هنا ونهتم بك.",
    triggers: ["ضغوط عمل مستمرة", "رعاية الآخرين بإفراط", "السعي للكمال"],
    regulation_strategies: ["radical_rest", "strict_boundary_setting", "reconnecting_with_hobbies"],
    transformation_paths: ["sustainable_balance", "self_prioritization"],
    user_affirmation: "من حقي أن أرتاح. رعايتي لنفسي ليست أنانية، بل هي ضرورة."
  },
  "emotional_numbness": {
    name: "الخدر العاطفي",
    core_emotions: ["emptiness", "fear", "detachment"],
    description: "آلية دفاعية يقوم فيها العقل بالانفصال عن المشاعر المؤلمة، مما يؤدي إلى الشعور بالفراغ.",
    intensity_level: "high",
    dialogue_prompt: "أحيانًا عندما يكون الألم كبيرًا جدًا، يتوقف العقل عن الشعور تمامًا. هذا الإحساس بالخدر هو علامة على أنك تحملت الكثير.",
    triggers: ["صدمة نفسية", "حزن عميق طويل الأمد", "ضغط نفسي شديد"],
    regulation_strategies: ["sensory_grounding", "gentle_movement", "connecting_with_safe_people"],
    transformation_paths: ["emotional_reawakening", "trauma_healing"],
    user_affirmation: "أنا آمن لأشعر بمشاعري بوتيرة تناسبني. سأسمح لنفسي بالشفاء خطوة بخطوة."
  }
  // ... (ويمكن تطبيق نفس الهيكل على باقي الحالات)
};

// ============================================================================
// 🔗 The Engine
// ============================================================================
export class EmotionalDynamicsEngine {
  constructor(dynamics = EMOTIONAL_DYNAMICS) {
    this.dynamics = dynamics;
  }

  /**
   * Identifies the most likely composite emotional state based on detected core emotions.
   * @param {string[]} detectedEmotions - An array of core emotion keys from ConceptEngine.
   * @returns {EmotionalState | null} - The best matching emotional state or null.
   */
  detectCompositeState(detectedEmotions = []) {
    if (detectedEmotions.length === 0) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const [key, state] of Object.entries(this.dynamics)) {
      // Calculate how many of the state's core emotions are present
      const matchCount = state.core_emotions.filter(e => detectedEmotions.includes(e)).length;
      
      // Calculate a score (e.g., percentage of matched emotions)
      const score = matchCount / state.core_emotions.length;

      if (score > highestScore) {
        highestScore = score;
        bestMatch = state;
      }
    }

    // Only return a match if it's reasonably confident (e.g., >50% match)
    if (highestScore > 0.5) {
      return bestMatch;
    }

    return null;
  }
}

export default { EMOTIONAL_DYNAMICS, EmotionalDynamicsEngine };
