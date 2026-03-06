import { LinguisticBrain } from './core/linguistic_brain.js';
import { UserMemoryGraph } from './core/memory_system.js';

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");

let brainInstance = null;
let memoryGraphInstance = null;

async function initializeBrain() {
    try {
        console.log("محاولة تشغيل العقل...");
        let userId = localStorage.getItem('rafiq_user_id') || 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('rafiq_user_id', userId);

        memoryGraphInstance = new UserMemoryGraph({ userId });
        await memoryGraphInstance.initialize();

        brainInstance = new LinguisticBrain(null);
        await brainInstance.init();
        
        if (brainInstance.engines.catharsis) {
            brainInstance.engines.catharsis.memory = memoryGraphInstance;
        }
        alert("✅ العقل جاهز تماماً!"); 
    } catch (err) {
        // هذه الرسالة ستخبرنا بالضبط أين المشكلة
        alert("❌ فشل تشغيل العقل. السبب: " + err.message);
        console.error(err);
    }
}

async function sendMessage(text) {
  if (!text.trim()) return;
  if (!brainInstance) {
      alert("العقل لم يتحمل بعد، انتظر ثانية.");
      await initializeBrain();
      return;
  }
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "user";
  messageDiv.innerText = text;
  chatBox.appendChild(messageDiv);
  userInput.value = "";

  try {
      const insight = await brainInstance.analyze(text);
      const response = await brainInstance.generateResponse(insight);
      
      const botDiv = document.createElement("div");
      botDiv.className = "bot";
      botDiv.innerText = response.responseText;
      chatBox.appendChild(botDiv);
  } catch (e) {
      alert("خطأ أثناء المعالجة: " + e.message);
  }
}

document.getElementById("send-btn").addEventListener("click", () => sendMessage(userInput.value));
window.addEventListener('load', initializeBrain);
