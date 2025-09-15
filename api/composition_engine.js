// composition_engine.js vΩ.1 - The Creative Lobe (Enhanced & Fixed)
// Implements: priority-aware recipes, diagnostic flags influence, multi-fragment blending,
// memory-aware rendering, persona-style profiles, multi-stage fallbacks, and self-evaluation loop.
//
// Assumes exports from knowledge_base.js:
// STRATEGIC_RECIPES (object of functions), RESPONSE_TEMPLATES (map), PERSONA_PROFILES (map),
// STYLE_PROFILES (map), RECOVERY_STRATEGIES (map)
//
// Also assumes topIntents have shape: [{ score, full_intent: { response_templates: {type: [templates...]}, composition_fragments: [...] } }, ...]
//
// Usage:
//   const payload = composeInferentialResponse(fingerprint, topIntents, 'the_listener');
//   payload => { reply, source, recipe, fingerprint, eval }

import { DEBUG } from './config.js';
// ===== بداية الإصلاح =====
import {
  STRATEGIC_RECIPES,
  RESPONSE_TEMPLATES,
  PERSONA_PROFILES,
  // FRAGMENT_STYLE_DEFAULTS, // <-- This was the incorrect export name. It's not needed.
  STYLE_PROFILES,
  RECOVERY_STRATEGIES
} from './knowledge_base.js'; // NOTE: Ensure this path points to your vΩ.1 knowledge base file
// ===== نهاية الإصلاح =====

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

function selectStrategicRecipe(fingerprint) {
  // Compatibility fix: Use `chosenPrimaryNeed` from the new fingerprint structure
  const primaryNeed = fingerprint.chosenPrimaryNeed || 'default';
  const recipeFunction = STRATEGIC_RECIPES[primaryNeed] || STRATEGIC_RECIPES['default'];
  // Compatibility fix: Pass the correct intensity and context objects
  const recipe = recipeFunction(fingerprint.intensity || 0, fingerprint.context || {});

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
    const templateFnOrArray = RESPONSE_TEMPLATES[type];
    // Ensure we handle both functions and arrays correctly from the knowledge base
    const templatesArray = typeof templateFnOrArray === 'function' ? templateFnOrArray({}) : (Array.isArray(templateFnOrArray) ? templateFnOrArray : []);
    for (const t of templatesArray) {
      generators[type].push({ template: t, sourceScore: 0.05, source: 'default_kb' });
    }
  }
  return generators;
}

// -------------------- Template Selection & Multi-blend --------------------

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

