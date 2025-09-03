document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elements ---
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    // --- 2. Application State ---
    let userProfile = JSON.parse(localStorage.getItem('userProfile')) || { name: null };
    let conversationState = userProfile.name ? 'general' : 'asking_name';
    let intentsData = []; // Will hold our knowledge base

    // --- 3. The "Brain" of Rafiq ---
    const RafiqBrain = {
        /**
         * Finds the best matching intent from the knowledge base.
         * @param {string} message The user's input.
         * @returns {object|null} The matched intent object or null.
         */
        findIntent: (message) => {
            const lowerCaseMessage = message.toLowerCase();
            // Search with priority: Critical intents first
            const criticalIntent = intentsData.find(intent =>
                intent.safety_protocol && intent.keywords.some(kw => lowerCaseMessage.includes(kw.toLowerCase()))
            );
            if (criticalIntent) return criticalIntent;

            const generalIntent = intentsData.find(intent =>
                !intent.safety_protocol && intent.keywords.some(kw => lowerCaseMessage.includes(kw.toLowerCase()))
            );
            return generalIntent || null;
        },

        /**
         * Generates a response based on the user's message and conversation state.
         * @param {string} message The user's input.
         * @returns {string} The bot's response text.
         */
        getResponse: (message) => {
            // State-based logic for initial interaction
            if (conversationState === 'asking_name') {
                userProfile.name = message.trim();
                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                conversationState = 'general';
                return `تشرفت بمعرفتك، ${userProfile.name}! اسمك جميل جدًا. أنا هنا لأسمعك، ما الذي يجول في خاطرك؟ 💜`;
            }

            // Intent-based logic for general conversation
            const intent = RafiqBrain.findIntent(message);

            // PRIORITY 1: SAFETY PROTOCOL
            if (intent && intent.safety_protocol === 'CRITICAL - IMMEDIATE_REDIRECT_TO_HELPLINE') {
                // IMPORTANT: Add your local helpline numbers here
                const helplineInfo = `\n\nأرقام الطوارئ:\n- الخط الساخن للدعم النفسي: [الرقم هنا]\n- الطوارئ: [الرقم هنا]`;
                return intent.response_before_redirect + helplineInfo;
            }

            if (intent && intent.responses) {
                // Select a random response to avoid repetition
                const randomResponse = intent.responses[Math.floor(Math.random() * intent.responses.length)];
                let finalResponse = randomResponse.replace(/\[اسم المستخدم\]/g, userProfile.name);

                // Add actionable advice if it exists
                if (intent.actionable_advice) {
                    finalResponse += `\n\n**نصيحة بسيطة:** ${intent.actionable_advice}`;
                }
                return finalResponse;
            }
            
            // Fallback response if no intent is matched
            return `أنا أستمع يا ${userProfile.name}. لم أفهم تمامًا، هل يمكنك التوضيح أكثر؟ أنا هنا من أجلك.`;
        }
    };

    // --- 4. UI Helper Functions ---
    /**
     * Adds a message to the chat history and scrolls down.
     * @param {string} sender 'user' or 'bot'.
     * @param {string} text The message content.
     */
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        // Use innerHTML to correctly render line breaks and bold text
        messageDiv.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Insert before the typing indicator
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
    /**
     * Handles the process of sending a message.
     */
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = '';
        showTyping();

        // Simulate bot thinking and get response
        setTimeout(() => {
            const botResponse = RafiqBrain.getResponse(message);
            hideTyping();
            addMessage('bot', botResponse);
        }, 1200 + Math.random() * 800); // Realistic delay
    }

    /**
     * Initializes the application.
     */
    async function startApp() {
        try {
            // Load the knowledge base from the JSON file
            const response = await fetch('intents.json');
            if (!response.ok) throw new Error('Network response was not ok');
            intentsData = await response.json();
            
            // Start the conversation
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
