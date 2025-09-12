
// intents_mega_smart.js
// سكربت: تحويل ملفات intents -> نسخة M E G A ذكية
// شغله بـ: node intents_mega_smart.js
// ملاحظات: ضع ملفات JSON الأصلية داخل مجلد ./intents

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// === إعدادات ومسارات ===
const INTENTS_FOLDER = "./intents";
const OUTPUT_FOLDER = "./intents_mega_smart";
const LEARNED_FILE = path.join(OUTPUT_FOLDER, "learned_examples.json");

// تأكد المجلد الناتج موجود
if (!fs.existsSync(OUTPUT_FOLDER)) fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
// تأكد ملف learned موجود أو أنشئه
if (!fs.existsSync(LEARNED_FILE)) fs.writeFileSync(LEARNED_FILE, JSON.stringify([], null, 2), "utf8");

// === أدوات نصية عربية بسيطة ===
function normalizeArabic(text = "") {
  return (text || "")
    .toString()
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "") // حذف تشكيل
    .replace(/[إأٱآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9a-z\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function tokenize(text) {
  return normalizeArabic(text).split(/\s+/).filter(Boolean);
}

// === خريطة مرادفات بسيطة (قابلة للتوسيع) ===
const SYNONYMS = {
  "حزين": ["مكتئب", "مهموم", "مستاء", "مكروب"],
  "سعيد": ["مبتهج", "فرحان", "مبسوط"],
  "مرهق": ["متعب", "منهك", "مجهد"],
  "قلق": ["متوتر", "مضطرب", "قلقان"],
  "غاضب": ["منزعج", "زعلان", "غضبان"],
  "وحدة": ["انعزال", "عزلة", "وِحدة"],
  "عمل": ["شغل", "وظيفة", "الدوام"],
  "أكل": ["طعام", "وجبة", "أكلت"]
};

// === دوال توليد وتنويعات ذكية ===
function generateSemanticVariations(pattern) {
  const base = pattern.trim();
  const variations = new Set();
  variations.add(base);

  // استبدالات مرادفات للكلمات الموجودة
  const tokens = tokenize(base);
  tokens.forEach((t, idx) => {
    if (SYNONYMS[t]) {
      SYNONYMS[t].forEach(syn => {
        // استبدال الكلمة بالمرادف
        const re = new RegExp("\\b" + t + "\\b", "g");
        variations.add(base.replace(re, syn));
        // نضيف نسخة بصيغة سؤال / دعوة للحديث
        variations.add(base.replace(re, syn) + " ...تحب تقول أكتر؟");
      });
    }
  });

  // تحويلات تركيبية بسيطة
  variations.add(base + " ...هل تحب أن تحكي أكثر؟");
  variations.add("أفهم شعورك عندما تقول: " + base);
  variations.add(base.replace(/أنا/g, "أنت"));
  variations.add(base + " وأريد أن أعرف المزيد عن شعورك.");
  // صيغة سؤال قصيرة
  variations.add(base + "?");

  // اجعل النتيجة محدودة للحجم (حماية من النفخة)
  return Array.from(variations).slice(0, 80);
}

// === وسم المزاج (بسيط) مع توزيع درجات الشدة ===
function tagMood(pattern) {
  const p = normalizeArabic(pattern);
  if (/حزن|مكتئب|حزن/.test(p)) return { type: "sadness", intensity: 0.7 };
  if (/سعيد|فرح|مبسوط/.test(p)) return { type: "joy", intensity: 0.6 };
  if (/غاضب|منزعج|زعلان/.test(p)) return { type: "anger", intensity: 0.7 };
  if (/مرهق|متعب|انهك/.test(p)) return { type: "fatigue", intensity: 0.6 };
  if (/قلق|متوتر|مضطرب/.test(p)) return { type: "anxiety", intensity: 0.65 };
  return { type: "neutral", intensity: 0.2 };
}

// === استخراج كلمات مفتاحية بسيطة ===
function extractKeywords(text, topN = 6) {
  const toks = tokenize(text).filter(t => t.length > 2);
  const freq = {};
  toks.forEach(t => freq[t] = (freq[t] || 0) + 1);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(e => e[0]);
}

// === حساب flexScore بسيط ===
function computeFlexScore(patText) {
  // طول النص + عدد الكلمات متنوعة => معيار بسيط
  const len = patText.length;
  const words = tokenize(patText).length || 1;
  const score = Math.min(1, Math.max(0.05, (words / 8) + (Math.min(len, 120) / 240)));
  return parseFloat(score.toFixed(3));
}

// === توليد embedding بسيط (هَش إلى متجه ثابت) ===
// هذا ليس embedding حقيقي لكنه مفيد للبحث السريع بدون مكتبات
function textToVector(text, dim = 64) {
  const hash = crypto.createHash("sha256").update(normalizeArabic(text)).digest();
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    vec[i] = (hash[i % hash.length] / 255); // قيمة بين 0 و1
  }
  return vec;
}

// === تحديث ملف learned examples ===
function appendLearnedExample(exampleObj) {
  try {
    const raw = fs.readFileSync(LEARNED_FILE, "utf8");
    const arr = JSON.parse(raw || "[]");
    arr.push(exampleObj);
    fs.writeFileSync(LEARNED_FILE, JSON.stringify(arr, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to append learned example:", e);
  }
}

// === توليد ردود templates مع placeholders ===
function generateResponseTemplates(intentTag) {
  // نماذج أولية قابلة للتوسع
  return {
    templates: [
      `أنا سامعك، فيما يتعلق بـ {CORE_CONCEPT} أقدر شعورك. هل تقدر تحكيلي أكثر عن {LAST_EVENT}?`,
      `مفهوم {CORE_CONCEPT} مهم. ممكن تحكي موقف حصل مؤخراً مرتبط بـ {CORE_CONCEPT}؟`,
      `انت مش لوحدك في الشعور ده. لو حابب، نقدر نجرب مع بعض خطوة بسيطة لحل مؤقت.`
    ],
    rotation: "round_robin"
  };
}

// === المعالجة الرئيسية لكل ملف intents ===
function processIntentFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  let intents = [];
  try { intents = JSON.parse(raw); } catch (e) {
    console.error("خطأ: لم أتمكن من قراءة JSON من:", filePath);
    return;
  }

  const outIntents = intents.map((intent) => {
    const tag = intent.tag || intent.name || "intent_" + Math.random().toString(36).slice(2, 8);
    const coreConcept = intent.core_concept || intent.tag || tag;
    const basePatterns = Array.isArray(intent.patterns) ? intent.patterns : (intent.pattern ? [intent.pattern] : []);

    // تجميع كل التنويعات
    let allPatterns = [];
    basePatterns.forEach(p => {
      const vars = generateSemanticVariations(p);
      allPatterns = allPatterns.concat(vars);
    });

    // أضف أيضاً أي نمط موجود في L1/L2 لو كانت بنية قديمة
    if (intent.layers) {
      ["L1_DirectMatch", "L2_HighConfidence", "L3_LearnedExamples"].forEach(l => {
        if (intent.layers[l] && Array.isArray(intent.layers[l].examples || intent.layers[l])) {
          const examples = intent.layers[l].examples || intent.layers[l];
          allPatterns = allPatterns.concat(examples);
        }
      });
    }

    // تطهير وتحديد عدد معقول للحماية
    allPatterns = Array.from(new Set(allPatterns)).slice(0, 300);

    // بناء patterns مع metadata
    const patternsWithMeta = allPatterns.map(p => {
      const mood = tagMood(p);
      const keywords = extractKeywords(p, 6);
      return {
        text: p,
        normalized: normalizeArabic(p),
        moodTag: mood.type,
        moodIntensity: mood.intensity,
        flexScore: computeFlexScore(p),
        keywords,
        embedding_vector: textToVector(p, 64)
      };
    });

    // NLU summary (keywords from whole intent)
    const allText = basePatterns.join(" ") + " " + (intent.description || "");
    const intentKeywords = extractKeywords(allText, 12);
    const nlu = {
      keywords: Array.from(new Set([...(intent.keywords || []), ...intentKeywords])),
      embedding_vector: textToVector((allText || tag).slice(0, 300), 64)
    };

    // emotion aggregated (avg intensity)
    const emotionAgg = (() => {
      const ints = patternsWithMeta.map(p => p.moodIntensity || 0.2);
      const avg = ints.length ? (ints.reduce((a,b) => a+b, 0) / ints.length) : 0.2;
      // determine dominant emotion by frequency
      const freq = {};
      patternsWithMeta.forEach(p => freq[p.moodTag] = (freq[p.moodTag]||0) + 1);
      const dominant = Object.entries(freq).sort((a,b) => b[1]-a[1])[0];
      return { type: dominant ? dominant[0] : (intent.emotion && intent.emotion.type) || "neutral", intensity: parseFloat(avg.toFixed(3)) };
    })();

    // context weighting: إذا كانت context triggers موجودة نحتفظ بها بصيغ أوزان
    const context = intent.context || {};
    const triggers = {};
    if (Array.isArray(context.triggers)) {
      context.triggers.forEach(t => triggers[t] = 0.6);
    } else if (typeof context.triggers === "object" && context.triggers !== null) {
      Object.assign(triggers, context.triggers);
    }

    // responses: إذا فيه responses موجودة استخدمها وإلا أنشئ قوالب ذكية
    const responses = intent.responses || intent.response_constructor || {};
    const finalResponses = {
      templates: (responses.templates && Array.isArray(responses.templates) ? responses.templates : generateResponseTemplates(coreConcept).templates),
      rotation: responses.rotation || "round_robin",
      adaptive: true // علامة إن الرد يتأثر بالسياق والمود
    };

    // metadata وauto-expand
    const metadata = intent.metadata || {
      created_at: new Date().toISOString().split("T")[0],
      last_updated: new Date().toISOString().split("T")[0],
      learned_from_users: intent.metadata && intent.metadata.learned_from_users ? intent.metadata.learned_from_users : []
    };

    const smartIntent = {
      tag,
      core_concept: coreConcept,
      nlu,
      emotion: intent.emotion || emotionAgg,
      layers: {
        L1: (intent.layers && intent.layers.L1_DirectMatch) ? intent.layers.L1_DirectMatch : basePatterns.slice(0,10),
        L2: (intent.layers && intent.layers.L2_HighConfidence) ? intent.layers.L2_HighConfidence : [],
        L3: (intent.layers && intent.layers.L3_LearnedExamples) ? intent.layers.L3_LearnedExamples : []
      },
      patterns: patternsWithMeta,
      context: {
        triggers: triggers,
        suggests: intent.context && intent.context.suggests ? intent.context.suggests : (intent.suggests || [])
      },
      opposite: intent.opposite || null,
      responses: finalResponses,
      priority_score: intent.priority_score || Math.min(1, 0.1 + intentKeywords.length * 0.05),
      metadata
    };

    return smartIntent;
  });

  // كتابة الملف الناتج
  const outPath = path.join(OUTPUT_FOLDER, path.basename(filePath));
  fs.writeFileSync(outPath, JSON.stringify(outIntents, null, 2), "utf8");
  console.log("✅ created:", path.basename(outPath));
}

// === تشغيل على كل ملفات intents ===
function runAll() {
  if (!fs.existsSync(INTENTS_FOLDER)) {
    console.error("خطأ: مجلد intents غير موجود. أنشئ مجلد './intents' وضع ملفات JSON فيه ثم شغّل السكربت.");
    process.exit(1);
  }
  const files = fs.readdirSync(INTENTS_FOLDER).filter(f => f.endsWith(".json"));
  if (files.length === 0) {
    console.error("لا توجد ملفات JSON داخل مجلد ./intents");
    process.exit(1);
  }
  files.forEach(f => {
    try {
      processIntentFile(path.join(INTENTS_FOLDER, f));
    } catch (e) {
      console.error("فشل معالجة:", f, e);
    }
  });
  console.log("🎉 انتهينا. راجع مجلد:", OUTPUT_FOLDER);
}

runAll();



