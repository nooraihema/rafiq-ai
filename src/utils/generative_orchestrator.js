const { render } = require('./template_renderer');

// Configurable thresholds
const QUALITY_THRESHOLD = 0.6;

function generateResponse(template, context, options = {}) {
  // Render once
  const result = render(template, context, options);
  // Log debugging info (ensure logger redacts sensitive info in production)
  console.debug('Rendering debug', {
    template,
    placeholders: result.placeholders,
    missing: result.missing,
    contextSnapshot: redactedContext(context),
  });

  // If missing keys found, mark quality lower by convention or trigger alternative flow
  if (result.missing.length > 0) {
    console.warn('Missing placeholders detected:', result.missing);
  }

  // Example: options.qualityScore provided by upstream pipeline
  const qualityScore = options.qualityScore ?? 1.0;

  // If quality too low, use fallback templates
  if (qualityScore < QUALITY_THRESHOLD) {
    console.info('Low quality score detected:', qualityScore, '- using fallback template.');
    const fallback = options.fallbackTemplate || 'أنا هنا معك. لو تحب، احكيلنا أكثر عن اللي بتحسّه.';
    const fallbackRender = render(fallback, context, options);
    return {
      text: fallbackRender.rendered,
      usedFallback: true,
      debug: { qualityScore, original: result },
    };
  }

  return { text: result.rendered, usedFallback: false, debug: { qualityScore, renderInfo: result } };
}

function redactedContext(ctx) {
  // Keep basic keys for debugging but avoid secrets
  const copy = {};
  for (const k of Object.keys(ctx)) {
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