// intelligence/linguistic_core/utils.js

/**
 * Returns a string representation of a value, defaulting to an empty string for null/undefined.
 * @param {*} s The value to stringify.
 * @returns {string}
 */
export function safeStr(s) { 
    return (s === null || s === undefined) ? "" : String(s); 
}

/**
 * Samples a random element from an array.
 * @param {Array<T>} arr The array to sample from.
 * @returns {T|null} A random element or null if the array is empty.
 */
export function sample(arr) { 
    if (!arr || arr.length === 0) return null; 
    return arr[Math.floor(Math.random() * arr.length)]; 
}

/**
 * Tokenizes text into words, removing punctuation.
 * @param {string} text The text to tokenize.
 * @returns {string[]} An array of cleaned words.
 */
export function tokenizeClean(text) {
  if (!text) return [];
  return safeStr(text).toLowerCase()
    .split(/\s+/)
    .map(t => t.replace(/[^\p{L}\p{N}_]+/gu, ""));
}
