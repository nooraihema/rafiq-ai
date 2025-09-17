
// emotion_tracker.js v10.0 - Sentient Emotional Engine with Graph Memory
// 🧠 تتبع + تنبؤ + صدمات + شبكة معرفية تربط الكلمات بالمشاعر والزمن + fingerprint

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  cosineSimilarity,
  normalizeVector,
  movingAverage,
  linearRegression,
} from "./utils/math_tools.js";
import { extractEmotionVector, extractKeywords } from "./utils/nlp_emotion.js";

// 📂 ملفات التخزين
const EMOTION_LOG = path.join("memory", "emotions_curve.json");
const EMOTION_GRAPH = path.join("memory", "emotions_graph.json");

// 🧩 تحميل/حفظ
function loadData(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

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
  const sim = cosineSimilarity(last.vector, snapshot.vector);

  if (sim > 0.94) {
    // دمج ذكي
    last.vector = last.vector.map((v, i) =>
      parseFloat(((v + snapshot.vector[i]) / 2).toFixed(4))
    );
    last.keywords = [...new Set([...last.keywords, ...snapshot.keywords])];
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
    const values = curve.slice(-7).map(p => p.vector[idx]);
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
  return last[0].vector.map((_, idx) => {
    const seq = last.map(p => p.vector[idx]);
    const slope = linearRegression(seq);
    return Math.min(Math.max(seq[seq.length - 1] + slope, 0), 1);
  });
}

// 🚨 كشف التحولات المفاجئة
function detectShocks(curve) {
  if (curve.length < 2) return [];
  const last = curve[curve.length - 1].vector;
  const prev = curve[curve.length - 2].vector;

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
  // منحنى
  let curve = loadData(EMOTION_LOG);
  const snapshot = analyzeSnapshot(userMessage, fingerprint);
  curve = evolveCurve(curve, snapshot);

  // شبكة
  let graph = loadData(EMOTION_GRAPH);
  graph = updateGraph(graph, snapshot);

  // تحليلات
  const trends = detectTrends(curve);
  const forecast = forecastNext(curve);
  const shocks = detectShocks(curve);

  // حفظ
  saveData(EMOTION_LOG, curve);
  saveData(EMOTION_GRAPH, graph);

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
  let graph = loadData(EMOTION_GRAPH);
  const filtered = graph.filter(node => node.emotion === emotion);
  const ranked = filtered.sort((a, b) => b.weight - a.weight);
  return ranked.slice(0, limit);
}

