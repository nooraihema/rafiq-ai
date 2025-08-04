
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
    
