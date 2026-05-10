/**
 * 📱 SOUL COMPANION - APP INTERFACE & STORAGE
 * الربط بين الواجهة والنواة مع التخزين المحلي
 */

// 1. إعداد النواة وتدريب أولي سريع
const soul = new SoulCompanion(5000);

// 2. دالة التخزين على الهاتف (LocalStorage)
function saveToPhone(key, data) {
    localStorage.setItem(`soul_${key}`, JSON.stringify(data));
    updateLog(`تم حفظ ${key} في ذاكرة الهاتف.`);
}

function loadFromPhone(key) {
    const data = localStorage.getItem(`soul_${key}`);
    return data ? JSON.parse(data) : null;
}

// 3. تحديث واجهة السجل (Log Window)
function updateLog(message) {
    const logWindow = document.getElementById('log-window');
    const time = new Date().toLocaleTimeString();
    logWindow.innerHTML += `<div>[${time}] ${message}</div>`;
    logWindow.scrollTop = logWindow.scrollHeight;
}

// 4. معالجة الإرسال
async function handleSendMessage() {
    const inputField = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const text = inputField.value;

    if (!text) return;

    // عرض رسالة المستخدم
    chatBox.innerHTML += `<div style="margin-bottom:10px; color:#94a3b8;">👤 أنت: ${text}</div>`;
    
    updateLog("بدء تحويل النص إلى توكنز (Tokenization)...");

    try {
        // تحويل النص لتوكنز (محاكاة بسيطة حالياً)
        const dummyTokens = text.split('').map(char => char.charCodeAt(0) % 5000);
        
        updateLog(`معالجة ${dummyTokens.length} توكن داخل الـ 15 مرحلة...`);
        
        // التشغيل عبر النواة
        const result = soul.process(dummyTokens);
        result.backward(); // تفعيل التعلم الذاتي بناءً على مدخلاتك

        // حفظ حالة الذاكرة بعد الرد
        saveToPhone('memory', soul.memoryContext);
        
        // عرض رد "رفيق الروح"
        chatBox.innerHTML += `<div style="margin-bottom:15px; color:#60a5fa;">✨ رفيق الروح: تم استيعاب رسالتك وإعادة هيكلة الوعي بناءً عليها.</div>`;
        
        updateLog("نجاح العملية. تم تحديث أوزان التنسور.");
        
    } catch (error) {
        updateLog(`خطأ في التشغيل: ${error.message}`);
    }

    inputField.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;
}

// عند تشغيل التطبيق: استعادة الذاكرة القديمة من الهاتف
window.onload = () => {
    const savedMemory = loadFromPhone('memory');
    if (savedMemory) {
        soul.memoryContext = savedMemory;
        updateLog("تم استعادة سياق الذاكرة من التخزين المحلي.");
    }
    updateLog("رفيق الروح جاهز للعمل.");
};
