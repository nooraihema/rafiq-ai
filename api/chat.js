
// /api/chat.js
// ==========================
// رفيق - محرك نوايا متقدّم: TF-IDF + Scoring + Negation + DialogTree + Memory + Safety
// ==========================

import fs from "fs";
import path from "path";
import crypto from "crypto";

// -------------- إعداد عام --------------
const ROOT = process.cwd();
const INTENTS_PATH = path.join(ROOT, "intents.json");
const DATA_DIR = path.join(ROOT, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.12");
const DEBUG = process.env.DEBUG === "1";
const SHORT_MEMORY_LIMIT = parseInt(process.env.SHORT_MEMORY_LIMIT || "5", 10);
const LONG_TERM_LIMIT = parseInt(process.env.LONG_TERM_LIMIT || "60", 10);

// -------------- أدوات تطبيع / تقسيم عربي --------------
function normalizeArabic(text = "") {
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/[إأٱآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "في","من","على","عن","الى","الي","او","ام","ان","انا","انت","هو","هي","هم",
  "مع","ما","لا","لم","لن","قد","ثم","كل","ايه","ايضا","بس","لكن","هذه","هذا",
  "ذلك","الذي","التي","اللي","كان","كانت","كون","يكون","هوه","هيه","يا","ياعم",
]);

function tokenize(text) {
  const t = normalizeArabic(text);
  if (!t) return [];
  return t.split(/\s+/).filter(w => w && !STOPWORDS.has(w));
}

// -------------- Levenshtein (مطابقة غامضة) --------------
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// -------------- تحميل intents + إعداد (precompute) --------------
let INTENTS_RAW = [];
let intentVectors = []; // { tag, responses, safety, keywords[], patterns[], vector, norm }
let tagToIndex = {};

function loadIntentsRaw() {
  try {
    const raw = fs.readFileSync(INTENTS_PATH, "utf8");
    const json = JSON.parse(raw);
    const arr = Array.isArray(json.intents) ? json.intents : json;
    return arr.map((it, idx) => {
      const tag = it.tag || it.intent || it.id || `intent_${idx}`;
      const patterns = Array.isArray(it.patterns) ? it.patterns : [];
      const keywords = Array.isArray(it.keywords) ? it.keywords : [];
      const responses = Array.isArray(it.responses) ? it.responses : (it.response ? [it.response] : []);
      const safety = (it.safety_protocol || "").toUpperCase().trim();
      const follow_up_question = it.follow_up_question || null;
      const follow_up_intents = Array.isArray(it.follow_up_intents) ? it.follow_up_intents : [];
      return { tag, patterns, keywords, responses, safety, follow_up_question, follow_up_intents };
    });
  } catch (e) {
    console.error("Failed reading intents.json:", e);
    return [];
  }
}

function buildTfIdfIndex() {
  INTENTS_RAW = loadIntentsRaw();
  const docsTokens = INTENTS_RAW.map(it => tokenize([...it.patterns, ...it.keywords].join(" ")));

  // DF & IDF
  const df = {};
  docsTokens.forEach(tokens => {
    const uniq = new Set(tokens);
    uniq.forEach(t => df[t] = (df[t] || 0) + 1);
  });
  const N = Math.max(1, docsTokens.length);
  const idf = {};
  Object.keys(df).forEach(t => { idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1; });

  intentVectors = INTENTS_RAW.map((it, i) => {
    const tokens = docsTokens[i];
    const counts = {};
    tokens.forEach(t => counts[t] = (counts[t] || 0) + 1);
    const total = Math.max(1, tokens.length);
    const vec = {};
    let sq = 0;
    Object.keys(counts).forEach(t => {
      const tf = counts[t] / total;
      const v = tf * (idf[t] || 1);
      vec[t] = v;
      sq += v * v;
    });
    const norm = Math.sqrt(sq) || 1;
    const keywordsNorm = it.keywords.map(normalizeArabic);
    const patternsNorm = it.patterns.map(normalizeArabic);
    return {
      tag: it.tag,
      responses: it.responses,
      safety: it.safety,
      keywords: keywordsNorm,
      patterns: patternsNorm,
      follow_up_question: it.follow_up_question || null,
      follow_up_intents: it.follow_up_intents || [],
      vector: vec,
      norm
    };
  });

  tagToIndex = {};
  intentVectors.forEach((iv, idx) => { tagToIndex[iv.tag] = idx; });

  if (DEBUG) console.log("✅ Built TF-IDF index:", intentVectors.length);
}
buildTfIdfIndex();

// -------------- Users storage (file) --------------
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}), "utf8");
      return {};
    }
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.error("Failed to load users file:", e);
    return {};
  }
}
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    if (DEBUG) console.log("Saved users");
  } catch (e) {
    console.error("Failed to save users file:", e);
  }
}
function makeUserId() {
  return crypto.randomBytes(8).toString("hex");
}

