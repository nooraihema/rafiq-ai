
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const SQL = await initSqlJs({ locateFile: file => `node_modules/sql.js/dist/${file}` });
const dbFile = path.join(process.cwd(), 'app_data.sqlite');
let db;

// لو القاعدة موجودة، افتحها، لو لا أنشئ جديدة
if (fs.existsSync(dbFile)) {
    const filebuffer = fs.readFileSync(dbFile);
    db = new SQL.Database(filebuffer);
} else {
    db = new SQL.Database();
}

// إنشاء جدول intents لو مش موجود
db.run(`
CREATE TABLE IF NOT EXISTS intents (
    intent_id TEXT PRIMARY KEY,
    phrase TEXT
)
`);

const intentsDir = path.join(process.cwd(), 'intents_mega_smart');

// دالة لإدخال بيانات من JSON
function importFile(filePath) {
    console.log(`بدء استيراد: ${filePath}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const stmt = db.prepare("INSERT OR REPLACE INTO intents VALUES (?, ?)");

    for (const item of data) {
        stmt.run([item.intent_id, item.phrase]);
    }
    stmt.free();
    console.log(`✅ انتهى استيراد: ${filePath}`);
}

// قراءة كل ملفات JSON في المجلد
fs.readdirSync(intentsDir)
  .filter(f => f.endsWith('.json'))
  .forEach(file => importFile(path.join(intentsDir, file)));

// حفظ القاعدة على ملف
fs.writeFileSync(dbFile, Buffer.from(db.export()));
console.log('🎉 كل ملفات intents_mega_smart تم تحويلها إلى SQLite!');


