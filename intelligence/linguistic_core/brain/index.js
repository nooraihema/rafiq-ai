// intelligence/linguistic_core/brain/index.js
// Version 2.0: The Strategic Synthesizer
// This version evolves the Brain from a collection of powerful modules into a true
// strategic synthesizer. It now consumes the full PsychologicalProfile and the orchestrated
// WisdomPack to compose nuanced, multi-layered, and therapeutically-aligned responses.

// --- Imports ---
import { Dictionaries } from '../dictionaries/index.js';
import { sample } from '../utils.js';

// --- State Management (No changes here, it's solid) ---
const UserState = new Map();
// ... (ensureUser, clamp, and other helpers remain the same) ...
function ensureUser(userId) { /* ... */ }
function clamp(v, min = -10, max = 10) { /* ... */ }

// --- Core Modules (EmotionalGraph, MemoryShaping - No changes here) ---
function updateEmotionalGraph(userState, concepts, intensity) { /* ... */ }
function shapeMemory(userState, semanticMap, fingerprint) { /* ... */ }

// -----------------------------
// SECTION 1: THE SYNTHESIZER (UPGRADED)
// This is the new core of the reply generation.
// -----------------------------

/**
 * The new strategic composer. It weaves together the best gems from the WisdomPack
 * into a coherent and therapeutically sound response.
 * @param {import('../wisdom_orchestrator.js').WisdomPack} wisdomPack - The scored and sorted gems.
 * @param {import('../summarizer/index.js').PsychologicalProfile} profile - The user's psychological profile.
 * @param {object} userState - The user's memory and state.
 * @returns {{reply: string, used_gems: string[]}} The final composed reply and the IDs of gems used.
 */
function synthesizeReply(wisdomPack, profile, userState) {
    if (!wisdomPack || !wisdomPack.primary || wisdomPack.primary.length === 0) {
        // Fallback for when no gems are found
        return { reply: "أنا أفكر في كلامك... ممكن توضحلي أكتر؟", used_gems: [] };
    }

    const replyParts = [];
    const usedGems = [];

    // 1. Select the Opening Gem (usually validation or empathy)
    const openingGem = wisdomPack.primary.find(g => g.category === 'validation') || 
                       wisdomPack.primary.find(g => g.category === 'empathy') || 
                       wisdomPack.primary[0]; // Fallback to the highest scored gem
    
    replyParts.push(openingGem.content);
    usedGems.push(openingGem.gem_id);

    // 2. Select the Core Insight or Reframe Gem
    // We prioritize a gem that addresses the core tension or need.
    const insightGem = wisdomPack.primary.find(g => g.category === 'insight' || g.category === 'reframe') ||
                       wisdomPack.supporting.find(g => g.category === 'insight' || g.category === 'reframe');
    
    if (insightGem && !usedGems.includes(insightGem.gem_id)) {
        replyParts.push(insightGem.content);
        usedGems.push(insightGem.gem_id);
    }

    // 3. Select the Closing Gem (usually a question or an action prompt)
    const closingGem = wisdomPack.primary.find(g => g.category === 'question' || g.category === 'action_prompt') ||
                       wisdomPack.supporting.find(g => g.category === 'question' || g.category === 'action_prompt');

    if (closingGem && !usedGems.includes(closingGem.gem_id)) {
        replyParts.push(closingGem.content);
        usedGems.push(closingGem.gem_id);
    }

    // If no specific closing gem was found, ensure the conversation continues.
    if (replyParts.length <= 2) {
        const fallbackQuestion = sample(["إيه رأيك في الكلام ده؟", "هل ده بيوصف اللي بتحس بيه؟", "تحب نتكلم في النقطة دي أكتر؟"]);
        replyParts.push(fallbackQuestion);
    }
    
    const finalReply = replyParts.join(' ');
    
    return { reply: finalReply, used_gems: usedGems };
}


// -----------------------------
// SECTION 2: THE MAIN CONDUCTOR (UPGRADED)
// This is the primary entry point that orchestrates the new flow.
// -----------------------------

/**
 * The main entry point for the Brain.
 * @param {object} inputs - An object containing all necessary data.
 * @param {import('../summarizer/index.js').PsychologicalProfile} inputs.profile
 * @param {import('../wisdom_orchestrator.js').WisdomPack} inputs.wisdomPack
 * @param {string} inputs.userId
 * @param {object} [inputs.options] - Debugging options.
 * @returns {object} The final result object with the reply and diagnostics.
 */
export function processMessage({ profile, wisdomPack, userId = 'anon', options = {} }) {
    GlobalStats.messagesProcessed++;
    const userState = ensureUser(userId);

    const { _rawSemanticMap: semanticMap, mood, allConcepts } = profile;
    
    // --- Existing Modules Integration ---
    // 1. Update Emotional Graph (still valuable)
    const intensity = mood.intensity || 1.0;
    updateEmotionalGraph(userState, allConcepts, intensity);

    // 2. Memory Shaping (still valuable)
    // We need the fingerprint for this, let's assume it's inside the profile or passed separately if needed.
    // For now, we'll use the raw text from the semantic map.
    shapeMemory(userState, semanticMap, { originalMessage: semanticMap.rawText });
    
    // --- The New Synthesis Core ---
    // 3. Synthesize the reply using the new strategic composer
    const { reply, used_gems } = synthesizeReply(wisdomPack, profile, userState);

    // --- State Update ---
    // 4. Update user's mood history (now simpler)
    if (userState.lastMood === mood.primary) {
        userState.moodStreak++;
    } else {
        userState.moodStreak = 0;
        userState.lastMood = mood.primary;
    }
    userState.moodHistory.push({ mood: mood.primary, time: Date.now() });
    if (userState.moodHistory.length > 20) userState.moodHistory.shift();
    
    // Track used gems to avoid repetition
    userState.recentGems = [...(userState.recentGems || []), ...used_gems].slice(-10);

    // --- Final Packaging ---
    const result = {
        userId,
        reply,
        diagnostics: {
            detectedMood: mood,
            detectedNeed: profile.implicitNeed,
            detectedTension: profile.narrativeTension,
            usedGems: used_gems,
            topLibrary: wisdomPack.primary[0]?.source_library || 'N/A',
        }
    };

    if (options.debug) {
        console.log('[Brain.processMessage] result diagnostics:', result.diagnostics);
    }

    return result;
}

// ... (Other utility functions like provideFeedback, resetUserState, etc., remain unchanged) ...
// You can keep all your other exported functions here.
export function provideFeedback(userId, feedback) { /* ... */ }
export function resetUserState(userId) { /* ... */ }
export function inspectUserState(userId) { /* ... */ }
// etc.
