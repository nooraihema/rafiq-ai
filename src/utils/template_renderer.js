const DEFAULT_FALLBACK = '[غير متوفر]';

function extractPlaceholders(template) {
  // matches {name} placeholders (adjust regex to your template format)
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  const placeholders = new Set();
  let m;
  while ((m = re.exec(template)) !== null) {
    placeholders.add(m[1]);
  }
  return Array.from(placeholders);
}

function safeStringify(value) {
  if (value === null || value === undefined) return DEFAULT_FALLBACK;
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch (e) { return DEFAULT_FALLBACK; }
  }
  return String(value);
}

/**
 * Render a template with a context. Will:
 * - detect missing placeholders and return list of missing keys
 * - avoid inserting raw 0 for missing values
 * - allow a fallbacks map for specific placeholder names
 */
function render(template, context = {}, options = {}) {
  const placeholders = extractPlaceholders(template);
  const missing = [];
  const fallbacks = options.fallbacks || {};

  // Build a sanitized context copy
  const sanitized = {};
  for (const key of placeholders) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      let val = context[key];
      // If we expect text but got number zero by mistake, try common alternative keys:
      if (val === 0 && context[`${key}_str`]) {
        val = context[`${key}_str`];
      }
      sanitized[key] = safeStringify(val);
    } else if (fallbacks[key]) {
      sanitized[key] = safeStringify(fallbacks[key]);
    } else {
      sanitized[key] = DEFAULT_FALLBACK;
      missing.push(key);
    }
  }

  const rendered = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => sanitized[k] ?? DEFAULT_FALLBACK);

  return { rendered, placeholders, missing, contextUsed: context };
}

module.exports = { render, extractPlaceholders, safeStringify };