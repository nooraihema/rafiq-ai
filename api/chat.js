
// /api/chat.js
// ==========================
// رفيق - محرك نوايا ذكي متكامل (TF-IDF + Memory + Emotion + Safety + Providers)
// ==========================

import fs from "fs";
import path from "path";
import crypto from "crypto";

// -------------- إعداد عام --------------
const ROOT = process.cwd();
const INTENTS_PATH = path.join(ROOT, "intents.json");
const USERS_DIR = path.join(ROOT, "data");
const USERS_FILE = path.join(USERS_DIR, "users.json");

const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.12"); // default
const DEBUG = process.env.DEBUG === "1";
const SHORT_MEMORY_LIMIT = parseInt(process.env.SHORT_MEMORY_LIMIT || "5", 10);
const LONG_TERM_LIMIT = parseInt(process.env.LONG_TERM_LIMIT || "60", 10);

// تأكد من وجود مجلد البيانات
try { if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR, { recursive: true }); } catch(e){ console.warn("Could not create data dir", e); }

// -------------- أدوات تطبيع / تقسيم عربي --------------
function normalizeArabic(text = "") {
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "") // إزالة التشكيل
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

// -------------- تحميل intents + بناء TF-IDF index --------------
let INTENTS_RAW = [];
let intentVectors = []; // { tag, responses, safety, keywords[], patterns[], vector{}, norm }

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
      return { tag, patterns, keywords, responses, safety };
    });
  } catch (e) {
    console.error("Failed reading intents.json:", e);
    return [];
  }
}

function buildTfIdfIndex() {
  INTENTS_RAW = loadIntentsRaw();
  const docsTokens = INTENTS_RAW.map(it => tokenize([...it.patterns, ...it.keywords].join(" ")));

  // DF -> idf
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
    return {
      tag: it.tag,
      responses: it.responses,
      safety: it.safety,
      keywords: it.keywords.map(normalizeArabic),
      patterns: it.patterns.map(normalizeArabic),
      vector: vec,
      norm
    };
  });

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

// -------------- Emotion / Mood detection --------------
const MOOD_KEYWORDS = {
  حزن: ["حزين","زعلان","مكسور","مكسور جدا","بكاء","بعيط","مكتئب","مش قادر","ضايق","متضايق","حزن"],
  فرح: ["مبسوط","فرحان","سعيد","مستمتع","مبسوط جدا","مبسوطة"],
  قلق: ["قلقان","خايف","متوتر","مضطرب","مخنوق","مخنوق اوي","توتر"],
  غضب: ["غضبان","متعصب","زعلان جدا","مستفز","عصبي","عايز انفجر"],
  وحدة: ["لوحدي","وحيد","محدش معايا","مفيش حد"],
  حب: ["بحبك","مشتاق","وحشتني","بحبك اوي"]
};

// يعيد mood أو "محايد"
function detectMood(message) {
  const norm = normalizeArabic(message);
  for (const mood in MOOD_KEYWORDS) {
    for (const kw of MOOD_KEYWORDS[mood]) {
      if (norm.includes(normalizeArabic(kw))) return mood;
    }
  }
  return "محايد";
}

// -------------- Safety detection --------------
const CRITICAL_KEYWORDS = ["انتحار","عايز اموت","عايز أموت","مش عايز اعيش","هقتل نفسي","اقتل نفسي","مووت","عايز أموت"];
function detectCritical(message) {
  const norm = normalizeArabic(message);
  for (const kw of CRITICAL_KEYWORDS) {
    if (norm.includes(normalizeArabic(kw))) return true;
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

// -------------- direct / fuzzy matching helper --------------
function directOrFuzzyHit(message, intent) {
  const mNorm = normalizeArabic(message);
  const mTokens = new Set(tokenize(message));
  // direct substring on keywords/patterns
  for (const kw of intent.keywords) {
    if (!kw) continue;
    if (mNorm.includes(kw)) return { hit: true, boost: 0.25 };
  }
  for (const pat of intent.patterns) {
    if (!pat) continue;
    if (mNorm === pat || mNorm.includes(pat)) return { hit: true, boost: 0.25 };
  }
  // fuzzy token levenshtein
  for (const kw of intent.keywords) {
    if (!kw) continue;
    for (const tok of mTokens) {
      if (levenshtein(tok, kw) <= 1) return { hit: true, boost: 0.18 };
    }
  }
  return { hit: false, boost: 0 };
}

// -------------- External providers (Together only here; Gemini kept optional) --------------
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
  } finally {
    clearTimeout(t);
  }
}

