
// نعود لاستخدام غلاف "DOMContentLoaded" لضمان أن كل شيء في الصفحة قد تم تحميله
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DOM Elements ---
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    // --- 2. Configuration & State ---
    const API_KEY =AIzaSyBJnFXcmnZl3ynDQyKRMRKhib58M2j15g0 "الصق_مفتاح_API_السري_الخاص_بك_هنا"; // !! هام: ضع مفتاحك هنا
    let userProfile = JSON.parse(localStorage.getItem('userProfile')) || { name: null };
    let conversationState = userProfile.name ? 'general' : 'asking_name';
    let intentsData = []; 

    // --- 3. The "Brain" of Rafiq ---
    const RafiqBrain = {
        findPredefinedIntent: (message) => {
            const lowerCaseMessage = message.toLowerCase();
            return intentsData.find(intent =>
                intent.keywords.some(kw => lowerCaseMessage.includes(kw.toLowerCase()))
            ) || null;
        },

        getGenerativeResponse: async (message, userName) => {
            // التحقق من وجود المكتبة قبل استخدامها
            if (!window.ai || !window.ai.GoogleGenerativeAI) {
                console.error("Gemini AI library not loaded!");
                return "عذرًا، هناك مشكلة في تحميل مكونات الذكاء الاصطناعي. يرجى تحديث الصفحة.";
            }

            try {
                const { GoogleGenerativeAI } = window.ai;
                const genAI = new GoogleGenerativeAI(API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });

                const prompt = `أنت "رفيق"، رفيق ذكاء اصطناعي وشخصيتك دافئة وداعمة ومتعاطفة. 
                مهمتك هي تقديم رد قصير وداعم لشخص يشعر بالضيق. 
                لا تقدم نصائح طبية أو نفسية أبداً. 
                اسم المستخدم هو "${userName}". 
                قال المستخدم للتو: "${message}".
                يرجى تقديم رد لطيف ومتفهم باللغة العربية.`;
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error) {
                console.error("Error calling Gemini API:", error);
                if (error.toString().includes("API key not valid")) {
                    return "عذرًا، يبدو أن مفتاح الوصول الخاص بي غير صالح. سأصلح هذه المشكلة قريبًا.";
                }
                return "أنا آسف، يبدو أن عقلي الرقمي يواجه صعوبة في الاتصال الآن. هل يمكننا المحاولة مرة أخرى بعد لحظات؟";
            }
        },

        getResponse: async (message) => {
            if (conversationState === 'asking_name') {
                userProfile.name = message.trim();
                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                conversationState = 'general';
                return `تشرفت بمعرفتك، ${userProfile.name}! اسمك جميل جدًا. أنا هنا لأسمعك، ما الذي يجول في خاطرك؟ 💜`;
            }

            const predefinedIntent = RafiqBrain.findPredefinedIntent(message);

            if (predefinedIntent) {
                const randomResponse = predefinedIntent.responses[Math.floor(Math.random() * predefinedIntent.responses.length)];
                let finalResponse = randomResponse.replace(/\[اسم المستخدم\]/g, userProfile.name);
                if (predefinedIntent.actionable_advice) {
                    finalResponse += `\n\n**نصيحة بسيطة:** ${predefinedIntent.actionable_advice}`;
                }
                return finalResponse;
            } else {
                return await RafiqBrain.getGenerativeResponse(message, userProfile.name);
            }
        }
    };

    // --- 4. UI Helper Functions ---
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        chatHistory.insertBefore(messageDiv, typingIndicator);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function showTyping() {
        typingIndicator.style.display = 'flex';
        scrollToBottom();
    }

    function hideTyping() {
        typingIndicator.style.display = 'none';
    }

    // --- 5. Main Application Logic ---
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = '';
        showTyping();

        const botResponse = await RafiqBrain.getResponse(message);
        hideTyping();
        addMessage('bot', botResponse);
    }

    async function startApp() {
        try {
            const response = await fetch('intents.json');
            if (!response.ok) throw new Error('Failed to load intents file');
            intentsData = await response.json();
            
            if (conversationState === 'asking_name') {
                addMessage('bot', 'مرحباً بك في رفيق! أنا هنا لأكون صديقك الداعم. كيف يمكنني مناداتك؟');
            } else {
                addMessage('bot', `أهلاً بعودتك يا ${userProfile.name}! أنا هنا دائمًا للاستماع. 💜`);
            }
        } catch (error) {
            console.error("Critical Error:", error);
            addMessage('bot', 'عذرًا، يبدو أن هناك مشكلة حرجة في تحميل ذاكرتي. يرجى تحديث الصفحة.');
        }
    }

    // --- 6. Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') handleSendMessage();
    });

    // --- Go! ---
    startApp();
});
