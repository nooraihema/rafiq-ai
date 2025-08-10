
let knowledge = [];
let learnedResponses = {}; // التخزين: { "مفتاح مبسط": "الرد" }
let lastUserMessage = "";
let lastNoorResponse = "";
let shortTermMemory = []; // array of {user, noor}
const memoryLimit = 8;
let longTermMemory = [];

// ------------------ تحميل / حفظ الـ localStorage ------------------
function loadLearnedResponses() {
  try {
    const saved = localStorage.getItem('learnedResponses');
    if (saved) learnedResponses = JSON.parse(saved);

    const memorySaved = localStorage.getItem('longTermMemory');
    if (memorySaved) longTermMemory = JSON.parse(memorySaved);
  } catch (e) {
    console.warn("خطأ في تحميل البيانات من localStorage:", e);
  }
}

function saveLearnedResponses() {
  try {
    localStorage.setItem('learnedResponses', JSON.stringify(learnedResponses));
    localStorage.setItem('longTermMemory', JSON.stringify(longTermMemory));
  } catch (e) {
    console.warn("خطأ في حفظ البيانات للـ localStorage:", e);
  }
}

// ------------------ تحميل knowledge.txt ------------------
async function loadKnowledge() {
  try {
    const response = await fetch('knowledge.txt?t=' + new Date().getTime());
    if (!response.ok) throw new Error("فشل تحميل knowledge.txt");
    const text = await response.text();
    const entries = text.split(/\n\s*\n+/); // فصل على بلوكات فارغة
    knowledge = entries.map(entry => {
      const kw = entry.match(/\[كلمات مفتاحية:\s*(.+?)\]/i);
      const resp = entry.match(/رد:\s*([\s\S]+)/i);
      if (kw && resp) {
        const keywords = kw[1].split(/،|\s*,\s*/).map(k => normalizeArabic(k.trim())).filter(Boolean);
        const responseText = resp[1].trim();
        return { keywords, response: responseText };
      }
      return null;
    }).filter(Boolean);
  } catch (err) {
    console.warn("لم أستطع تحميل knowledge.txt:", err);
    knowledge = [];
  }
}

// ------------------ توحيد النص العربي ------------------
function normalizeArabic(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "") // إزالة التشكيل
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-zA-Z\s]/g, " ") // استبدال علامات بعلاقة بمسافة
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(.)\1{2,}/g, "$1$1"); // السماح بتكرار مرتين كحد أقصى
}

// ------------------ تبسيط الرسالة ------------------
function simplifyMessage(message) {
  const stopwords = ["انا","أنا","مش","بس","كل","في","على","من","ما","مع","ايه","إيه","ليه","هو","هي","ده","دي","انت","إنت","أنا"];
  const norm = normalizeArabic(message).toLowerCase();
  const words = norm.split(/\s+/).filter(w => w && !stopwords.includes(w));
  return words.join(" ");
}

