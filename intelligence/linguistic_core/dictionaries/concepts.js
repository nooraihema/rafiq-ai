// intelligence/linguistic_core/dictionaries/concepts.js
// Version 3.0: Optimized for direct lookups. The key is now the concept name.

export const CONCEPT_DEFINITIONS = {
  // Supportive Mood Concepts
  "sadness": { mood_weights: { supportive: 1.0 } },
  "depression_symptom": { mood_weights: { supportive: 1.2 } },
  "helplessness": { mood_weights: { supportive: 1.5, empowering: 0.5 } },
  "loneliness": { mood_weights: { supportive: 1.0 } },
  "grief": { mood_weights: { supportive: 2.0 } }, // Grief is a strong indicator

  // Calming Mood Concepts
  "anxiety": { mood_weights: { calming: 1.0, supportive: 0.3 } },
  "fear": { mood_weights: { calming: 1.2 } },

  // Empowering Mood Concepts
  "passion_loss": { mood_weights: { empowering: 1.0, supportive: 0.4 } },
  "goal_setting": { mood_weights: { empowering: 1.2 } },
  "low_self_esteem": { mood_weights: { empowering: 1.0, supportive: 0.8 } }
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
  "طاقة": ["helplessness", "passion_loss"],
  "شغف": ["passion_loss"],
  "هدف": ["goal_setting"],
  "ضعيف": ["helplessness", "low_self_esteem"],
};
