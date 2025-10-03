// intelligence/linguistic_core/generator/index.js
// Version 3.0: The Eloquent Weaver
// This version simplifies the generator's role. It no longer makes strategic decisions.
// Its sole responsibility is to take a pre-selected, ordered array of gems
// from the Brain and weave them into a natural, flowing, and coherent paragraph.

import { sample } from '../utils.js';

// A small set of transition words to connect gems smoothly.
const TRANSITIONS = [
    'وفي نفس الوقت،', 
    'وبجانب ده،', 
    'وده بيخليني أفكر في نقطة تانية، وهي إن', 
    'وفوق كل ده،', 
    'ولهذا السبب،'
];

/**
 * The main function of the new Generator.
 * Weaves an array of selected gems into a final, polished reply.
 * @param {import('../wisdom_orchestrator.js').ScoredGem[]} selectedGems - An ordered array of gems chosen by the Brain.
 * @returns {string} - The final, composed reply string.
 */
export function weaveGemsIntoReply(selectedGems) {
    if (!selectedGems || selectedGems.length === 0) {
        // Fallback in case the Brain sends an empty list.
        return "أنا أفكر في كلامك... ممكن توضحلي أكتر؟";
    }

    // 1. Extract the content from the gem objects.
    const gemContents = selectedGems.map(gem => gem.content);

    // 2. Handle the simple cases first.
    if (gemContents.length === 1) {
        return gemContents[0]; // If there's only one gem, return it as is.
    }
    
    // 3. Weave multiple gems into a paragraph.
    let finalReply = gemContents[0]; // Start with the first gem.
    
    for (let i = 1; i < gemContents.length; i++) {
        const currentPart = gemContents[i];
        
        // Logic to add a transition word, but not always, for a more natural feel.
        // And avoid adding a transition before a question.
        if (i === 1 && !currentPart.includes('؟')) {
             // Use a transition for the second part to connect it to the first.
            finalReply += ` ${sample(TRANSITIONS)} ${currentPart.toLowerCase()}`;
        } else {
             // For subsequent parts, just add a space and the sentence.
            finalReply += ` ${currentPart}`;
        }
    }
    
    // 4. Basic final polishing.
    // (Future versions could add more advanced NLP polishing here).
    finalReply = finalReply.replace(/\s+/g, ' ').trim(); // Clean up extra spaces.

    return finalReply;
}
