// intelligence/linguistic_core/dictionaries/concepts.js
// Version 3.1: Added semantic tags for need analysis.

export const CONCEPT_DEFINITIONS = {
  // Concepts related to internal feelings (tags: 'feeling')
  "sadness": { mood_weights: { supportive: 1.0 }, tags: ['feeling'] },
  "depression_symptom": { mood_weights: { supportive: 1.2 }, tags: ['feeling', 'symptom'] },
  "loneliness": { mood_weights: { supportive: 1.0 }, tags: ['feeling'] },
  "anxiety": { mood_weights: { calming: 1.0, supportive: 0.3 }, tags: ['feeling'] },
  "fear": { mood_weights: { calming: 1.2 }, tags: ['feeling'] },
  "grief": { mood_weights: { supportive: 2.0 }, tags: ['feeling'] },
  "guilt": { mood_weights: { supportive: 1.3 }, tags: ['feeling', 'self-criticism'] },

  // Concepts related to a state of being or inaction (tags: 'state', 'inaction')
  "helplessness": { mood_weights: { supportive: 1.5, empowering: 0.5 }, tags: ['state', 'inaction'] },
  "passion_loss": { mood_weights: { empowering: 1.0, supportive: 0.4 }, tags: ['state', 'inaction'] },
  "low_self_esteem": { mood_weights: { empowering: 1.0, supportive: 0.8 }, tags: ['state', 'self-criticism'] },
  
  // Concepts related to action or problem-solving (tags: 'action', 'problem-solving')
  "goal_setting": { mood_weights: { empowering: 1.2 }, tags: ['action', 'problem-solving'] },
  "change": { mood_weights: { empowering: 1.0, calming: 0.5 }, tags: ['action'] }, // New example
};

// This map links user's words (stems) to one or more concepts
export const CONCEPT_MAP = {
  "حزن": ["sadness"],
  "حزين": ["sadness"],
  "مكتئب": ["sadness", "depression_symptom"],
  "مخنوق": ["sadness", "anxiety"],
  "يأس": ["sadness", "helplessness"],
  "وحدة": ["loneliness"],
  "قلق": ["anxiety"],
  "قلقان": ["anxiety"],
  "خايف": ["anxiety", "fear"],
  "خوف": ["fear"],
  "متوتر": ["anxiety"],
  "طاقة": ["helplessness", "passion_loss"], // "مفيش طاقة"
  "شغف": ["passion_loss"],
  "هدف": ["goal_setting"],
  "ضعيف": ["helplessness", "low_self_esteem"],
  "ذنب": ["guilt"],
  "تغيير": ["change"], // New example
};
