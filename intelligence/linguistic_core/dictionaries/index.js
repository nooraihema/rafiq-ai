// intelligence/linguistic_core/dictionaries/index.js
// Version 2.0: Centralized Knowledge Hub
// This file acts as the main distributor for all linguistic and psychological knowledge
// stored in the various dictionary files. It imports them all and exports them in a
// single, structured object for easy access throughout the cognitive core.

import { CONCEPT_DEFINITIONS, CONCEPT_MAP } from './concepts.js';
import { CAUSAL_PATTERNS, NARRATIVE_TENSIONS } from './patterns.js';
import INTENSIFIERS from './intensifiers.js'; // Can use default import
import ANCHOR_MOODS from './anchors.js';   // Can use default import
import { STOP_WORDS } from './stop_words.js';
import { GENERATIVE_LEXICON } from './generative.js';
import { PREFIXES, SUFFIXES } from './affixes.js';

/**
 * A centralized list of all possible mood types the system can aim for in a response.
 * This provides a single source of truth for mood-related logic.
 * @type {string[]}
 */
export const AVAILABLE_MOODS = [
    'supportive', // For empathy, validation, and comfort.
    'calming',    // For reducing anxiety, fear, and overwhelm.
    'empowering', // For building self-esteem, motivation, and agency.
    'celebratory',// For acknowledging progress and success.
    'reflective', // For encouraging introspection and deeper insight.
];

/**
 * The main export object that aggregates all dictionaries into a single, easily accessible hub.
 * This is the primary way other modules should access the system's knowledge base.
 */
export const Dictionaries = {
    // Core psychological and linguistic data
    CONCEPT_DEFINITIONS,
    CONCEPT_MAP,
    
    // Abstract psychological patterns and conflicts
    CAUSAL_PATTERNS,
    NARRATIVE_TENSIONS,
    
    // Mood and intensity modifiers
    INTENSIFIERS,
    ANCHOR_MOODS,
    
    // NLP processing tools
    STOP_WORDS,
    PREFIXES,
    SUFFIXES,
    
    // Generative tools
    GENERATIVE_LEXICON,
    
    // System constants
    AVAILABLE_MOODS,
};

// For convenience, you can also export it as a default
export default Dictionaries;
