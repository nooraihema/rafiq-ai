/**
 * 🚀 SOUL COMPANION - PRODUCTION RUNTIME (Vercel Ready)
 * هذا الملف يربط الواجهة بالنواة المحلية دون الحاجة لسيرفر خارجي
 */

// التأكد من استدعاء النواة
const soul = new SoulCompanion(5000); 

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const systemLogs = document.getElementById("system-logs");

// دالة لتحديث السجلات في الواجهة
function pushLog(message) {
    const time = new Date().toLocaleTimeString();
    if (systemLogs) {
        systemLogs.innerHTML += `<div>> [${time}] ${message}</div>`;
        systemLogs.scrollTop = systemLogs.scrollHeight;
    }
}

function addMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `msg ${sender}`;
    messageDiv.innerText = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(text) {
    if (!text.trim()) return;

    addMessage("user", text);
    userInput.value = "";
    
    pushLog("بدء المعالجة المحلية (Sovereign Mode)...");

    try {
        // 1. تحويل النص لتوكنز
        const tokens = text.split('').map(c => c.charCodeAt(0) % 5000);

        // 2. تشغيل النواة - الـ 15 مرحلة
        // ملاحظة: soul.process هو المحرك اللي في ملف core.js
        const result = soul.process(tokens);

        // 3. تفعيل التعلم الذاتي
        result.backward();

        // 4. التخزين على الموبايل (حتى مع Vercel التخزين بيفضل في موبايلك أنت)
        localStorage.setItem('soul_memory_v1', JSON.stringify(soul.memoryContext));
        pushLog("تم تحديث مصفوفة الذاكرة وحفظها محلياً.");

        // 5. الرد (سيتم تطويره لاحقاً ليولد كلمات حقيقية)
        setTimeout(() => {
            addMessage("bot", "تم استيعاب رسالتك ودمجها في نموذج العالم الخاص بي. أنا الآن أعيد معايرة أوزاني بناءً على حوارنا.");
            pushLog("اكتملت الدورة العصبية بنجاح.");
        }, 500);

    } catch (err) {
        pushLog(`خطأ: ${err.message}`);
        console.error(err);
    }
}

// استعادة الذاكرة عند فتح الرابط من Vercel
window.onload = () => {
    pushLog("جاري الاتصال بالنواة السيادية...");
    const savedMemory = localStorage.getItem('soul_memory_v1');
    if (savedMemory) {
        soul.memoryContext = JSON.parse(savedMemory);
        pushLog("تم استعادة السياق السابق من ذاكرة الهاتف.");
    }
    pushLog("رفيق الروح جاهز للعمل على Vercel.");
};

document.getElementById("send-btn").addEventListener("click", () => sendMessage(userInput.value));
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(userInput.value); });
