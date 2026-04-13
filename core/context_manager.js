class ContextManager {
    constructor(tokenLimit) {
        this.conversationHistory = [];
        this.tokenLimit = tokenLimit;
        this.currentContext = '';
    }

    addMessage(message) {
        this.conversationHistory.push(message);
        this.updateContext();
    }

    updateContext() {
        this.currentContext = this.conversationHistory.join('\n');
        this.ensureTokenLimit();
    }

    ensureTokenLimit() {
        while (this.tokenCount(this.currentContext) > this.tokenLimit) {
            this.conversationHistory.shift(); // Remove the oldest message
            this.currentContext = this.conversationHistory.join('\n');
        }
    }

    tokenCount(text) {
        return text.split(/\\s+/).length;
    }

    getContext() {
        return this.currentContext;
    }
}

// Example usage:
// const manager = new ContextManager(4096);
// manager.addMessage('User: Hello!');
// manager.addMessage('AI: Hi there! How can I help you?');
// console.log(manager.getContext());