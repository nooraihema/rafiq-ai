
// test_index.js
import { buildIndexSync, getTopIntents } from "./api/intent_engine.js";

console.log("🧪 بدء اختبار buildIndexSync ...");

// إعادة بناء الفهرس
const ok = buildIndexSync();
if (!ok) {
  console.log("📂 buildIndexSync رجع: فشل التحميل");
} else {
  console.log("📂 buildIndexSync رجع: نجاح ✅");
}

// اختبار البحث عن كلمة الحزن
const query = "الحزن";
const results = getTopIntents(query);

console.log(`🔍 نتيجة getTopIntents('${query}'):`, results);


