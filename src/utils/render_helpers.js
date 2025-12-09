// Helpers: humanize rendered text (replace concept IDs with labels) and sanitize DNA blend.
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\]/g, '\\$&');
}

/**
 * Replace concept identifiers in `text` with provided human labels.
 * labelsMap: { "depression_symptom": "الاكتئاب", ... }
 */
function humanizeText(text, labelsMap = {}) {
  if (!text || typeof text !== 'string') return text;
  if (!labelsMap || typeof labelsMap !== 'object') return text;

  let out = text;
  for (const key of Object.keys(labelsMap)) {
    const label = labelsMap[key];
    if (!label) continue;
    const re = new RegExp('\b' + escapeRegExp(key) + '\b', 'g');
    out = out.replace(re, label);
  }
  return out;
}

/**
 * Ensure DNA object has sane types and fallback defaults.
 * - name: string (fallback 'neutral')
 * - numeric fields: coerce to Number, fallback to defaults
 */
function sanitizeDNA(dna = {}) {
  const defaults = {
    name: 'neutral',
    warmth: 0.6,
    rhythm: 0.5,
    abstraction: 0.5,
    lexicalDensity: 0.5,
    directness: 0.5,
    imageryScore: 0.5,
    politeness: 0.9,
  };

  const sanitized = {};
  sanitized.name = (typeof dna.name === 'string' && dna.name.trim()) ? dna.name : defaults.name;

  const numericKeys = ['warmth', 'rhythm', 'abstraction', 'lexicalDensity', 'directness', 'imageryScore', 'politeness'];
  for (const k of numericKeys) {
    const v = dna[k];
    const n = Number(v);
    sanitized[k] = Number.isFinite(n) ? n : defaults[k];
  }

  return sanitized;
}

module.exports = { humanizeText, sanitizeDNA };