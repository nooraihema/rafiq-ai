
// script.js - النسخة المطورة: نقل العقل والذاكرة من السيرفر إلى المتصفح
// هذا الملف يستورد المحركات الأصلية ويقوم بتشغيلها محلياً 100%

import { LinguisticBrain } from './core/linguistic_brain.js';
import { UserMemoryGraph } from './core/memory_system.js';

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");

// --- [إدارة الحالة والذاكرة] ---
// الحصول على معرف المستخدم من ذاكرة المتصفح
let currentUserId = localStorage.getItem('rafiq_user_id');
if (!currentUserId) {
    currentUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('rafiq_user_id', currentUserId);
}
console.log("Current User ID:", currentUserId);

// تعريف متغيرات العقل والذاكرة لتعيش طوال فترة فتح التطبيق
let brainInstance = null;
let memoryGraphInstance = null;

/**
 * وظيفة لإضافة الرسائل لواجهة الشات
 */
function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = sender;
  messageDiv.innerText = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * وظيفة إظهار/إخفاء مؤشر التفكير
 */
function showTypingIndicator(show) {
  let typingDiv = document.getElementById("typing-indicator");
  if (show) {
    if (!typingDiv) {
      typingDiv = document.createElement("div");
      typingDiv.id = "typing-indicator";
      typingDiv.className = "bot";
      typingDiv.innerText = "يفكر...";
      chatBox.appendChild(typingDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  } else {
    if (typingDiv) typingDiv.remove();
  }
}

/**
 * وظيفة تهيئة النظام (العقل والذاكرة)
 * تعمل لمرة واحدة عند أول رسالة أو عند تحميل الصفحة
 */
async function initializeBrain() {
    if (brainInstance) return; // إذا كان العقل يعمل بالفعل، لا تفعل شيئاً

    try {
        // 1. تهيئة نظام الذاكرة للمستخدم
        memoryGraphInstance = new UserMemoryGraph({ userId: currentUserId });
        await memoryGraphInstance.initialize();
        console.log("🧠 تم تحميل ذاكرة المستخدم بنجاح.");

        // 2. تهيئة الدماغ اللغوي
        brainInstance = new LinguisticBrain(null);
        await brainInstance.init();
        
        // 3. ربط الذاكرة بمحرك الاستجابة (Catharsis)
        if (brainInstance.engines.catharsis) {
            brainInstance.engines.catharsis.memory = memoryGraphInstance;
        }
        
        console.log("✅ العقل جاهز للعمل محلياً داخل المتصفح.");
    } catch (err) {
        console.error("خطأ أثناء تهيئة العقل:", err);
        addMessage("bot", "حدث خطأ في تشغيل العقل المحلي. تأكد من مسارات الملفات.");
    }
}

/**
 * الوظيفة الرئيسية لمعالجة الرسالة (بديلة لـ fetch القديمة)
 */
async function sendMessage(text) {
  if (!text.trim()) return;

  // إظهار رسالة المستخدم وتجهيز الواجهة
  addMessage("user", text);
  userInput.value = "";
  showTypingIndicator(true);

  try {
    // التأكد من أن العقل جاهز
    if (!brainInstance) {
        await initializeBrain();
    }

    // محاكاة خطة العمل (Pipeline) التي كانت تحدث في السيرفر:

    // أ. الحصول على آخر حالة عاطفية من الذاكرة
    const previousEmotion = memoryGraphInstance.workingMemory.slice(-1)[0]?.insight?.emotionProfile?.primaryEmotion;

    // ب. المرحلة 1: التحليل اللحظي (Conscious Mind)
    console.log(`[1/4] جاري التحليل اللحظي...`);
    const insight = await brainInstance.analyze(text, { previousEmotion });

    // ج. المرحلة 2: دمج المعلومات في الذاكرة (Subconscious Mind)
    console.log(`[2/4] دمج المعلومات في الذاكرة...`);
    if (insight) {
        memoryGraphInstance.ingest(insight);
    }

    // د. المرحلة 3: توليد الرد (Expressive Mind)
    console.log(`[3/4] توليد الرد النهائي...`);
    const response = await brainInstance.generateResponse(insight);

    // هـ. المرحلة 4: الحفظ والعمليات الخلفية
    console.log(`[4/4] حفظ الذاكرة محلياً...`);
    memoryGraphInstance.persist(); 
    // محاكاة عملية الـ Dream (اختياري)
    if (memoryGraphInstance.dream) memoryGraphInstance.dream();

    // إظهار الرد النهائي للمستخدم
    showTypingIndicator(false);
    addMessage("bot", response.responseText || "أنا هنا لأسمعك..");

    // طباعة البيانات التقنية في المتصفح للتدقيق (اختياري)
    console.log("Insight:", insight);
    console.log("Response Details:", response._meta);

  } catch (err) {
    showTypingIndicator(false);
    addMessage("bot", "⚡ حدث خطأ أثناء التفكير. حاول مرة أخرى.");
    console.error("Execution Error:", err);
  }
}

// ربط الأزرار والأحداث
document.getElementById("send-btn").addEventListener("click", () => {
  sendMessage(userInput.value);
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage(userInput.value);
  }
});

// تشغيل التهيئة بمجرد تحميل الصفحة لسرعة الاستجابة لاحقاً
window.addEventListener('load', initializeBrain);
