const { render } = require('../src/utils/template_renderer');

function testMissingKey() {
  const tpl = "حاسس إن {emotion_name} واخد مساحة جواك.";
  const ctx = { emotion_score: 1 }; // missing emotion_name
  const { rendered, missing } = render(tpl, ctx);
  if (!(missing.length > 0)) throw new Error('should detect missing key');
  console.log('testMissingKey ok:', rendered);
}

function testNumberInsteadOfName() {
  const tpl = "حاسس إن {emotion_name} واخد مساحة.";
  const ctx = { emotion_name: 0, emotion_name_str: 'الحزن' }; // emulate mis-typed value
  const { rendered } = render(tpl, ctx);
  if (!rendered.includes('الحزن')) throw new Error('fallback mapping not applied');
  console.log('testNumberInsteadOfName ok:', rendered);
}

function runAll() {
  testMissingKey();
  testNumberInsteadOfName();
  console.log('all tests passed');
}

runAll();
