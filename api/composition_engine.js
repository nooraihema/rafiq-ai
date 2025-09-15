// composition_engine.js vΩ.1 - The Creative Lobe (Enhanced)
// Implements: priority-aware recipes, diagnostic flags influence, multi-fragment blending,
// memory-aware rendering, persona-style profiles, multi-stage fallbacks, and self-evaluation loop.
//
// Assumes exports from knowledge_base.js:
// STRATEGIC_RECIPES (object of functions), RESPONSE_TEMPLATES (map), PERSONA_PROFILES (map),
// FRAGMENT_STYLE_DEFAULTS (map), STYLE_PROFILES (map), RECOVERY_STRATEGIES (map)
//
// Also assumes topIntents have shape: [{ score, full_intent: { response_templates: {type: [templates...]}, composition_fragments: [...] } }, ...]
//
// Usage:
//   const payload = composeInferentialResponse(fingerprint, topIntents, 'the_listener');
//   payload => { reply, source, recipe, fingerprint, eval }

import { DEBUG } from './config.js';
import {
  STRATEGIC_RECIPES,
  RESPONSE_TEMPLATES,
  PERSONA_PROFILES,
  FRAGMENT_STYLE_DEFAULTS,
  STYLE_PROFILES,
  RECOVERY_STRATEGIES
} from './knowledge_base.js';

// ----------------------------- Utilities ---------------------------------

