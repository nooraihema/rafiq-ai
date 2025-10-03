// intelligence/linguistic_core/index.js
// Version 4.0: The Unified Cognitive Cycle Conductor
// This file orchestrates the complete cognitive cycle:
// 1. Understanding (Summarizer) -> Creates the Psychological Profile.
// 2. Strategy (Wisdom Orchestrator) -> Creates the WisdomPack.
// 3. Synthesis (Brain & Generator) -> Composes the final reply.

import { tokenize } from './tokenizer/index.js';
import { createPsychologicalProfile } from './summarizer/index.js';
import { orchestrateWisdom } from './wisdom_orchestrator.js';
import { processMessage } from './brain/index.js';
import { weaveGemsIntoReply } from './generator/index.js';

/**
 * The primary, sole entry point for the entire advanced linguistic core.
 * @param {string} userMessage - The raw user message.
 * @param {object[]} allWisdomLibraries - An array of all loaded wisdom library files.
 * @param {object} [fingerprint={}] - Legacy fingerprint object for integration.
 * @param {string} [userId='anon'] - The user's unique ID.
 * @param {object} [userState={}] - The user's current state object.
 * @returns {Promise<object|null>} - The final result object containing the reply and updated state, or null on failure.
 */
export async function generateAdvancedReply(
    userMessage, 
    allWisdomLibraries, 
    fingerprint = {}, 
    userId = 'anon', 
    userState = {}
) {
    try {
        // --- PRE-PROCESSING ---
        // Create the foundational SemanticMap once.
        const semanticMap = tokenize(userMessage);

        // --- STAGE 1: UNDERSTANDING ---
        console.log("[Conductor] ==> STAGE 1: Creating Psychological Profile...");
        const { profile, updatedUserState } = createPsychologicalProfile(semanticMap, fingerprint, userState);
        console.log(`[Conductor] Profile created. Need: '${profile.implicitNeed.dominant}', Mood: '${profile.mood.primary}'`);

        // --- STAGE 2: STRATEGY ---
        console.log("[Conductor] ==> STAGE 2: Orchestrating Wisdom...");
        const recentGems = userState.recentGems || [];
        const wisdomPack = orchestrateWisdom(profile, allWisdomLibraries, recentGems);
        console.log(`[Conductor] WisdomPack created. Found ${wisdomPack.primary.length} primary gems.`);

        // --- STAGE 3: SYNTHESIS ---
        console.log("[Conductor] ==> STAGE 3: Invoking Brain for Synthesis...");
        const brainResult = processMessage({
            profile,
            wisdomPack,
            userId,
            userState: updatedUserState, // Pass the state that was updated by the summarizer
            options: { debug: true }
        });

        if (!brainResult || !brainResult.reply) {
            console.error("[Conductor] Brain did not produce a valid reply.");
            // We can still use the generator with the top gem as a fallback
            const fallbackReply = weaveGemsIntoReply(wisdomPack.primary.slice(0, 1));
            if (fallbackReply) {
                 return { reply: fallbackReply, updatedUserState: brainResult.updatedUserState || updatedUserState };
            }
            return null;
        }
        
        console.log("[Conductor] Cognitive Cycle Complete.");
        
        // The brainResult should already contain the updated user state.
        return brainResult;

    } catch (error)
    {
        console.error("[Conductor] FATAL ERROR in Cognitive Cycle:", error);
        return null; // Return null to allow fallback logic to handle the error.
    }
}
