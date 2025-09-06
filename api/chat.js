
// /api/chat.js
// ==========================
// رفيق - محرك نوايا متقدّم (Embeddings + TF-IDF fallback + Memory + Profile + Learning Queue)
// ==========================

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ------------ إعداد عام ومسارات ------------
const ROOT = process.cwd();
const INTENTS_PATH = path.join(ROOT, "intents.json");
const DATA_DIR = path.join(ROOT, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEARNING_QUEUE_FILE = path.join(DATA_DIR, "learning_queue.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.12");
const DEBUG = process.env.DEBUG === "1";
const SHORT_MEMORY_LIMIT = parseInt(process.env.SHORT_MEMORY_LIMIT || "5", 10);
const LONG_TERM_LIMIT = parseInt(process.env.LONG_TERM_LIMIT || "60", 10);

// Embeddings config
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || ""; // "openai" | "hf" | ""
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
const HF_API_KEY = process.env.HF_API_KEY || "";
const HF_EMBEDDING_MODEL = process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-mpnet-base-v2";

// ------------ أدوات تطبيع عربي وtokenize ------------
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

// ------------ Levenshtein ------------
function levenshtein(a, b) {
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

// ------------ تحميل intents + بناء فهرس (TF-IDF & optional Embeddings) ------------
let INTENTS_RAW = [];
let intentIndex = []; // entries: { tag, responses, safety, keywords[], patterns[], tfidfVector, tfidfNorm, embedding: [] (optional) }
let tagToIdx = {};

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
    console.error("Failed to parse intents.json:", e);
    return [];
  }
}

// TF-IDF compute
function buildTfIdf(docsTokens) {
  const df = {};
  docsTokens.forEach(tokens => {
    const uniq = new Set(tokens);
    uniq.forEach(t => df[t] = (df[t] || 0) + 1);
  });
  const N = Math.max(1, docsTokens.length);
  const idf = {};
  Object.keys(df).forEach(t => { idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1; });
  return { idf };
}

function buildIndexSync() {
  INTENTS_RAW = loadIntentsRaw();
  const docs = INTENTS_RAW.map(it => tokenize([...it.patterns, ...it.keywords].join(" ")));
  const { idf } = buildTfIdf(docs);

  intentIndex = INTENTS_RAW.map((it, i) => {
    const tokens = docs[i];
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
      follow_up_question: it.follow_up_question,
      follow_up_intents: it.follow_up_intents,
      tfidfVector: vec,
      tfidfNorm: norm,
      embedding: null // to be filled if embeddings enabled
    };
  });

  tagToIdx = {};
  intentIndex.forEach((e, idx) => { tagToIdx[e.tag] = idx; });

  if (DEBUG) console.log("Built index (TF-IDF). Intents:", intentIndex.length);
}

// ------------ Embeddings helpers (OpenAI or HF) ------------
async function embedTextOpenAI(texts) {
  // texts: array of strings -> returns array of float arrays
  const key = OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI key missing");
  // using text-embedding-3-small or text-embedding-3-large depending on preference
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({ model, input: texts })
  });
  const data = await res.json();
  if (!data.data) throw new Error("OpenAI embedding error: " + JSON.stringify(data));
  return data.data.map(d => d.embedding);
}

