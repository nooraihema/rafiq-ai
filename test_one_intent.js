
import fs from "fs";
import path from "path";

// تحميل ملف intents_final
const intentsPath = path.join(process.env.HOME, "mybot/rafiq-ai/intents_final");
let allIntents = [];

// نقرأ كل ملفات JSON في المجلد
fs.readdirSync(intentsPath).forEach(file => {
  if (file.endsWith(".json")) {
    const filePath = path.join(intentsPath, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    allIntents = allIntents.concat(data.intents || []);
  }
});

console.log("📂 Total intents loaded:", allIntents.length);

// لو فيه intents نطبع أول واحد
if (allIntents.length > 0) {
  const firstIntent = allIntents[0];
  console.log("📌 أول Intent كامل:\n");

  console.log(JSON.stringify(firstIntent, null, 2));

  // نطبع الردود بشكل أوضح
  if (firstIntent.responses) {
    console.log("\n💬 الردود:");
    firstIntent.responses.forEach((r, i) => {
      if (typeof r === "string") {
        console.log(`- ${r}`);
      } else if (typeof r === "object" && r.text) {
        console.log(`- ${r.text}`);
      } else {
        console.log(`- (⚠️ غير معروف):`, r);
      }
    });
  }
}

