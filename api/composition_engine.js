// composition_engine.js vΩ - The Creative Lobe
// The ultimate engine for inferential, strategic, and empathetic response generation.
// It reads the fingerprint and the knowledge base to compose a unique response in real-time.

import { DEBUG } from './config.js';
import { 
    STRATEGIC_RECIPES, 
    RESPONSE_TEMPLATES, 
    PERSONA_PROFILES,
    FRAGMENT_STYLE_DEFAULTS,
    STYLE_PROFILES,
    RECOVERY_STRATEGIES
} from './knowledge_base.js';

/**
 * Selects the appropriate strategic recipe based on the fingerprint.
 * It uses the stateful, function-based recipes from the knowledge base.
 * @param {object} fingerprint - The psychological fingerprint from the perception engine.
 * @returns {Array<object>} The chosen recipe (an array of fragment instructions).
 */
function selectStrategicRecipe(fingerprint) {
    const { primaryNeed, primaryEmotion, context } = fingerprint;
    const recipeFunction = STRATEGIC_RECIPES[primaryNeed] || STRATEGIC_RECIPES['default'];
    
    // The recipe is now a function that takes context, allowing for stateful, adaptive strategies.
    const recipe = recipeFunction(primaryEmotion.intensity, context);
    if (DEBUG) console.log(`📝 Strategic Recipe Selected for '${primaryNeed}' (Intensity: ${primaryEmotion.intensity}):`, recipe);
    return recipe;
}

/**
 * Gathers all available, typed response templates from the top relevant intents ("experts").
 * This is different from the old fragments; these are dynamic template generators.
 * @param {Array<object>} topIntents - The list of top intents from the intent engine.
 * @returns {object} An object grouping templates by their type (e.g., { validation: [...], reframing: [...] }).
 */
function gatherTemplateGenerators(topIntents) {
    const generators = {};
    for (const intent of topIntents) {
        const templates = intent.full_intent?.response_templates; // We will add this to intents later
        if (templates) {
            for (const type in templates) {
                if (!generators[type]) generators[type] = [];
                // We add the function/template string AND the source intent's score
                generators[type].push(...templates[type].map(t => ({ template: t, score: intent.score })));
            }
        }
    }
    // Add default templates as a fallback
    for (const type in RESPONSE_TEMPLATES) {
        if (!generators[type]) generators[type] = [];
        generators[type].push(...RESPONSE_TEMPLATES[type].map(t => ({ template: t, score: 0.1 }))); // Low score for defaults
    }
    return generators;
}

/**
 * The core of the creative process. It selects the best template for a given fragment type,
 * considering persona weights and the scores of the source intents. (Implements User Idea #6)
 * @param {string} fragmentType - The type of fragment needed (e.g., 'validation').
 * @param {object} templateGenerators - All available templates grouped by type.
 * @param {object} persona - The active persona profile.
 * @returns {object|null} The best template object { template, score } or null.
 */
function selectBestTemplate(fragmentType, templateGenerators, persona) {
    const potentialTemplates = templateGenerators[fragmentType];
    if (!potentialTemplates || potentialTemplates.length === 0) return null;

    // Score each template based on a combination of source intent score and persona preference.
    const scoredTemplates = potentialTemplates.map(t => {
        const personaWeight = persona.fragmentWeights[fragmentType] || 1.0;
        const finalScore = t.score * personaWeight;
        return { ...t, finalScore };
    });

    // Sort by the highest final score and pick the best one.
    scoredTemplates.sort((a, b) => b.finalScore - a.finalScore);
    return scoredTemplates[0];
}

/**
 * Fills in the placeholders (e.g., {emotion}) in a template string with actual context.
 * (Implements User Idea #4)
 * @param {string|Function} template - The template string or function.
 * @param {object} fingerprint - The psychological fingerprint.
 * @param {object} context - Additional context for template generation.
 * @returns {string} The final, rendered text fragment.
 */
function renderFragment(template, fingerprint, context) {
    let templateString = typeof template === 'function' ? template(context) : template;
    
    // Replace placeholders with data from the fingerprint
    templateString = templateString.replace(/{emotion}/g, fingerprint.primaryEmotion.type);
    templateString = templateString.replace(/{concept}/g, fingerprint.concepts[0] || 'هذا الموقف');
    // Add more placeholder replacements here...
    
    return templateString;
}

/**
 * The main function of the Creative Lobe. It orchestrates the entire response generation
 * process, from strategic planning to final stylistic expression.
 *
 * @param {object} fingerprint - The psychological fingerprint from the perception engine.
 * @param {Array<object>} topIntents - The list of top relevant intents ("the experts").
 * @param {string} personaKey - The key for the desired AI persona (e.g., 'the_listener').
 * @returns {object} The final, composed response payload.
 */
export function composeInferentialResponse(fingerprint, topIntents, personaKey = 'the_listener') {
    //
    if (fingerprint.context.is_stuck_in_loop) {
        const reply = RECOVERY_STRATEGIES.repetitive_loop_breaker[0];
        return { reply, source: 'recovery_loop_breaker' };
    }

    // Step 1: Select the active persona.
    const persona = PERSONA_PROFILES[personaKey] || PERSONA_PROFILES['the_listener'];

    // Step 2: Determine the strategic recipe for this specific situation.
    const recipe = selectStrategicRecipe(fingerprint);

    // Step 3: Gather all available creative tools (template generators) from the experts.
    const templateGenerators = gatherTemplateGenerators(topIntents);

    // Step 4: Compose the response fragment by fragment, following the recipe.
    const composedFragments = [];
    for (const instruction of recipe) {
        if (Math.random() < instruction.probability) {
            // A. Select the best tool (template) for the job, guided by the persona.
            const bestTemplate = selectBestTemplate(instruction.type, templateGenerators, persona);
            if (bestTemplate) {
                // B. Use the tool to craft a piece of the response, filling it with context.
                const renderedText = renderFragment(bestTemplate.template, fingerprint, { tags: instruction.tags || [] });
                composedFragments.push(renderedText);
            }
        }
    }

    if (composedFragments.length === 0) {
        const reply = RECOVERY_STRATEGIES.low_confidence_fallback[0];
        return { reply, source: 'recovery_empty_composition' };
    }

    // Step 5: Assemble and apply the final stylistic touch, guided by the persona.
    let finalReply = composedFragments.join(' ');
    const styleFunction = persona.style || ((text) => text);
    finalReply = styleFunction(finalReply);
    
    if (DEBUG) console.log(`💬 Composed Inferential Reply (vΩ): "${finalReply}"`);

    return {
        reply: finalReply,
        source: `composition_Ω:${personaKey}`,
        recipe: recipe.map(r => r.type),
        fingerprint: fingerprint
    };
}
