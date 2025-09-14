// ~/mybot/rafiq-ai/test_one_tag.js
import { buildIndexSync, tagToIdx } from "./api/intent_engine.js";

console.log("🧪 بدء اختبار طباعة تاج واحد ...");
buildIndexSync();

const allTags = Object.keys(tagToIdx);
if (allTags.length > 0) {
  console.log("📌 أول تاج كامل:", allTags[0]);
} else {
  console.log("⚠️ مفيش أي tags متخزنة.");
}
