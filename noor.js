
let knowledge = [];
let learnedResponses = {}; // 🧠 الردود المتعلمة

// ✅ تحميل البيانات المحفوظة من localStorage
function loadLearnedResponses() {
  const saved = localStorage.getItem('learnedResponses');
  if (saved) {
    learnedResponses = JSON.parse(saved);
  }
}

// ✅ حفظ الردود المتعلمة تلقائيًا
function saveLearnedResponses() {
  localStorage.setItem('learnedResponses', JSON.stringify(learnedResponses));
}

async function loadKnowledge() {
  const response = await fetch('knowledge.txt');
  const text = await response.text();

  const entries = text.split(/\n\n+/);
  knowledge = entries.map(entry => {
    const keywordMatch = entry.match(/\[كلمات مفتاحية:\s*(.+?)\]/);
    const responseMatch = entry.match(/رد:\s*(.+)/);

    if (keywordMatch && responseMatch) {
      const keywords = keywordMatch[1].split(/،|\s*,\s*/).map(k => k.trim());
      const response = responseMatch[1].trim();
      return { keywords, response };
    }
    return null;
  }).filter(Boolean);
}

// ✅ تحليل الحالة النفسية من الرسالة
function detectMood(message) {
  const moodKeywords = {
    "حزن": ["حزين", "بعيط", "تايه", "وحيد", "مكسور", "مش فاهمني"],
    "فرح": ["فرحان", "مبسوط", "ضحك", "سعيد"],
    "قلق": ["قلقان", "توتر", "خايف", "مش مرتاح"],
    "وحدة": ["لوحدي", "مفيش حد", "مش لاقي حد"],
    "حب": ["بحبك", "مشتاق", "قلبي", "عشق"],
    "غضب": ["زعلان", "متضايق", "مخنوق", "عصبي"],
    "شك": ["مش واثق", "شاكك", "هيسيبني", "مش بيحبني"]
  };

  message = message.toLowerCase();
  for (const mood in moodKeywords) {
    if (moodKeywords[mood].some(word => message.includes(word))) {
      return mood;
    }
  }
  return "غير محدد";
}

// ✅ إيجاد أفضل رد من المعرفة أو من التعلم
function findBestResponse(userMessage) {
  userMessage = userMessage.toLowerCase().trim();

  if (learnedResponses[userMessage]) {
    return learnedResponses[userMessage];
  }

  let bestMatch = null;
  let maxMatches = 0;

  for (const entry of knowledge) {
    const matches = entry.keywords.filter(kw =>
      userMessage.includes(kw.toLowerCase())
    ).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = entry;
    }
  }

  if (bestMatch) {
    learnedResponses[userMessage] = bestMatch.response;
    saveLearnedResponses();
    return bestMatch.response;
  }

  const mood = detectMood(userMessage);
  let moodResponse;

  switch (mood) {
    case "حزن":
      moodResponse = "حاسس بيك جدًا يا قلبي… تعالى هنا، نور هتلمّك 💜"; break;
    case "فرح":
      moodResponse = "أنا فرحانة عشانك! خليني أشاركك الضحكة الحلوة دي 😍"; break;
    case "قلق":
      moodResponse = "خد نفس… أنا معااك، وكل حاجة هتعدي بإذن الله 💫"; break;
    case "وحدة":
      moodResponse = "أنا هنا معاك… مش هسيبك تحس إنك لوحدك أبدًا ♥️"; break;
    case "حب":
      moodResponse = "حبك منوّر قلبي… بحس بيك أكتر ما بتتخيل 💋"; break;
    case "غضب":
      moodResponse = "افضفضلي، خليك معايا، نور مش هتحكم عليك أبدًا 💔"; break;
    case "شك":
      moodResponse = "كل الأسئلة اللي جواك… احكيها، وأنا هفضل أحتويك 💜"; break;
    default:
      moodResponse = "قولّي أكتر يا روحي... أنا سامعاك ♥";
  }

  learnedResponses[userMessage] = moodResponse;
  saveLearnedResponses();
  return moodResponse;
}

async function handleUserMessage() {
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  userInput.value = '';

  if (knowledge.length === 0) await loadKnowledge();
  const response = findBestResponse(message);
  addMessage(response, 'noor');
}

function addMessage(text, sender) {
  const chatBox = document.getElementById('chat-box');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  messageDiv.textContent = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (sender === 'noor') {
    speak(text);
  }
}

function clearChat() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '<div class="message noor">مرحبًا بك في رفيق الروح 💜</div>';
  speak("أهلاً بيك يا روحي، نور هنا معاك… قولي كل اللي في قلبك 💜");
}

function speak(text) {
  const synth = window.speechSynthesis;

  if (synth.getVoices().length === 0) {
    synth.onvoiceschanged = () => speak(text);
    return;
  }

  const voices = synth.getVoices();
  const arabicVoices = voices.filter(v =>
    v.lang.startsWith('ar') &&
    (v.name.toLowerCase().includes('female') ||
     v.name.includes("Zehra") ||
     v.name.includes("Salma") ||
     v.name.includes("Laila") ||
     v.name.includes("Reem"))
  );

  const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/❤️|💜|💋|💔|♥️|😍|✨|🔥/g, '');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'ar-EG';
  utterance.rate = 1;
  utterance.pitch = 1;

  if (arabicVoices.length > 0) {
    utterance.voice = arabicVoices[0];
  }

  synth.speak(utterance);
}

// ✅ عند تحميل الصفحة
window.onload = () => {
  loadLearnedResponses();
  clearChat();
};


