body {
    font-family: 'Cairo', sans-serif; /* A nice Arabic font */
    background-color: #f4f7f6;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
}

#chat-container {
    width: 400px;
    height: 600px;
    background-color: #fff;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

#chat-header {
    background-color: #8A2BE2; /* A warm purple color */
    color: white;
    padding: 15px;
    text-align: center;
    border-bottom: 1px solid #ddd;
}

#chat-history {
    flex-grow: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

/* Message Styling */
.message {
    padding: 10px 15px;
    border-radius: 18px;
    max-width: 80%;
    line-height: 1.5;
}

.user-message {
    background-color: #E1E1E1;
    color: #333;
    align-self: flex-start; /* Messages from user on the left */
    border-bottom-left-radius: 4px;
}

.bot-message {
    background-color: #8A2BE2;
    color: white;
    align-self: flex-end; /* Messages from bot on the right */
    border-bottom-right-radius: 4px;
}

/* Typing Indicator Styling */
#typing-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 12px 15px;
}
.typing-dot {
    width: 8px;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 50%;
    animation: typing-animation 1.2s infinite ease-in-out;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-animation {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
}

/* Input Area Styling */
#chat-input-area {
    display: flex;
    padding: 10px;
    border-top: 1px solid #ddd;
    background-color: #f9f9f9;
}

#user-input {
    flex-grow: 1;
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 10px 15px;
    font-size: 16px;
}

#send-button {
    background-color: #8A2BE2;
    color: white;
    border: none;
    border-radius: 20px;
    padding: 10px 20px;
    margin-right: 10px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.2s;
}

#send-button:hover {
    background-color: #7B1FA2;
}
