
let knowledge = [];
let learnedResponses = {}; // الردود المتعلمة من المستخدم
let lastUserMessage = "";
let shortTermMemory = [];
const memoryLimit = 8;
let longTermMemory = [];

// تحميل الردود المتعلمة والذاكرة من localStorage
function loadLearnedResponses() {
  try {
    const saved = localStorage.getItem('learnedResponses');
    if (saved) learnedResponses = JSON.parse(saved);

    const savedLongTerm = localStorage.getItem('longTermMemory');
    if (savedLongTerm) longTermMemory = JSON.parse(savedLongTerm);
  } catch (e) {
    console.warn("خطأ في تحميل البيانات من localStorage:", e);
  }
}

// حفظ الردود المتعلمة والذاكرة في localStorage
function saveLearnedResponses() {
  try {
    localStorage.setItem('learnedResponses', JSON.stringify(learnedResponses));
    localStorage.setItem('longTermMemory', JSON.stringify(longTermMemory));
  } catch (e) {
    console.warn("خطأ في حفظ البيانات للـ localStorage:", e);
  }
}

// تحميل knowledge.txt (قاعدة المعرفة)
async function loadKnowledge() {
  try {
    const response = await fetch('knowledge.txt?t=' + Date.now());
    if (!response.ok) throw new Error("فشل تحميل knowledge.txt");
    const text = await response.text();
    const entries = text.split(/\n\s*\n+/);
    knowledge = entries.map(entry => {
      const kwMatch = entry.match(/كلمات مفتاحية:\s*([^\n]+)/i);
      const respMatch = entry.match(/رد:\s*([\s\S]+)/i);
      if (kwMatch && respMatch) {
        const keywords = kwMatch[1].split(/،|\s*,\s*/).map(k => normalizeArabic(k.trim())).filter(Boolean);
        const responseText = respMatch[1].trim();
        return { keywords, response: responseText };
      }
      return null;
    }).filter(Boolean);
  } catch (err) {
    console.warn("لم أستطع تحميل knowledge.txt:", err);
    knowledge = [];
  }
}

// توحيد النص العربي (تطبيع)
function normalizeArabic(text) {
  if (!text) return "";
  return text.toString()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "") // إزالة التشكيل
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-zA-Z\s]/g, " ") // استبدال الرموز بمسافة
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(.)\1{2,}/g, "$1$1"); // السماح لتكرار مرتين فقط
}

// تبسيط الرسالة (إزالة كلمات التوقف + تطبيع)
function simplifyMessage(message) {
  const stopwords = ["انا","أنا","مش","بس","كل","في","على","من","ما","مع","ايه","إيه","ليه","هو","هي","ده","دي","انت","إنت","أنا"];
  const norm = normalizeArabic(message).toLowerCase();
  const words = norm.split(/\s+/).filter(w => w && !stopwords.includes(w));
  return words.join(" ");
}

// حساب المسافة الليفنشتاين بين كلمتين (لمطابقة تقريبية)
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

// مطابقة تقريبية بين كلمات الرسالة والكلمات المفتاحية
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

// العثور على أفضل رد
function findBestResponse(userMessage) {
  const simplified = simplifyMessage(userMessage);
  const words = simplified.split(/\s+/).filter(Boolean);

  // أولًا: البحث في knowledge
  let bestMatch = null;
  let highestScore = 0;
  for (const entry of knowledge) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (fuzzyMatch(words, kw)) score += 1;
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }
  if (bestMatch && highestScore > 0) return bestMatch.response;

  // ثانيًا: البحث في الردود المتعلمة
  for (const key in learnedResponses) {
    if (fuzzyMatch(words, key.split(/\s+/))) return learnedResponses[key];
  }

  // ثالثًا: fallback
  return "قولّي أكتر يا روحي... أنا سامعاك ♥";
}

// تحديث الذاكرة القصيرة والطويلة
function updateMemory(userMessage, noorResponse) {
  shortTermMemory.push({ user: userMessage, noor: noorResponse });
  if (shortTermMemory.length > memoryLimit) shortTermMemory.shift();

  if (longTermMemory.length % 6 === 0) {
    longTermMemory.push({ date: new Date().toISOString(), summary: userMessage });
    if (longTermMemory.length > 50) longTermMemory.shift();
    saveLearnedResponses();
  }
}

// إضافة رسالة إلى واجهة الدردشة
function addMessage(text, sender) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return console.warn("لا يوجد chat-box في الصفحة.");
  const messageDiv = document.createElement('div');
  messageDiv.className = "message " + sender;
  messageDiv.textContent = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (sender === 'noor') speak(text);
}

// مسح الدردشة وعرض رسالة ترحيب
function clearChat() {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;
  chatBox.innerHTML = '<div class="message noor">مرحبًا بك في رفيق الروح 💜</div>';
  speak("أهلاً بيك يا روحي، نور هنا معاك… قولي كل اللي في قلبك 💜");
}

// نطق النص بالعربية
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

// التعامل مع إرسال المستخدم
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

  updateMemory(message, response);
}

// تهيئة الصفحة بعد تحميلها
window.onload = () => {
  loadLearnedResponses();
  loadKnowledge();
  clearChat();

  // تسجيل service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log("✅ Service Worker مسجّل"))
      .catch(err => console.warn("❌ Service Worker فشل:", err));
  }

  // ربط زر Enter بإرسال الرسالة
  const input = document.getElementById('user-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUserMessage();
    });
  }
};

