// intent_engine.js

import fs from "fs";
import path from "path";
import { ROOT, DEBUG, OPENAI_API_KEY, HF_API_KEY, HF_EMBEDDING_MODEL, EMBEDDING_PROVIDER } from './config.js';
import { normalizeArabic, tokenize, levenshtein, hasNegationNearby, hasEmphasisNearby } from './utils.js';

// ------------ تحميل intents + بناء فهرس ------------
let INTENTS_RAW = [];
export let intentIndex = [];
export let tagToIdx = {};

// ===== بداية الكود المعدل (المحقق الذكي) =====
function loadIntentsRaw() {
    let intentsDir = path.join(process.cwd(), "intents");

    if (!fs.existsSync(intentsDir)) {
      console.log("INFO: 'intents/' directory not found in project root. Checking inside 'api/' directory...");
      intentsDir = path.join(process.cwd(), "api", "intents");
    }

    if (!fs.existsSync(intentsDir)) {
        const errorMsg = "CRITICAL ERROR: Could not find the 'intents/' directory in the project root or inside the 'api/' directory. Please ensure your `intents` folder is placed correctly.";
        console.error(errorMsg);
        throw new Error(errorMsg);
    } 
    
    console.log(`✅ SUCCESS: Located intents directory at: ${intentsDir}`);
    
    let allIntents = [];
    try {
        const files = fs.readdirSync(intentsDir);

        for (const file of files) {
            if (file.endsWith(".json")) {
                const filePath = path.join(intentsDir, file);
                const rawContent = fs.readFileSync(filePath, "utf8");
                const jsonContent = JSON.parse(rawContent);

                const intentsArray = Array.isArray(jsonContent.intents) 
                                      ? jsonContent.intents 
                                      : (Array.isArray(jsonContent) ? jsonContent : []);
                
                allIntents = allIntents.concat(intentsArray);

                if (DEBUG) {
                    console.log(`- Loaded ${intentsArray.length} intents from [${file}]`);
                }
            }
        }
        
        if (DEBUG) {
            console.log(`✨ Total intents loaded: ${allIntents.length}`);
        }
        return allIntents;

    } catch (e) {
        console.error(`❌ ERROR: Failed to read or parse files from the intents directory. Error: ${e.message}`);
        return [];
    }
}
// ===== نهاية الكود المعدل =====


export function buildIndexSync() {
    INTENTS_RAW = loadIntentsRaw();
    if (INTENTS_RAW.length === 0) {
        console.warn("WARNING: No intents were loaded. The bot will not be able to match any intents.");
    }
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
            tag: it.tag, responses: it.responses, response_constructor: it.response_constructor, safety: it.safety,
            keywords: it.keywords.map(normalizeArabic), patterns: it.patterns.map(normalizeArabic),
            follow_up_question: it.follow_up_question, follow_up_intents: it.follow_up_intents,
            tfidfVector: vec, tfidfNorm: Math.sqrt(sq) || 1, embedding: null
        };
    });

    tagToIdx = {};
    intentIndex.forEach((e, idx) => tagToIdx[e.tag] = idx);
    if (DEBUG) console.log("Built index (TF-IDF). Total Intents:", intentIndex.length);
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

export async function ensureIntentEmbeddings() {
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

// ------------ Message vector & Scoring ------------
export function buildMessageTfVec(message) {
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

export function scoreIntent(rawMessage, msgTfVec, msgTfNorm, intent) {
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

// ------------ Embedding message ------------
export async function embedMessageIfPossible(msgObj, rawMessage) {
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

// ------------ External provider ------------
export async function callTogetherAPI(userText) {
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
  } catch (e) { // <-- تم إصلاح الخطأ هنا
    if (DEBUG) console.warn("Together error", e);
    return "حالياً مش قادر أستخدم الموديل الخارجي، بس أنا معاك وجاهز أسمعك. احكيلي أكتر 💙";
  } finally { clearTimeout(t); }
}
