
// Usage: node fix_intents_final.js
// Place this file in your repo root and run with Node.js (Termux compatible, ES module)

import fs from 'fs';
import path from 'path';

// Simple Arabic normalization
function normalizeArabic(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u064B-\u0652]/g, '') // Remove diacritics
    .replace(/[\u0640]/g, '') // Tatweel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'ء')
    .replace(/ئ/g, 'ء')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// English normalization
function normalizeEnglish(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toLowerCase()
    .trim();
}

// Load synonyms if present
let synonyms = {};
try {
  const synPath = path.join(process.cwd(), 'synonyms.json');
  if (fs.existsSync(synPath)) {
    synonyms = JSON.parse(fs.readFileSync(synPath, 'utf8'));
  }
} catch (e) {
  console.error('Error loading synonyms.json:', e.message);
}

function expandWithSynonyms(word) {
  const normWord = normalizeArabic(word);
  for (const group in synonyms) {
    if (Array.isArray(synonyms[group]) && synonyms[group].includes(normWord)) {
      return Array.from(new Set([normWord, ...synonyms[group]]));
    }
    if (group === normWord) return [normWord, ...synonyms[group]];
  }
  return [normWord];
}

const intentsDir = path.join(process.cwd(), 'intents_final');
if (!fs.existsSync(intentsDir)) {
  console.error('❌ intents_final directory not found!');
  process.exit(1);
}

fs.readdirSync(intentsDir).forEach(file => {
  if (!file.endsWith('.json')) return;
  const fullPath = path.join(intentsDir, file);
  let intents = [];
  try {
    intents = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (!Array.isArray(intents)) {
      console.warn(`⚠️ File ${file} does not contain an array of intents`);
      return;
    }
  } catch (e) {
    console.error(`❌ Error parsing ${file}:`, e.message);
    return;
  }

  let changed = false;

  intents = intents.map(intent => {
    // Normalize tag
    if (intent.tag) intent.tag = normalizeArabic(intent.tag);

    // Normalize keywords
    if (Array.isArray(intent.keywords)) {
      intent.keywords = intent.keywords.flatMap(kw => {
        if (typeof kw !== 'string') kw = '';
        let arr = [];
        arr = arr.concat(expandWithSynonyms(kw));
        arr = arr.concat([normalizeEnglish(kw)]);
        return Array.from(new Set(arr));
      });
      changed = true;
    }

    // Normalize patterns
    if (Array.isArray(intent.patterns)) {
      intent.patterns = intent.patterns.map(pat => normalizeArabic(pat));
      changed = true;
    }

    // Ensure at least one response
    if (!Array.isArray(intent.responses) || intent.responses.length === 0) {
      intent.responses = ["أنا أسمعك..."];
      changed = true;
    }

    // Ensure unique tag
    if (!intent.tag) intent.tag = "intent_" + Math.random().toString(36).slice(2);

    return intent;
  });

  if (changed) {
    fs.writeFileSync(fullPath, JSON.stringify(intents, null, 2), 'utf8');
    console.log(`✔ Processed ${file}`);
  } else {
    console.log(`- No changes for ${file}`);
  }
});

console.log('✅ Intents normalization complete!');


