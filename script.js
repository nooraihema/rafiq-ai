document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // --- التطوير 1: الذاكرة باستخدام localStorage ---
    let userName = localStorage.getItem('userName');
    let conversationState = 'initial_greeting';

    // --- التطوير 2: شخصية ونبرة ودودة (مكتبة ردود) ---
    const responses = {
        greetings: [
            `أهلاً بعودتك يا ${userName}! كيف كان يومك؟`,
            `مرحباً ${userName}! سعيد برؤيتك مرة أخرى. ما الذي يشغل بالك اليوم؟`,
            `أهلاً ${userName}! أنا هنا للاستماع. كيف تشعر؟`
        ],
        ask_feelings: [
            "أتفهم. هل يمكنك أن تخبرني المزيد عما تشعر به، أو ما الذي يدور في ذهنك؟",
            "أنا أستمع. صف لي شعورك بالتفصيل إذا أردت.",
            "خذ وقتك. ما هي طبيعة هذا الشعور؟"
        ],
        empathy: [
            "شكرًا لمشاركتي هذا الأمر. يبدو أن هذا الموقف صعب.",
            "أتفهم تمامًا لماذا قد تشعر بهذا. من الطبيعي أن تتأثر.",
            "أنا أقدر ثقتك بي. دعنا نستكشف هذا معًا."
        ],
        encouragement: [
            "هذه خطوة رائعة! مجرد التفكير في الأدلة هو مهارة قوية.",
            "أنت تقوم بعمل رائع في تحليل أفكارك.",
            "ممتاز! هذه الفكرة البديلة تبدو أكثر توازنًا وإيجابية."
        ]
    };

    // وظيفة لاختيار رد عشوائي من قائمة
    function getRandomResponse(responseArray) {
        const randomIndex = Math.floor(Math.random() * responseArray.length);
        return responseArray[randomIndex];
    }

    // --- بداية التطبيق ---
    function startApp() {
        if (!userName) {
            // إذا كان المستخدم جديدًا
            addMessage('bot', 'مرحباً بك في رفيق! أنا صديقك ومعالجك الذكي. قبل أن نبدأ، كيف تحب أن أناديك؟');
            conversationState = 'asking_name';
        } else {
            // إذا كان المستخدم عائدًا
            addMessage('bot', getRandomResponse(responses.greetings));
            conversationState = 'asking_feelings';
        }
    }

    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = '';

        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.textContent = '...يفكر'; // تغيير النص ليعكس شخصية
        chatHistory.appendChild(typingIndicator);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        setTimeout(() => {
            chatHistory.removeChild(typingIndicator);
            const botResponse = getBotResponse(message);
            addMessage('bot', botResponse);
        }, 1200 + Math.random() * 800);
    }

    function getBotResponse(userMessage) {
        const lowerCaseMessage = userMessage.toLowerCase();

        // --- التعامل مع الحالات المختلفة للمحادثة ---
        switch (conversationState) {
            case 'asking_name':
                userName = userMessage;
                localStorage.setItem('userName', userName); // حفظ الاسم في الذاكرة
                conversationState = 'asking_feelings';
                return `جميل جدًا، ${userName}! الآن، أخبرني، ما الذي يجول في خاطرك اليوم؟`;

            case 'initial_greeting': // هذه الحالة الآن للبدء من جديد
                conversationState = 'asking_feelings';
                return `بالتأكيد يا ${userName}. لنبدأ من جديد. كيف هو شعورك الآن؟`;

            case 'asking_feelings':
                conversationState = 'asking_situation';
                return `${getRandomResponse(responses.empathy)} متى بدأ هذا الشعور؟ هل ارتبط بموقف معين؟`;

            case 'asking_situation':
                conversationState = 'asking_automatic_thought';
                return `شكرًا للتوضيح. وفي قلب هذا الموقف، ما هي الفكرة المحددة التي كانت تلح عليك؟`;

            case 'asking_automatic_thought':
                conversationState = 'challenging_thought_evidence';
                return `هذه فكرة قوية. دعنا نتفحصها بهدوء. هل هناك أي دليل حقيقي يدعم صحة هذه الفكرة؟`;

            case 'challenging_thought_evidence':
                conversationState = 'alternative_thought';
                return `${getRandomResponse(responses.encouragement)} الآن، هل يمكنك التفكير في طريقة أخرى، ربما أكثر لطفًا أو واقعية، للنظر إلى هذا الموقف؟`;

            case 'alternative_thought':
                conversationState = 're_evaluate_feelings';
                return `${getRandomResponse(responses.encouragement)} عندما تتبنى هذه الفكرة الجديدة، ما هو التغيير الذي تلاحظه في شعورك؟`;

            case 're_evaluate_feelings':
                conversationState = 'suggesting_coping_mechanism';
                return `هذا رائع! تذكر دائمًا أن لديك القدرة على إعادة صياغة أفكارك. هل تود أن نجرب تمرينًا بسيطًا للاسترخاء لتهدئة الذهن الآن؟`;

            case 'suggesting_coping_mechanism':
                if (lowerCaseMessage.includes('نعم') || lowerCaseMessage.includes('أوافق') || lowerCaseMessage.includes('تمرين')) {
                    conversationState = 'doing_relaxation_exercise';
                    return `ممتاز. دعنا نجرب تمرين "5-4-3-2-1". انظر حولك وسمِّ 5 أشياء يمكنك رؤيتها، 4 أشياء يمكنك لمسها، 3 أشياء يمكنك سماعها، شيئين يمكنك شمهما، وشيئًا واحدًا يمكنك تذوقه. هذا يساعد على العودة للحظة الحالية.`;
                } else {
                    conversationState = 'initial_greeting';
                    return `حسنًا، لا بأس أبدًا. أنا هنا متى احتجت إلي. هل هناك شيء آخر تود الحديث عنه؟`;
                }

            case 'doing_relaxation_exercise':
                conversationState = 'initial_greeting';
                return `أتمنى أن يكون هذا التمرين قد ساعدك. تذكر دائمًا أنك لست وحدك. أنا هنا دائمًا للاستماع.`;

            default:
                return `أنا أستمع يا ${userName}. هل يمكنك أن توضح أكثر؟`;
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    startApp(); // بدء تشغيل التطبيق
});
