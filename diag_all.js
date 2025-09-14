import fs from 'fs';
import path from 'path';

const base = path.join(process.env.HOME || process.cwd(), 'mybot/rafiq-ai');
const intentsDir = path.join(base, 'intents_final');

function safeReadJson(fp) {
  try {
    const txt = fs.readFileSync(fp, 'utf8');
    return JSON.parse(txt || 'null');
  } catch (e) {
    return { __error: e.message };
  }
}

console.log('🧪 Diagnostic start');
console.log('📁 Base path:', base);
console.log('🔍 intents_final path:', intentsDir);

if (!fs.existsSync(intentsDir) || !fs.statSync(intentsDir).isDirectory()) {
  console.error('❌ intents_final folder not found or not a directory.');
  process.exit(1);
}

const files = fs.readdirSync(intentsDir).filter(f => f.endsWith('.json'));
if (files.length === 0) {
  console.error('❌ No .json files found inside intents_final.');
  process.exit(1);
}

console.log('📂 JSON files found:');
files.forEach(f => {
  const p = path.join(intentsDir, f);
  const stat = fs.statSync(p);
  console.log(` - ${f}  (size: ${stat.size} bytes)`);
});

let all = [];
for (const f of files) {
  const p = path.join(intentsDir, f);
  const parsed = safeReadJson(p);
  if (parsed && parsed.__error) {
    console.warn(`⚠️ Failed to parse ${f}:`, parsed.__error);
    continue;
  }
  // possible shapes: array, { intents: [...] }, { someKey: { ... } }
  if (Array.isArray(parsed)) {
    all = all.concat(parsed);
  } else if (parsed && Array.isArray(parsed.intents)) {
    all = all.concat(parsed.intents);
  } else {
    // try to collect objects that look like intents (have tag or patterns/responses)
    const found = [];
    for (const k of Object.keys(parsed || {})) {
      const v = parsed[k];
      if (v && (v.tag || v.patterns || v.responses)) {
        found.push(v);
      }
    }
    if (found.length) {
      all = all.concat(found);
    } else {
      // if file has keys but not intents, show top-level keys (for debugging)
      console.log(`ℹ️ File ${f} top-level keys:`, Object.keys(parsed || {}).slice(0,20));
    }
  }
}

console.log('📊 Total intents discovered (after heuristics):', all.length);

if (all.length === 0) {
  console.error('❌ No intents parsed — possible unexpected JSON shape. Paste content of one file (small) for inspection.');
  process.exit(0);
}

// choose first intent that looks valid (has tag or patterns or responses)
const first = all.find(it => it && (it.tag || it.patterns || it.responses)) || all[0];

console.log('\n📌 FIRST intent (raw):');
console.log(JSON.stringify(first, null, 2));

// Normalize and print cleaned view:
function normalizeResponses(arr) {
  if (!arr) return [];
  return arr.map(r => {
    if (typeof r === 'string') return r;
    if (r === null || r === undefined) return String(r);
    if (typeof r === 'object') {
      if (typeof r.text === 'string') return r.text;
      // try common keys
      const keys = ['text','reply','message','response'];
      for (const k of keys) if (typeof r[k] === 'string') return r[k];
      // fallback to JSON short
      try { return JSON.stringify(r).slice(0,200); } catch(e) { return String(r); }
    }
    return String(r);
  });
}

console.log('\n🔎 Cleaned summary of the first intent:');
console.log(' tag:', first.tag || '(no tag)');
console.log(' patterns:', (first.patterns || first.pattern || []).slice(0,10));
const cleaned = normalizeResponses(first.responses || first.response || []);
console.log(' responses (cleaned sample up to 10):', cleaned.slice(0,10));
console.log(' responses stored as object? ', (first.responses && first.responses.some(r => typeof r === "object")) ? 'yes' : 'no');

// print sample of 5 intents (tag + patterns[0..2] + responses[0..2])
console.log('\n📋 Sample 5 intents:');
all.slice(0,5).forEach((it, idx) => {
  const tag = it.tag || it.intent || `(no-tag-${idx})`;
  const pats = (it.patterns || it.pattern || []).slice(0,3);
  const res = normalizeResponses(it.responses || it.response || []).slice(0,3);
  console.log(`\n${idx+1}) tag: ${tag}`);
  console.log('   patterns:', pats.length ? pats : '(none)');
  console.log('   responses:', res.length ? res : '(none)');
});

// quick grep: list intents that contain the word "sad" or "guilt" or Arabic 'حزن'
const terms = ['sad','guilt','depress','anx','حزن','حزين'];
console.log('\n🔎 Searching common terms in patterns/responses (case-insensitive):');
const matches = [];
all.forEach(it => {
  const tag = it.tag || it.intent || '(no-tag)';
  const hay = JSON.stringify(it).toLowerCase();
  for (const t of terms) {
    if (hay.includes(t)) {
      matches.push({ tag, term: t });
      break;
    }
  }
});
if (matches.length) {
  console.log(' matches found (sample up to 20):');
  matches.slice(0,20).forEach(m => console.log(' -', m.tag, 'contains', m.term));
} else {
  console.log(' none of those terms found in parsed intents.');
}

console.log('\n✅ Diagnostic finished. Paste the output here so I can read it and give the next exact fix.');
