// composition_engine.js vΩ.1 - The Creative Lobe (Enhanced & Fixed)
// Implements: priority-aware recipes, diagnostic flags influence, multi-fragment blending,
// memory-aware rendering, persona-style profiles, multi-stage fallbacks, and self-evaluation loop.

import { DEBUG } from './config.js';
// ===== بداية الإصلاح =====
import {
  STRATEGIC_RECIPES,
  RESPONSE_TEMPLATES,
  PERSONA_PROFILES,
  // FRAGMENT_STYLE_DEFAULTS, // This was already removed.
  // STYLE_PROFILES, // This specific name is not exported directly from your vΩ1 knowledge base
  RECOVERY_STRATEGIES
  // All other necessary functions and constants are exported from knowledge_base_vΩ1.js
  // and will be used as needed.
} from './knowledge_base_vΩ1.js'; // Ensure the file name is correct
// ===== نهاية الإصلاح =====

// NOTE: Since your knowledge_base_vΩ1.js also exports functions like applyPersonaStyle,
// we will assume they are available and might not need to be rewritten here.
// For clarity, I will keep the local function and assume it uses the exported data.

// ----------------------------- Utilities ---------------------------------

function weightedRandomChoice(items, weightKey = 'finalScore') {
  const sum = items.reduce((s, it) => s + (it[weightKey] || 0), 0);
  if (sum === 0) return items.length ? items[Math.floor(Math.random() * items.length)] : null;
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
  const primaryNeed = fingerprint.chosenPrimaryNeed || 'default';
  const recipeFunction = STRATEGIC_RECIPES[primaryNeed] || STRATEGIC_RECIPES['default'];
  const recipe = recipeFunction(fingerprint.intensity || 0, fingerprint.context || {}, fingerprint);

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
  // from intents (hypothetical structure)
  for (const intent of topIntents) {
    const templates = intent.full_intent?.response_templates;
    const intentScore = intent.score || 0.1;
    if (!templates) continue;
    for (const type in templates) {
      if (!generators[type]) generators[type] = [];
      const templatesArray = typeof templates[type] === 'function' ? templates[type]({}) : templates[type];
      for (const t of templatesArray) {
        generators[type].push({ template: t, sourceScore: intentScore, source: intent.tag || 'intent' });
      }
    }
  }
  // from knowledge base
  for (const type in RESPONSE_TEMPLATES) {
    if (!generators[type]) generators[type] = [];
    const templateFnOrArray = RESPONSE_TEMPLATES[type];
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

  const scored = pool.map(t => {
    const personaWeight = persona.fragmentWeights?.[fragmentType] ?? 1.0;
    const finalScore = (t.sourceScore || 0.05) * personaWeight;
    return { ...t, finalScore };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);

  const chosen = [scored[0]];
  if (blend && scored[1] && scored[1].finalScore >= 0.4 * scored[0].finalScore) {
    if (Math.random() < 0.5) chosen.push(scored[1]);
  }
  return chosen;
}

function blendTemplates(templates, fingerprint, ctx) {
  if (templates.length === 0) return null;
  if (templates.length === 1) return renderFragment(templates[0].template, fingerprint, ctx);

  const first = renderFragment(templates[0].template, fingerprint, ctx);
  const second = renderFragment(templates[1].template, fingerprint, ctx);

  if (first.length < 40 && second.length < 40) {
    return `${first} و${second}`;
  }
  return `${first}. ${second}`;
}

// ---------------------- Rendering & Placeholders --------------------------

function renderFragment(template, fingerprint, context = {}) {
    let templateString;
    const ctx = {
        ...context,
        fingerprint,
        username: fingerprint.context?.user_name || '',
        emotion: fingerprint.primaryEmotion?.type || 'مشاعرك',
        concept: fingerprint.concepts?.[0]?.concept || 'هذا الأمر',
    };

    try {
        if (typeof template === 'function') {
            const variants = template(ctx);
            templateString = Array.isArray(variants) && variants.length > 0 ? variants[Math.floor(Math.random() * variants.length)] : '';
        } else {
            templateString = String(template || '');
        }
    } catch (err) {
        if (DEBUG) console.error('Error executing template function:', err);
        templateString = '';
    }

    for (const ph in ctx) {
        const re = new RegExp(`\\{${ph}\\}`, 'g');
        templateString = templateString.replace(re, ctx[ph] || '');
    }

    return templateString.replace(/\s{2,}/g, ' ').trim();
}


// -------------------- Persona Styling & Format ----------------------------

function applyPersonaStyle(text, personaKey, ctx) {
    const persona = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES["the_listener"];
    let out = text;
    try {
        if (persona.style) {
            out = persona.style(out, ctx);
        }
    } catch (err) {
        if (DEBUG) console.error(err);
    }
    if (ctx.showOpener && persona.opener) out = `${persona.opener} ${out}`;
    if (ctx.showCloser && persona.closer) out = `${out} ${persona.closer}`;
    return out;
}

// ------------------------- Multi-stage Fallbacks -------------------------

function fallbackByLevel(level, fingerprint) {
  const msg = fingerprint.originalMessage || '';
  if (level === 1) {
    const fallbackText = RECOVERY_STRATEGIES.low_confidence_fallback[0] || 'لم أفهم تمامًا.';
    return `${fallbackText} هل تقصد شيئًا بخصوص "${msg.slice(0, 20)}..."؟`;
  }
  if (level === 2) {
    return RECOVERY_STRATEGIES.user_frustration_deescalation[0] || 'أنا آسف، يبدو أنني أواجه صعوبة.';
  }
  return RECOVERY_STRATEGIES.user_frustration_deescalation[1] || 'كيف يمكنني مساعدتك بشكل أفضل؟';
}

// ---------------------- Self-evaluation & Regeneration -------------------

function selfEvaluateResponse(recipe, composedFragments, fingerprint) {
    if (!recipe || recipe.length === 0) return 0;
    if (composedFragments.length === 0) return 0;
    const producedTypes = new Set(composedFragments.map(cf => cf.type));
    const requiredTypes = new Set(recipe.map(r => r.type));
    const matched = [...requiredTypes].filter(t => producedTypes.has(t)).length;
    const coverageScore = requiredTypes.size > 0 ? matched / requiredTypes.size : 1;
    const intensity = fingerprint.intensity || 0;
    let intensityScore = 1.0;
    if (intensity > 0.7 && !producedTypes.has('empathetic_statement') && !producedTypes.has('validation')) {
        intensityScore = 0.5;
    }
    const finalScore = clamp(0.7 * coverageScore + 0.3 * intensityScore, 0, 1);
    return parseFloat(finalScore.toFixed(2));
}

// --------------------------- Main Composer -------------------------------

export function composeInferentialResponse(fingerprint, topIntents = [], personaKey = 'the_listener') {
  if (fingerprint.diagnostics?.loopDetected) {
    const reply = RECOVERY_STRATEGIES.repetitive_loop_breaker[0] || 'يبدو أننا نكرر نفس النقطة.';
    return { reply, source: 'recovery_loop_breaker', fingerprint };
  }

  const persona = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES['the_listener'];
  const templateGenerators = gatherTemplateGenerators(topIntents);
  let recipe = selectStrategicRecipe(fingerprint);

  let attempts = 0;
  let finalPayload = null;
  const maxAttempts = 2;
  let fallbackLevel = 1;

  while (attempts < maxAttempts) {
    attempts++;
    const composedFragments = [];
    for (const instruction of recipe) {
      if (instruction.priority === 'high' || Math.random() < instruction.probability) {
        const chosenTemplates = selectTemplatesForFragment(instruction.type, templateGenerators, persona, true);
        if (chosenTemplates.length > 0) {
          const text = blendTemplates(chosenTemplates, fingerprint, { tags: instruction.tags || [] });
          if (text) composedFragments.push({ type: instruction.type, text });
        }
      }
    }

    if (composedFragments.length === 0) {
      if (attempts >= maxAttempts) {
          finalPayload = { reply: fallbackByLevel(fallbackLevel, fingerprint), source: `fallback_level_${fallbackLevel}`, fingerprint, eval: 0 };
      }
      fallbackLevel++;
      continue;
    }

    let assembled = composedFragments.map(cf => cf.text).join(' ');
    assembled = applyPersonaStyle(assembled, personaKey, {
        showOpener: fingerprint.context?.history?.length === 0, // example context usage
        showCloser: false
    });

    const evalScore = selfEvaluateResponse(recipe, composedFragments, fingerprint);

    if (DEBUG) {
        console.log(`⚙️ Attempt ${attempts}: eval=${evalScore}, fragments=${composedFragments.map(f=>f.type).join(',')}`);
    }

    if (evalScore >= 0.6 || attempts >= maxAttempts) {
      finalPayload = {
        reply: assembled,
        source: `composition_Ω.1:${personaKey}`,
        recipe: recipe.map(r => r.type),
        fingerprint,
        eval: evalScore,
        attempts
      };
      break;
    }
  }

  if (!finalPayload) {
    finalPayload = { reply: fallbackByLevel(fallbackLevel, fingerprint), source: 'final_safety_fallback', fingerprint, eval: 0 };
  }

  if (DEBUG) console.log('🎯 Final Payload:', finalPayload.reply);
  return finalPayload;
}