// -------------- Mood detection & critical detection --------------
const MOOD_KEYWORDS = {
  حزن: ["حزين","زعلان","مكسور","بكاء","بعيط","مكتئب","مش قادر","ضايق","متضايق","حزن","حسيت بالحزن","زهقان"],
  فرح: ["مبسوط","فرحان","سعيد","مستمتع","مبسوط جدا","مبسوطة"],
  قلق: ["قلقان","خايف","متوتر","مضطرب","مخنوق","توتر","خايفة"],
  غضب: ["غضبان","متعصب","زعلان جدا","مستفز","عصبي","عايز انفجر"],
  وحدة: ["لوحدي","وحيد","محدش معايا","مفيش حد"],
  حب: ["بحبك","مشتاق","وحشتني","احبك"]
};
function detectMood(message) {
  const norm = normalizeArabic(message);
  for (const mood in MOOD_KEYWORDS) {
    for (const kw of MOOD_KEYWORDS[mood]) {
      if (norm.includes(normalizeArabic(kw))) return mood;
    }
  }
  return "محايد";
}
const CRITICAL_KEYWORDS = ["انتحار","عايز اموت","عايز أموت","مش عايز اعيش","هقتل نفسي","اقتل نفسي","انا هموت","موتي"];
function detectCritical(message) {
  const norm = normalizeArabic(message);
  for (const kw of CRITICAL_KEYWORDS) {
    if (norm.includes(normalizeArabic(kw))) return true;
  }
  return false;
}

// -------------- Negation & emphasis helpers --------------
const NEGATORS = new Set(["لا","مش","ما","ليس","لست","بدون","ابدا","أبدا","وليس"]);
const EMPHASIS = new Set(["جدا","للغاية","بشدة","كتير","قوي","قوية","تماما","بصراحة"]);

function tokensArray(text) {
  return normalizeArabic(text).split(/\s+/).filter(Boolean);
}

function hasNegationNearby(rawMessage, term) {
  const tokens = tokensArray(rawMessage);
  const termTokens = tokensArray(term);
  if (!termTokens.length) return false;
  // find occurrences of first token of term
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === termTokens[0]) {
      // check previous up to 2 tokens for negator
      for (let j = Math.max(0, i - 2); j < i; j++) {
        if (NEGATORS.has(tokens[j])) return true;
      }
    }
  }
  // also check pattern "ما + verb + term" by simple substring check of "ما " + term
  if (normalizeArabic(rawMessage).includes("ما " + normalizeArabic(term))) return true;
  return false;
}

function hasEmphasisNearby(rawMessage, term) {
  const tokens = tokensArray(rawMessage);
  const termTokens = tokensArray(term);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === termTokens[0]) {
      // check next up to 3 tokens for emphasis
      for (let j = i + 1; j <= Math.min(tokens.length - 1, i + 3); j++) {
        if (EMPHASIS.has(tokens[j])) return true;
      }
    }
  }
  return false;
}

