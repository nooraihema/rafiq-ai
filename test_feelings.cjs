

// test_feelings_cjs.js
const intentEngine = require("./api/intent_engine.js");

// الرسالة اللي عايزين نختبرها
const testMessage = "أنا حزين ومضايق النهاردة";

// تابع لتشخيص الـ intents
function testIntent(message) {
  const normMsg = intentEngine.normalizeArabic(message);
  const tokens = intentEngine.tokenize(normMsg);

  console.log("Normalized message:", normMsg);
  console.log("Tokens:", tokens);

  const candidates = intentEngine.getTopIntents(tokens);
  console.log("=== Candidate intents ===");
  candidates.forEach(c => {
    console.log(`Tag: ${c.tag}, Score: ${c.score.toFixed(4)}, Matched Terms: ${c.matchedTerms}`);
  });

  if (candidates.length === 0 || candidates[0].score < 0.08) {
    console.log("Fallback triggered");
  } else {
    console.log("Selected intent:", candidates[0].tag);
    console.log("Responses:", candidates[0].responses);
  }
}

// شغّل الاختبار
testIntent(testMessage);


