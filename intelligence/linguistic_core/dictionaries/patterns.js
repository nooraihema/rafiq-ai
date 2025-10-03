// intelligence/linguistic_core/dictionaries/patterns.js
// Version 3.0: Comprehensive Knowledge Expansion
// This version significantly expands the knowledge base to create a dense map of psychological relationships,
// enabling the cognitive engine to draw much deeper and more nuanced inferences.

/**
 * @typedef {Object} CausalPattern
 * @property {string} pattern_id - A unique identifier for the pattern.
 * @property {string[]} concepts - The set of concepts that trigger this pattern.
 * @property {string} description - An internal description of the psychological dynamic.
 */

/**
 * CAUSAL_PATTERNS: A dictionary of common psychological cause-and-effect loops.
 * @type {CausalPattern[]}
 */
export const CAUSAL_PATTERNS = [
  // --- Anxiety & Coping ---
  { pattern_id: "anxiety_feeds_rumination", concepts: ["anxiety", "rumination"], description: "Anxiety triggers rumination as the mind tries to 'solve' the threat, which in turn fuels more anxiety." },
  { pattern_id: "procrastination_increases_anxiety", concepts: ["procrastination", "anxiety"], description: "Delaying tasks creates a pressure cooker of stress, increasing anxiety as deadlines loom." },
  { pattern_id: "catastrophizing_magnifies_fear", concepts: ["catastrophizing", "fear"], description: "Imagining the worst-case scenario acts as fuel for the fire of fear and panic." },
  { pattern_id: "social_anxiety_leads_to_loneliness", concepts: ["social_anxiety", "loneliness"], description: "Fear of social judgment leads to avoidance, which paradoxically creates the very isolation the person fears." },
  
  // --- Depression & Inaction ---
  { pattern_id: "sadness_leads_to_helplessness", concepts: ["sadness", "helplessness"], description: "Intense sadness depletes energy, leading to a feeling of powerlessness and inaction." },
  { pattern_id: "loneliness_deepens_depression", concepts: ["loneliness", "depression_symptom"], description: "Prolonged loneliness and lack of social connection are significant contributors to depressive states." },
  { pattern_id: "passion_loss_causes_stagnation", concepts: ["passion_loss", "stagnation"], description: "Loss of interest (anhedonia) removes the motivation to act, leading to a feeling of being stuck." },
  { pattern_id: "helplessness_reinforces_depression", concepts: ["helplessness", "depression_symptom"], description: "The belief that one cannot change their situation is a core cognitive component that maintains depression." },

  // --- Self-Criticism & Negative Self-Perception ---
  { pattern_id: "self_blame_fuels_guilt_cycle", concepts: ["self_blame", "guilt"], description: "The cognitive habit of blaming oneself for negative outcomes creates a persistent cycle of guilt." },
  { pattern_id: "shame_causes_social_withdrawal", concepts: ["shame", "loneliness"], description: "Intense shame often leads to hiding oneself from the world to avoid judgment, causing deep isolation." },
  { pattern_id: "low_self_esteem_attracts_imposter_syndrome", concepts: ["low_self_esteem", "imposter_syndrome"], description: "A core belief of inadequacy makes it difficult to internalize success, fostering the feeling of being a fraud." },
  { pattern_id: "people_pleasing_erodes_self_esteem", concepts: ["people_pleasing", "low_self_esteem"], description: "Consistently prioritizing others' needs over one's own sends a subconscious message that one's own needs are less valuable." },

  // --- Grief & Loss ---
  { pattern_id: "grief_triggers_rumination_on_past", concepts: ["grief", "rumination"], description: "Grief often involves replaying past memories and 'what ifs', which is a natural but sometimes painful part of processing." },
  { pattern_id: "guilt_complicates_grief", concepts: ["guilt", "grief"], description: "Feelings of guilt (e.g., 'I should have done more') are a common and painful complication in the grieving process." },
];


/**
 * @typedef {Object} NarrativeTension
 * @property {string} tension_id - A unique identifier for the tension.
 * @property {string[]} pole_a_concepts - Concepts representing the first competing drive.
 * @property {string[]} pole_b_concepts - Concepts representing the second competing drive.
 * @property {string} description - An internal description of the core conflict.
 */

/**
 * NARRATIVE_TENSIONS: A dictionary of core psychological conflicts.
 * @type {NarrativeTension[]}
 */
export const NARRATIVE_TENSIONS = [
  // --- 1. Action vs. Inaction ---
  { tension_id: "growth_vs_safety", pole_a_concepts: ["change", "goal_setting"], pole_b_concepts: ["fear", "anxiety", "catastrophizing"], description: "The drive for growth and new experiences vs. the fear of the unknown, failure, or leaving one's comfort zone." },
  { tension_id: "action_vs_stagnation", pole_a_concepts: ["goal_setting", "change"], pole_b_concepts: ["passion_loss", "helplessness", "stagnation"], description: "The desire to act and move forward vs. the feeling of being stuck, unmotivated, or powerless." },
  
  // --- 2. Self vs. Other ---
  { tension_id: "authenticity_vs_belonging", pole_a_concepts: ["boundary_setting"], pole_b_concepts: ["people_pleasing", "social_anxiety", "attachment_anxiety"], description: "The conflict between expressing one's true self and needs vs. the desire to fit in, be accepted, and avoid conflict." },
  { tension_id: "connection_vs_protection", pole_a_concepts: ["loneliness"], pole_b_concepts: ["social_anxiety", "fear", "attachment_anxiety"], description: "The deep need for connection vs. the fear of being judged, rejected, or hurt by others." },

  // --- 3. Past vs. Future ---
  { tension_id: "acceptance_vs_rumination", pole_a_concepts: ["self_compassion", "grief"], pole_b_concepts: ["rumination", "guilt", "self_blame"], description: "The struggle between accepting past events and mistakes vs. being trapped in a cycle of overthinking and self-criticism." },
  { tension_id: "hope_vs_despair", pole_a_concepts: ["hope", "goal_setting"], pole_b_concepts: ["helplessness", "depression_symptom", "sadness"], description: "The fundamental struggle between maintaining hope for the future vs. succumbing to feelings of despair and powerlessness." },

  // --- 4. Self-Perception Conflicts ---
  { tension_id: "self_criticism_vs_self_compassion", pole_a_concepts: ["guilt", "shame", "self_blame", "low_self_esteem"], pole_b_concepts: ["self_compassion"], description: "The internal battle between a harsh inner critic and the desire for self-kindness, understanding, and forgiveness." },
  { tension_id: "vulnerability_vs_invulnerability", pole_a_concepts: ["sadness", "fear", "shame"], pole_b_concepts: ["anger"], description: "The conflict between allowing oneself to feel vulnerable emotions vs. using anger as a shield to protect oneself." },

  // --- 5. Grief & Attachment ---
  { tension_id: "attachment_vs_detachment", pole_a_concepts: ["grief", "rumination"], pole_b_concepts: ["resilience", "change", "hope"], description: "The struggle between holding on to a past love, identity, or loss vs. the painful but necessary process of letting go and reinvesting in a new future." },
];

// Default export for easy import
export default {
  CAUSAL_PATTERNS,
  NARRATIVE_TENSIONS
};
