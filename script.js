// script.js (Version with Session Memory)

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");

// --- [THE MEMORY UPGRADE] ---
// 1. At the very start, try to get the user's permanent ID card from the browser's memory.
let currentUserId = localStorage.getItem('rafiq_user_id');
console.log("Initial User ID from storage:", currentUserId); // For debugging

function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = sender;
  // Use innerText to prevent HTML injection issues
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
      typingDiv.innerText = "يفكر..."; // Changed to "thinking"
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
      // --- [THE MEMORY UPGRADE] ---
      // 2. Send the current user ID with every single message.
      // The first time, this will be null, which is exactly what we want.
      body: JSON.stringify({ 
          message: text,
          userId: currentUserId 
      })
    });
    
    // Check if the server responded correctly
    if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
    }

    const data = await res.json();
    showTypingIndicator(false);
    
    // --- [THE MEMORY UPGRADE] ---
    // 3. This is the most critical part. After the FIRST successful response,
    // we get the user ID from the server and save it.
    if (!currentUserId && data.userId) {
        currentUserId = data.userId;
        localStorage.setItem('rafiq_user_id', currentUserId);
        console.log("SUCCESS: User ID received and saved:", currentUserId); // For debugging
    }
    // On all future requests, this `if` block will be skipped because `currentUserId` will have a value.

    addMessage("bot", data.reply || "عفواً، حدث خطأ ما. حاول مرة أخرى.");

    // Debugging
    console.log("Source:", data.source, "| Metadata:", data.metadata);

  } catch (err) {
    showTypingIndicator(false);
    addMessage("bot", "⚡ حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    console.error("Fetch Error:", err);
  }
}

document.getElementById("send-btn").addEventListener("click", () => {
  sendMessage(userInput.value);
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage(userInput.value);
});
