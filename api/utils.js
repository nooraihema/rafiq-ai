// utils.js v14.1 - Precision Sensory Upgrade
// Replaced unreliable `includes()` with precise whole-word matching for mood and entities.

import { STOPWORDS, NEGATORS, EMPHASIS, MOOD_KEYWORDS, CRITICAL_KEYWORDS, CONTEXTUAL_KEYWORDS } from './config.js';

// ------------ أدوات تطبيع عربي وtokenize ------------
export function normalizeArabic(text = "") {
  // ... (No changes here)
  return text.toString().toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/[إأٱآا]/g, "ا").replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء").replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenize(text) {
  // ... (No changes here)
  const t = normalizeArabic(text);
  if (!t) return [];
  return t.split(/\s+/).filter(w => w && !STOPWORDS.has(w));
}

// ------------ Levenshtein ------------
export function levenshtein(a, b) {
  // ... (No changes here)
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
// START: v14.1 PRECISION SENSORY UPGRADE
// =================================================================

const NORMALIZED_MOOD_KEYWORDS = Object.entries(MOOD_KEYWORDS).reduce((acc, [mood, keywords]) => {
    acc[mood] = keywords.map(kw => normalizeArabic(kw));
    return acc;
}, {});

/**
 * v14.1: Detects mood using precise, whole-word matching for superior accuracy.
 */
export function detectMood(msg) {
  const norm = normalizeArabic(msg);
  const messageTokens = new Set(norm.split(/\s+/)); // Split message into a Set for fast lookups

  for (const mood in NORMALIZED_MOOD_KEYWORDS) {
    for (const kw of NORMALIZED_MOOD_KEYWORDS[mood]) {
      // Check if the SET of message words HAS the keyword.
      if (messageTokens.has(kw)) {
          return mood;
      }
    }
  }
  return "محايد";
}

/**
 * v14.1: Extracts entities using precise, whole-word matching.
 */
export function extractEntities(rawMessage) {
    const norm = normalizeArabic(rawMessage);
    const messageTokens = new Set(norm.split(/\s+/));
    const entities = new Set();
    
    // Search for the broad, important concepts defined in the config
    for (const keyword of CONTEXTUAL_KEYWORDS) {
        const normalizedKeyword = normalizeArabic(keyword);
        // Check if the SET of message words HAS the keyword.
        if (messageTokens.has(normalizedKeyword)) {
            entities.add(keyword); // Add the original, human-readable keyword
        }
    }
    return Array.from(entities);
}

// =================================================================
// END: v14.1 PRECISION SENSORY UPGRADE
// =================================================================


export function detectCritical(msg) {
  const norm = normalizeArabic(msg);
  for (const kw of CRITICAL_KEYWORDS) if (norm.includes(normalizeArabic(kw))) return true; // `includes` is OK here for safety phrases
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
  if (normalizeArabic(rawMessage).includes("ما " + normalizeArabic(term))) return true;
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
