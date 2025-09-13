
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./app_data.db');
const intentsDir = path.join(__dirname, 'intents_mega_smart');
const BATCH_SIZE = 100;

// إنشاء الجدول لو مش موجود
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS intents (
        intent_id TEXT PRIMARY KEY,
        phrase TEXT
    )`);
});

// دالة لاستيراد JSON ضخمة باستخدام streams
async function importJSON(filePath) {
    console.log(`بدء استيراد البيانات من ${filePath} ...`);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let batch = [];
    let count = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;
        const obj = JSON.parse(line); // لو كل سطر JSON منفصل
        batch.push([obj.intent_id, obj.phrase]);

        if (batch.length >= BATCH_SIZE) {
            const placeholders = batch.map(() => '(?, ?)').join(',');
            db.run(`INSERT OR REPLACE INTO intents (intent_id, phrase) VALUES ${placeholders}`, batch.flat());
            count += batch.length;
            console.log(`${count} عناصر تم استيرادها من ${filePath}`);
            batch = [];
        }
    }

    if (batch.length > 0) {
        const placeholders = batch.map(() => '(?, ?)').join(',');
        db.run(`INSERT OR REPLACE INTO intents (intent_id, phrase) VALUES ${placeholders}`, batch.flat());
        count += batch.length;
        console.log(`${count} عناصر تم استيرادها من ${filePath} (النهائية)`);
    }

    console.log(`✅ تم الانتهاء من استيراد ${filePath}\n`);
}

// تنفيذ الاستيراد لكل الملفات في المجلد
(async () => {
    const files = fs.readdirSync(intentsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
        await importJSON(path.join(intentsDir, file));
    }
    db.close();
    console.log('🎉 كل ملفات intents_mega_smart تم تحويلها إلى SQLite بنجاح!');
})();
