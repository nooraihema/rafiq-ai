// utils.js v15.0 - Semantic Core Integration
// Now features a powerful semantic expansion engine powered by synonyms.json.

import fs from 'fs';
import path from 'path';
import { STOPWORDS, NEGATORS, EMPHASIS, MOOD_KEYWORDS, CRITICAL_KEYWORDS, CONTEXTUAL_KEYWORDS } from './config.js';

// =================================================================
// START: SEMANTIC KNOWLEDGE BASE LOADER (NEW in v15.0)
// =================================================================

let SEMANTIC_KNOWLEDGE_BASE = {};
let REVERSE_SEMANTIC_MAP = {};

function loadSemanticKnowledgeBase() {
    try {
        const synonymsPath = path.join(process.cwd(), 'synonyms.json');
        const raw = fs.readFileSync(synonymsPath, 'utf8');
        const parsed = JSON.parse(raw);

        SEMANTIC_KNOWLEDGE_BASE = {};
        REVERSE_SEMANTIC_MAP = {};

        for (const key in parsed) {
            if (key.startsWith('__')) continue; // Ignore comments

            const normalizedKey = normalizeArabic(key);
            SEMANTIC_KNOWLEDGE_BASE[normalizedKey] = parsed[key].map(val => normalizeArabic(val));

            // Create the reverse map for fast lookups
            for (const value of SEMANTIC_KNOWLEDGE_BASE[normalizedKey]) {
                if (!REVERSE_SEMANTIC_MAP[value]) {
                    REVERSE_SEMANTIC_MAP[value] = [];
                }
                REVERSE_SEMANTIC_MAP[value].push(normalizedKey);
            }
        }
        console.log(`📚 Semantic Knowledge Base loaded with ${Object.keys(SEMANTIC_KNOWLEDGE_BASE).length} concepts.`);

    } catch (e) {
        console.error("❌ CRITICAL: Failed to load or parse synonyms.json. Semantic features will be disabled.", e);
        SEMANTIC_KNOWLEDGE_BASE = {};
        REVERSE_SEMANTIC_MAP = {};
    }
}

// Load the knowledge base on startup
loadSemanticKnowledgeBase();

// =================================================================
// END: SEMANTIC KNOWLEDGE BASE LOADER
// =================================================================


// ------------ أدوات تطبيع عربي وtokenize ------------
export function normalizeArabic(text = "") {
  return text.toString().toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/[إأٱآا]/g, "ا").replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء").replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenize(text) {
  const t = normalizeArabic(text);
  if (!t) return [];
  return t.split(/\s+/).filter(w => w && !STOPWORDS.has(w));
}

// ------------ Levenshtein (No changes) ------------
export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}


// =================================================================
// START: SEMANTICALLY-AWARE SENSORS (UPGRADED in v15.0)
// =================================================================

/**
 * v15.0 (NEW): Enriches a message with concepts from the semantic knowledge base.
 * @param {string} rawMessage The user's original message.
 * @returns {string} The message, enriched with parent concepts.
 */
export function expandMessageWithSemantics(rawMessage) {
    const norm = normalizeArabic(rawMessage);
    const tokens = new Set(norm.split(/\s+/));
    const conceptsToAdd = new Set();

    for (const token of tokens) {
        if (REVERSE_SEMANTIC_MAP[token]) {
            REVERSE_SEMANTIC_MAP[token].forEach(concept => conceptsToAdd.add(concept));
        }
    }
    
    // Add the new concepts back to the original message string
    if (conceptsToAdd.size > 0) {
        return `${norm} ${[...conceptsToAdd].join(' ')}`;
    }

    return norm; // Return original normalized message if no expansion
}


const NORMALIZED_MOOD_KEYWORDS = Object.entries(MOOD_KEYWORDS).reduce((acc, [mood, keywords]) => {
    acc[mood] = keywords.map(kw => normalizeArabic(kw));
    return acc;
}, {});

/**
 * v15.0: Detects mood using precise, whole-word matching.
 * NOTE: This function now works on the SEMANTICALLY EXPANDED message passed from chat.js.
 */
export function detectMood(semanticallyExpandedMessage) {
  const messageTokens = new Set(semanticallyExpandedMessage.split(/\s+/));
  for (const mood in NORMALIZED_MOOD_KEYWORDS) {
    for (const kw of NORMALIZED_MOOD_KEYWORDS[mood]) {
      if (messageTokens.has(kw)) {
          return mood;
      }
    }
  }
  return "محايد";
}

/**
 * v15.0: Extracts entities using precise, whole-word matching.
 * NOTE: This function now works on the SEMANTICALLY EXPANDED message passed from chat.js.
 */
