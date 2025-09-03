
// 🟢 تخزين الذاكرة
let shortTermMemory = [];
let learnedResponses = {};
let knowledgeBase = {};

// 🟢 تحميل قاعدة المعرفة (knowledge.txt)
async function loadKnowledge() {
  try {
    const res = await fetch("knowledge.txt");
    const text = await res.text();
    const lines = text.split("\n");
    lines.forEach((line) => {
      if (line.includes("|")) {
        const [keyword, a] = line.split("|").map((s) => s.trim());
        if (keyword && a) knowledgeBase[keyword] = a;
      }
    });
    console.log("✅ Knowledge Loaded:", knowledgeBase);
  } catch (err) {
    console.error("❌ خطأ في تحميل قاعدة المعرفة:", err);
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

// 🟢 البحث عن أفضل رد (كلمات مفتاحية)
function findBestResponse(message) {
  const simplified = simplify(message);

  // 🔍 البحث عن أي كلمة مفتاحية داخل الرسالة
  for (const keyword in knowledgeBase) {
    if (simplified.includes(simplify(keyword))) {
      return knowledgeBase[keyword];
    }
  }

  // 🔁 fallback: تحليل عاطفي
  const mood = detectMood(simplified);
  const tone = detectTone(simplified);
  const intent = detectIntent(simplified);

  return `لسه بتعلم 🤍 حاسه إنك (${mood}, ${tone}, ${intent}).. كمل معايا أكتر.`;
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

// 🟢 إرسال رسالة
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
  addMessage("💜 أهلاً بيك، أنا نور وجاهزة أسمعك!", "noor");
  shortTermMemory = [];
  localStorage.removeItem("shortTermMemory");
}

// 🟢 تحميل البيانات عند البدء
window.onload = () => {
  loadKnowledge();
  shortTermMemory = JSON.parse(localStorage.getItem("shortTermMemory") || "[]");
  learnedResponses = JSON.parse(localStorage.getItem("learnedResponses") || "{}");
  clearChat();
};
