document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // --- التطوير 1: الذاكرة والملف الشخصي ---
    let userProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
    let conversationState = 'initial_greeting';

    // --- التطوير 2: الحالة المزاجية والشخصية ---
    let userMood = 'neutral'; // (neutral, sad, anxious, happy)
    let botPersonaState = 'caring'; // (caring, empathetic, professional, friendly)

    // --- التطوير 3: مكتبة ردود موسعة تعتمد على الشخصية ---
    const responses = {
        personas: {
            caring: { // الشخصية الافتراضية الدافئة
                greeting: () => `أهلاً بعودتك يا ${userProfile.name}! اشتقت لك. كيف حالك اليوم؟`,
                ask_feelings: "أنا هنا للاستماع. ما الذي يجول في خاطرك؟"
            },
            empathetic: { // شخصية تظهر عند حزن المستخدم
                greeting: () => `أهلاً ${userProfile.name}. أرى أنك قد لا تكون بخير. تذكر، أنا هنا معك.`,
                ask_feelings: "سماع هذا يؤلمني لأجلك. خذ وقتك، وأخبرني بكل شيء عندما تكون مستعدًا."
            }
        },
        empathy: [
            "أتفهم تمامًا لماذا قد تشعر بهذا. هذا شعور صعب حقًا.",
            "أنا أقدر ثقتك بي ومشاركتي هذا الأمر. دعنا نتجاوز هذا معًا.",
            "يبدو أنك تمر بوقت عصيب. تذكر أن مشاعرك صحيحة ومهمة."
        ]
    };

    function startApp() {
        if (!userProfile.name) {
            addMessage('bot', 'مرحباً بك في رفيق! أنا هنا لأكون صديقك الداعم. كيف يمكنني مناداتك؟');
            conversationState = 'asking_name';
        } else {
            // التحية تعتمد الآن على شخصية الروبوت
            addMessage('bot', responses.personas[botPersonaState].greeting());
            conversationState = 'asking_feelings';
        }
    }

    // --- وظيفة بسيطة لتحليل المشاعر ---
    function detectUserMood(message) {
        const lowerCaseMessage = message.toLowerCase();
        if (lowerCaseMessage.includes('حزين') || lowerCaseMessage.includes('مكتئب') || lowerCaseMessage.includes('ابكي')) {
            userMood = 'sad';
            botPersonaState = 'empathetic'; // الروبوت يصبح متعاطفًا
        } else if (lowerCaseMessage.includes('قلق') || lowerCaseMessage.includes('متوتر') || lowerCaseMessage.includes('خائف')) {
            userMood = 'anxious';
            botPersonaState = 'caring'; // الروبوت يصبح مهتمًا ومهدئًا
        } else {
            userMood = 'neutral';
            botPersonaState = 'caring';
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        detectUserMood(message); // *** تحليل مشاعر المستخدم مع كل رسالة ***
        userInput.value = '';

        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.textContent = '...يفكر';
        chatHistory.appendChild(typingIndicator);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        setTimeout(() => {
            chatHistory.removeChild(typingIndicator);
            const botResponse = getBotResponse(message);
            addMessage('bot', botResponse);
        }, 1200 + Math.random() * 800);
    }
    
    function getBotResponse(userMessage) {
        // --- المنطق الرئيسي للمحادثة ---
        switch (conversationState) {
            case 'asking_name':
                userProfile.name = userMessage;
                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                conversationState = 'asking_feelings';
                return `تشرفت بمعرفتك، ${userProfile.name}! الآن، أخبرني بصراحة، كيف هو حال قلبك اليوم؟`;

            case 'asking_feelings':
                conversationState = 'asking_situation';
                // الرد يعتمد على الشخصية
                if(botPersonaState === 'empathetic'){
                    return responses.personas.empathetic.ask_feelings;
                }
                return `شكرًا لأنك وثقت بي. هل يمكنك أن تصف لي الموقف الذي جعلك تشعر بهذا؟`;

            // ... باقي حالات المحادثة (asking_situation, etc.) يمكن تعديلها بنفس الطريقة لتعتمد على botPersonaState
            
            case 'asking_situation':
                conversationState = 'asking_automatic_thought';
                return `أتفهم الموقف الآن. وفي تلك اللحظة بالذات، ما هي الفكرة التي سيطرت على عقلك؟`;

            // ... (باقي الحالات كما كانت في النسخة السابقة، مع إمكانية تحسينها لاحقًا)

            default:
                return `أنا أستمع يا ${userProfile.name}. هل يمكنك أن توضح أكثر؟`;
        }
    }

    // --- وظائف المساعدة (لا تغيير هنا) ---
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') sendMessage();
    });

    startApp();
});
