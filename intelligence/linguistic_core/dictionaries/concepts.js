// intelligence/linguistic_core/dictionaries/concepts.js
// Version 2.0: Now supports multi-concept mapping and mood weighting.

export const CONCEPT_MAP = {
  // Supportive Mood Concepts
  "حزن": { concepts: ["sadness"], mood_weights: { supportive: 1.0 } },
  "حزين": { concepts: ["sadness"], mood_weights: { supportive: 1.0 } },
  "مكتئب": { concepts: ["sadness", "depression_symptom"], mood_weights: { supportive: 1.2 } },
  "يأس": { concepts: ["sadness", "helplessness"], mood_weights: { supportive: 1.5 } },
  "وحدة": { concepts: ["loneliness"], mood_weights: { supportive: 1.0 } },

  // Calming Mood Concepts
  "قلق": { concepts: ["anxiety"], mood_weights: { calming: 1.0 } },
  "قلقان": { concepts: ["anxiety"], mood_weights: { calming: 1.0 } },
  "خايف": { concepts: ["anxiety", "fear"], mood_weights: { calming: 1.2 } },
  "خوف": { concepts: ["fear"], mood_weights: { calming: 1.0 } },
  "متوتر": { concepts: ["anxiety"], mood_weights: { calming: 1.0 } },
  "مخنوق": { concepts: ["sadness", "anxiety"], mood_weights: { supportive: 0.6, calming: 0.6 } }, // <--- مثال لمفهوم مختلط

  // Empowering Mood Concepts
  "طاقة": { concepts: ["helplessness", "passion_loss"], mood_weights: { empowering: 0.8, supportive: 0.5 } }, // يحتاج تمكين ودعم
  "شغف": { concepts: ["passion_loss"], mood_weights: { empowering: 1.0 } },
  "هدف": { concepts: ["goal_setting"], mood_weights: { empowering: 1.2 } },
};
