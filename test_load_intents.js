
import fs from 'fs';
import path from 'path';

// المسار اللي بيقرأ منه التطبيق الافتراضي
const INTENTS_DIRS = [
  path.join(process.cwd(), 'intents_final')
];

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || "null");
  } catch(e) {
    console.error(`❌ Error reading ${filePath}: ${e.message}`);
    return null;
  }
}

console.log("🧪 بدء تشخيص runtime للـ intents ...");

INTENTS_DIRS.forEach(dir => {
  console.log(`🔍 التحقق من المسار: ${dir}`);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.warn(`⚠️ المسار غير موجود أو ليس مجلد: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  console.log('📂 ملفات JSON الموجودة:', files.join(', ') || 'لا يوجد');

  let totalIntents = 0;
  files.forEach(f => {
    const j = safeReadJson(path.join(dir, f));
    if (!j) return;
    const arr = Array.isArray(j.intents) ? j.intents : (Array.isArray(j) ? j : []);
    totalIntents += arr.length;
    console.log(`- Loaded ${arr.length} intents from ${f}`);
  });

  console.log(`📂 إجمالي intents محملة: ${totalIntents}`);
  if (totalIntents === 0) console.warn('⚠️ لا يوجد intents محملة، تحقق من المسارات وملفات intents_final.');
});

console.log("✅ تشخيص runtime اكتمل.");