// -------------- Personality / reply formatting --------------
function adaptReplyBase(reply, userProfile, mood) {
  // userProfile may have preferredTone: 'warm' | 'clinical' | 'playful'
  const tone = (userProfile && userProfile.preferredTone) || "warm";
  // Short personalization rules:
  let prefix = "";
  let suffix = "";
  if (tone === "warm") {
    prefix = "يا روحي، ";
    suffix = " 💜";
  } else if (tone === "clinical") {
    prefix = "";
    suffix = "";
  } else if (tone === "playful") {
    prefix = "يا حبيبي، ";
    suffix = " 😉";
  }
  // adjust by mood
  if (mood === "حزن") {
    prefix = "أنا معااك دلوقتي، ";
  } else if (mood === "قلق") {
    prefix = "خد نفس عميق، ";
  } else if (mood === "فرح") {
    prefix = "يا سلام! ";
  }
  // avoid double emojis explosion; just return shaped response
  return `${prefix}${reply}${suffix}`.trim();
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

    // userId handling: frontend should send userId if known, otherwise we create one and return it
    let userId = body.userId || null;
    const users = loadUsers();
    if (!userId || !users[userId]) {
      // new user: create id and profile
      userId = makeUserId();
      users[userId] = {
        id: userId,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        preferredTone: "warm",
        shortMemory: [], // {message, reply, mood, ts}
        longMemory: [],  // important facts {key, value, ts}
        moodHistory: [], // {mood, ts}
        flags: {},       // e.g., { critical: true }
      };
      saveUsers(users);
      if (DEBUG) console.log("Created new user:", userId);
    }

    const profile = users[userId];

    // update lastSeen
    profile.lastSeen = new Date().toISOString();

    // 0) safety quick check (critical)
    const isCritical = detectCritical(rawMessage);
    if (isCritical) {
      // mark user flag
      profile.flags.critical = true;
      // save and respond with safety reply immediately
      saveUsers(users);
      const reply = criticalSafetyReply();
      return res.status(200).json({ reply, source: "safety", userId });
    }

    // 1) analyze mood
    const mood = detectMood(rawMessage);
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });
    if (profile.moodHistory.length > LONG_TERM_LIMIT) profile.moodHistory.shift();

    // 2) compute TF-IDF + direct/fuzzy matching
    const msgVec = buildMessageVector(rawMessage);
    const mNorm = msgVec.norm;
    msgVec._norm = mNorm;

    let best = { idx: -1, score: 0, source: "none", cosine: 0, boost: 0 };
    for (let i = 0; i < intentVectors.length; i++) {
      const it = intentVectors[i];
      const df = directOrFuzzyHit(rawMessage, it);
      const cs = cosineScore(msgVec.vec, it.vector, mNorm, it.norm);
      const score = cs + df.boost;
      if (score > best.score) best = { idx: i, score, source: df.hit ? "direct+tfidf" : "tfidf", cosine: cs, boost: df.boost };
      if (DEBUG) {
        console.log(`[INTENT] ${it.tag} | cosine=${cs.toFixed(3)} | boost=${df.boost.toFixed(3)} | total=${score.toFixed(3)}`);
      }
    }

    // 3) if matched above threshold -> use intent response
    if (best.idx !== -1 && best.score >= THRESHOLD) {
      const intent = intentVectors[best.idx];
      // safety check
      if (intent.safety === "CRITICAL") {
        profile.flags.critical = true;
        saveUsers(users);
        const reply = criticalSafetyReply();
        return res.status(200).json({ reply, source: "intent_critical", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }

      // pick response from INTENTS_RAW corresponding (matching by tag) because intentVectors only stores normalized arrays
      const rawIntent = INTENTS_RAW.find(x => (x.tag === intent.tag || x.tag === intent.tag));
      const pool = (rawIntent && rawIntent.responses && rawIntent.responses.length) ? rawIntent.responses : intent.responses || [];
      const baseReply = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "أنا سامعك وبكل هدوء معاك. احكيلي أكتر 💙";

      // personalization: adapt reply using user profile and current mood & short memory
      const personalized = adaptReplyBase(baseReply, profile, mood);

      // update short memory
      profile.shortMemory = profile.shortMemory || [];
      profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();

      // if mood notable, add long memory point occasionally
      if (mood !== "محايد" && Math.random() < 0.25) {
        profile.longMemory = profile.longMemory || [];
        profile.longMemory.push({ key: "mood_note", value: mood, ts: new Date().toISOString() });
        if (profile.longMemory.length > LONG_TERM_LIMIT) profile.longMemory.shift();
      }

      users[userId] = profile; saveUsers(users);

      return res.status(200).json({
        reply: personalized,
        source: best.source,
        tag: intent.tag,
        score: Number(best.score.toFixed(3)),
        userId
      });
    }

    // 4) no strong intent -> try external provider if available
    if (process.env.TOGETHER_API_KEY) {
      const ext = await callTogetherAPI(rawMessage);
      // store to memory
      profile.shortMemory = profile.shortMemory || [];
      profile.shortMemory.push({ message: rawMessage, reply: ext, mood, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      users[userId] = profile; saveUsers(users);
      return res.status(200).json({ reply: ext, source: "together", userId });
    }

    // Optional: Gemini if configured
    if (process.env.GEMINI_API_KEY) {
      try {
        // if you previously had callGeminiAPI, you can integrate it here; omitted for minimality
      } catch (e) {
        if (DEBUG) console.warn("Gemini attempt failed:", e);
      }
    }

    // 5) polite fallback but with memory-aware style
    // if user previously had mood flagged recently, mention it
    const lastMood = (profile.moodHistory && profile.moodHistory.length) ? profile.moodHistory[profile.moodHistory.length - 1].mood : null;
    let fallback = "محتاج منك توضيح بسيط كمان 💜 احكيلي بالراحة وأنا سامعك.";
    if (lastMood && lastMood !== "محايد") {
      fallback = `لسه فاكرة إنك كنت حاسس بـ"${lastMood}" قبل كده... ممكن تحكيلي لو الحالة اتغيرت؟ 💙`;
    }

    // save last message into short memory
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


