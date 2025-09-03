document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // **مفتاح تطوير الذكاء: حالة المحادثة (Conversation State)**
    // هذا المتغير سيساعد الروبوت على تذكر السياق وتوجيه المحادثة
    let conversationState = 'initial_greeting';
    let currentProblem = ''; // لتخزين المشكلة التي يتحدث عنها المستخدم
    let automaticThought = ''; // لتخزين الفكرة السلبية التلقائية

    // وظيفة لإضافة رسالة إلى واجهة المحادثة
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight; // التمرير لأسفل تلقائياً
    }

    // وظيفة للتعامل مع إرسال الرسائل
    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = ''; // مسح حقل الإدخال

        // هنا سيكون منطق رد الروبوت المتقدم
        setTimeout(() => {
            const botResponse = getBotResponse(message);
            addMessage('bot', botResponse);
        }, 700); // تأخير بسيط لمحاكاة التفكير البشري
    }

    // **الوظيفة الأساسية لمنطق الذكاء الاصطناعي للروبوت**
    function getBotResponse(userMessage) {
        let response = '';
        userMessage = userMessage.toLowerCase(); // تحويل رسالة المستخدم لحالة صغيرة لتسهيل المقارنة

        switch (conversationState) {
            case 'initial_greeting':
                // بعد الترحيب الأول، نسأل عن المشاعر
                response = 'أتفهم. هل يمكنك أن تخبرني المزيد عما تشعر به، أو ما الذي يدور في ذهنك؟';
                conversationState = 'asking_feelings';
                break;

            case 'asking_feelings':
                // المستخدم يصف مشاعره، نسأله عن الموقف
                currentProblem = userMessage; // نخزن المشكلة
                response = `شكرًا لمشاركتك. متى/أين شعرت بهذا الإحساس أو الفكرة لأول مرة؟ هل كان هناك موقف معين حدث؟`;
                conversationState = 'asking_situation';
                break;

            case 'asking_situation':
                // المستخدم يصف الموقف، نطلب منه تحديد الأفكار السلبية
                response = `حسنًا. في ذلك الموقف، ما هي الأفكار المحددة التي خطرت ببالك؟ ما الذي كنت تقوله لنفسك؟`;
                conversationState = 'asking_automatic_thought';
                break;

            case 'asking_automatic_thought':
                // المستخدم يذكر الفكرة السلبية، نبدأ في تحديها (إعادة الهيكلة المعرفية)
                automaticThought = userMessage; // نخزن الفكرة السلبية
                response = `أفهم أن هذه الفكرة ( "${automaticThought}" ) قد تكون صعبة. دعنا ننظر إليها عن كثب. ما هو الدليل الذي يدعم هذه الفكرة؟ وما هو الدليل الذي يتعارض معها؟`;
                conversationState = 'challenging_thought_evidence';
                break;

            case 'challenging_thought_evidence':
                // المستخدم يقدم أدلة، نطلب منه رؤية بديلة
                response = `شكرًا لتفكيرك في الأدلة. بالنظر إلى كل هذا، هل هناك طريقة أخرى أو منظور مختلف يمكن أن تنظر به إلى الموقف؟ ما هي الفكرة البديلة التي قد تكون أكثر توازنًا؟`;
                conversationState = 'alternative_thought';
                break;

            case 'alternative_thought':
                // المستخدم يقدم فكرة بديلة، نطلب منه تقييم المشاعر الجديدة
                response = `هذه فكرة رائعة وأكثر توازنًا! عندما تفكر بهذه الطريقة الجديدة ( "${userMessage}" )، كيف تشعر الآن حيال الموقف الذي تحدثنا عنه؟`;
                conversationState = 're_evaluate_feelings';
                break;

            case 're_evaluate_feelings':
                // المستخدم يقيم مشاعره بعد التغيير، ونقدم له ملخصًا أو نصيحة
                response = `ممتاز أنك تشعر بتحسن! تذكر أن تحديد وتحدي الأفكار السلبية هو مهارة يمكنك تطويرها. هل ترغب في تجربة تمرين سريع للاسترخاء الآن، أم نودع هذه الجلسة؟`;
                conversationState = 'initial_greeting'; // إعادة تعيين الحالة لبداية جديدة أو ميزة أخرى
                break;

            default:
                response = 'أنا أستمع إليك. كيف يمكنني مساعدتك أكثر؟';
                break;
        }

        // هنا يمكن إضافة ردود عامة للتعامل مع التحيات أو الأسئلة الشائعة خارج تدفق CBT الرئيسي
        if (userMessage.includes('كيف حالك') && conversationState !== 'initial_greeting') {
            return 'أنا نظام ذكاء اصطناعي، ليس لدي مشاعر، لكني جاهز لمساعدتك! لنواصل ما كنا نتحدث عنه.';
        }
        if (userMessage.includes('شكرا') || userMessage.includes('شكرا لك')) {
            return 'العفو، أنا هنا لدعمك ومساعدتك.';
        }
        if (userMessage.includes('مرحبا') || userMessage.includes('السلام عليكم')) {
             if (conversationState !== 'initial_greeting') {
                return 'أهلاً بك مرة أخرى! لنكمل محادثتنا.';
            }
        }


        return response; // إرجاع الرد النهائي بناءً على الحالة
    }

    // ربط زر الإرسال بالوظيفة
    sendButton.addEventListener('click', sendMessage);

    // السماح بإرسال الرسائل بالضغط على Enter
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

});
