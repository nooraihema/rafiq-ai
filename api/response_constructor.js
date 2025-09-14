// response_constructor.js v1.0 - The Dynamic Response Core
// This module interprets the rich intent structure to build intelligent, contextual responses.

import { DEBUG } from './config.js';

// =================================================================
// START: HELPER FUNCTIONS
// =================================================================

/**
 * Selects a random item from an array.
 * @param {Array} arr The array to choose from.
 * @returns {*} A random item or null if the array is empty.
 */
function selectRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Finds a user's history for a specific action/suggestion.
 * @param {string} suggestionText The text of the suggestion.
 * @param {Object} userProfile The user's profile.
 * @returns {Object|null} The history object or null.
 */
function getEffectivenessHistory(suggestionText, userProfile) {
    const history = userProfile?.progress_tracking?.effectiveness_history || [];
    return history.find(item => item.action === suggestionText) || null;
}


// =================================================================
// END: HELPER FUNCTIONS
// =================================================================


/**
 * The main function to construct a dynamic response based on the full intent object and user profile.
 * @param {Object} fullIntent - The complete intent object from the JSON file.
 * @param {Object} userProfile - The user's profile, including short and long-term memory.
 * @param {string} detectedMood - The current detected mood of the user.
 * @param {string} rawMessage - The original message from the user.
 * @returns {Promise<Object>} A payload containing the final reply and other metadata.
 */
export async function constructDynamicResponse(fullIntent, userProfile, detectedMood, rawMessage) {
    if (!fullIntent) {
        return { reply: "أنا آسف، حدث خطأ ما ولم أتمكن من العثور على استجابة مناسبة.", source: "error_no_intent" };
    }

    let finalReplyParts = [];
    let context = {
        chosenSuggestion: null,
        chosenResponse: null,
        chosenFollowUp: null
    };

    // -----------------------------------------------------------------
    // Step 1: Apply Dynamic Response Logic to make a primary decision
    // -----------------------------------------------------------------
    const dynamicLogic = fullIntent.dynamic_response_logic || {};
    const lastInteraction = userProfile.shortMemory?.[userProfile.shortMemory.length - 1];

    // Example implementation of `if_previous_choice_effective`
    if (dynamicLogic.if_previous_choice_effective && lastInteraction?.effectiveness > 0.7) {
        // Here you would add logic to re-suggest or build upon the last choice.
        // For now, we'll just log it.
        if (DEBUG) console.log(`🧠 Dynamic Logic: Previous choice was effective.`);
    }

    // -----------------------------------------------------------------
    // Step 2: Select an Actionable Suggestion based on its own logic
    // -----------------------------------------------------------------
    const suggestions = fullIntent.actionable_suggestions || [];
    if (suggestions.length > 0) {
        // This is a simplified selection. A full implementation would parse the `logic` string.
        let potentialSuggestions = suggestions;
        const emotionIntensity = fullIntent.emotion?.intensity || 0.5;

        // Filter suggestions based on emotion
        if (emotionIntensity > 0.6 && ['قلق', 'حزن', 'غضب'].includes(detectedMood)) {
            potentialSuggestions = suggestions.filter(s => s.logic.includes("قلق مرتفع") || s.logic.includes("قلق في تزايد"));
        }

        // If no specific suggestions match, fall back to all suggestions.
        if (potentialSuggestions.length === 0) {
            potentialSuggestions = suggestions;
        }
        
        context.chosenSuggestion = selectRandom(potentialSuggestions);
    }
    
    // -----------------------------------------------------------------
    // Step 3: Select a Response Template
    // -----------------------------------------------------------------
    const responses = fullIntent.responses || [];
    if (responses.length > 0) {
        let potentialResponses = responses;
        
        // Prioritize emotion-sensitive responses if applicable
        if (detectedMood !== 'محايد') {
            const emotionResponses = responses.filter(r => r.type === "emotion_sensitive");
            if (emotionResponses.length > 0) {
                potentialResponses = emotionResponses;
            }
        } else {
            // Otherwise, use static responses
            const staticResponses = responses.filter(r => r.type === "static");
            if (staticResponses.length > 0) {
                potentialResponses = staticResponses;
            }
        }

        context.chosenResponse = selectRandom(potentialResponses);
    }

    // -----------------------------------------------------------------
    // Step 4: Assemble the core reply
    // -----------------------------------------------------------------
    if (context.chosenResponse) {
        // The `text` for static, or the `logic` description for dynamic ones as a placeholder
        finalReplyParts.push(context.chosenResponse.text || context.chosenResponse.logic);
    } else {
        finalReplyParts.push("أنا أفهمك. دعنا نفكر في هذا معًا."); // A safe default
    }

    if (context.chosenSuggestion) {
        finalReplyParts.push(`\n\nإليك اقتراح عملي قد يساعدك: ${context.chosenSuggestion.suggestion}`);
    }

    // -----------------------------------------------------------------
    // Step 5: Select a Follow-up Question
    // -----------------------------------------------------------------
    const followUps = fullIntent.follow_up_questions || [];
    const shouldAskFollowUp = Math.random() > 0.4; // Ask a question 60% of the time

    if (followUps.length > 0 && shouldAskFollowUp) {
        // A full implementation would check the `logic` of each question
        context.chosenFollowUp = selectRandom(followUps);
        finalReplyParts.push(`\n\n${context.chosenFollowUp.question}`);
    }

    // -----------------------------------------------------------------
    // Step 6: Generate and append progress feedback
    // -----------------------------------------------------------------
    const feedbackOptions = fullIntent.progress_feedback || [];
    // Example: Give feedback if the user has used a tool successfully before.
    if (context.chosenSuggestion) {
        const history = getEffectivenessHistory(context.chosenSuggestion.suggestion, userProfile);
        if (history && history.success_rate > 0.7) {
            const feedback = feedbackOptions.find(f => f.logic.includes("فعالاً بنسبة"));
            if (feedback) {
                // Personalize the feedback message
                let personalizedFeedback = feedback.feedback
                    .replace('80%', `${Math.round(history.success_rate * 100)}%`);
                finalReplyParts.push(`\n\n${personalizedFeedback}`);
            }
        }
    }


    return {
        reply: finalReplyParts.join(''),
        source: "dynamic_constructor",
        metadata: context
    };
}
