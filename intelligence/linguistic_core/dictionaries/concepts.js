// intelligence/linguistic_core/dictionaries/concepts.js
// Version 5.0: Comprehensive Content Expansion.
// This version transforms the dictionary into a rich, psychologically-grounded lexicon,
// forming the true knowledge base for the entire cognitive engine.

/**
 * @typedef {Object} ConceptDefinition
 * @property {string[]} tags - Semantic tags for high-level analysis.
 * @property {Object.<string, number>} mood_weights - How this concept influences the desired response mood.
 * @property {string} [description] - A brief internal description of the concept's scope.
 */

/**
 * CONCEPT_DEFINITIONS: The "encyclopedia" of psychological concepts.
 * @type {Object.<string, ConceptDefinition>}
 */
export const CONCEPT_DEFINITIONS = {
  // --- 1. Core Negative Affects ---
  "sadness": { tags: ['feeling', 'core-affect'], mood_weights: { supportive: 1.0 }, description: "General unhappiness or sorrow." },
  "anxiety": { tags: ['feeling', 'core-affect', 'future-oriented'], mood_weights: { calming: 1.0, supportive: 0.3 }, description: "Worry or nervousness about an uncertain outcome." },
  "fear": { tags: ['feeling', 'core-affect', 'present-oriented'], mood_weights: { calming: 1.2, supportive: 0.5 }, description: "Emotion caused by a perceived immediate threat." },
  "anger": { tags: ['feeling', 'core-affect'], mood_weights: { calming: 0.8, supportive: 0.5 }, description: "Strong annoyance, displeasure, or hostility." },

  // --- 2. Complex Emotional & Cognitive States ---
  "grief": { tags: ['feeling', 'process', 'loss'], mood_weights: { supportive: 2.0 }, description: "Deep sorrow caused by significant loss." },
  "loneliness": { tags: ['feeling', 'state', 'social-need'], mood_weights: { supportive: 1.1, empowering: 0.2 }, description: "Sadness from lack of friends or company." },
  "guilt": { tags: ['feeling', 'self-criticism', 'past-oriented'], mood_weights: { supportive: 1.3 }, description: "Feeling of having committed a wrong." },
  "shame": { tags: ['feeling', 'self-criticism', 'identity-related'], mood_weights: { supportive: 1.5, empowering: 0.4 }, description: "Painful feeling of humiliation tied to self-worth." },
  "jealousy": { tags: ['feeling', 'social-comparison', 'threat'], mood_weights: { supportive: 1.0, empowering: 0.3 }, description: "Feeling protective of one's possessions or relationships." },
  "depression_symptom": { tags: ['feeling', 'symptom', 'state'], mood_weights: { supportive: 1.5 }, description: "Cluster of depressive symptoms." },
  "trauma_symptom": { tags: ['feeling', 'symptom', 'past-oriented', 'trauma-related'], mood_weights: { supportive: 2.5, calming: 1.5 }, description: "Emotional response to a distressing event." },

  // --- 3. States of Inaction & Low Motivation ---
  "helplessness": { tags: ['state', 'inaction', 'control-related'], mood_weights: { supportive: 1.5, empowering: 0.8 }, description: "Inability to act effectively." },
  "passion_loss": { tags: ['state', 'inaction', 'motivation-related'], mood_weights: { empowering: 1.2, supportive: 0.4 }, description: "Loss of enthusiasm; anhedonia." },
  "procrastination": { tags: ['behavior', 'inaction', 'avoidance'], mood_weights: { empowering: 1.5, supportive: 0.5 }, description: "The action of delaying or postponing something." },
  "stagnation": { tags: ['state', 'inaction', 'stuck'], mood_weights: { empowering: 1.3, supportive: 0.6 }, description: "Feeling stuck or lacking development." },
  
  // --- 4. Self-Perception & Cognitive Patterns ---
  "low_self_esteem": { tags: ['state', 'self-criticism', 'identity-related'], mood_weights: { empowering: 1.0, supportive: 0.8 }, description: "Lack of confidence in one's own worth." },
  "imposter_syndrome": { tags: ['cognitive-pattern', 'self-criticism'], mood_weights: { supportive: 1.2, empowering: 0.8 }, description: "Feeling like a fraud despite success." },
  "rumination": { tags: ['cognitive-pattern', 'inaction', 'past-oriented'], mood_weights: { calming: 0.7, supportive: 0.5, empowering: 0.2 }, description: "Repetitive thinking about negative feelings and events." },
  "catastrophizing": { tags: ['cognitive-pattern', 'future-oriented', 'anxiety'], mood_weights: { calming: 1.5, supportive: 0.5 }, description: "Imagining the worst-case scenario." },
  "self_blame": { tags: ['cognitive-pattern', 'self-criticism'], mood_weights: { supportive: 1.4 }, description: "Unfairly attributing negative events to oneself." },

  // --- 5. Social & Relational Concepts ---
  "social_anxiety": { tags: ['feeling', 'anxiety', 'social-need'], mood_weights: { calming: 1.2, supportive: 0.8 }, description: "Anxiety in social situations." },
  "attachment_anxiety": { tags: ['feeling', 'anxiety', 'relational'], mood_weights: { supportive: 1.5, calming: 0.5 }, description: "Fear of abandonment in relationships." },
  "people_pleasing": { tags: ['behavior', 'social-need', 'boundary-issue'], mood_weights: { empowering: 1.2, supportive: 0.8 }, description: "A need to please others, often at one's own expense." },
  "boundary_setting": { tags: ['action', 'self-care', 'relational'], mood_weights: { empowering: 1.8 }, description: "Establishing healthy guidelines in relationships." },
  
  // --- 6. Positive Psychology & Growth Concepts ---
  "goal_setting": { tags: ['action', 'problem-solving', 'future-oriented'], mood_weights: { empowering: 1.2 }, description: "Process of identifying and planning for a goal." },
  "change": { tags: ['action', 'process'], mood_weights: { empowering: 1.0, calming: 0.5 }, description: "The act of making or becoming different." },
  "self_compassion": { tags: ['action', 'self-care', 'feeling'], mood_weights: { supportive: 1.8 }, description: "Extending compassion to oneself." },
  "resilience": { tags: ['state', 'growth', 'coping-mechanism'], mood_weights: { empowering: 1.5, supportive: 0.5 }, description: "The capacity to recover quickly from difficulties." },
  "gratitude": { tags: ['action', 'feeling', 'positive-psychology'], mood_weights: { empowering: 1.0 }, description: "The quality of being thankful." },
  "hope": { tags: ['feeling', 'state', 'future-oriented'], mood_weights: { empowering: 1.2, supportive: 0.5 }, description: "A feeling of expectation and desire for a certain thing to happen." },
  "mindfulness": { tags: ['action', 'self-care', 'present-oriented'], mood_weights: { calming: 2.0 }, description: "Paying attention to the present moment without judgment." },
};


