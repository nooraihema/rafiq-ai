// script.js

import { GoogleGenerativeAI } from "https://unpkg.com/@google/generative-ai?module";

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elements ---
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    // --- 2. Configuration & State ---
    const API_KEY =AIzaSyBJnFXcmnZl3ynDQyKRMRKhib58M2j15g0 "الصق_مفتاح_API_السري_الخاص_بك_هنا"; // !! هام: ضع مفتاحك =AIzaSyBJnFXcmnZl3ynDQyKRMRKhib58M2j15g0
    let userProfile = JSON.parse(localStorage.getItem('userProfile')) || { name: null };
    let conversationState = userProfile.name ? 'general' : 'asking_name';
    let intentsData = []; // سيحتوي على قاعدة المعرفة الخاصة بنا

    // --- 3. The "Brain" of Rafiq ---
    const RafiqBrain = {
        /**
         * يجد نية محددة مسبقًا من قاعدة المعرفة.
         */
        findPredefinedIntent: (message) => {
            const lowerCaseMessage = message.toLowerCase();
            return intentsData.find(intent =>
                intent.keywords.some(kw => lowerCaseMessage.includes(kw.toLowerCase()))
            ) || null;
        },

        /**
         * يستدعي Gemini API للحصول على استجابة ديناميكية وذكية.
         */
        getGenerativeResponse: async (message, userName) => {
            try {
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
                return "أنا آسف، يبدو أن عقلي الرقمي يواجه صعوبة في الاتصال الآن. هل يمكننا المحاولة مرة أخرى بعد لحظات؟";
            }
        },

        /**
         * يولد استجابة بناءً على رسالة المستخدم.
         */
        getResponse: async (message) => {
            if (conversationState === 'asking_name') {
                userProfile.name = message.trim();
                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                conversationState = 'general';
                return `تشرفت بمعرفتك، ${userProfile.name}! اسمك جميل جدًا. أنا هنا لأسمعك، ما الذي يجول في خاطرك؟ 💜`;
            }

            const predefinedIntent = RafiqBrain.findPredefinedIntent(message);

            if (predefinedIntent) {
                // --- 1. تم العثور على تطابق في ملف JSON (موثوق) ---
                const randomResponse = predefinedIntent.responses[Math.floor(Math.random() * predefinedIntent.responses.length)];
                let finalResponse = randomResponse.replace(/\[اسم المستخدم\]/g, userProfile.name);

                if (predefinedIntent.actionable_advice) {
                    finalResponse += `\n\n**نصيحة بسيطة:** ${predefinedIntent.actionable_advice}`;
                }
                return finalResponse;
            } else {
                // --- 2. لا يوجد تطابق، لذلك نستخدم الرد الاحتياطي الذكي (ذكي) ---
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

    /**
     * يبدأ التطبيق.
     */
    async function startApp() {
        try {
            const response = await fetch('intents.json');
            if (!response.ok) throw new Error('Network response was not ok');
            intentsData = await response.json();
            
            if (conversationState === 'asking_name') {
                addMessage('bot', 'مرحباً بك في رفيق! أنا هنا لأكون صديقك الداعم. كيف يمكنني مناداتك؟');
            } else {
                addMessage('bot', `أهلاً بعودتك يا ${userProfile.name}! أنا هنا دائمًا للاستماع. 💜`);
            }
        } catch (error) {
            console.error("Failed to load intents:", error);
            addMessage('bot', 'عذرًا، يبدو أن هناك مشكلة في تحميل ذاكرتي. يرجى المحاولة مرة أخرى لاحقًا.');
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
