
// /api/chat.js
// رفيق - محرك نوايا متقدّم (TF-IDF + Embeddings fallback + Memory + Entities + RootCause + Proactive + LearningQueue)
// Final version with Advanced Intelligence Layer (Active Memory, Proactive Intelligence, Pattern Recognition)

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ------------ إعداد عام ومسارات ------------
const ROOT = process.cwd();
const INTENTS_PATH = path.join(ROOT, "intents.json");

// --- تعديل ذكي لمسار البيانات ---
const IS_VERCEL = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "data") : path.join(ROOT, "data");
// ---------------------------------

const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEARNING_QUEUE_FILE = path.join(DATA_DIR, "learning_queue.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.12");
const DEBUG = process.env.DEBUG === "1";
const SHORT_MEMORY_LIMIT = parseInt(process.env.SHORT_MEMORY_LIMIT || "5", 10);
const LONG_TERM_LIMIT = parseInt(process.env.LONG_TERM_LIMIT || "60", 10);

// Embeddings config
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
const HF_API_KEY = process.env.HF_API_KEY || "";
const HF_EMBEDDING_MODEL = process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-mpnet-base-v2";

// ------------ أدوات تطبيع عربي وtokenize ------------
function normalizeArabic(text = "") {
  return text.toString().toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/[إأٱآا]/g, "ا").replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء").replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

const STOPWORDS = new Set(["في","من","على","عن","الى","الي","او","ام","ان","انا","انت","هو","هي","هم","مع","ما","لا","لم","لن","قد","ثم","كل","ايه","ايضا","بس","لكن","هذه","هذا","ذلك","الذي","التي","اللي","كان","كانت","كون","يكون","هوه","هيه","يا","ياعم"]);

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

// ------------ تحميل intents + بناء فهرس ------------
let INTENTS_RAW = [];
let intentIndex = [];
let tagToIdx = {};

function loadIntentsRaw() {
  try {
    const raw = fs.readFileSync(INTENTS_PATH, "utf8");
    const json = JSON.parse(raw);
    const arr = Array.isArray(json.intents) ? json.intents : json;
    return arr.map((it, idx) => ({
      tag: it.tag || it.intent || it.id || `intent_${idx}`,
      patterns: Array.isArray(it.patterns) ? it.patterns : [],
      keywords: Array.isArray(it.keywords) ? it.keywords : [],
      responses: Array.isArray(it.responses) ? it.responses : (it.response ? [it.response] : []),
      response_constructor: it.response_constructor || null,
      safety: (it.safety_protocol || "").toUpperCase().trim(),
      follow_up_question: it.follow_up_question || null,
      follow_up_intents: Array.isArray(it.follow_up_intents) ? it.follow_up_intents : []
    }));
  } catch (e) { console.error("Failed to parse intents.json:", e); return []; }
}

function buildIndexSync() {
  INTENTS_RAW = loadIntentsRaw();
  const docs = INTENTS_RAW.map(it => tokenize([...it.patterns, ...it.keywords].join(" ")));
  
  const df = {};
  docs.forEach(tokens => new Set(tokens).forEach(t => df[t] = (df[t] || 0) + 1));
  const N = Math.max(1, docs.length);
  const idf = {};
  Object.keys(df).forEach(t => idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1);

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
    return {
      tag: it.tag,
      responses: it.responses,
      response_constructor: it.response_constructor,
      safety: it.safety,
      keywords: it.keywords.map(normalizeArabic),
      patterns: it.patterns.map(normalizeArabic),
      follow_up_question: it.follow_up_question,
      follow_up_intents: it.follow_up_intents,
      tfidfVector: vec,
      tfidfNorm: Math.sqrt(sq) || 1,
      embedding: null
    };
  });

  tagToIdx = {};
  intentIndex.forEach((e, idx) => tagToIdx[e.tag] = idx);
  if (DEBUG) console.log("Built index (TF-IDF). Intents:", intentIndex.length);
}

