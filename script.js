
document.addEventListener("DOMContentLoaded", () => {
  const chatHistory = document.getElementById("chat-history");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");

  // إضافة رسالة لواجهة المحادثة
  function addMessage(sender, text) {
    const div = document.createElement("div");
    div.classList.add("message", `${sender}-message`);
    div.textContent = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // إرسال رسالة
  function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage("user", message);
    userInput.value = "";

    // هنا مناداة نور.js
    const reply = findBestResponse(message);
    setTimeout(() => {
      addMessage("bot", reply);
    }, 400);
  }

  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
});
