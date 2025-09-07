// utils.js

import { STOPWORDS, NEGATORS, EMPHASIS, MOOD_KEYWORDS, CRITICAL_KEYWORDS } from './config.js';

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

// ------------ Levenshtein ------------
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

// ------------ Mood & Safety detection ------------
export function detectMood(msg) {
  const norm = normalizeArabic(msg);
  for (const mood in MOOD_KEYWORDS) {
    for (const kw of MOOD_KEYWORDS[mood]) {
      if (norm.includes(normalizeArabic(kw))) return mood;
    }
  }
  return "محايد";
}

export function detectCritical(msg) {
  const norm = normalizeArabic(msg);
  for (const kw of CRITICAL_KEYWORDS) if (norm.includes(normalizeArabic(kw))) return true;
  return false;
}

// ------------ Negation & emphasis helpers ------------
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

// ------------ Entity extraction & root cause ----------
export function extractEntities(rawMessage) {
  const norm = normalizeArabic(rawMessage);
  const tokens = norm.split(/\s+/).filter(Boolean);
  const entities = new Set();
  const peopleMarkers = ["صديقي","صديقتي","اخي","اختي","أمي","امي","أبوي","ابوي","زوجي","زوجتي","ابني","بنتي","مديري","معلمي"];
  for (let i = 0; i < tokens.length; i++) {
    if (peopleMarkers.includes(tokens[i])) {
      if (tokens[i+1] && !STOPWORDS.has(tokens[i+1])) entities.add(tokens[i+1]);
    }
  }
  const topics = ["العمل","الدراسة","الجامعة","البيت","العائلة","الزواج","المال","الفلوس","الصحة","الدوام","الموظفين","الامتحان","المدرسة"];
  for (const t of topics) if (norm.includes(t)) entities.add(t);
  return Array.from(entities);
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

// ------------ Helpers متفرقات ------------
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
```
