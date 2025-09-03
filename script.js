// ==================================================================
//               النسخة النهائية والآمنة لملف script.js
// ==================================================================

// لا يوجد أي مفتاح API هنا

window.onload = () => {
    // --- 1. تعريف المتغيرات وربطها بعناصر الصفحة ---
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    let userProfile = JSON.parse(localStorage.getItem('userProfile')) || { name: null };
    let conversationState = userProfile.name ? 'general' : 'asking_name';

    // --- 2. تعريف كل الدوال ---

    // دالة تتحدث مع الواجهة الخلفية الآمنة
    async function getBotResponseFromServer(message, userName) {
        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, userName: userName }),
            });

            if (!apiResponse.ok) {
                console.error("API Error:", await apiResponse.text());
                return "عذرًا، حدث خطأ أثناء محاولة التواصل مع عقلي.";
            }
            
            const data = await apiResponse.json();
            return data.response;
        } catch (error) {
            console.error("Fetch Error:", error);
            return "يبدو أن هناك مشكلة في الشبكة. هل يمكنك التحقق من اتصالك بالإنترنت؟";
        }
    }

    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        chatHistory.insertBefore(messageDiv, typingIndicator);
        scrollToBottom();
    }

    function scrollToBottom() { chatHistory.scrollTop = chatHistory.scrollHeight; }
    function showTyping() { typingIndicator.style.display = 'flex'; scrollToBottom(); }
    function hideTyping() { typingIndicator.style.display = 'none'; }

    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (message === '' || !userInput) return; // التأكد من أن userInput ليس null

        addMessage('user', message);
        userInput.value = '';
        showTyping();

        let botResponse;
        if (conversationState === 'asking_name') {
            userProfile.name = message;
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            conversationState = 'general';
            botResponse = `تشرفت بمعرفتك، ${userProfile.name}! أنا هنا لأسمعك، ما الذي يجول في خاطرك؟ 💜`;
        } else {
            // استدعاء الواجهة الخلفية للحصول على الرد
            botResponse = await getBotResponseFromServer(message, userProfile.name);
        }

        hideTyping();
        addMessage('bot', botResponse);
    }

    function startApp() {
        if (!chatHistory) {
            console.error("Chat history element not found!");
            return;
        }
        if (conversationState === 'asking_name') {
            addMessage('bot', 'مرحباً بك في رفيق! أنا هنا لأكون صديقك الداعم. كيف يمكنني مناداتك؟');
        } else {
            addMessage('bot', `أهلاً بعودتك يا ${userProfile.name}! أنا هنا دائمًا للاستماع. 💜`);
        }
    }

    // --- 3. ربط الأحداث ---
    if (sendButton && userInput) {
        sendButton.addEventListener('click', handleSendMessage);
        userInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') handleSendMessage();
        });
    }

    // --- 4. بدء التطبيق ---
    startApp();
};
