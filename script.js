
// script.js
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");

function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = sender;
  messageDiv.innerText = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTypingIndicator(show) {
  let typingDiv = document.getElementById("typing-indicator");
  if (show) {
    if (!typingDiv) {
      typingDiv = document.createElement("div");
      typingDiv.id = "typing-indicator";
      typingDiv.className = "bot";
      typingDiv.innerText = "جارٍ الكتابة...";
      chatBox.appendChild(typingDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  } else {
    if (typingDiv) typingDiv.remove();
  }
}

async function sendMessage(text) {
  if (!text.trim()) return;
  addMessage("user", text);
  userInput.value = "";
  showTypingIndicator(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    showTypingIndicator(false);

    addMessage("bot", data.reply || "معنديش رد دلوقتي 🙏");

    // Debugging: اعرض المصدر والدرجة في الـ console
    console.log("Source:", data.source, "Score:", data.score);

  } catch (err) {
    showTypingIndicator(false);
    addMessage("bot", "⚡ حصل خطأ في الاتصال");
    console.error(err);
  }
}

document.getElementById("send-btn").addEventListener("click", () => {
  sendMessage(userInput.value);
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage(userInput.value);
});

