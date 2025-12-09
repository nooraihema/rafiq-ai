// Updated orchestrator: sanitize DNA and humanize rendered text to avoid leaking concept IDs.
const { render } = require('./template_renderer');
const { humanizeText, sanitizeDNA } = require('./render_helpers');

// Configurable thresholds
const QUALITY_THRESHOLD = 0.6;

function generateResponse(template, context, options = {}) {
  // If DNA present, sanitize it before use
  if (options.dna) {
    options.dna = sanitizeDNA(options.dna);
  }

  // Render once
  const result = render(template, context, options);

  // Debug logging
  console.debug('Rendering debug', {
    template,
    placeholders: result.placeholders,
    missing: result.missing,
    contextSnapshot: redactedContext(context),
    dna: options.dna,
  });

  if (result.missing.length > 0) {
    console.warn('Missing placeholders detected:', result.missing);
  }

  const qualityScore = options.qualityScore ?? 1.0;

  // If quality too low, use fallback template
  if (qualityScore < QUALITY_THRESHOLD) {
    console.info('Low quality score detected:', qualityScore, '- using fallback template.');
    const fallback = options.fallbackTemplate || 'أنا هنا معك. لو تحب، احكيلنا أكثر عن اللي بتحسّه.';
    const fallbackRender = render(fallback, context, options);
    // Humanize fallback as well
    const humanizedFallback = humanizeText(fallbackRender.rendered, options.labelsMap || context.labelsMap);
    return {
      text: humanizedFallback,
      usedFallback: true,
      debug: { qualityScore, original: result },
    };
  }

  // Post-process the rendered text: replace concept IDs with human labels (if provided)
  const labelsMap = options.labelsMap || context.labelsMap || {};
  let finalText = humanizeText(result.rendered, labelsMap);

  // If no labelsMap provided but we still detect tokens like 'depression_symptom', log warning
  if (finalText.match(/\b[a-z_]{3,}\b/) && Object.keys(labelsMap).length === 0) {
    // crude detection: many concept ids are lowercase with underscores
    console.warn('Rendered text may contain raw concept IDs but no labelsMap was provided.');
  }

  return { text: finalText, usedFallback: false, debug: { qualityScore, renderInfo: result } };
}

function redactedContext(ctx) {
  const copy = {};
  for (const k of Object.keys(ctx || {})) {
    const v = ctx[k];
    if (k.toLowerCase().includes('token') || k.toLowerCase().includes('password')) {
      copy[k] = '[REDACTED]';
    } else if (typeof v === 'string' && v.length > 200) {
      copy[k] = v.slice(0, 200) + '...';
    } else {
      copy[k] = v;
    }
  }
  return copy;
}

module.exports = { generateResponse };