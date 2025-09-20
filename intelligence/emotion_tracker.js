// emotion_tracker.js v10.1 - In-Memory Sentient Emotional Engine
// 🧠 تتبع + تنبؤ + صدمات + شبكة معرفية تربط الكلمات بالمشاعر والزمن + fingerprint
// Now uses In-Memory storage to prevent file system errors on Vercel.

import crypto from "crypto";

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import {
  cosineSimilarity,
  normalizeVector,
  movingAverage,
  linearRegression,
} from "../shared/math_tools.js"; // Assuming math_tools is now in shared/utils
import { extractEmotionVector, extractKeywords } from "../shared/nlp_emotion.js"; // Assuming nlp_emotion is now in shared/utils
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================

// --- [CRASH FIX] ---
// We replace the file system (fs) with our simple in-memory store.
// This database will live for the duration of the serverless function's lifecycle.
const memoryStore = {
  emotion_log: [],
  emotion_graph: [],
};

if (process.env.NODE_ENV === 'development') {
    console.log("✅ [EMOTION_TRACKER] Running in smart In-Memory Temporary Storage mode.");
}
// --------------------

// 🧩 The old loadData and saveData functions are no longer needed.

// 🧠 لقطة انفعالية متقدمة
function analyzeSnapshot(userMessage, fingerprint) {
  const rawVector = extractEmotionVector(userMessage); // [قلق, فرح, حزن, غضب, أمل, فضول,...]
  const vector = normalizeVector(rawVector);
  const keywords = extractKeywords(userMessage);

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    fingerprint,
    vector,
    keywords,
  };
}

// 🔀 تطور المنحنى
function evolveCurve(curve, snapshot) {
  if (curve.length === 0) return [snapshot];

  const last = curve[curve.length - 1];
  // Ensure vectors exist before comparing
  if (!last.vector || !snapshot.vector) {
      curve.push(snapshot);
      return curve;
  }
  const sim = cosineSimilarity(last.vector, snapshot.vector);

  if (sim > 0.94) {
    // دمج ذكي
    last.vector = last.vector.map((v, i) =>
      parseFloat(((v + snapshot.vector[i]) / 2).toFixed(4))
    );
    last.keywords = [...new Set([...(last.keywords || []), ...(snapshot.keywords || [])])];
    last.timestamp = snapshot.timestamp;
  } else {
    curve.push(snapshot);
  }

  return curve;
}

// 📊 كشف الترندات
function detectTrends(curve) {
  if (curve.length < 5) return [];

  const emotions = ["قلق", "فرح", "حزن", "غضب", "أمل", "فضول"];
  const trends = [];

  emotions.forEach((emo, idx) => {
    const values = curve.slice(-7).map(p => (p.vector && p.vector[idx]) ? p.vector[idx] : 0);
    if(values.length < 3) return; // Need at least 3 points for moving average
    const slope = linearRegression(values);
    const avg = movingAverage(values, 3);

    if (slope > 0.12) trends.push(`📈 ${emo} في صعود`);
    else if (slope < -0.12) trends.push(`📉 ${emo} في هبوط`);
    if (avg > 0.7) trends.push(`🔥 ${emo} مسيطر`);
  });

  return trends;
}

// 🔮 توقع المزاج القادم
function forecastNext(curve) {
  if (curve.length < 6) return null;

  const last = curve.slice(-6);
  // Ensure the first point has a vector
  if(!last[0].vector) return null;

  return last[0].vector.map((_, idx) => {
    const seq = last.map(p => (p.vector && p.vector[idx]) ? p.vector[idx] : 0);
    const slope = linearRegression(seq);
    return Math.min(Math.max(seq[seq.length - 1] + slope, 0), 1);
  });
}

// 🚨 كشف التحولات المفاجئة
function detectShocks(curve) {
  if (curve.length < 2) return [];
  const last = curve[curve.length - 1].vector;
  const prev = curve[curve.length - 2].vector;
  
  if (!last || !prev) return []; // Ensure vectors exist

  const diff = last.map((v, i) => v - prev[i]);
  return diff
    .map((d, i) =>
      Math.abs(d) > 0.4
        ? `⚡ تغير مفاجئ في المحور ${i} (${d > 0 ? "↑" : "↓"})`
        : null
    )
    .filter(Boolean);
}

// 🌌 شبكة الذاكرة العاطفية (Graph Memory)
function updateGraph(graph, snapshot) {
  const emotions = ["قلق", "فرح", "حزن", "غضب", "أمل", "فضول"];
  
  if(!snapshot.keywords || !snapshot.vector) return graph;

  snapshot.keywords.forEach(word => {
    emotions.forEach((emo, idx) => {
      const weight = snapshot.vector[idx];
      if (weight > 0.2) {
        graph.push({
          id: crypto.randomUUID(),
          word,
          emotion: emo,
          weight: parseFloat(weight.toFixed(3)),
          fingerprint: snapshot.fingerprint,
          timestamp: snapshot.timestamp,
        });
      }
    });
  });

  return graph;
}

// 📌 API رئيسي
export async function trackEmotion(userMessage, fingerprint) {
  // We now directly use our in-memory store
  let curve = memoryStore.emotion_log;
  const snapshot = analyzeSnapshot(userMessage, fingerprint);
  curve = evolveCurve(curve, snapshot);

  // شبكة
  let graph = memoryStore.emotion_graph;
  graph = updateGraph(graph, snapshot);

  // تحليلات
  const trends = detectTrends(curve);
  const forecast = forecastNext(curve);
  const shocks = detectShocks(curve);

  // The 'saveData' calls are no longer needed because we modified the data in-memory directly.
  
  return {
    last: snapshot,
    curveSize: curve.length,
    graphSize: graph.length,
    trends,
    forecast,
    shocks,
  };
}

// 🔍 استعلام الشبكة: "إيه أكتر كلمة مرتبطة بالحزن مثلاً؟"
export function queryEmotionGraph(emotion, limit = 5) {
  let graph = memoryStore.emotion_graph;
  const filtered = graph.filter(node => node.emotion === emotion);
  const ranked = filtered.sort((a, b) => b.weight - a.weight);
  return ranked.slice(0, limit);
}
