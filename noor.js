
// 🟢 تخزين الذاكرة
let shortTermMemory = [];
let learnedResponses = {};
let knowledgeBase = {};

// 🟢 تحميل قاعدة المعرفة
async function loadKnowledge() {
  try {
    const res = await fetch("knowledge.txt");
    const text = await res.text();
    const lines = text.split("\n");
    lines.forEach((line) => {
      if (line.includes("|")) {
        const [q, a] = line.split("|").map((s) => s.trim());
        if (q && a) knowledgeBase[q] = a;
      }
    });
  } catch (err) {
    console.error("خطأ في تحميل قاعدة المعرفة:", err);
  }
}

// 🟢 تحديث الذاكرة القصيرة
function updateMemory(userMessage, noorResponse) {
  shortTermMemory.push({ user: userMessage, noor: noorResponse });
  if (shortTermMemory.length > 10) shortTermMemory.shift();
  localStorage.setItem("shortTermMemory", JSON.stringify(shortTermMemory));
}

// 🟢 تطبيع النص العربي
function normalizeArabic(text) {
  return text
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[إأٱآا]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .replace(/ة/g, "ه");
}

// 🟢 تبسيط النص
function simplify(text) {
  return normalizeArabic(
    text.toLowerCase().replace(/[^\u0600-\u06FF\w\s]/g, "").trim()
  );
}

// 🟢 Levenshtein Distance
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;

  const dp = Array.from(Array(m + 1), () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// 🟢 كشف المزاج
function detectMood(text) {
  const moods = {
    فرح: ["مبسوط", "سعيد", "تمام", "حلو", "فرحان"],
    حزن: ["زعلان", "حزين", "مكتئب", "بعيط", "مكسور"],
    غضب: ["متضايق", "غاضب", "عصبى", "مقهور"],
    حب: ["بحبك", "مشتاق", "وحشتني", "عايزك"],
    خوف: ["خايف", "قلقان", "مرعوب", "متوتر"],
    شك: ["شاكك", "مش واثق", "هيسيبني"],
  };
  for (const mood in moods) {
    if (moods[mood].some((w) => text.includes(w))) return mood;
  }
  return "محايد";
}

// 🟢 كشف النغمة
function detectTone(text) {
  if (/[!؟?!]/.test(text)) return "متحمس";
  if (/شكرا|تسلم|ربنا يخليك/.test(text)) return "ممتن";
  if (/ليه|لماذا/.test(text)) return "فضولي";
  return "عادي";
}

// 🟢 كشف النية
function detectIntent(text) {
  if (/ازايك|عامل ايه|اخبارك/.test(text)) return "تحية";
  if (/بحبك|وحشتني|مشتاق/.test(text)) return "حب";
  if (/زعلان|حزين|مخنوق/.test(text)) return "فضفضة";
  if (/انصحني|اعمل ايه/.test(text)) return "استشارة";
  return "غير محدد";
}

// 🟢 البحث عن أفضل رد
function findBestResponse(message) {
  const simplified = simplify(message);

  if (knowledgeBase[simplified]) return knowledgeBase[simplified];
  if (learnedResponses[simplified]) return learnedResponses[simplified];

  let bestMatch = null;
  let minDist = Infinity;
  for (const key in knowledgeBase) {
    const dist = levenshteinDistance(simplified, simplify(key));
    if (dist < minDist) {
      minDist = dist;
      bestMatch = key;
    }
  }
  if (bestMatch && minDist <= 3) return knowledgeBase[bestMatch];

  const mood = detectMood(simplified);
  const tone = detectTone(simplified);
  const intent = detectIntent(simplified);

  return `أنا سامعاك 🙏 حاسه إنك (${mood}, ${tone}, ${intent}).. كمل معايا أكتر.`;
}

// 🟢 إضافة رسالة للواجهة
function addMessage(content, sender) {
  const chatBox = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = sender === "user" ? "message user" : "message noor";
  div.innerText = content;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🟢 نطق صوتي
function speak(text) {
  const utter = new SpeechSynthesisUtterance(
    text.replace(/[^\u0600-\u06FF\s]/g, "")
  );
  utter.lang = "ar-SA";
  speechSynthesis.speak(utter);
}

// 🟢 إرسال رسالة (مرتبطة بزر الإرسال)
function handleUserMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");
  const reply = findBestResponse(message);
  addMessage(reply, "noor");
  updateMemory(message, reply);
  speak(reply);

  input.value = "";
}

// 🟢 مسح المحادثة
function clearChat() {
  document.getElementById("chat-box").innerHTML = "";
  localStorage.removeItem("shortTermMemory");
}

// 🟢 تعليم نور
function teachNoor(q, a) {
  learnedResponses[simplify(q)] = a;
  localStorage.setItem("learnedResponses", JSON.stringify(learnedResponses));
  alert("تم تعليم نور رد جديد ✅");
}

// 🟢 تحميل البيانات عند البدء
window.onload = () => {
  loadKnowledge();
  shortTermMemory = JSON.parse(localStorage.getItem("shortTermMemory") || "[]");
  learnedResponses = JSON.parse(localStorage.getItem("learnedResponses") || "{}");
};