function renderFragment(template, fingerprint, context = {}) {
  let templateString;
  try {
    templateString = (typeof template === 'function') ? template(context) : template;
    // If template function returns array, choose one by randomness
    if (Array.isArray(templateString)) {
      // Safety check for empty array from template function
      if (templateString.length === 0) return '';
      templateString = templateString[Math.floor(Math.random() * templateString.length)];
    }
  } catch (err) {
    if (DEBUG) console.error('Error executing template function:', err);
    templateString = typeof template === 'string' ? template : '';
  }

  // placeholders
  const placeholders = {
    emotion: fingerprint.primaryEmotion?.type || 'مزيج من المشاعر',
    concept: fingerprint.concepts?.[0]?.concept || 'هذا الموقف', // Compatibility fix
    last_need: fingerprint.context?.last_needs?.slice(-1)[0] || '',
    trend: fingerprint.diagnostics?.trend || 'مستقر',
    last_emotion: fingerprint.context?.last_emotions?.[0] || '', // Assuming from context
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

function fallbackByLevel(level, fingerprint) {
  if (level === 1) {
    return `${RECOVERY_STRATEGIES.low_confidence_fallback[0] || 'لم أفهم تمامًا.'} هل تقصد: "${fingerprint.originalMessage}"؟`;
  }
  if (level === 2) {
    return `أعتقد أنني لم أفهم تمامًا. ${RECOVERY_STRATEGIES.user_frustration_deescalation[0] || 'أنا آسف.'}`;
  }
  // level 3
  return RECOVERY_STRATEGIES.user_frustration_deescalation[1] || 'كيف يمكنني المساعدة بشكل أفضل؟';
}

// ---------------------- Self-evaluation & Regeneration -------------------

function selfEvaluateResponse(recipe, composedFragments, fingerprint) {
  if (!recipe || recipe.length === 0) return 0;
  if (!composedFragments || composedFragments.length === 0) return 0;

  // 1) coverage: how many instructed fragment types were produced?
  const producedTypes = composedFragments.map(cf => cf.type);
  const requiredTypes = recipe.map(r => r.type);
  const matched = requiredTypes.filter(t => producedTypes.includes(t)).length;
  const coverageScore = requiredTypes.length > 0 ? matched / requiredTypes.length : 0;

  // 2) intensity alignment: if intensity high, ensure presence of empathetic / validation
  const intensity = fingerprint.intensity || 0;
  let intensityScore = 1.0;
  if (intensity > 0.7) {
    const hasEmpathy = producedTypes.includes('empathetic_statement') || producedTypes.includes('validation');
    intensityScore = hasEmpathy ? 1.0 : 0.5;
  }

  // 3) novelty: penalize if fragments repeated identical text (very basic)
  const texts = composedFragments.map(cf => cf.text);
  const uniqueCount = new Set(texts).size;
  const noveltyScore = texts.length > 0 ? uniqueCount / texts.length : 1;

  // final composite
  const finalScore = clamp(0.5 * coverageScore + 0.3 * intensityScore + 0.2 * noveltyScore, 0, 1);
  return parseFloat(finalScore.toFixed(2));
}

// --------------------------- Main Composer -------------------------------

export function composeInferentialResponse(fingerprint, topIntents = [], personaKey = 'the_listener') {
  // Quick recovery if stuck
  if (fingerprint.diagnostics?.loopDetected) {
    const reply = RECOVERY_STRATEGIES.repetitive_loop_breaker[0] || 'يبدو أننا نكرر نفس النقطة.';
    return { reply, source: 'recovery_loop_breaker', fingerprint, eval: 0, attempts: 0 };
  }

  const persona = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES['the_listener'] || { fragmentWeights: {}, styleFn: (t)=>t };

  const templateGenerators = gatherTemplateGenerators(topIntents);

  let recipe = selectStrategicRecipe(fingerprint);

  let attempts = 0;
  let finalPayload = null;
  const maxAttempts = 3;
  let fallbackLevel = 1;

  while (attempts < maxAttempts) {
    attempts++;

    const composedFragments = [];
    for (const instruction of recipe) {
      if (instruction.priority === 'high' || Math.random() < instruction.probability) {
        const chosenTemplates = selectTemplatesForFragment(instruction.type, templateGenerators, persona, true);
        if (chosenTemplates.length === 0) continue;

        const text = blendTemplates(chosenTemplates, fingerprint, { tags: instruction.tags || [] });
        if (!text) continue;
        composedFragments.push({ type: instruction.type, text });
      }
    }

    if (composedFragments.length === 0) {
      const reply = fallbackByLevel(fallbackLevel, fingerprint);
      finalPayload = { reply, source: `fallback_level_${fallbackLevel}`, fingerprint, eval: 0 };
      fallbackLevel++;
      if (attempts >= maxAttempts) break;
      else continue;
    }

    let assembled = composedFragments.map(cf => cf.text).join(' ');
    assembled = applyPersonaStyle(assembled, personaKey);

    const evalScore = selfEvaluateResponse(recipe, composedFragments, fingerprint);

    if (DEBUG) {
      console.log('⚙️ Attempt', attempts, 'composedFragments:', composedFragments);
      console.log('⚙️ Evaluation score:', evalScore);
    }

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
      // Regenerate with a slightly different recipe
      for (const r of recipe) {
        r.probability = clamp(r.probability * (0.8 + Math.random() * 0.4), 0.05, 1.0);
        if (attempts > 1 && Math.random() < 0.15) r.priority = 'high';
      }
    }
  }

  if (!finalPayload) {
    const reply = RECOVERY_STRATEGIES.low_confidence_fallback[0] || 'لم أفهم تمامًا.';
    finalPayload = { reply, source: 'final_safety_fallback', fingerprint, eval: 0 };
  }

  if (DEBUG) console.log('🎯 Final Payload:', finalPayload);
  return finalPayload;
}