// -------------- Similarity / Vector helpers --------------
function buildMessageVector(message) {
  const tokens = tokenize(message);
  const counts = {};
  tokens.forEach(t => counts[t] = (counts[t] || 0) + 1);
  const total = Math.max(1, tokens.length);
  const vec = {};
  let sq = 0;
  Object.keys(counts).forEach(t => {
    const tf = counts[t] / total;
    vec[t] = tf;
    sq += tf * tf;
  });
  const norm = Math.sqrt(sq) || 1;
  return { vec, norm };
}

function cosineScore(messageVec, intentVec, messageNorm, intentNorm) {
  let dot = 0;
  for (const t in messageVec) {
    if (intentVec[t]) dot += messageVec[t] * intentVec[t];
  }
  const denom = (messageNorm || 1) * (intentNorm || 1);
  return denom ? (dot / denom) : 0;
}

// -------------- Scoring system (counts + cosine + boosts) --------------
function scoreIntent(rawMessage, msgVec, msgNorm, intent) {
  // 1) count keyword/pattern matches (consider negation)
  const normMsg = normalizeArabic(rawMessage);
  let matchCount = 0;
  let matchExactCount = 0;
  const matchedTerms = [];
  for (const kw of intent.keywords || []) {
    if (!kw) continue;
    const nkw = normalizeArabic(kw);
    if (nkw && normMsg.includes(nkw)) {
      if (!hasNegationNearby(rawMessage, nkw)) {
        matchCount++;
        matchedTerms.push(nkw);
        if (normMsg === nkw) matchExactCount++;
      }
    } else {
      // fuzzy token-to-token
      const toks = new Set(tokenize(rawMessage));
      for (const tok of toks) {
        if (levenshtein(tok, nkw) <= 1 && !hasNegationNearby(rawMessage, nkw)) {
          matchCount++;
          matchedTerms.push(nkw);
          break;
        }
      }
    }
  }
  for (const pat of intent.patterns || []) {
    if (!pat) continue;
    const npat = normalizeArabic(pat);
    if (npat && normMsg.includes(npat) && !hasNegationNearby(rawMessage, npat)) {
      matchCount++;
      matchedTerms.push(npat);
    }
  }

  // normalize count score: more matches => higher but saturates
  const countScore = matchCount > 0 ? (matchCount / (matchCount + 1)) : 0;

  // cosine similarity
  const cs = cosineScore(msgVec, intent.vector, msgNorm, intent.norm) || 0;
  // emphasis boost if user emphasized matched terms
  let emphasisBoost = 0;
  for (const t of matchedTerms) {
    if (hasEmphasisNearby(rawMessage, t)) emphasisBoost += 0.08;
  }
  // direct substring strong boost already partially included via matchCount but we add small bonus
  const directBoost = matchCount > 0 ? 0.06 : 0;

  // final weighted score
  // weights chosen so that small messages with keyword still get decent score
  const wCount = 0.60, wCos = 0.34, wDirect = 0.06;
  const final = (countScore * wCount) + (Math.max(0, cs) * wCos) + directBoost + emphasisBoost;
  return { final, countScore, cosine: cs, matchedTerms };
}

// -------------- Time-aware greeting --------------
function cairoGreetingPrefix() {
  const now = new Date();
  const cairoHour = (now.getUTCHours() + 2) % 24; // Africa/Cairo UTC+2
  if (cairoHour >= 5 && cairoHour < 12) return "صباح الخير";
  if (cairoHour >= 12 && cairoHour < 17) return "مساء الخير"; // 下午用 مساء للبساطة
  return "مساء النور";
}

