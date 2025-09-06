
// /api/chat.js
import fs from "fs";
import path from "path";

// ---------- إعداد وتطبيع النص العربي ----------
function normalizeArabic(text = "") {
  return text
    .toString()
    .toLowerCase()
    // إزالة تشكيل
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    // توحيد الألف
    .replace(/[إأٱآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ|ئ/g, "ء")
    .replace(/ة/g, "ه")
    // إزالة علامات غير الحروف والأرقام والمسافات
    .replace(/[^ء-ي0-9a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// قائمة stopwords عربية بسيطة (ممكن تعدلها وتوسعها لاحقًا)
const STOPWORDS = new Set([
  "في","من","على","ان","انا","أنت","انت","إنت","هو","هي","مع","ما","لا","لم","لن",
  "هل","هوه","هيه","كان","كانت","قد","ثم","كل","ايه","ايضا","بس","بسّ","لكن",
  "هوذا","هذه","ذلك","اللذي","اللي"
]);

function tokenize(text) {
  const norm = normalizeArabic(text);
  if (!norm) return [];
  return norm.split(/\s+/).filter(w => w && !STOPWORDS.has(w));
}

// ---------- تحميل intents.json و بناء TF-IDF (مرة عند الإقلاع) ----------
const INTENTS_PATH = path.join(process.cwd(), "intents.json");

let INTENTS = [];
let intentVectors = []; // array of { tag, responses, vectorMap, norm }

function buildTfIdfIndex() {
  try {
    const raw = fs.readFileSync(INTENTS_PATH, "utf8");
    const json = JSON.parse(raw);
    INTENTS = Array.isArray(json.intents) ? json.intents : json;

    // 1) كنّا نعتبر كل intent كوثيقة (نجمع كل patterns مع بعض)
    const docs = INTENTS.map(it => it.patterns.join(" "));

    // 2) حساب DF (document frequency)
    const df = {}; // token -> count of documents containing token
    const docTokens = []; // per doc set of tokens
    for (const doc of docs) {
      const toks = new Set(tokenize(doc));
      docTokens.push(toks);
      for (const t of toks) {
        df[t] = (df[t] || 0) + 1;
      }
    }
    const N = docs.length;

    // 3) IDF
    const idf = {};
    for (const token in df) {
      idf[token] = Math.log((N + 1) / (df[token] + 1)) + 1; // smooth idf
    }

    // 4) TF-IDF per intent (aggregate all patterns into one doc per intent)
    intentVectors = INTENTS.map((intent, idx) => {
      const text = intent.patterns.join(" ");
      const tokens = tokenize(text);
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
      return { tag: intent.tag || intent.intent || intent.id || `intent_${idx}`, responses: intent.responses || intent.response || intent.responses, vector: vec, norm };
    });

    console.log("✅ Built TF-IDF index for intents:", intentVectors.length);
  } catch (err) {
    console.error("❌ Failed to load intents.json or build index:", err);
    INTENTS = [];
    intentVectors = [];
  }
}

// Build at startup
buildTfIdfIndex();

// ---------- دوال مساعدة للتشابه ----------
function buildMessageVector(text) {
  const tokens = tokenize(text);
  const counts = {};
  for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
  const total = tokens.length || 1;
  // For message TF-IDF we will use same IDF used earlier approx by matching keys in intents
  // Simpler: compute tf only and later dot with intent vectors (which already include idf)
  const vec = {};
  let sqsum = 0;
  for (const t in counts) {
    const tf = counts[t] / total;
    vec[t] = tf; // note: intent vectors contain tf*idf; message contains tf
    sqsum += tf * tf;
  }
  const norm = Math.sqrt(sqsum) || 1;
  return { vec, norm };
}

function cosineScore(messageVec, intentVec, intentNorm) {
  // messageVec: {token: tf}, intentVec: {token: tfidf}
  let dot = 0;
  for (const t in messageVec) {
    if (intentVec[t]) dot += messageVec[t] * intentVec[t];
  }
  const denom = (messageVec._norm || 0) * (intentNorm || 1);
  return denom ? dot / denom : 0;
}

// ---------- واجهة الاتصال بالخدمات الخارجية (Together, Gemini) ----------

async function callTogetherAPI(message) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error("No TOGETHER_API_KEY defined");
  const model = process.env.TOGETHER_MODEL || "gpt-j-6b"; // يمكنك تغييره حسب الحاجة
  try {
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
    // حاول نقرأ النص الناتج من أكثر من شكل
    const out = data.output_text || data.output?.[0]?.content || data[0]?.generated_text || JSON.stringify(data);
    return (typeof out === "string") ? out : JSON.stringify(out);
  } catch (e) {
    throw new Error("Together API error: " + e.message);
  }
}

async function callGeminiAPI(message) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("No GEMINI_API_KEY defined");
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${key}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: {
          text: message
        },
        temperature: 0.7,
        maxOutputTokens: 250
      })
    });
    const data = await res.json();
    // حاول استخراج النص الناتج من هيكل Gemini
    const reply = data?.candidates?.[0]?.content?.[0]?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
    return reply;
  } catch (e) {
    throw new Error("Gemini API error: " + e.message);
  }
}

// ---------- الدالة الأساسية للـ API ----------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Empty message" });

    // 1) بناء متجه للرسالة
    const m = buildMessageVector(message);
    m._norm = m.norm;

    // 2) البحث عن أفضل intent عبر حساب cosine score
    let best = { score: 0, intentIdx: -1 };
    for (let i = 0; i < intentVectors.length; i++) {
      const iv = intentVectors[i];
      const score = cosineScore(m.vec, iv.vector, iv.norm);
      if (score > best.score) {
        best = { score, intentIdx: i };
      }
    }

    const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.20"); // اضبط لو عايز
    if (best.intentIdx >= 0 && best.score >= THRESHOLD) {
      const chosenIntent = intentVectors[best.intentIdx];
      // اختار رد عشوائي من responses
      const responses = INTENTS[best.intentIdx].responses || INTENTS[best.intentIdx].response || chosenIntent.responses || [];
      const reply = Array.isArray(responses) ? responses[Math.floor(Math.random() * responses.length)] : responses;
      return res.status(200).json({ reply, source: "intent", score: best.score });
    }

    // 3) لو لم نجد intent مناسب، نحاول معاودة الاتصال بخدمة خارجية (Together أولًا، ثم Gemini)
    try {
      if (process.env.TOGETHER_API_KEY) {
        const r = await callTogetherAPI(message);
        return res.status(200).json({ reply: r, source: "together" });
      } else if (process.env.GEMINI_API_KEY) {
        const r = await callGeminiAPI(message);
        return res.status(200).json({ reply: r, source: "gemini" });
      } else {
        // لا توجد مفاتيح خارجية => رد افتراضي لطيف
        return res.status(200).json({ reply: "ممكن توضّح شوية أكتر؟ أنا هحاول أجاوبك من اللي عندي دلوقتي.", source: "fallback" });
      }
    } catch (externalErr) {
      // لو الخدمة الخارجية فشلت (كوتا/429/غيره)
      console.error("Error in external AI:", externalErr);
      // رد لطيف واحتياطي من intents (لو فيه intent عام للمساعدة)
      const fallbackReply = "آسف، أنا مش قادر أتواصل مع السيرفر دلوقتي. ممكن تجرب تقوللي بشكل أبسط أو أحكيلي شوية؟";
      return res.status(200).json({ reply: fallbackReply, source: "error_external", error: String(externalErr) });
    }

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
}