/**
 * CONCEPT_MAP: The "dictionary" linking user's words to psychological concepts.
 * @type {Object.<string, string[]>}
 */
export const CONCEPT_MAP = {
  // --- Sadness, Depression, Grief ---
  "حزن": ["sadness"], "حزين": ["sadness"], "زعلان": ["sadness"],
  "مكتئب": ["depression_symptom"], "كآبة": ["depression_symptom"], "اكتئاب": ["depression_symptom"],
  "ضيق": ["sadness", "anxiety"], "مخنوق": ["sadness", "anxiety", "helplessness"],
  "يأس": ["sadness", "helplessness", "depression_symptom"], "يائس": ["sadness", "helplessness"],
  "محبط": ["sadness", "passion_loss"], "احباط": ["sadness", "passion_loss"],
  "فقد": ["grief"], "موت": ["grief"], "انفصال": ["grief"], "فراق": ["grief"],
  "وحشني": ["grief", "loneliness"], "بفتقده": ["grief"],
  "قلبي واجعني": ["sadness", "grief"], "قلبي مقبوض": ["sadness", "anxiety"],
  "الدنيا سودة": ["depression_symptom", "helplessness"],

  // --- Anxiety, Fear, Stress ---
  "قلق": ["anxiety"], "قلقان": ["anxiety"], "متوتر": ["anxiety"],
  "خايف": ["anxiety", "fear"], "خوف": ["fear"], "رعب": ["fear"], "مرعوب": ["fear"],
  "ضغط": ["anxiety"], "مضغوط": ["anxiety"],
  "كارثة": ["catastrophizing"], "مصيبة": ["catastrophizing"],
  "هيحصل ايه": ["anxiety", "catastrophizing"],
  "قلق اجتماعي": ["social_anxiety"], "بكسف": ["social_anxiety"], "بتكسف": ["social_anxiety"],
  "هيسيبني": ["attachment_anxiety"], "هتسيبني": ["attachment_anxiety"],

  // --- Loneliness & Social Needs ---
  "وحدة": ["loneliness"], "وحيد": ["loneliness"], "لوحدي": ["loneliness"],
  "عزلة": ["loneliness"], "منعزل": ["loneliness"],
  "محدش فاهمني": ["loneliness"], "محدش حاسس بيا": ["loneliness"],
  "صحاب": ["social_anxiety", "loneliness"], // Context-dependent
  
  // --- Inaction, Motivation, Self-Criticism ---
  "طاقة": ["passion_loss", "helplessness", "depression_symptom"], // معنديش طاقة
  "شغف": ["passion_loss"], "ملل": ["passion_loss"], "زهقت": ["passion_loss"],
  "كسل": ["passion_loss", "procrastination"], "بأجل": ["procrastination"], "تسويف": ["procrastination"],
  "واقف مكاني": ["stagnation"], "مش بتحرك": ["stagnation", "helplessness"],
  "ضايع": ["helplessness", "stagnation"], "تايه": ["helplessness", "stagnation"],
  "ضعيف": ["helplessness", "low_self_esteem"],
  "فاشل": ["low_self_esteem", "shame"], "غبي": ["low_self_esteem"],
  "مش كفاية": ["low_self_esteem", "imposter_syndrome"],
  "بحس إني نصاب": ["imposter_syndrome"],
  "ذنب": ["guilt", "self_blame"], "بجلد ذاتي": ["self_blame", "guilt"],
  "بلوم نفسي": ["self_blame"], "اللوم": ["self_blame"],
  "عار": ["shame"], "فضيحة": ["shame"], "مكسوف من نفسي": ["shame"],
  "أفكر كتير": ["rumination"], "تفكير": ["rumination"], "بفكر زيادة": ["rumination"],

  // --- Anger ---
  "غضب": ["anger"], "غضبان": ["anger"], "عصبي": ["anger"], "متعصب": ["anger"], "متضايق": ["anger", "sadness"],

  // --- Relational Patterns ---
  "برضي الناس": ["people_pleasing"], "مبعرفش أقول لأ": ["people_pleasing", "boundary_setting"],
  "حدود": ["boundary_setting"],

  // --- Growth & Action ---
  "هدف": ["goal_setting"], "أهداف": ["goal_setting"], "خطة": ["goal_setting"],
  "تغيير": ["change"], "أتغير": ["change"], "أتحسن": ["change"],
  "أساعد نفسي": ["self_compassion"], "أكون لطيف مع نفسي": ["self_compassion"],
  "قوة": ["resilience"], "صمود": ["resilience"], "أتجاوز": ["resilience", "grief"],
  "أمل": ["hope"], "متفائل": ["hope"],
  "شكر": ["gratitude"], "ممتن": ["gratitude"], "الحمدلله": ["gratitude"],
  "تركيز": ["mindfulness"], "أكون هنا": ["mindfulness"],
};

// Default export for easy import
export default {
  CONCEPT_DEFINITIONS,
  CONCEPT_MAP
};