// ------------ Embeddings helpers ------------
async function embedTextOpenAI(texts) {
  const key = OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI key missing");
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
    if (Array.isArray(j) && Array.isArray(j[0])) {
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
  if (!EMBEDDING_PROVIDER) return;
  try {
    const texts = intentIndex.map(it => (it.keywords.concat(it.patterns).join(" ")) || it.tag);
    let embeddings = [];
    if (EMBEDDING_PROVIDER === "openai") embeddings = await embedTextOpenAI(texts);
    else if (EMBEDDING_PROVIDER === "hf") embeddings = await embedTextHF(texts);
    else throw new Error("Unknown EMBEDDING_PROVIDER");
    for (let i = 0; i < intentIndex.length; i++) {
      intentIndex[i].embedding = embeddings[i];
    }
    if (DEBUG) console.log("Intent embeddings ready");
  } catch (e) {
    console.warn("Failed to build intent embeddings:", e.message || e);
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

// ------------ Learning queue ------------
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

// ------------ Mood & Safety detection ------------
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

// ------------ Negation & emphasis helpers ------------
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

// ------------ Entity extraction & root cause ----------
function extractEntities(rawMessage) {
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

function extractRootCause(rawMessage) {
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

// ------------ Scoring ------------
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

  let embedSim = 0;
  if (intent.embedding && msgTfVec._embeddingVector) {
    embedSim = cosineVectors(msgTfVec._embeddingVector, intent.embedding);
  }

  let emphasisBoost = 0;
  for (const t of matchedTerms) if (hasEmphasisNearby(rawMessage, t)) emphasisBoost += 0.08;
  const directBoost = matchCount > 0 ? 0.06 : 0;

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

// ------------ Time-aware greeting ------------
function cairoGreetingPrefix() {
  const now = new Date();
  const cairoHour = (now.getUTCHours() + 2) % 24;
  if (cairoHour >= 5 && cairoHour < 12) return "صباح الخير";
  if (cairoHour >= 12 && cairoHour < 17) return "مساء الخير";
  return "مساء النور";
}

// ------------ External provider ------------
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

// ------------ Embedding message ------------
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

// ------------ Personalization helper ------------
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

// ------------ Profile updaters ------------
function updateProfileWithEntities(profile, entities, mood, rootCause) {
  profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
  for (const ent of entities) {
    const key = ent;
    if (!profile.longTermProfile.mentioned_entities[key]) {
      profile.longTermProfile.mentioned_entities[key] = {
        type: "topic",
        sentiment_associations: {},
        last_mentioned: new Date().toISOString(),
        mention_count: 0,
        last_root_causes: []
      };
    }
    const obj = profile.longTermProfile.mentioned_entities[key];
    obj.mention_count = (obj.mention_count || 0) + 1;
    obj.sentiment_associations[mood] = (obj.sentiment_associations[mood] || 0) + 1;
    obj.last_mentioned = new Date().toISOString();
    if (rootCause) {
      obj.last_root_causes = obj.last_root_causes || [];
      obj.last_root_causes.unshift({ cause: rootCause, ts: new Date().toISOString() });
      if (obj.last_root_causes.length > 5) obj.last_root_causes.pop();
    }
  }
}

function recordRecurringTheme(profile, tag, mood) {
  profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
  profile.longTermProfile.recurring_themes[tag] = (profile.longTermProfile.recurring_themes[tag] || 0) + 1;
}

// =================================================================
// START: ADVANCED INTELLIGENCE LAYER - HELPER FUNCTIONS
// =================================================================

/**
 * 1. Active Memory: Checks if any entity in the current message has a significant history.
 * @returns An object with an { entity, insight } or null.
 */
function getHistoricalContext(entities, profile) {
  if (!entities || entities.length === 0 || !profile.longTermProfile || !profile.longTermProfile.mentioned_entities) {
    return null;
  }

  const mainEntity = entities[0];
  const memory = profile.longTermProfile.mentioned_entities[mainEntity];

  if (!memory) return null;

  let dominantSentiment = null;
  let maxCount = 0;
  if (memory.sentiment_associations) {
    for (const sentiment in memory.sentiment_associations) {
      if (memory.sentiment_associations[sentiment] > maxCount) {
        maxCount = memory.sentiment_associations[sentiment];
        dominantSentiment = sentiment;
      }
    }
  }

  if (memory.mention_count > 2 && ['حزن', 'قلق', 'غضب'].includes(dominantSentiment)) {
    return {
      entity: mainEntity,
      insight: `أتذكر أننا تحدثنا عن "${mainEntity}" من قبل، ويبدو أنه موضوع يمثل تحديًا مستمرًا لك.`
    };
  }
  
  return null;
}

/**
 * 2. Proactive Intelligence: Suggests a personalized conversation starter.
 * @returns A proactive opening string or null.
 */
function getProactiveOpening(profile) {
  if (!profile.longTermProfile || !profile.longTermProfile.mentioned_entities) {
    return null;
  }

  let lastImportantTopic = null;
  let lastDate = new Date(0);

  for (const entityName in profile.longTermProfile.mentioned_entities) {
    const entity = profile.longTermProfile.mentioned_entities[entityName];
    const entityDate = new Date(entity.last_mentioned);
    
    if (entity.mention_count > 3 && entityDate > lastDate) {
      lastDate = entityDate;
      lastImportantTopic = entityName;
    }
  }

  if (lastImportantTopic) {
    return `أهلاً بعودتك. في آخر مرة تحدثنا، كان "${lastImportantTopic}" يشغل تفكيرك. كيف هي الأمور بخصوص هذا الموضوع الآن؟`;
  }

  return null;
}

/**
 * 3. Pattern Recognition: Periodically analyzes long-term memory for patterns.
 * @returns An insightful observation string or null.
 */
function analyzePatterns(profile) {
  if (!profile.longTermProfile || !profile.longTermProfile.mentioned_entities) {
    return null;
  }

  let mostNegativeEntity = null;
  let maxNegativeScore = 0;

  for (const entityName in profile.longTermProfile.mentioned_entities) {
    const entity = profile.longTermProfile.mentioned_entities[entityName];
    const negativeScore = (entity.sentiment_associations?.['حزن'] || 0) + 
                          (entity.sentiment_associations?.['قلق'] || 0) + 
                          (entity.sentiment_associations?.['غضب'] || 0);

    if (negativeScore > 5 && negativeScore > maxNegativeScore) {
      maxNegativeScore = negativeScore;
      mostNegativeEntity = entityName;
    }
  }

  if (mostNegativeEntity) {
    if (profile.flags && !profile.flags.shared_pattern_insight) {
      return `لقد لاحظت شيئًا أثناء حديثنا معًا، وربما أكون مخطئًا. يبدو أن موضوع "${mostNegativeEntity}" يظهر بشكل متكرر عندما نتحدث عن المشاعر الصعبة. هل تلاحظ هذا الرابط أيضًا؟`;
    }
  }
  return null;
}

// =================================================================
// END: ADVANCED INTELLIGENCE LAYER - HELPER FUNCTIONS
// =================================================================


// --- Compositional Intelligence Function ---
function composeResponse(constructor, context) {
  if (!constructor) return null;

  const { mood, entities, isRecurring, intentTag, profile, historicalInsight } = context;
  let finalResponseParts = [];
  const mainEntity = entities.length > 0 ? entities[0] : null;

  // ADVANCED INTELLIGENCE: Prioritize historical insight as the strongest opener.
  if (historicalInsight && historicalInsight.insight) {
      finalResponseParts.push(historicalInsight.insight);
  } else if (constructor.openers && constructor.openers.length > 0) {
    let opener = constructor.openers[Math.floor(Math.random() * constructor.openers.length)];
    if (mainEntity) opener = opener.replace(/\{ENTITY\}/g, mainEntity);
    if (mood && mood !== 'محايد') opener = opener.replace(/\{MOOD\}/g, mood);
    finalResponseParts.push(opener);
  }

  if (constructor.memory_hooks && constructor.memory_hooks.length > 0) {
    for (const hook of constructor.memory_hooks) {
      if (hook.if_recurring_theme && isRecurring && hook.if_recurring_theme === intentTag) {
        finalResponseParts.push(hook.phrase);
      }
      if (hook.if_entity_mentioned && mainEntity && hook.if_entity_mentioned === mainEntity) {
        let phrase = hook.phrase.replace(/\{ENTITY\}/g, mainEntity);
        finalResponseParts.push(phrase);
      }
    }
  }
  
  if (constructor.validations && constructor.validations.length > 0) {
    const validation = constructor.validations[Math.floor(Math.random() * constructor.validations.length)];
    finalResponseParts.push(validation);
  }
  
  if (constructor.continuers && constructor.continuers.length > 0) {
    const continuer = constructor.continuers[Math.floor(Math.random() * constructor.continuers.length)];
    finalResponseParts.push(continuer);
  }

  return finalResponseParts.filter(Boolean).join(' ');
}

// ------------ Initialization ------------
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
      if (DEBUG) console.log("Created user", userId);
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    if (detectCritical(rawMessage)) {
      profile.flags.critical = true;
      saveUsers(users);
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    const mood = detectMood(rawMessage);
    const entities = extractEntities(rawMessage);
    const rootCause = extractRootCause(rawMessage);
    
    updateProfileWithEntities(profile, entities, mood, rootCause);
    
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });
    if (profile.moodHistory.length > LONG_TERM_LIMIT) profile.moodHistory.shift();

    const msgTf = buildMessageTfVec(rawMessage);
    await embedMessageIfPossible(msgTf, rawMessage);

    let allowedIdxs = null;
    if (profile.expectingFollowUp && profile.expectingFollowUp.expiresTs > Date.now()) {
      allowedIdxs = (profile.expectingFollowUp.allowedTags || []).map(t => tagToIdx[t]).filter(i=>typeof i==="number");
      if (DEBUG) console.log("Follow-up allowed indices", allowedIdxs);
    } else {
      profile.expectingFollowUp = null;
    }

    let best = { idx: -1, score: 0, details: null };
    const candidateIdxs = (Array.isArray(allowedIdxs) && allowedIdxs.length) ? allowedIdxs : intentIndex.map((_,i)=>i);

    for (const i of candidateIdxs) {
      const intent = intentIndex[i];
      const sc = scoreIntent(rawMessage, msgTf, msgTf.norm, intent);
      if (sc.final > best.score) best = { idx: i, score: sc.final, details: sc };
      if (DEBUG) console.log(`[SCORE] tag=${intent.tag} final=${sc.final.toFixed(3)} matched=${JSON.stringify(sc.matchedTerms)} embed=${sc.embedSim?.toFixed?.(3) || 0}`);
    }

    if (best.idx !== -1 && best.score >= THRESHOLD) {
      const intent = intentIndex[best.idx];
      recordRecurringTheme(profile, intent.tag, mood); // Record theme when intent is confirmed

      if (intent.safety === "CRITICAL") {
        profile.flags.critical = true; 
        saveUsers(users);
        return res.status(200).json({ reply: criticalSafetyReply(), source: "intent_critical", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }
      
      let baseReply;
      
      if (intent.response_constructor) {
          const historicalInsight = getHistoricalContext(entities, profile);
          const context = {
              mood: mood,
              entities: entities,
              isRecurring: (profile.longTermProfile.recurring_themes[intent.tag] || 0) > 3,
              intentTag: intent.tag,
              profile: profile,
              historicalInsight: historicalInsight
          };
          baseReply = composeResponse(intent.response_constructor, context);
      } else if (intent.responses && intent.responses.length > 0) {
          baseReply = intent.responses[Math.floor(Math.random() * intent.responses.length)];
      }
      
      if (!baseReply) {
          baseReply = "أنا سامعك وبكل هدوء معاك. احكيلي أكتر 💙";
      }

      let insightReply = null;
      const totalMessages = (profile.shortMemory?.length || 0) + (profile.longMemory?.length || 0) + profile.moodHistory.length;
      if ([10, 25, 50, 100].includes(totalMessages) && !(profile.flags?.shared_pattern_insight)) {
          insightReply = analyzePatterns(profile);
          if (insightReply) {
              profile.flags = profile.flags || {};
              profile.flags.shared_pattern_insight = true;
          }
      }

      if (insightReply) {
          baseReply = `${baseReply}\n\nبالمناسبة، ${insightReply}`;
      }
      
      if (intent.follow_up_question && Array.isArray(intent.follow_up_intents) && intent.follow_up_intents.length) {
        profile.expectingFollowUp = { parentTag: intent.tag, allowedTags: intent.follow_up_intents, expiresTs: Date.now() + (5*60*1000) };
        const question = intent.follow_up_question;
        const reply = adaptReplyBase(`${baseReply}\n\n${question}`, profile, mood);
        profile.shortMemory.push({ message: rawMessage, reply, mood, tag: intent.tag, ts: new Date().toISOString() });
        if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
        users[userId] = profile; 
        saveUsers(users);
        return res.status(200).json({ reply, source: "intent_followup", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }

      const personalized = adaptReplyBase(baseReply, profile, mood);
      profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, tag: intent.tag, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      
      if (mood !== "محايد" && Math.random() < 0.25) {
        profile.longMemory = profile.longMemory || [];
        profile.longMemory.push({ key: "mood_note", value: mood, ts: new Date().toISOString() });
        if (profile.longMemory.length > LONG_TERM_LIMIT) profile.longMemory.shift();
      }
      users[userId] = profile; 
      saveUsers(users);
      return res.status(200).json({ reply: personalized, source: "intent", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
    }

    if (process.env.TOGETHER_API_KEY) {
      const ext = await callTogetherAPI(rawMessage);
      appendLearningQueue({ message: rawMessage, userId, provider: "together", extResponse: ext, ts: new Date().toISOString() });
      profile.shortMemory.push({ message: rawMessage, reply: ext, mood, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      users[userId] = profile; 
      saveUsers(users);
      return res.status(200).json({ reply: ext, source: "together", userId });
    }

    let fallback;
    if (!profile.shortMemory || profile.shortMemory.length === 0) {
        const proactiveOpening = getProactiveOpening(profile);
        fallback = proactiveOpening || `${cairoGreetingPrefix()}، أنا رفيقك هنا. احكيلي إيه اللي بيحصل معاك النهاردة؟`;
    } else {
        const lastMood = profile.moodHistory?.slice(-1)[0]?.mood;
        if (lastMood && lastMood !== "محايد") {
            fallback = `لسه فاكرة إنك قلت إنك حاسس بـ"${lastMood}" قبل كده. تحب تحكيلي لو الحالة اتغيرت؟`;
        } else {
            fallback = "محتاج منك توضيح بسيط كمان 💜 احكيلي بالراحة وأنا سامعك.";
        }
    }
    
    profile.shortMemory.push({ message: rawMessage, reply: fallback, mood, ts: new Date().toISOString() });
    if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
    users[userId] = profile; 
    saveUsers(users);

    return res.status(200).json({ reply: fallback, source: "fallback", userId });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
