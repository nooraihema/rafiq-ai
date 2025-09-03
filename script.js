/ لا يوجد أي "import" أو مفتاح API هنا

document.addEventListener('DOMContentLoaded', () => {
    
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    let userProfile = JSON.parse(localStorage.getItem('userProfile')) || { name: null };
    let conversationState = userProfile.name ? 'general' : 'asking_name';
    // لم نعد بحاجة لـ intentsData هنا، لأن الواجهة الخلفية تعالجها

    async function getBotResponse(message, userName) {
        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, userName: userName }),
            });

            if (!apiResponse.ok) {
                // حاول قراءة رسالة الخطأ من الخادم
                const errorData = await apiResponse.json();
                console.error("API Error:", errorData.message);
                return "عذرًا، حدث خطأ أثناء محاولة التواصل مع عقلي.";
            }
            
            const data = await apiResponse.json();
            return data.response;

        } catch (error) {
            console.error("Fetch Error:", error);
            return "يبدو أن هناك مشكلة في الشبكة. هل يمكنك التحقق من اتصالك بالإنترنت؟";
        }
    }

    // --- بقية الدوال تبقى كما هي تقريبًا ---
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
        if (message === '') return;

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
            botResponse = await getBotResponse(message, userProfile.name);
        }

        hideTyping();
        addMessage('bot', botResponse);
    }

    function startApp() {
        if (conversationState === 'asking_name') {
            addMessage('bot', 'مرحباً بك في رفيق! أنا هنا لأكون صديقك الداعم. كيف يمكنني مناداتك؟');
        } else {
            addMessage('bot', `أهلاً بعودتك يا ${userProfile.name}! أنا هنا دائمًا للاستماع. 💜`);
        }
    }

    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') handleSendMessage();
    });

    startApp();
});
