
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

// 🟢 إضافة رسالة للواجهة
function addMessage(content, sender) {
  const chatBox = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = sender === "user" ? "msg user" : "msg noor";
  div.innerText = content;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🟢 البحث عن أفضل رد
function findBestResponse(message) {
  if (knowledgeBase[message]) return knowledgeBase[message];
  return "لسه بتعلم 🤍، قوللي أكتر...";
}

// 🟢 إرسال رسالة
function sendMessage() {
  const input = document.getElementById("msg-input");
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");

  const reply = findBestResponse(message);
  addMessage(reply, "noor");

  input.value = "";
}

// 🟢 مسح المحادثة
function clearChat() {
  document.getElementById("chat-box").innerHTML = "";
}

// 🟢 تحميل البيانات عند البدء
window.onload = () => {
  loadKnowledge();
};