export function extractEntities(semanticallyExpandedMessage) {
    const messageTokens = new Set(semanticallyExpandedMessage.split(/\s+/));
    const entities = new Set();
    
    for (const keyword of CONTEXTUAL_KEYWORDS) {
        const normalizedKeyword = normalizeArabic(keyword);
        if (messageTokens.has(normalizedKeyword)) {
            entities.add(keyword);
        }
    }
    return Array.from(entities);
}

// =================================================================
// END: SEMANTICALLY-AWARE SENSORS
// =================================================================


export function detectCritical(msg) {
  const norm = normalizeArabic(msg);
  for (const kw of CRITICAL_KEYWORDS) if (norm.includes(normalizeArabic(kw))) return true;
  return false;
}

// ------------ The rest of the file has no changes ------------
function tokensArray(text) { return normalizeArabic(text).split(/\s+/).filter(Boolean); }
export function hasNegationNearby(rawMessage, term) {
  const tokens = tokensArray(rawMessage);
  const termTokens = tokensArray(term);
  if (!termTokens.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === termTokens[0]) {
      for (let j = Math.max(0, i - 2); j < i; j++) if (NEGATORS.has(tokens[j])) return true;
    }
  }
  if (normalizeArabic(rawMessage).includes("ma " + normalizeArabic(term))) return true;
  return false;
}
export function hasEmphasisNearby(rawMessage, term) {
  const tokens = tokensArray(rawMessage);
  const termTokens = tokensArray(term);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === termTokens[0]) {
      for (let j = i + 1; j <= Math.min(tokens.length - 1, i + 3); j++) if (EMPHASIS.has(tokens[j])) return true;
    }
  }
  return false;
}
export function detectStyleSignals(rawMessage) {
    const norm = normalizeArabic(rawMessage);
    const tokens = tokenize(rawMessage);
    const isQuestion = /[\?؟]$/.test(rawMessage.trim()) || /^\s*(هل|متى|لماذا|أين|كيف|من|ما|كم)\b/.test(rawMessage.trim());
    const sarcasm = /(بجد\?|عنجد\?|يا سلام\?)/i.test(rawMessage) || /(؟\?){1,}/.test(rawMessage);
    const hasBasicEmphasis = tokens.some(t => EMPHASIS.has(t)) || /[!！]{2,}/.test(rawMessage);
    let emotionalIntensity = 1.0;
    if (/(.)\1{2,}/.test(norm)) emotionalIntensity += 0.2;
    if (/[😭😢😡😠😥😫😩🔥💥]/.test(rawMessage)) emotionalIntensity += 0.3;
    return { 
        isQuestion, 
        sarcasm, 
        hasBasicEmphasis,
        emotionalIntensity: parseFloat(emotionalIntensity.toFixed(2)),
        tokens 
    };
}
export function extractRootCause(rawMessage) {
  const markers = ["بسبب", "لأن", "علشان", "على خاطر", "بعد ما", "عشان"];
  const norm = rawMessage;
  for (const m of markers) {
    const idx = norm.indexOf(m);
    if (idx !== -1) {
      const cause = norm.slice(idx + m.length).trim();
      if (cause) return cause.split(/[.,؟!]/)[0].trim();
    }
  }
  return null;
}
export function cairoGreetingPrefix() {
  const now = new Date();
  const cairoHour = (now.getUTCHours() + 2) % 24;
  if (cairoHour >= 5 && cairoHour < 12) return "صباح الخير";
  if (cairoHour >= 12 && cairoHour < 17) return "مساء الخير";
  return "مساء النور";
}
export function adaptReplyBase(reply, userProfile, mood) {
  const tone = (userProfile && userProfile.preferredTone) || "warm";
  let prefix = "", suffix = "";
  if (tone === "warm") { prefix = ""; suffix = " 💜"; }
  else if (tone === "clinical") { prefix = ""; suffix = ""; }
  else if (tone === "playful") { prefix = ""; suffix = " 😉"; }
  if (mood === "حزن") prefix = "أنا معااك دلوقتي، ";
  else if (mood === "قلق") prefix = "خد نفس عميق، ";
  else if (mood === "فرح") prefix = "يا سلام! ";
  return `${prefix}${reply}${suffix}`.trim();
}
export function criticalSafetyReply() {
  return "كلامك مهم جدًا وأنا آخذه على محمل الجد. لو عندك أفكار لإيذاء نفسك أو فقدت الأمان، مهم جدًا تكلم حد موثوق فورًا أو تواصل مع جهة مختصة قريبة منك. لو تقدر، كلّمني أكتر دلوقتي عن اللي بيمرّ عليك وأنا معاك خطوة بخطوة 💙";
}