// -------------- External providers (Together minimal) --------------
async function callTogetherAPI(userText) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("No TOGETHER_API_KEY defined");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.together.xyz/inference", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3-8B-Instruct-Turbo",
        input: `أجب عربيًا باختصار وبأسلوب داعم ولطيف دون نصائح طبية.\n\nسؤال المستخدم: ${userText}`,
        max_output_tokens: 220,
        temperature: 0.5
      }),
    });
    const data = await res.json();
    const out = data.output_text || data.output?.[0]?.content || data[0]?.generated_text;
    return (typeof out === "string" && out.trim()) ? out.trim() : "محتاج منك توضيح بسيط كمان 💜";
  } catch (e) {
    if (DEBUG) console.warn("Together API error:", e);
    return "حالياً مش قادر أستخدم الموديل الخارجي، بس أنا معاك وجاهز أسمعك. احكيلي أكتر 💙";
  } finally { clearTimeout(t); }
}

// -------------- Safety reply --------------
function criticalSafetyReply() {
  return "كلامك مهم جدًا وأنا آخذه على محمل الجد. لو عندك أفكار لإيذاء نفسك أو فقدت الأمان، مهم جدًا تكلم حد موثوق فورًا أو تواصل مع جهة مختصة قريبة منك. لو تقدر، كلّمني أكتر دلوقتي عن اللي بيمرّ عليك وأنا معاك خطوة بخطوة 💙";
}

