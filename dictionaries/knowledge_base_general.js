// Knowledge Base for General-purpose AI Capabilities

const knowledgeBaseGeneral = {
    topics: [
        "Machine Learning",
        "Natural Language Processing",
        "Computer Vision",
        "Robotics",
        "Neural Networks",
        "Data Science",
        "AI Ethics"
    ],
    facts: {
        "Machine Learning": "A subset of AI that focuses on the development of algorithms that allow computers to learn from and make predictions based on data.",
        "Natural Language Processing": "The ability of a computer program to understand human language as it is spoken or written.",
        "Computer Vision": "An interdisciplinary field that enables computers to interpret and understand visual information from the world.",
        "Robotics": "The branch of technology that deals with the design, construction, operation, and application of robots.",
        "Neural Networks": "A series of algorithms that mimic the operations of a human brain to recognize relationships in a dataset.",
        "Data Science": "A field that uses scientific methods, processes, algorithms and systems to extract knowledge and insights from structured and unstructured data.",
        "AI Ethics": "A discipline that examines the moral implications and responsibilities of AI behaviors and impacts."
    },
    logicRules: [
        "If user asks a question, analyze intent and provide a response.",
        "If user input is unclear, ask clarifying questions.",
        "If faced with an unknown query, offer options for the user to choose from."
    ],
    conversationPatterns: [
        "Greeting",
        "Question-Response",
        "Clarification",
        "Feedback",
        "Goodbye"
    ],
    terminology: {
        "AI": "Artificial Intelligence",
        "ML": "Machine Learning",
        "NLP": "Natural Language Processing",
        "CV": "Computer Vision"
    },
    faqPatterns: [
        "What is AI?",
        "How does machine learning work?",
        "What are some applications of natural language processing?",
        "What ethical concerns are associated with AI?"
    ],
    relationshipMaps: {
        "ML": ["Data Science", "NLP"],
        "NLP": ["AI", "Computer Vision"],
        "Robotics": ["AI", "Machine Learning"]
    },
    confidenceMetrics: {
        "intents": {
            "high": "90-100%",
            "medium": "70-89%",
            "low": "below 70%"
        },
        "accuracy": {
            "high": "Above 95%",
            "medium": "80-94%",
            "low": "below 80%"
        }
    }
};

export default knowledgeBaseGeneral;