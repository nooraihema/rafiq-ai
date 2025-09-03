document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    let conversationState = 'initial_greeting';
    let currentProblem = '';
    let automaticThought = '';

    // قائمة بالردود العامة إذا خرج المستخدم عن السياق المتوقع
    const generalResponses = [
        "أفهم ما تقوله. دعنا نركز على الخطوة التي كنا فيها. هل يمكنك أن تخبرني المزيد عن...",
        "هذه نقطة مثيرة للاهتمام، لكن دعنا نعد إلى موضوعنا. ما هي الأفكار التي كانت تدور في ذهنك؟",
        "يبدو أنك ترغب في التحدث عن شيء آخر، لكني أركز حاليًا على مساعدتك في فهم مشاعرك. هل يمكننا العودة إلى ذلك؟",
        "أتفهم أن أفكارك قد تتشعب. دعنا نعد إلى سؤالنا الأصلي: كيف شعرت عندما...؟"
    ];

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

        // إضافة مؤشر "جاري الكتابة..."
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.textContent = '...جاري الكتابة';
        chatHistory.appendChild(typingIndicator);
        chatHistory.scrollTop = chatHistory.scrollHeight;


        setTimeout(() => {
            chatHistory.removeChild(typingIndicator); // إزالة مؤشر الكتابة
            const botResponse = getBotResponse(message);
            addMessage('bot', botResponse);
        }, 1500 + Math.random() * 1000); // تأخير عشوائي بين 1.5 و 2.5 ثانية
    }

    function getBotResponse(userMessage) {
        let response = '';
        const lowerCaseMessage = userMessage.toLowerCase();

        // **معالجة الردود العامة والتحكم في التدفق خارج الـ CBT الرئيسي**
        if (lowerCaseMessage.includes('كيف حالك')) {
            return 'أنا نظام ذكاء اصطناعي، ليس لدي مشاعر، لكني جاهز لمساعدتك! لنواصل ما كنا نتحدث عنه.';
        }
        if (lowerCaseMessage.includes('شكرا') || lowerCaseMessage.includes('شكرا لك')) {
            return 'العفو، أنا هنا لدعمك ومساعدتك.';
        }
        if (lowerCaseMessage.includes('مرحبا') || lowerCaseMessage.includes('السلام عليكم')) {
             if (conversationState !== 'initial_greeting') {
                return 'أهلاً بك مرة أخرى! لنكمل محادثتنا.';
            }
        }
        if (lowerCaseMessage.includes('بدء جديد') || lowerCaseMessage.includes('أريد أن أبدأ من جديد') || lowerCaseMessage.includes('تغيير الموضوع')) {
            conversationState = 'initial_greeting';
            currentProblem = '';
            automaticThought = '';
            return 'حسناً، يمكننا أن نبدأ جلسة جديدة. كيف تشعر اليوم؟';
        }


        switch (conversationState) {
            case 'initial_greeting':
                response = 'أتفهم. هل يمكنك أن تخبرني المزيد عما تشعر به، أو ما الذي يدور في ذهنك؟';
                conversationState = 'asking_feelings';
                break;

            case 'asking_feelings':
                currentProblem = userMessage;
                response = `شكرًا لمشاركتك. متى/أين شعرت بهذا الإحساس أو الفكرة لأول مرة؟ هل كان هناك موقف معين حدث؟`;
                conversationState = 'asking_situation';
                break;

            case 'asking_situation':
                response = `حسنًا. في ذلك الموقف، ما هي الأفكار المحددة التي خطرت ببالك؟ ما الذي كنت تقوله لنفسك؟`;
                conversationState = 'asking_automatic_thought';
                break;

            case 'asking_automatic_thought':
                automaticThought = userMessage;
                response = `أفهم أن هذه الفكرة ( "${automaticThought}" ) قد تكون صعبة. دعنا ننظر إليها عن كثب. ما هو الدليل الذي يدعم هذه الفكرة؟ وما هو الدليل الذي يتعارض معها؟`;
                conversationState = 'challenging_thought_evidence';
                break;

            case 'challenging_thought_evidence':
                response = `شكرًا لتفكيرك في الأدلة. بالنظر إلى كل هذا، هل هناك طريقة أخرى أو منظور مختلف يمكن أن تنظر به إلى الموقف؟ ما هي الفكرة البديلة التي قد تكون أكثر توازنًا؟`;
                conversationState = 'alternative_thought';
                break;

            case 'alternative_thought':
                response = `هذه فكرة رائعة وأكثر توازنًا! عندما تفكر بهذه الطريقة الجديدة ( "${userMessage}" )، كيف تشعر الآن حيال الموقف الذي تحدثنا عنه؟`;
                conversationState = 're_evaluate_feelings';
                break;

            case 're_evaluate_feelings':
                // بعد إعادة تقييم المشاعر، نقدم خيارات للخطوة التالية
                response = `ممتاز أنك تشعر بتحسن! تذكر أن تحديد وتحدي الأفكار السلبية هو مهارة يمكنك تطويرها. هل ترغب في تجربة تمرين سريع للاسترخاء الآن، أم تفضل أن نلخص ما تعلمته في هذه الجلسة؟`;
                conversationState = 'suggesting_coping_mechanism';
                break;

            case 'suggesting_coping_mechanism':
                if (lowerCaseMessage.includes('تمرين استرخاء') || lowerCaseMessage.includes('نعم')) {
                    response = `رائع! دعنا نجرب تمرين التنفس العميق. اجلس في مكان هادئ، أغلق عينيك إذا أردت. خذ شهيقاً عميقاً ببطء من أنفك وعد حتى 4، ثم احبس نفسك وعد حتى 7، ثم أخرج الزفير ببطء من فمك وعد حتى 8. كرر هذا لعدة دقائق. هل جربت هذا؟`;
                    conversationState = 'doing_relaxation_exercise';
                } else if (lowerCaseMessage.includes('تلخيص') || lowerCaseMessage.includes('ملخص')) {
                    response = `بالتأكيد. في هذه الجلسة، تحدثنا عن شعورك بـ "${currentProblem}"، وتعرفنا على فكرة تلقائية سلبية هي "${automaticThought}". قمنا بتحدي هذه الفكرة ووجدنا منظوراً بديلاً أكثر إيجابية. تذكر أنك قوي وقادر على تغيير طريقة تفكيرك. هل تود أن تبدأ جلسة جديدة؟`;
                    conversationState = 'initial_greeting';
                } else {
                    response = 'لم أفهم اختيارك تمامًا. هل تود "تمرين استرخاء" أم "تلخيص" الجلسة؟';
                    // نبقى في نفس الحالة لإعادة طلب الاختيار
                }
                break;

            case 'doing_relaxation_exercise':
                response = `ممتاز! استمر في التمرين إذا شعرت بالراحة. تذكر، يمكنك العودة إليه في أي وقت. هل تود أن تناقش شيئًا آخر الآن، أم أنك مستعد لإنهاء الجلسة؟`;
                conversationState = 'initial_greeting'; // نعود للحالة الأولية للسماح بالبدء من جديد
                break;

            default:
                // رد عام عندما لا يكون هناك تطابق في الحالات، لمحاولة إعادة توجيه المستخدم
                const randomIndex = Math.floor(Math.random() * generalResponses.length);
                response = generalResponses[randomIndex];
                // لا نغير حالة المحادثة هنا لإعطاء فرصة للمستخدم لتصحيح المسار
                break;
        }

        return response;
    }

    // ربط زر الإرسال بالوظيفة
    sendButton.addEventListener('click', sendMessage);

    // السماح بإرسال الرسائل بالضغط على Enter
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // إضافة بعض التنسيقات لمؤشر الكتابة في CSS
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = `
        .typing-indicator {
            background-color: #f0f0f0;
            color: #555;
            font-style: italic;
            border-radius: 18px;
            padding: 8px 15px;
            align-self: flex-end; /* نفس مكان رسائل الروبوت */
            max-width: fit-content;
            animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
        }
    `;
    document.head.appendChild(styleSheet);

});
