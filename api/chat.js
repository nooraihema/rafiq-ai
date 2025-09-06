
// /api/chat.js
import fs from "fs";
import path from "path";

// ---------- إعداد وتطبيع النص العربي ----------
function normalizeArabic(text = "") {
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "") // إزالة تشكيل
    .replace(/[إأٱآا]/g, "ا") // توحيد الألف
    .replace(/ى/g, "ي")
    .replace(/ؤ|ئ/g, "ء")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-zA-Z\s]/g, " ") // إزالة الرموز
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "في","من","على","ان","انا","انت","هو","هي","مع","ما","لا","لم","لن",
  "هل","كان","كانت","قد","ثم","كل","ايه","ايضا","بس","لكن","هوذا","هذه","ذلك","اللي"
]);

function tokenize(text) {
  const norm = normalizeArabic(text);
  if (!norm) return [];
  return norm.split(/\s+/).filter(w => w && !STOPWORDS.has(w));
}

// ---------- تحميل intents.json ----------
const INTENTS_PATH = path.join(process.cwd(), "intents.json");

let INTENTS = [];
let intentVectors = [];

function buildTfIdfIndex() {
  try {
    const raw = fs.readFileSync(INTENTS_PATH, "utf8");
    const json = JSON.parse(raw);
    INTENTS = Array.isArray(json.intents) ? json.intents : json;

    const docs = INTENTS.map(it => it.patterns.join(" "));

    // DF
    const df = {};
    const docTokens = [];
    for (const doc of docs) {
      const toks = new Set(tokenize(doc));
      docTokens.push(toks);
      for (const t of toks) df[t] = (df[t] || 0) + 1;
    }
    const N = docs.length;

    // IDF
    const idf = {};
    for (const token in df) {
      idf[token] = Math.log((N + 1) / (df[token] + 1)) + 1;
    }

    // Vectors
    intentVectors = INTENTS.map((intent, idx) => {
      const tokens = tokenize(intent.patterns.join(" "));
      const counts = {};
      for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
      const total = tokens.length || 1;
      const vec = {};
      let sqsum = 0;
      for (const t in counts) {
        const tf = counts[t] / total;
        const v = tf * (idf[t] || 1.0);
        vec[t] = v;
        sqsum += v * v;
      }
      const norm = Math.sqrt(sqsum) || 1;
      return {
        tag: intent.tag || `intent_${idx}`,
        responses: intent.responses || [],
        vector: vec,
        norm
      };
    });

    console.log("✅ Built TF-IDF index for intents:", intentVectors.length);
  } catch (err) {
    console.error("❌ Failed to load intents.json:", err);
    INTENTS = [];
    intentVectors = [];
  }
}

buildTfIdfIndex();

// ---------- similarity ----------
function buildMessageVector(text) {
  const tokens = tokenize(text);
  const counts = {};
  for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
  const total = tokens.length || 1;
  const vec = {};
  let sqsum = 0;
  for (const t in counts) {
    const tf = counts[t] / total;
    vec[t] = tf;
    sqsum += tf * tf;
  }
  const norm = Math.sqrt(sqsum) || 1;
  return { vec, norm };
}

function cosineScore(messageVec, intentVec, intentNorm) {
  let dot = 0;
  for (const t in messageVec) {
    if (intentVec[t]) dot += messageVec[t] * intentVec[t];
  }
  return dot / (messageVec._norm * intentNorm || 1);
}

// ---------- Together API ----------
async function callTogetherAPI(message) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("No TOGETHER_API_KEY defined");
  const model = process.env.TOGETHER_MODEL || "gpt-j-6b";
  const res = await fetch("https://api.together.xyz/inference", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: message,
      max_output_tokens: 300,
      temperature: 0.7
    })
  });
  const data = await res.json();
  return data.output_text || data.output?.[0]?.content || data[0]?.generated_text || "معرفتش أرد من Together";
}

// ---------- Gemini API (مصححة) ----------
async function callGeminiAPI(message) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("No GEMINI_API_KEY defined");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${key}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: message }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250
      }
    })
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "معرفتش أرد من Gemini";
}

// ---------- API handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Empty message" });

    const m = buildMessageVector(message);
    m._norm = m.norm;

    let best = { score: 0, idx: -1 };
    for (let i = 0; i < intentVectors.length; i++) {
      const score = cosineScore(m.vec, intentVectors[i].vector, intentVectors[i].norm);
      if (score > best.score) best = { score, idx: i };
    }

    const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.20");
    if (best.idx >= 0 && best.score >= THRESHOLD) {
      const intent = INTENTS[best.idx];
      const responses = intent.responses || [];
      const reply = responses[Math.floor(Math.random() * responses.length)];
      return res.status(200).json({ reply, source: "intent", score: best.score });
    }

    // لا يوجد intent مناسب → جرب Together أو Gemini
    if (process.env.TOGETHER_API_KEY) {
      const r = await callTogetherAPI(message);
      return res.status(200).json({ reply: r, source: "together" });
    } else if (process.env.GEMINI_API_KEY) {
      const r = await callGeminiAPI(message);
      return res.status(200).json({ reply: r, source: "gemini" });
    }

    return res.status(200).json({ reply: "ممكن توضّح أكتر؟ أنا معاك.", source: "fallback" });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