function weightedRandomChoice(items, weightKey = 'finalScore') {
  const sum = items.reduce((s, it) => s + (it[weightKey] || 0), 0);
  if (sum === 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * sum;
  for (const it of items) {
    r -= (it[weightKey] || 0);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function clamp(n, a = 0, b = 1) { return Math.max(a, Math.min(b, n)); }

// ------------------------ Recipe Selection (priority) ---------------------

/**
 * Get strategic recipe but enforce priority rules. Each instruction can include:
 * { type, probability, priority } where priority in ['low','normal','high'].
 * High priority instructions always run.
 */
function selectStrategicRecipe(fingerprint) {
  const primaryNeed = fingerprint.primaryNeed || 'default';
  const recipeFunction = STRATEGIC_RECIPES[primaryNeed] || STRATEGIC_RECIPES['default'];
  const recipe = recipeFunction(fingerprint.primaryEmotion?.intensity || 0, fingerprint.context || {});

  // Normalize: ensure each instruction has probability and priority
  return recipe.map(instr => ({
    type: instr.type,
    probability: typeof instr.probability === 'number' ? clamp(instr.probability, 0, 1) : 0.7,
    priority: instr.priority || 'normal',
    tags: instr.tags || []
  }));
}

// ------------------- Gather Template Generators (experts) -----------------

function gatherTemplateGenerators(topIntents = []) {
  const generators = {};
  // from intents
  for (const intent of topIntents) {
    const templates = intent.full_intent?.response_templates;
    const intentScore = intent.score || 0.1;
    if (!templates) continue;
    for (const type in templates) {
      if (!generators[type]) generators[type] = [];
      for (const t of templates[type]) {
        generators[type].push({ template: t, sourceScore: intentScore, source: intent.tag || intent.name || 'intent' });
      }
    }
  }
  // Add global defaults with low base score
  for (const type in RESPONSE_TEMPLATES) {
    if (!generators[type]) generators[type] = [];
    for (const t of RESPONSE_TEMPLATES[type]) {
      generators[type].push({ template: t, sourceScore: 0.05, source: 'default_kb' });
    }
  }
  return generators;
}

// -------------------- Template Selection & Multi-blend --------------------

/**
 * Choose 1 or 2 templates for a fragment type and blend them optionally.
 * Uses persona fragmentWeights and sourceScore to compute finalScore.
 */
function selectTemplatesForFragment(fragmentType, templateGenerators, persona, blend = true) {
  const pool = templateGenerators[fragmentType] || [];
  if (!pool.length) return [];

  // Score templates using persona fragmentWeights (default 1)
  const scored = pool.map(t => {
    const personaWeight = persona.fragmentWeights?.[fragmentType] ?? 1.0;
    const finalScore = (t.sourceScore || 0.05) * personaWeight;
    return { ...t, finalScore };
  });

  // Sort
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // Always pick top one. Optionally pick second for blending if high-scoring.
  const chosen = [scored[0]];
  if (blend && scored[1] && scored[1].finalScore >= 0.4 * scored[0].finalScore) {
    // probabilistic decision to blend based on relative score
    if (Math.random() < 0.5) chosen.push(scored[1]);
  }
  return chosen;
}

/**
 * Blend two template strings or functions into one text by simple concatenation/variation.
 * If both are functions, call both and join with " و ".
 */
function blendTemplates(templates, fingerprint, ctx) {
  if (templates.length === 0) return null;
  if (templates.length === 1) return renderFragment(templates[0].template, fingerprint, ctx);

  const first = renderFragment(templates[0].template, fingerprint, ctx);
  const second = renderFragment(templates[1].template, fingerprint, ctx);

  // Simple heuristics: if short, join with " و "; else keep as two sentences.
  if (first.length < 40 && second.length < 40) {
    return `${first} و ${second}`;
  }
  return `${first} ${second}`;
}

// ---------------------- Rendering & Placeholders --------------------------

/**
 * Render a fragment template (string or function). Supports placeholders:
 * {emotion}, {concept}, {last_need}, {trend}, {last_emotion}, {username}
 * Also supports function templates returning string or array (choose one).
 */
function renderFragment(template, fingerprint, context = {}) {
  let templateString;
  try {
    templateString = (typeof template === 'function') ? template(context) : template;
    // If template function returns array, choose one by randomness
    if (Array.isArray(templateString)) {
      templateString = templateString[Math.floor(Math.random() * templateString.length)];
    }
  } catch (err) {
    if (DEBUG) console.error('Error executing template function:', err);
    templateString = typeof template === 'string' ? template : '';
  }

  // placeholders
  const placeholders = {
    emotion: fingerprint.primaryEmotion?.type || 'مزيج من المشاعر',
    concept: fingerprint.concepts?.[0] || 'هذا الموقف',
    last_need: fingerprint.context?.last_need || '',
    trend: fingerprint.context?.emotion_trend || '',
    last_emotion: fingerprint.context?.last_emotion || '',
    username: fingerprint.context?.user_name || ''
  };

  let rendered = templateString;
  for (const ph in placeholders) {
    const re = new RegExp(`\\{${ph}\\}`, 'g');
    rendered = rendered.replace(re, placeholders[ph] || '');
  }

  // Clean double spaces
  rendered = rendered.replace(/\s{2,}/g, ' ').trim();

  return rendered;
}

// -------------------- Persona Styling & Format ----------------------------

/**
 * Apply persona profile style. Persona may define:
 * - styleFn (function)
 * - style: { opener, closer, tone }
 * - styleFunction fallback in STYLE_PROFILES
 */
function applyPersonaStyle(text, personaKey) {
  const persona = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES['the_listener'] || {};
  if (typeof persona.style === 'function') {
    try { return persona.style(text); } catch (e) { if (DEBUG) console.error(e); }
  }
  // If persona.style is an object
  if (persona.style && typeof persona.style === 'object') {
    const opener = persona.style.opener || '';
    const closer = persona.style.closer || '';
    return `${opener}${text}${closer}`.trim();
  }
  // fallback to STYLE_PROFILES 'default' or persona.styleFn
  const personaStyleFn = persona.styleFn || STYLE_PROFILES[personaKey] || STYLE_PROFILES['default'];
  try { return personaStyleFn(text); } catch (e) { if (DEBUG) console.error(e); return text; }
}

// ------------------------- Multi-stage Fallbacks -------------------------

/**
 * Multi-stage fallback builder:
 * level 1: clarification + validation
 * level 2: rephrase + empathy
 * level 3: apology + direct ask for clarification
 */
function fallbackByLevel(level, fingerprint) {
  if (level === 1) {
    return `${RECOVERY_STRATEGIES.low_confidence_fallback[0]} هل تقصد: "${fingerprint.originalMessage}"؟`;
  }
  if (level === 2) {
    return `أعتقد أنني لم أفهم تمامًا. ${RECOVERY_STRATEGIES.user_frustration_deescalation[0]}`;
  }
  // level 3
  return RECOVERY_STRATEGIES.user_frustration_deescalation[1];
}

// ---------------------- Self-evaluation & Regeneration -------------------

/**
 * Quick evaluator that checks coverage between recipe types and produced text.
 * Returns score between 0..1
 */
function selfEvaluateResponse(recipe, composedFragments, fingerprint) {
  if (!recipe || recipe.length === 0) return 0;
  if (!composedFragments || composedFragments.length === 0) return 0;

  // 1) coverage: how many instructed fragment types were produced?
  const producedTypes = composedFragments.map(cf => cf.type);
  const requiredTypes = recipe.map(r => r.type);
  const matched = requiredTypes.filter(t => producedTypes.includes(t)).length;
  const coverageScore = matched / requiredTypes.length;

  // 2) intensity alignment: if intensity high, ensure presence of empathetic / validation
  const intensity = fingerprint.primaryEmotion?.intensity || 0;
  let intensityScore = 1.0;
  if (intensity > 0.7) {
    const hasEmpathy = producedTypes.includes('empathetic_statement') || producedTypes.includes('validation');
    intensityScore = hasEmpathy ? 1.0 : 0.5;
  }

  // 3) novelty: penalize if fragments repeated identical text (very basic)
  const texts = composedFragments.map(cf => cf.text);
  const uniqueCount = new Set(texts).size;
  const noveltyScore = uniqueCount / texts.length;

  // final composite
  const finalScore = clamp(0.5 * coverageScore + 0.3 * intensityScore + 0.2 * noveltyScore, 0, 1);
  return parseFloat(finalScore.toFixed(2));
}

// --------------------------- Main Composer -------------------------------

/**
 * Compose an inferential response with regeneration loop (max 2 regenerations).
 */
export function composeInferentialResponse(fingerprint, topIntents = [], personaKey = 'the_listener') {
  // Quick recovery if stuck
  if (fingerprint.context?.is_stuck_in_loop) {
    const reply = RECOVERY_STRATEGIES.repetitive_loop_breaker[0];
    return { reply, source: 'recovery_loop_breaker', fingerprint };
  }

  const persona = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES['the_listener'] || { fragmentWeights: {}, styleFn: (t)=>t };

  const templateGenerators = gatherTemplateGenerators(topIntents);

  const recipe = selectStrategicRecipe(fingerprint);

  let attempts = 0;
  let finalPayload = null;
  const maxAttempts = 3; // original + 2 regenerations
  let fallbackLevel = 1;

  while (attempts < maxAttempts) {
    attempts++;

    const composedFragments = []; // { type, text }
    for (const instruction of recipe) {
      // force high priority fragments, else use probability
      if (instruction.priority === 'high' || Math.random() < instruction.probability) {
        // select templates (1 or 2)
        const chosenTemplates = selectTemplatesForFragment(instruction.type, templateGenerators, persona, true);
        if (chosenTemplates.length === 0) continue;

        const text = blendTemplates(chosenTemplates, fingerprint, { tags: instruction.tags || [] });
        if (!text) continue;
        composedFragments.push({ type: instruction.type, text });
      }
    }

    // If empty, use fallback for this attempt
    if (composedFragments.length === 0) {
      const reply = fallbackByLevel(fallbackLevel, fingerprint);
      finalPayload = { reply, source: `fallback_level_${fallbackLevel}`, fingerprint, eval: 0 };
      // escalate fallback level and maybe try again
      fallbackLevel++;
      if (attempts >= maxAttempts) break;
      else continue;
    }

    // Assemble reply
    let assembled = composedFragments.map(cf => cf.text).join(' ');
    // Apply persona stylistic touches
    assembled = applyPersonaStyle(assembled, personaKey);

    // Self-evaluate
    const evalScore = selfEvaluateResponse(recipe, composedFragments, fingerprint);

    if (DEBUG) {
      console.log('⚙️ Attempt', attempts, 'composedFragments:', composedFragments);
      console.log('⚙️ Evaluation score:', evalScore);
    }

    // If evaluation is acceptable (> threshold) or last attempt, accept; else regenerate
    const acceptThreshold = 0.6;
    if (evalScore >= acceptThreshold || attempts >= maxAttempts) {
      finalPayload = {
        reply: assembled,
        source: `composition_Ω.1:${personaKey}`,
        recipe: recipe.map(r => ({ type: r.type, priority: r.priority, prob: r.probability })),
        fingerprint,
        eval: evalScore,
        attempts
      };
      break;
    } else {
      // Try slight variation: nudge probabilities for next attempt (diversify)
      for (const r of recipe) {
        r.probability = clamp(r.probability * (0.8 + Math.random() * 0.4), 0.05, 1.0);
        // occasionally flip low-priority to high if repeated low evals
        if (attempts > 1 && Math.random() < 0.15) r.priority = 'high';
      }
      // continue loop to regenerate
    }
  }

  // Safety net
  if (!finalPayload) {
    const reply = RECOVERY_STRATEGIES.low_confidence_fallback[0];
    finalPayload = { reply, source: 'final_safety_fallback', fingerprint, eval: 0 };
  }

  if (DEBUG) console.log('🎯 Final Payload:', finalPayload);
  return finalPayload;
}