// ------------------ Levenshtein distance ------------------
function levenshteinDistance(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// ------------------ مطابقة تقريبية ------------------
function fuzzyMatch(messageWords, keyword) {
  if (!keyword) return false;
  const key = normalizeArabic(keyword);
  const threshold = Math.max(1, Math.round(key.length * 0.25));
  for (const w of messageWords) {
    if (!w) continue;
    const word = normalizeArabic(w);
    if (word === key) return true;
    if (word.includes(key) || key.includes(word)) return true;
    const dist = levenshteinDistance(word, key);
    if (dist <= threshold) return true;
  }
  return false;
}

// ------------------ دوال التحليل (مزاج/نبرة/حاجة/نية) ------------------
function detectMood(message) {
  const moodKeywords = {
    "حزن": ["حزين","بعيط","مكسور","تايه","زعلان","مكسر","مكسور"],
    "فرح": ["فرحان","مبسوط","سعيد","ضحك","مبسوطة"],
    "قلق": ["قلقان","توتر","خايف","مخنوق","مش مرتاح"],
    "وحدة": ["لوحدي","وحيد","مفيش حد","وحده"],
    "حب": ["بحبك","مشتاق","عشق","قلبى"],
    "غضب": ["زعلان","متضايق","عصبي","مخنوق"]
  };
  const norm = normalizeArabic(message).toLowerCase();
  for (const mood in moodKeywords) {
    if (moodKeywords[mood].some(k => norm.includes(k))) return mood;
  }
  return "غير محدد";
}

function detectTone(message) {
  const toneKeywords = {
    "سخرية": ["آه أكيد","واو","عظمة بجد","طبعًا"],
    "رومانسية": ["يا حبيبي","نور عيني","مشتاق","حبيبي"],
    "استغاثة": ["الحقيني","ساعديني","مش قادر","بننهار"],
    "لوم": ["ليه عملت كده","إنت السبب","زعلتني","عتاب"]
  };
  const norm = normalizeArabic(message).toLowerCase();
  for (const tone in toneKeywords) {
    if (toneKeywords[tone].some(k => norm.includes(k))) return tone;
  }
  return "عادي";
}

function detectNeed(message) {
  const needKeywords = {
    "احتواء": ["حضن","الطبطبة","طبطب","يحضني","يلمّني"],
    "أمان": ["خايف","مرعوب","مش مطمّن","خوف"],
    "إنصات": ["اسمعني","مش لاقي حد يسمعني","اسمعوني"],
    "حب": ["بحبك","محتاج حب","محتاج حد يحبني"]
  };
  const norm = normalizeArabic(message).toLowerCase();
  for (const need in needKeywords) {
    if (needKeywords[need].some(k => norm.includes(k))) return need;
  }
  return "غير محدد";
}

function detectIntent(message) {
  const intentKeywords = {
    "اعتذار": ["آسف","حقك عليا","سامحيني"],
    "طلب دعم": ["شجعيني","اديني أمل","طمنييني"],
    "فضفضة": ["هحكيلك","أحكيلك","حابب أفضفض"]
  };
  const norm = normalizeArabic(message).toLowerCase();
  for (const intent in intentKeywords) {
    if (intentKeywords[intent].some(k => norm.includes(k))) return intent;
  }
  return null;
}

// ------------------ تذكّر من الذاكرة الطويلة ------------------
function recallFromMemory(mood) {
  if (!mood || mood === "غير محدد") return null;
  const past = longTermMemory.slice().reverse().find(mem => mem.mood === mood);
  if (past) return `لسه فاكرة لما قلتلي: "${past.summary}"… بحس بيك وبفتكر كل حاجة 💭`;
  return null;
}

// ------------------ البحث عن أفضل رد ------------------
function findBestResponse(userMessage) {
  const simplified = simplifyMessage(userMessage);
  const words = simplified.split(/\s+/).filter(Boolean);
  const contextText = shortTermMemory.map(s => s.user).join(" ") + " " + userMessage;
  const contextWords = simplifyMessage(contextText).split(/\s+/).filter(Boolean);

  // 1) knowledge أولًا (أولوية)
  let bestMatch = null;
  let highestScore = 0;
  for (const entry of knowledge) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (fuzzyMatch(words, kw) || fuzzyMatch(contextWords, kw)) score += 1;
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }
  if (bestMatch && highestScore > 0) {
    return bestMatch.response;
  }

  // 2) الردود المتعلمة (learnedResponses)
  for (const key in learnedResponses) {
    const keyWords = key.split(/\s+/).filter(Boolean);
    if (fuzzyMatch(words, key) || fuzzyMatch(keyWords, simplified.split(/\s+/))) {
      return learnedResponses[key];
    }
  }

  // 3) الذاكرة القصيرة (محادثات سابقة)
  for (let i = shortTermMemory.length - 1; i >= 0; i--) {
    const item = shortTermMemory[i];
    if (simplifyMessage(item.user) === simplified) return item.noor;
  }

  // 4) fallback ذكي بناءً على مزاج/نبرة/حاجة/نية
  const mood = detectMood(userMessage);
  const tone = detectTone(userMessage);
  const need = detectNeed(userMessage);
  const intent = detectIntent(userMessage);

  let fallback = recallFromMemory(mood) || "قولّي أكتر يا روحي... أنا سامعاك ♥";

  if (intent === "اعتذار") fallback = "ولا يهمك… نور قلبك دايمًا مفتوح ♥";
  else if (intent === "طلب دعم") fallback = "أنا معاك… خطوة بخطوة، وعمري ما هسيبك 💪";
  else if (intent === "فضفضة") fallback = "احكيلي كل حاجة، أنا سامعاك ومش هقاطعك أبدًا 💬";
  else if (need === "احتواء") fallback = "تعالى حضني… أنا هنا أطبطب على قلبك 💜";
  else if (need === "أمان") fallback = "أنا معااك… ومش هسيبك تحس بالخوف لوحدك 💫";

  if (tone === "سخرية") fallback = "عارفة إنك مش بتتكلم بجد… بس أنا هنا معاك بردو 💔";
  else if (tone === "رومانسية") fallback = "كلامك بيخليني أذوب… بحبك أوي 💋";

  return fallback;
}

