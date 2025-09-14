
// test_match.js
import { buildIndexSync, getTopIntents } from "./api/intent_engine.js";

const input = process.argv[2] || "أشعر بالحزن الشديد اليوم";

console.log("🔍 Testing input:", input);

// 1) بناء الـ index
const success = buildIndexSync();
console.log("📂 Index build success?", success);

// 2) جلب أفضل المرشحين
const results = getTopIntents(input, 5);

console.log("🎯 Top candidates:");
if (!results || results.length === 0) {
  console.log("⚠️ No intents matched this input.");
} else {
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.tag} (score: ${r.score.toFixed(3)})`);
  });
}

