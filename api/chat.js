
// /api/chat.js
// ==========================
// رفيق - محرك نوايا ذكي جدًا
// ==========================

import fs from "fs";
import path from "path";

// -------------- إعداد عام --------------
const INTENTS_PATH = path.join(process.cwd(), "intents.json");
const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.12"); // عتبة أهدى بقليل
const DEBUG = process.env.DEBUG === "1";

// -------------- تطبيع/تقسيم عربي --------------
function normalizeArabic(text = "") {
  return text
    .toString()
    .toLowerCase()
    // إزالة التشكيل
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    // توحيد الألف
    .replace(/[إأٱآا]/g, "ا")
    // ياءات/همزات/تاء مربوطة
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .replace(/ة/g, "ه")
    // غير الحروف/الأرقام → مساحة
    .replace(/[^ء-ي0-9a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// stopwords مختصرة (تقدر تزودها بحرية)
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

// -------------- Levenshtein (للمطابقة الغامضة) --------------
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

// -------------- تحميل intents وبناء فهرس TF-IDF --------------
let INTENTS = [];
let intentVectors = [];  // [{tag, responses, safety, vector, norm, keywords, patterns}]

function loadIntents() {
  const raw = fs.readFileSync(INTENTS_PATH, "utf8");
  const json = JSON.parse(raw);
  const arr = Array.isArray(json.intents) ? json.intents : json;

  // تطبيع الحقول ودعم صيغ متعددة (tag/intent, patterns/keywords/responses)
  return arr.map((it, idx) => {
    const tag = it.tag || it.intent || it.id || `intent_${idx}`;
    const patterns = Array.isArray(it.patterns) ? it.patterns : [];
    const keywords = Array.isArray(it.keywords) ? it.keywords : [];
    const responses = Array.isArray(it.responses)
      ? it.responses
      : (it.response ? [it.response] : []);
    const safety = (it.safety_protocol || "").toUpperCase().trim();

    return { tag, patterns, keywords, responses, safety };
  });
}

function buildTfIdfIndex() {
  try {
    INTENTS = loadIntents();

    // وثيقة لكل intent = patterns + keywords
    const docs = INTENTS.map(it => {
      const text = [...it.patterns, ...it.keywords].join(" ");
      return tokenize(text);
    });

    // DF
    const df = {};
    docs.forEach(docSet => {
      const unique = new Set(docSet);
      unique.forEach(t => { df[t] = (df[t] || 0) + 1; });
    });

    const N = Math.max(1, docs.length);
    const idf = {};
    for (const t in df) idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1;

    intentVectors = INTENTS.map((it, i) => {
      const tokens = docs[i];
      const counts = {};
      tokens.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      const total = Math.max(1, tokens.length);
      const vector = {};
      let sq = 0;
      for (const t in counts) {
        const tf = counts[t] / total;
        const v = tf * (idf[t] || 1);
        vector[t] = v;
        sq += v * v;
      }
      const norm = Math.sqrt(sq) || 1;
      return {
        tag: it.tag,
        responses: it.responses,
        safety: it.safety,
        keywords: it.keywords.map(normalizeArabic),
        patterns: it.patterns.map(normalizeArabic),
        vector, norm
      };
    });

    console.log("✅ Built TF-IDF index for intents:", intentVectors.length);
  } catch (err) {
    console.error("❌ Failed to load intents.json or build index:", err);
    INTENTS = [];
    intentVectors = [];
  }
}

buildTfIdfIndex();

// -------------- تشابه/درجات --------------
function buildMessageVector(message) {
  const tokens = tokenize(message);
  const counts = {};
  tokens.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  const total = Math.max(1, tokens.length);
  const vec = {};
  let sq = 0;
  for (const t in counts) {
    const tf = counts[t] / total;
    vec[t] = tf; // سنضربه في tf-idf للـ intent
    sq += tf * tf;
  }
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

// -------------- مطابقة ذكية قبل TF-IDF --------------
// 1) مطابقات مباشرة tokens/keywords
// 2) مطابقات شبه مباشرة (levenshtein <= 1) بين كلمات الرسالة والـkeywords
function directOrFuzzyHit(message, intent) {
  const mNorm = normalizeArabic(message);
  const mTokens = new Set(tokenize(message));
  // مطابقات مباشرة
  for (const kw of intent.keywords) {
    if (!kw) continue;
    // substring قوي للكلمات القصيرة (زي "حزين", "مخنوق")
    if (mNorm.includes(kw)) return { hit: true, boost: 0.25 };
  }
  for (const pat of intent.patterns) {
    if (!pat) continue;
    if (mNorm === pat || mNorm.includes(pat)) return { hit: true, boost: 0.25 };
  }
  // fuzzy token-to-token
  for (const kw of intent.keywords) {
    for (const tok of mTokens) {
      if (levenshtein(tok, kw) <= 1) return { hit: true, boost: 0.18 };
    }
  }
  return { hit: false, boost: 0 };
}

// -------------- مزودات خارجية (اختيارية) --------------
async function callTogetherAPI(userText) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("No TOGETHER_API_KEY defined");

  // ملاحظة: نقطة النهاية والمحتوى قد تتغير حسب موديلك وخطتك
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
    return "حالياً مش قادر أستخدم الموديل الخارجي، بس أنا معاك وجاهز أسمعك. احكيلي أكتر 💙";
  } finally {
    clearTimeout(t);
  }
}

async function callGeminiAPI(userText) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("No GEMINI_API_KEY defined");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${key}`;
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `أجب عربيًا باختصار وبلهجة داعمة:\n\n${userText}` }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 220 }
      })
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return (typeof text === "string" && text.trim()) ? text.trim() : "محتاج منك توضيح بسيط كمان 💜";
  } catch (e) {
    return "حالياً مش قادر أستخدم الموديل الخارجي، بس أنا معاك وجاهز أسمعك. احكيلي أكتر 💙";
  } finally {
    clearTimeout(t);
  }
}

// -------------- ردود السلامة الحرجة --------------
function criticalSafetyReply() {
  return (
    "كلامك مهم جدًا وأنا آخذه على محمل الجد. لو عندك أفكار لإيذاء نفسك أو فقدت الأمان، " +
    "مهم جدًا تكلم حد موثوق فورًا أو تواصل مع جهة مختصة قريبة منك. " +
    "لو تقدر، كلّمني أكتر دلوقتي عن اللي بيمرّ عليك وأنا معاك خطوة بخطوة 💙"
  );
}

// -------------- المعالج الرئيسي --------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Empty message" });
    }

    // 1) محاولة مطابقة مباشرة/غامضة سريعًا
    let best = { idx: -1, score: 0, source: "direct" };
    const msgVec = buildMessageVector(message);

    for (let i = 0; i < intentVectors.length; i++) {
      const it = intentVectors[i];

      // direct/fuzzy boost
      const df = directOrFuzzyHit(message, it);
      // cosine
      const cs = cosineScore(msgVec.vec, it.vector, msgVec.norm, it.norm);

      const score = cs + df.boost; // نجمع البوست مع الكوزاين
      if (score > best.score) best = { idx: i, score, source: df.hit ? "direct+tfidf" : "tfidf" };

      if (DEBUG) {
        console.log(
          `[INTENT] ${it.tag} | cosine=${cs.toFixed(3)} | boost=${df.boost.toFixed(3)} | total=${score.toFixed(3)}`
        );
      }
    }

    // 2) لو نية لُقطت كفاية
    if (best.idx !== -1 && best.score >= THRESHOLD) {
      const intent = intentVectors[best.idx];
      // أولوية السلامة
      if (intent.safety === "CRITICAL") {
        return res.status(200).json({
          reply: criticalSafetyReply(),
          source: "intent_critical",
          tag: intent.tag,
          score: Number(best.score.toFixed(3))
        });
      }
      // رد من المكتبة
      const pool = intent.responses || [];
      const reply = pool.length
        ? pool[Math.floor(Math.random() * pool.length)]
        : "أنا سامعك وبكل هدوء معاك. احكيلي أكتر 💙";

      return res.status(200).json({
        reply,
        source: best.source,
        tag: intent.tag,
        score: Number(best.score.toFixed(3))
      });
    }

    // 3) لا توجد نية قوية → جرّب مزود خارجي (لو موجود)
    if (process.env.TOGETHER_API_KEY) {
      const r = await callTogetherAPI(message);
      return res.status(200).json({ reply: r, source: "together" });
    }
    // (اختياري) Gemini لو فعلته لاحقًا
    if (process.env.GEMINI_API_KEY) {
      const r = await callGeminiAPI(message);
      return res.status(200).json({ reply: r, source: "gemini" });
    }

    // 4) فallback مهذب
    return res.status(200).json({
      reply: "محتاج منك توضيح بسيط كمان 💜 احكيلي بالراحة وأنا سامعك.",
      source: "fallback"
    });

  } catch (e) {
    console.error("API error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