// ------------------ تحديث الذاكرة بعد كل رسالة ------------------
function updateMemory(userMessage, noorResponse) {
  shortTermMemory.push({ user: userMessage, noor: noorResponse });
  if (shortTermMemory.length > memoryLimit) shortTermMemory.shift();

  const mood = detectMood(userMessage);
  if (mood !== "غير محدد" || longTermMemory.length % 6 === 0) {
    longTermMemory.push({ date: new Date().toISOString(), summary: userMessage, mood });
    if (longTermMemory.length > 50) longTermMemory.shift();
    saveLearnedResponses();
  }
}

// ------------------ تعليم نور (من المستخدم) ------------------
function teachNoor() {
  const lastUser = lastUserMessage || [...document.querySelectorAll('.message.user')].pop()?.textContent;
  if (!lastUser) return alert("مفيش رسالة أخيرة أتعلم منها دلوقتي.");
  const reply = prompt(`🧠 اكتب الرد اللي تحب نور تقوله لما تسمع: "${lastUser}"`);
  if (reply) {
    const key = simplifyMessage(lastUser);
    learnedResponses[key] = reply;
    saveLearnedResponses();
    const keywords = key.split(" ").filter(w => w.length > 1).slice(0, 6).join("، ");
    const entryText = `[كلمات مفتاحية: ${keywords}]\nرد: ${reply}\n\n`;
    if (confirm("هل تريد نسخ الاقتراح لحفظه يدويًا في knowledge.txt؟\n(سأنسخه للحافظة)")) {
      navigator.clipboard?.writeText(entryText).then(() => alert("✅ تم نسخ الاقتراح للحافظة، الصقه في knowledge.txt"), () => alert("✅ تم حفظ الرد محليًا (لم يتم نسخ الاقتراح)"));
    } else {
      alert("✅ تم تعليم نور الرد (محليًا فقط).");
    }
  }
}

// ------------------ واجهة المستخدم: إرسال/عرض الرسائل ------------------
function addMessage(text, sender) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return console.warn("لا يوجد chat-box في الصفحة.");
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  messageDiv.textContent = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (sender === 'noor') speak(text);
}

function clearChat() {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;
  chatBox.innerHTML = '<div class="message noor">مرحبًا بك في رفيق الروح 💜</div>';
  speak("أهلاً بيك يا روحي، نور هنا معاك… قولي كل اللي في قلبك 💜");
}

// ------------------ نطق النص (SpeechSynthesis) ------------------
function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/❤️|💜|💋|💔|♥️|😍|✨|🔥/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-EG';
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = synth.getVoices();
    const arabicVoices = voices.filter(v => v.lang && v.lang.startsWith('ar'));
    if (arabicVoices.length) utterance.voice = arabicVoices[0];

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => synth.speak(utterance);
      return;
    }
    synth.cancel();
    synth.speak(utterance);
  } catch (e) {
    console.warn("مشغل الصوت فيه مشكلة:", e);
  }
}

// ------------------ التعامل مع إرسال المستخدم ------------------
async function handleUserMessage() {
  const userInput = document.getElementById('user-input');
  if (!userInput) return alert("عنصر الإدخال غير موجود.");
  const message = userInput.value.trim();
  if (!message) return;
  addMessage(message, 'user');
  userInput.value = '';
  lastUserMessage = message;

  if (knowledge.length === 0) await loadKnowledge();
  const response = findBestResponse(message);
  addMessage(response, 'noor');

  lastNoorResponse = response;
  updateMemory(message, response);

  if (response.includes("قولّي أكتر") || response.includes("قولي اكتر")) {
    showTeachButton();
  }
}

function showTeachButton() {
  const controls = document.querySelector('.controls');
  if (!controls) return;
  if (!document.getElementById('teach-btn')) {
    const teachButton = document.createElement('button');
    teachButton.id = 'teach-btn';
    teachButton.textContent = "✨ علّم نور ردًا على رسالتك";
    teachButton.onclick = teachNoor;
    controls.appendChild(teachButton);
  }
}

// ------------------ تسجيل Service Worker وتهيئة ------------------
window.onload = () => {
  loadLearnedResponses();
  loadKnowledge();
  clearChat();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log("✅ Service Worker مسجّل"))
      .catch(err => console.warn("❌ Service Worker فشل:", err));
  }

  const input = document.getElementById('user-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUserMessage();
    });
  }
};
    
