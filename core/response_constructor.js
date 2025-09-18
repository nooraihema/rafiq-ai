
// response_constructor.js v1.1 - The Dynamic Response Core (Enhanced Integration)
// This module interprets the rich intent structure to build intelligent, contextual responses
// and integrates smoothly with context_tracker & learning modules.

// =omed================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { DEBUG } from '../shared/config.js';
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================

/**
 * Selects a random item from an array.
 */
function selectRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Finds a user's history for a specific action/suggestion.
 */
function getEffectivenessHistory(suggestionText, userProfile) {
    const history = userProfile?.progress_tracking?.effectiveness_history || [];
    return history.find(item => item.action === suggestionText) || null;
}

/**
 * Constructs a dynamic, contextual response.
 */
export async function constructDynamicResponse(fullIntent, userProfile, detectedMood, rawMessage, contextState = null) {
    if (!fullIntent) {
        return { reply: "أنا آسف، لم أتمكن من العثور على استجابة مناسبة.", source: "error_no_intent" };
    }

    let finalReplyParts = [];
    let context = {
        intentId: fullIntent.id || null,
        chosenSuggestion: null,
        chosenResponse: null,
        chosenFollowUp: null
    };

    // STEP 1: Apply dynamic response logic
    const dynamicLogic = fullIntent.dynamic_response_logic || {};
    const lastInteraction = userProfile.shortMemory?.[userProfile.shortMemory.length - 1];

    if (dynamicLogic.if_previous_choice_effective && lastInteraction?.effectiveness > 0.7) {
        if (DEBUG) console.log(`🧠 Dynamic Logic: Previous choice effective, building upon it.`);
    }

    // STEP 2: Select actionable suggestion
    const suggestions = fullIntent.actionable_suggestions || [];
    if (suggestions.length > 0) {
        let potentialSuggestions = suggestions;
        const emotionIntensity = fullIntent.emotion?.intensity || 0.5;

        if (emotionIntensity > 0.6 && ['قلق', 'حزن', 'غضب'].includes(detectedMood)) {
            potentialSuggestions = suggestions.filter(s => s.logic.includes("قلق مرتفع") || s.logic.includes("قلق في تزايد"));
        }

        if (contextState?.is_stuck_in_loop) {
            // لو المستخدم عالق في نفس الحاجة، نقترح حاجة مختلفة
            potentialSuggestions = suggestions.filter(s => !s.logic.includes("مكرر"));
        }

        if (potentialSuggestions.length === 0) {
            potentialSuggestions = suggestions;
        }
        context.chosenSuggestion = selectRandom(potentialSuggestions);
    }

    // STEP 3: Select response template
    const responses = fullIntent.responses || [];
    if (responses.length > 0) {
        let potentialResponses = responses;

        if (detectedMood !== 'محايد') {
            const emotionResponses = responses.filter(r => r.type === "emotion_sensitive");
            if (emotionResponses.length > 0) potentialResponses = emotionResponses;
        } else {
            const staticResponses = responses.filter(r => r.type === "static");
            if (staticResponses.length > 0) potentialResponses = staticResponses;
        }

        context.chosenResponse = selectRandom(potentialResponses);
    }

    // STEP 4: Assemble reply
    if (context.chosenResponse) {
        finalReplyParts.push(context.chosenResponse.text || context.chosenResponse.logic);
    } else {
        finalReplyParts.push("أنا أفهمك. دعنا نفكر في هذا معًا.");
    }

    if (context.chosenSuggestion) {
        finalReplyParts.push(`\n\n💡 اقتراح عملي: ${context.chosenSuggestion.suggestion}`);
    }

    // STEP 5: Add follow-up
    const followUps = fullIntent.follow_up_questions || [];
    const shouldAskFollowUp = Math.random() > 0.4;

    if (followUps.length > 0 && shouldAskFollowUp) {
        context.chosenFollowUp = selectRandom(followUps);
        finalReplyParts.push(`\n\n${context.chosenFollowUp.question}`);
    }

    // STEP 6: Add feedback
    const feedbackOptions = fullIntent.progress_feedback || [];
    if (context.chosenSuggestion) {
        const history = getEffectivenessHistory(context.chosenSuggestion.suggestion, userProfile);
        if (history && history.success_rate > 0.7) {
            const feedback = feedbackOptions.find(f => f.logic.includes("فعالاً بنسبة"));
            if (feedback) {
                let personalizedFeedback = feedback.feedback
                    .replace('80%', `${Math.round(history.success_rate * 100)}%`);
                finalReplyParts.push(`\n\n✅ ${personalizedFeedback}`);
            }
        }
    }

    if (DEBUG) {
        console.log("📝 Final Response Context:", context);
    }

    return {
        reply: finalReplyParts.join(''),
        source: "dynamic_constructor",
        metadata: context
    };
}
