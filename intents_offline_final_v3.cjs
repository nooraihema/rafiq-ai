
// intents_offline_final_v4.cjs
// نسخة محسّنة بالكامل: Embeddings لكل intent/pattern/response, follow-up, تعلم ذاتي, offline
const fs = require('fs');
const path = require('path');

const INTENTS_DIR = './intents_mega_smart';
const OUTPUT_DIR = './intents_final';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// توليد embedding dummy محلي (offline بالكامل)
function generateEmbedding(text) {
  if (typeof text !== 'string') text = String(text || '');
  return Array(64).fill(0).map((_, i) => (text.charCodeAt(i % text.length) % 100) / 100);
}

// تحسين intent وإضافة كل الميزات الذكية
function enhanceIntent(intent) {
  const coreConcept = intent.core_concept || '';
  const patternsText = Array.isArray(intent.patterns) ? intent.patterns.join(' ') : '';
  const combinedText = coreConcept + ' ' + patternsText;

  intent.nlu = intent.nlu || {};
  intent.nlu.embedding_vector = generateEmbedding(combinedText);

  // توليد embeddings لكل pattern
  intent.patterns_embedding = Array.isArray(intent.patterns)
    ? intent.patterns.map(p => generateEmbedding(p))
    : [];

  // توليد embeddings لكل response template
  intent.responses = intent.responses || { templates: [], rotation: 'round_robin', adaptive: true };
  intent.responses_embedding = Array.isArray(intent.responses.templates)
    ? intent.responses.templates.map(r => generateEmbedding(r))
    : [];

  // تحسينات الذكاء
  intent.metadata = intent.metadata || {
    created_at: new Date().toISOString().split('T')[0],
    last_updated: new Date().toISOString().split('T')[0],
    learned_from_users: []
  };
  intent.emotion = intent.emotion || { type: 'neutral', intensity: 0.2 };
  intent.context = intent.context || { triggers: {}, suggests: [] };
  intent.layers = intent.layers || { L1: [], L2: [], L3: [] };

  // follow-up questions تلقائية لكل pattern
  intent.follow_up_questions = Array.isArray(intent.patterns)
    ? intent.patterns.map(p => `ممكن تحكيلي أكثر عن "${p}"؟`)
    : [];
}

// تسجيل جملة جديدة من المستخدم للتعلم الذاتي
function learnFromUser(intent, userText) {
  if (!intent.metadata.learned_from_users.includes(userText)) {
    intent.metadata.learned_from_users.push(userText);
  }
}

function processIntents() {
  const files = fs.readdirSync(INTENTS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    console.log('Processing:', file);
    const filePath = path.join(INTENTS_DIR, file);
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`❌ Error parsing ${file}:`, err);
      continue;
    }

    if (!Array.isArray(data)) {
      console.warn(`⚠️ Skipping ${file} because it's not an array of intents`);
      continue;
    }

    for (const intent of data) {
      enhanceIntent(intent);
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, file), JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ Saved final intent:', file);
  }
}

processIntents();
console.log('🎯 All intents processed offline with advanced intelligence!');


