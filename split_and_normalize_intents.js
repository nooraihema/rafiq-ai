
// Usage: node split_and_normalize_intents.js
// Place in repo root, run with Node.js (Termux compatible)

import fs from 'fs';
import path from 'path';

const intentsDir = path.join(process.cwd(), 'intents_final');
const splitDir = path.join(process.cwd(), 'split_intents');

if (!fs.existsSync(splitDir)) fs.mkdirSync(splitDir);

// Normalization functions
function normalizeArabic(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[\u0640]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function normalizeEnglish(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().trim();
}

// Load synonyms if exists
let synonyms = {};
try {
  synonyms = JSON.parse(fs.readFileSync('synonyms.json', 'utf8'));
} catch(e) {}

function expandWithSynonyms(word) {
  const normWord = normalizeArabic(word);
  for (const group in synonyms) {
    if (synonyms[group].includes(normWord) || group === normWord) {
      return Array.from(new Set([normWord, ...synonyms[group]]));
    }
  }
  return [normWord];
}

// Process each intent file
fs.readdirSync(intentsDir).forEach(file => {
  if (!file.endsWith('.json')) return;
  const fullPath = path.join(intentsDir, file);
  let intents = [];
  try {
    intents = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch(e) {
    console.error(`Error parsing ${file}: ${e.message}`);
    return;
  }

  intents.forEach((intent, index) => {
    // Normalize tag
    if (intent.tag) intent.tag = normalizeArabic(intent.tag);
    else intent.tag = "intent_" + Math.random().toString(36).slice(2);

    // Normalize keywords
    if (Array.isArray(intent.keywords)) {
      intent.keywords = intent.keywords.flatMap(kw => {
        return Array.from(new Set([...expandWithSynonyms(kw), normalizeEnglish(kw)]));
      });
    }

    // Normalize patterns
    if (Array.isArray(intent.patterns)) {
      intent.patterns = intent.patterns.map(pat => normalizeArabic(pat));
    }

    // Ensure at least one response
    if (!Array.isArray(intent.responses) || intent.responses.length === 0) {
      intent.responses = ["أنا أسمعك..."];
    }

    // Write each intent to separate file
    const outFile = path.join(splitDir, `${intent.tag}_${index}.json`);
    fs.writeFileSync(outFile, JSON.stringify(intent, null, 2), 'utf8');
  });

  console.log(`✔ Processed ${file}, split into ${intents.length} intents`);
});

console.log('✅ All intents normalized and split successfully!');
