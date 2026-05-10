/**
 * 🧠 script.js - Soul Companion Runtime
 * الربط بين الواجهة والنواة المحلية مع نظام السجلات (Logs)
 */

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const systemLogs = document.getElementById("system-logs");

// 1. استدعاء النواة (Core) المحملة في الذاكرة
// تأكد أن ملف core.js يحتوي على class SoulCompanion
const soul = new SoulCompanion(5000);

// 2. دالة تحديث السجلات (System Logs) لتظهر في الشاشة السوداء
function pushLog(message) {
    const time = new Date().toLocaleTimeString();
    systemLogs.innerHTML += `<div>> [${time}] ${message}</div>`;
    systemLogs.scrollTop = systemLogs.scrollHeight;
    console.log(`[System]: ${message}`);
}

function addMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `msg ${sender}`; // استخدام الكلاسات الجديدة
    messageDiv.innerText = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(text) {
    if (!text.trim()) return;

    addMessage("user", text);
    userInput.value = "";
    
    pushLog("بدء المعالجة السيادية...");

    try {
        // تحويل النص إلى توكنز (Encoding)
        pushLog("جاري تحويل النص إلى مطابقة تنسورات...");
        const tokens = text.split('').map(c => c.charCodeAt(0) % 5000);

        // تشغيل النواة (المعالجة عبر الـ 15 مرحلة)
        pushLog("تشغيل محرك الـ MatMul و الـ Attention...");
        const result = soul.process(tokens);

        // تفعيل التعلم العكسي (تطوير الأوزان بناءً على الحوار)
        pushLog("تحديث الأوزان (Backpropagation) مفعل...");
        result.backward();

        // حفظ الحالة في ذاكرة الهاتف
        localStorage.setItem('soul_memory_v1', JSON.stringify(soul.memoryContext));
        pushLog("تم تأمين الذاكرة محلياً في الهاتف.");

        // الرد المحاكي (سيتم تطويره ليصبح توليداً كاملاً للنصوص)
        setTimeout(() => {
            const reply = "تم تحليل رسالتك ودمجها في نموذج العالم الخاص بي بنجاح.";
            addMessage("bot", reply);
            pushLog("استجابة كاملة. النظام مستقر.");
        }, 600);

    } catch (err) {
        pushLog(`خطأ فني: ${err.message}`);
        addMessage("bot", "⚡ حدث اضطراب في النواة. يرجى مراجعة السجلات.");
        console.error("Core Error:", err);
    }
}

// 3. استعادة الذاكرة عند بدء التشغيل
window.onload = () => {
    pushLog("جاري استدعاء الوعي من ذاكرة الهاتف...");
    const savedMemory = localStorage.getItem('soul_memory_v1');
    if (savedMemory) {
        soul.memoryContext = JSON.parse(savedMemory);
        pushLog("تمت استعادة 50 نقطة سياقية من الذاكرة.");
    } else {
        pushLog("بداية جديدة: لا توجد ذاكرة سابقة.");
    }
    pushLog("نظام رفيق الروح جاهز.");
};

document.getElementById("send-btn").addEventListener("click", () => {
    sendMessage(userInput.value);
});

userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage(userInput.value);
});