// -------------- Main handler --------------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString();
    if (!rawMessage || !rawMessage.trim()) return res.status(400).json({ error: "Empty message" });

    // users load/create
    const users = loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = {
        id: userId,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        preferredTone: "warm",
        shortMemory: [],
        longMemory: [],
        moodHistory: [],
        flags: {},
        expectingFollowUp: null // { parentTag, allowedTags: [], expiresTs }
      };
      saveUsers(users);
      if (DEBUG) console.log("Created user", userId);
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    // quick critical safety
    if (detectCritical(rawMessage)) {
      profile.flags.critical = true;
      saveUsers(users);
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // analyze mood
    const mood = detectMood(rawMessage);
    profile.moodHistory = profile.moodHistory || [];
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });
    if (profile.moodHistory.length > LONG_TERM_LIMIT) profile.moodHistory.shift();

    // handle follow-up flow: if expectingFollowUp -> restrict to allowed intents
    let allowedIndices = null;
    if (profile.expectingFollowUp && profile.expectingFollowUp.expiresTs > Date.now()) {
      const allowed = profile.expectingFollowUp.allowedTags || [];
      allowedIndices = allowed.map(tag => tagToIndex[tag]).filter(i => typeof i === "number");
      if (DEBUG) console.log("Expecting follow-up, allowed indices:", allowedIndices);
    } else {
      profile.expectingFollowUp = null; // expired or absent
    }

    // build message vector
    const msg = buildMessageVector(rawMessage);
    const mNorm = msg.norm;

    // scoring across intents (or restricted set)
    let best = { idx: -1, score: 0, details: null };
    const candidateIndices = (Array.isArray(allowedIndices) && allowedIndices.length) ? allowedIndices : intentVectors.map((_,i)=>i);

    for (const i of candidateIndices) {
      const intent = intentVectors[i];
      const sc = scoreIntent(rawMessage, msg.vec, mNorm, intent);
      if (sc.final > best.score) best = { idx: i, score: sc.final, details: sc };
      if (DEBUG) {
        console.log(`[SCORE] tag=${intent.tag} final=${sc.final.toFixed(3)} count=${sc.countScore.toFixed(3)} cos=${sc.cosine.toFixed(3)} matched=${JSON.stringify(sc.matchedTerms)}`);
      }
    }

    // If matched above threshold -> produce intent response
    if (best.idx !== -1 && best.score >= THRESHOLD) {
      const intent = intentVectors[best.idx];

      // safety protocol
      if (intent.safety === "CRITICAL") {
        profile.flags.critical = true;
        saveUsers(users);
        return res.status(200).json({ reply: criticalSafetyReply(), source: "intent_critical", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }

      // fetch raw intent object to get follow_up_question, full responses
      const rawIntent = INTENTS_RAW.find(x => x.tag === intent.tag) || {};
      const pool = Array.isArray(rawIntent.responses) && rawIntent.responses.length ? rawIntent.responses : (intent.responses || []);
      const baseReply = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "أنا سامعك وبكل هدوء معاك. احكيلي أكتر 💙";

      // if this intent has a follow-up question, set expectingFollowUp
      if (rawIntent.follow_up_question && Array.isArray(rawIntent.follow_up_intents) && rawIntent.follow_up_intents.length) {
        profile.expectingFollowUp = {
          parentTag: intent.tag,
          allowedTags: rawIntent.follow_up_intents,
          expiresTs: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        // reply will be baseReply + question
        const question = rawIntent.follow_up_question;
        const reply = adaptReplyBase(`${baseReply}\n\n${question}`, profile, mood);
        // store memory
        profile.shortMemory = profile.shortMemory || [];
        profile.shortMemory.push({ message: rawMessage, reply, mood, tag: intent.tag, ts: new Date().toISOString() });
        if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
        users[userId] = profile; saveUsers(users);
        return res.status(200).json({ reply, source: "intent_followup", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }

      // normal personalized reply
      const personalized = adaptReplyBase(baseReply, profile, mood);
      profile.shortMemory = profile.shortMemory || [];
      profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, tag: intent.tag, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();

      // occasionally store important long-term fact
      if (mood !== "محايد" && Math.random() < 0.25) {
        profile.longMemory = profile.longMemory || [];
        profile.longMemory.push({ key: "mood_note", value: mood, ts: new Date().toISOString() });
        if (profile.longMemory.length > LONG_TERM_LIMIT) profile.longMemory.shift();
      }

      users[userId] = profile; saveUsers(users);
      return res.status(200).json({ reply: personalized, source: "intent", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
    }

    // no strong intent -> try external provider if available
    if (process.env.TOGETHER_API_KEY) {
      const ext = await callTogetherAPI(rawMessage);
      profile.shortMemory = profile.shortMemory || [];
      profile.shortMemory.push({ message: rawMessage, reply: ext, mood, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      users[userId] = profile; saveUsers(users);
      return res.status(200).json({ reply: ext, source: "together", userId });
    }

    // fallback: time-aware / memory-aware phrasing
    const lastMood = (profile.moodHistory && profile.moodHistory.length) ? profile.moodHistory[profile.moodHistory.length - 1].mood : null;
    let fallback = "محتاج منك توضيح بسيط كمان 💜 احكيلي بالراحة وأنا سامعك.";
    if (!profile.shortMemory || profile.shortMemory.length === 0) {
      // first interaction -> friendly time-aware greeting + prompt
      fallback = `${cairoGreetingPrefix()}، أنا رفيقك هنا. احكيلي إيه اللي بيحصل معاك النهاردة؟`;
    } else if (lastMood && lastMood !== "محايد") {
      fallback = `لسه فاكرة إنك قلت إنك حاسس بـ"${lastMood}" قبل كده. تحب تحكيلي لو الحالة اتغيرت؟`;
    }

    profile.shortMemory = profile.shortMemory || [];
    profile.shortMemory.push({ message: rawMessage, reply: fallback, mood, ts: new Date().toISOString() });
    if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
    users[userId] = profile; saveUsers(users);

    return res.status(200).json({ reply: fallback, source: "fallback", userId });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// -------------- personalization helper (kept simple) --------------
function adaptReplyBase(reply, userProfile, mood) {
  const tone = (userProfile && userProfile.preferredTone) || "warm";
  let prefix = "";
  let suffix = "";
  if (tone === "warm") { prefix = ""; suffix = " 💜"; }
  else if (tone === "clinical") { prefix = ""; suffix = ""; }
  else if (tone === "playful") { prefix = ""; suffix = " 😉"; }

  if (mood === "حزن") prefix = "أنا معااك دلوقتي، ";
  else if (mood === "قلق") prefix = "خد نفس، ";
  else if (mood === "فرح") prefix = "يا سلام! ";

  return `${prefix}${reply}${suffix}`.trim();
}