async function embedTextHF(texts) {
  // HuggingFace inference: pipeline/feature-extraction/<model>
  const key = HF_API_KEY;
  if (!key) throw new Error("HF key missing");
  const url = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_EMBEDDING_MODEL}`;
  const out = [];
  for (const t of texts) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(t)
    });
    if (!res.ok) {
      const tt = await res.text();
      throw new Error("HF embed error: " + tt);
    }
    const j = await res.json();
    // HF returns array of token vectors or a single vector; if 2D, average
    if (Array.isArray(j) && Array.isArray(j[0])) {
      // average token vectors
      const dim = j[0].length;
      const acc = new Array(dim).fill(0);
      j.forEach(tok => { for (let k=0;k<dim;k++) acc[k]+=tok[k]; });
      out.push(acc.map(v => v / j.length));
    } else if (Array.isArray(j)) {
      out.push(j);
    } else {
      throw new Error("HF unexpected embed shape");
    }
  }
  return out;
}

function cosineVectors(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

async function ensureIntentEmbeddings() {
  // if embeddings provider configured: for each intent compute centroid embedding for patterns
  if (!EMBEDDING_PROVIDER) return;
  try {
    const texts = intentIndex.map(it => (it.keywords.concat(it.patterns).join(" ")) || it.tag);
    let embeddings = [];
    if (EMBEDDING_PROVIDER === "openai") embeddings = await embedTextOpenAI(texts);
    else if (EMBEDDING_PROVIDER === "hf") embeddings = await embedTextHF(texts);
    else throw new Error("Unknown EMBEDDING_PROVIDER");
    // assign
    for (let i = 0; i < intentIndex.length; i++) {
      intentIndex[i].embedding = embeddings[i];
    }
    if (DEBUG) console.log("Intent embeddings ready");
  } catch (e) {
    console.warn("Failed to build intent embeddings:", e.message || e);
    // keep embeddings null -> fallback to TF-IDF
  }
}

// ------------ Users storage (structured profile) ------------
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

// ------------ Learning queue (semi-automated learning) ------------
function appendLearningQueue(entry) {
  try {
    let q = [];
    if (fs.existsSync(LEARNING_QUEUE_FILE)) {
      q = JSON.parse(fs.readFileSync(LEARNING_QUEUE_FILE, "utf8") || "[]");
    }
    q.push(Object.assign({ ts: new Date().toISOString() }, entry));
    fs.writeFileSync(LEARNING_QUEUE_FILE, JSON.stringify(q, null, 2), "utf8");
    if (DEBUG) console.log("Appended to learning queue");
  } catch (e) {
    console.error("Failed to append learning queue:", e);
  }
}

// ------------ Mood detection & critical ------------
const MOOD_KEYWORDS = {
  حزن: ["حزين","زعلان","مكسور","بكاء","بعيط","مكتئب","مش قادر","ضايق","متضايق","حزن","زهقان"],
  فرح: ["مبسوط","فرحان","سعيد","مبتهج","مستمتع"],
  قلق: ["قلقان","خايف","متوتر","مضطرب","مخنوق","توتر"],
  غضب: ["غضبان","متعصب","زعلان جدا","مستفز","عصبي"],
  وحدة: ["لوحدي","وحيد","محدش معايا","مفيش حد"],
  حب: ["بحبك","مشتاق","وحشتني","احبك"]
};
function detectMood(msg) {
  const norm = normalizeArabic(msg);
  for (const mood in MOOD_KEYWORDS) {
    for (const kw of MOOD_KEYWORDS[mood]) {
      if (norm.includes(normalizeArabic(kw))) return mood;
    }
  }
  return "محايد";
}
const CRITICAL_KEYWORDS = ["انتحار","عايز اموت","عايز أموت","مش عايز اعيش","هقتل نفسي","اقتل نفسي","انا هموت","موتي"];
function detectCritical(msg) {
  const norm = normalizeArabic(msg);
  for (const kw of CRITICAL_KEYWORDS) if (norm.includes(normalizeArabic(kw))) return true;
  return false;
}

// ------------ Negation / emphasis helpers ------------
const NEGATORS = new Set(["لا","مش","ما","ليس","لست","بدون","ابدا","أبدا","وليس"]);
const EMPHASIS = new Set(["جدا","للغاية","بشدة","كتير","قوي","قوية","تماما","بصراحة"]);
function tokensArray(text) { return normalizeArabic(text).split(/\s+/).filter(Boolean); }
function hasNegationNearby(rawMessage, term) {
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
function hasEmphasisNearby(rawMessage, term) {
  const tokens = tokensArray(rawMessage);
  const termTokens = tokensArray(term);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === termTokens[0]) {
      for (let j = i + 1; j <= Math.min(tokens.length - 1, i + 3); j++) if (EMPHASIS.has(tokens[j])) return true;
    }
  }
  return false;
}

// ------------ Message vector (TF-IDF) ------------
function buildMessageTfVec(message) {
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

// ------------ Scoring combining TF-IDF, Embedding, direct matches ------------
function scoreIntent(rawMessage, msgTfVec, msgTfNorm, intent) {
  const normMsg = normalizeArabic(rawMessage);
  let matchCount = 0;
  const matchedTerms = [];
  for (const kw of intent.keywords || []) {
    if (!kw) continue;
    const nkw = normalizeArabic(kw);
    if (nkw && normMsg.includes(nkw) && !hasNegationNearby(rawMessage, nkw)) {
      matchCount++; matchedTerms.push(nkw);
    } else {
      const toks = new Set(tokenize(rawMessage));
      for (const tok of toks) {
        if (levenshtein(tok, nkw) <= 1 && !hasNegationNearby(rawMessage, nkw)) {
          matchCount++; matchedTerms.push(nkw); break;
        }
      }
    }
  }
  for (const pat of intent.patterns || []) {
    if (!pat) continue;
    const npat = normalizeArabic(pat);
    if (npat && normMsg.includes(npat) && !hasNegationNearby(rawMessage, npat)) {
      matchCount++; matchedTerms.push(npat);
    }
  }
  const countScore = matchCount > 0 ? (matchCount / (matchCount + 1)) : 0;
  const csTf = cosineScore(msgTfVec, intent.tfidfVector || {}, msgTfNorm, intent.tfidfNorm) || 0;

  // embeddings similarity if available
  let embedSim = 0;
  if (intent.embedding && msgTfVec._embeddingVector) {
    embedSim = cosineVectors(msgTfVec._embeddingVector, intent.embedding);
  }

  let emphasisBoost = 0;
  for (const t of matchedTerms) if (hasEmphasisNearby(rawMessage, t)) emphasisBoost += 0.08;
  const directBoost = matchCount > 0 ? 0.06 : 0;

  // weights: give high weight to embeddings if available (semantic understanding)
  const wCount = 0.40, wTf = 0.20, wEmbed = (intent.embedding ? 0.36 : 0), wDirect = 0.04;
  const final = (countScore * wCount) + (Math.max(0, csTf) * wTf) + (embedSim * wEmbed) + directBoost + emphasisBoost;
  return { final, countScore, csTf, embedSim, matchedTerms };
}

function cosineScore(messageVec, intentVec, messageNorm, intentNorm) {
  let dot = 0;
  for (const t in messageVec) {
    if (intentVec[t]) dot += messageVec[t] * intentVec[t];
  }
  const denom = (messageNorm || 1) * (intentNorm || 1);
  return denom ? (dot / denom) : 0;
}

// ------------ time-aware greeting ------------
function cairoGreetingPrefix() {
  const now = new Date();
  const cairoHour = (now.getUTCHours() + 2) % 24;
  if (cairoHour >= 5 && cairoHour < 12) return "صباح الخير";
  if (cairoHour >= 12 && cairoHour < 17) return "مساء الخير";
  return "مساء النور";
}

// ------------ External provider minimal (Together) ------------
async function callTogetherAPI(userText) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("No TOGETHER_API_KEY defined");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.together.xyz/inference", {
      method: "POST",
      signal: controller.signal,
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
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
    if (DEBUG) console.warn("Together error", e);
    return "حالياً مش قادر أستخدم الموديل الخارجي، بس أنا معاك وجاهز أسمعك. احكيلي أكتر 💙";
  } finally { clearTimeout(t); }
}

// ------------ Embedding message (add to msgTfVec) ------------
async function embedMessageIfPossible(msgObj, rawMessage) {
  try {
    if (!EMBEDDING_PROVIDER) return;
    const text = rawMessage;
    let emb;
    if (EMBEDDING_PROVIDER === "openai") {
      emb = (await embedTextOpenAI([text]))[0];
    } else if (EMBEDDING_PROVIDER === "hf") {
      emb = (await embedTextHF([text]))[0];
    }
    if (emb) msgObj._embeddingVector = emb;
  } catch (e) {
    if (DEBUG) console.warn("embedMessageIfPossible failed:", e.message || e);
  }
}

// ------------ personalization small helper ------------
function adaptReplyBase(reply, userProfile, mood) {
  const tone = (userProfile && userProfile.preferredTone) || "warm";
  let prefix = "";
  let suffix = "";
  if (tone === "warm") { prefix = ""; suffix = " 💜"; }
  else if (tone === "clinical") { prefix = ""; suffix = ""; }
  else if (tone === "playful") { prefix = ""; suffix = " 😉"; }

  if (mood === "حزن") prefix = "أنا معااك دلوقتي، ";
  else if (mood === "قلق") prefix = "خد نفس عميق، ";
  else if (mood === "فرح") prefix = "يا سلام! ";

  return `${prefix}${reply}${suffix}`.trim();
}

// ------------ Safety reply ------------
function criticalSafetyReply() {
  return "كلامك مهم جدًا وأنا آخذه على محمل الجد. لو عندك أفكار لإيذاء نفسك أو فقدت الأمان، مهم جدًا تكلم حد موثوق فورًا أو تواصل مع جهة مختصة قريبة منك. لو تقدر، كلّمني أكتر دلوقتي عن اللي بيمرّ عليك وأنا معاك خطوة بخطوة 💙";
}

// ------------ Initialization: build TF-IDF index and embeddings (async part) ------------
buildIndexSync();
(async () => { 
  await ensureIntentEmbeddings().catch(e => { if (DEBUG) console.warn("Embedding init failed:", e.message || e); });
})();

// ------------ Main handler ------------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString();
    if (!rawMessage || !rawMessage.trim()) return res.status(400).json({ error: "Empty message" });

    // load/create user
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
        longTermProfile: { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" },
        moodHistory: [],
        flags: {},
        expectingFollowUp: null
      };
      saveUsers(users);
      if (DEBUG) console.log("Created user", userId);
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    // safety quick
    if (detectCritical(rawMessage)) {
      profile.flags.critical = true;
      saveUsers(users);
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    // mood detect & update longTermProfile recurring themes
    const mood = detectMood(rawMessage);
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });
    if (profile.moodHistory.length > LONG_TERM_LIMIT) profile.moodHistory.shift();
    if (mood !== "محايد") {
      profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
      profile.longTermProfile.recurring_themes[mood] = (profile.longTermProfile.recurring_themes[mood] || 0) + 1;
    }

    // prepare message vector
    const msgTf = buildMessageTfVec(rawMessage);
    // attach embeddings if possible
    await embedMessageIfPossible(msgTf, rawMessage);

    // follow-up restriction
    let allowedIdxs = null;
    if (profile.expectingFollowUp && profile.expectingFollowUp.expiresTs > Date.now()) {
      allowedIdxs = (profile.expectingFollowUp.allowedTags || []).map(t => tagToIdx[t]).filter(i=>typeof i==="number");
      if (DEBUG) console.log("Follow-up allowed indices", allowedIdxs);
    } else {
      profile.expectingFollowUp = null;
    }

    // scoring candidates
    let best = { idx: -1, score: 0, details: null };
    const candidateIdxs = (Array.isArray(allowedIdxs) && allowedIdxs.length) ? allowedIdxs : intentIndex.map((_,i)=>i);

    for (const i of candidateIdxs) {
      const intent = intentIndex[i];
      const sc = scoreIntent(rawMessage, msgTf, msgTf.norm, Object.assign({}, intent, { tfidfVector: intent.tfidfVector || {}, tfidfNorm: intent.tfidfNorm || 1, embedding: intent.embedding || null }));
      if (sc.final > best.score) best = { idx: i, score: sc.final, details: sc };
      if (DEBUG) console.log(`[SCORE] tag=${intent.tag} final=${sc.final.toFixed(3)} matched=${JSON.stringify(sc.matchedTerms)} embed=${sc.embedSim?.toFixed?.(3) || 0}`);
    }

    // matched intent
    if (best.idx !== -1 && best.score >= THRESHOLD) {
      const intent = intentIndex[best.idx];
      // safety protocol
      if (intent.safety === "CRITICAL") {
        profile.flags.critical = true; saveUsers(users);
        return res.status(200).json({ reply: criticalSafetyReply(), source: "intent_critical", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }
      // get raw intent for followup/responses
      const rawIntent = INTENTS_RAW.find(x => x.tag === intent.tag) || {};
      const pool = Array.isArray(rawIntent.responses) && rawIntent.responses.length ? rawIntent.responses : (intent.responses || []);
      const baseReply = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "أنا سامعك وبكل هدوء معاك. احكيلي أكتر 💙";

      // follow-up handling
      if (rawIntent.follow_up_question && Array.isArray(rawIntent.follow_up_intents) && rawIntent.follow_up_intents.length) {
        profile.expectingFollowUp = { parentTag: intent.tag, allowedTags: rawIntent.follow_up_intents, expiresTs: Date.now() + (5*60*1000) };
        const question = rawIntent.follow_up_question;
        const reply = adaptReplyBase(`${baseReply}\n\n${question}`, profile, mood);
        profile.shortMemory = profile.shortMemory || []; profile.shortMemory.push({ message: rawMessage, reply, mood, tag: intent.tag, ts: new Date().toISOString() });
        if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
        users[userId] = profile; saveUsers(users);
        return res.status(200).json({ reply, source: "intent_followup", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }

      // normal reply
      const personalized = adaptReplyBase(baseReply, profile, mood);
      profile.shortMemory = profile.shortMemory || []; profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, tag: intent.tag, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      // update long memory occasionally
      if (mood !== "محايد" && Math.random() < 0.25) {
        profile.longMemory = profile.longMemory || [];
        profile.longMemory.push({ key: "mood_note", value: mood, ts: new Date().toISOString() });
        if (profile.longMemory.length > LONG_TERM_LIMIT) profile.longMemory.shift();
      }
      users[userId] = profile; saveUsers(users);
      return res.status(200).json({ reply: personalized, source: "intent", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
    }

    // no strong internal understanding -> external provider
    if (process.env.TOGETHER_API_KEY) {
      const ext = await callTogetherAPI(rawMessage);
      // push to learning queue for later manual labeling
      appendLearningQueue({ message: rawMessage, userId, provider: "together", extResponse: ext, ts: new Date().toISOString() });
      profile.shortMemory = profile.shortMemory || []; profile.shortMemory.push({ message: rawMessage, reply: ext, mood, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      users[userId] = profile; saveUsers(users);
      return res.status(200).json({ reply: ext, source: "together", userId });
    }

    // fallback: memory/time-aware
    const lastMood = (profile.moodHistory && profile.moodHistory.length) ? profile.moodHistory[profile.moodHistory.length - 1].mood : null;
    let fallback = "محتاج منك توضيح بسيط كمان 💜 احكيلي بالراحة وأنا سامعك.";
    if (!profile.shortMemory || profile.shortMemory.length === 0) {
      fallback = `${cairoGreetingPrefix()}، أنا رفيقك هنا. احكيلي إيه اللي بيحصل معاك النهاردة؟`;
    } else if (lastMood && lastMood !== "محايد") {
      fallback = `لسه فاكرة إنك قلت إنك حاسس بـ"${lastMood}" قبل كده. تحب تحكيلي لو الحالة اتغيرت؟`;
    }
    profile.shortMemory = profile.shortMemory || []; profile.shortMemory.push({ message: rawMessage, reply: fallback, mood, ts: new Date().toISOString() });
    if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
    users[userId] = profile; saveUsers(users);

    return res.status(200).json({ reply: fallback, source: "fallback", userId });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
