// Simple test for humanization post-process
const { humanizeText, sanitizeDNA } = require('../src/utils/render_helpers');

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `${a} !== ${b}`);
}

function testHumanizeText() {
  const text = "حاسس إن depression_symptom واخد مساحة جواك.";
  const labels = { depression_symptom: 'الاكتئاب' };
  const out = humanizeText(text, labels);
  assertEqual(out.includes('الاكتئاب'), true, 'should replace concept id with Arabic label');
  console.log('testHumanizeText ok:', out);
}

function testSanitizeDNA() {
  const dna = { name: NaN, warmth: '0.85', rhythm: null, politeness: 'foo' };
  const s = sanitizeDNA(dna);
  // name must be fallback string
  if (typeof s.name !== 'string' || s.name.length === 0) throw new Error('dna.name fallback failed');
  // warmth must be numeric
  if (typeof s.warmth !== 'number' || !Number.isFinite(s.warmth)) throw new Error('dna.warmth not numeric');
  console.log('testSanitizeDNA ok:', s);
}

function runAll() {
  testHumanizeText();
  testSanitizeDNA();
  console.log('all postprocess tests passed');
}

runAll();