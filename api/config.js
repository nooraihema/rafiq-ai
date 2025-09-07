// config.js

import path from "path";

// ------------ إعداد عام ومسارات ------------
export const ROOT = process.cwd();
export const INTENTS_PATH = path.join(ROOT, "intents.json");

// --- تعديل ذكي لمسار البيانات ---
export const IS_VERCEL = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
export const DATA_DIR = IS_VERCEL ? path.join("/tmp", "data") : path.join(ROOT, "data");
// ---------------------------------

export const USERS_FILE = path.join(DATA_DIR, "users.json");
export const LEARNING_QUEUE_FILE = path.join(DATA_DIR, "learning_queue.json");

// ------------ متغيرات التشغيل ------------
export const THRESHOLD = parseFloat(process.env.INTENT_THRESHOLD || "0.12");
export const DEBUG = process.env.DEBUG === "1";
export const SHORT_MEMORY_LIMIT = parseInt(process.env.SHORT_MEMORY_LIMIT || "5", 10);
export const LONG_TERM_LIMIT = parseInt(process.env.LONG_TERM_LIMIT || "60", 10);

// ------------ إعدادات Embeddings ------------
export const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
export const HF_API_KEY = process.env.HF_API_KEY || "";
export const HF_EMBEDDING_MODEL = process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-mpnet-base-v2";

// ------------ قوائم الكلمات المفتاحية الثابتة ------------
export const STOPWORDS = new Set(["في","من","على","عن","الى","الي","او","ام","ان","انا","انت","هو","هي","هم","مع","ما","لا","لم","لن","قد","ثم","كل","ايه","ايضا","بس","لكن","هذه","هذا","ذلك","الذي","التي","اللي","كان","كانت","كون","يكون","هوه","هيه","يا","ياعم"]);
export const NEGATORS = new Set(["لا","مش","ما","ليس","لست","بدون","ابدا","أبدا","وليس"]);
export const EMPHASIS = new Set(["جدا","للغاية","بشدة","كتير","قوي","قوية","تماما","بصراحة"]);

export const MOOD_KEYWORDS = {
  حزن: ["حزين","زعلان","مكسور","بكاء","بعيط","مكتئب","مش قادر","ضايق","متضايق","حزن","زهقان"],
  فرح: ["مبسوط","فرحان","سعيد","مبتهج","مستمتع"],
  قلق: ["قلقان","خايف","متوتر","مضطرب","مخنوق","توتر"],
  غضب: ["غضبان","متعصب","زعلان جدا","مستفز","عصبي"],
  وحدة: ["لوحدي","وحيد","محدش معايا","مفيش حد"],
  حب: ["بحبك","مشتاق","وحشتني","احبك"]
};

export const CRITICAL_KEYWORDS = ["انتحار","عايز اموت","عايز أموت","مش عايز اعيش","هقتل نفسي","اقتل نفسي","انا هموت","موتي"];

