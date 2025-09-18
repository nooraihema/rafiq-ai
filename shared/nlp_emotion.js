// shared/nlp_emotion.js
    import { MOOD_KEYWORDS } from './config.js'; // Assumes MOOD_KEYWORDS is in config.js
    import { tokenize } from './utils.js';

    /**
     * Extracts a simple emotion vector based on keyword matching.
     * The order of emotions should be consistent.
     */
    export function extractEmotionVector(userMessage) {
        const emotions = ["قلق", "فرح", "حزن", "غضب", "أمل", "فضول"]; // Consistent order
        const vector = new Array(emotions.length).fill(0);
        const tokens = new Set(tokenize(userMessage));

        emotions.forEach((emo, idx) => {
            const keywords = MOOD_KEYWORDS[emo] || [];
            for (const kw of keywords) {
                if (tokens.has(kw)) {
                    vector[idx] += 1;
                }
            }
        });

        return vector;
    }

    /**
     * Extracts keywords from a message (simple version).
     */
    export function extractKeywords(userMessage) {
        return tokenize(userMessage); // For now, we consider all non-stopwords as keywords.
    }
