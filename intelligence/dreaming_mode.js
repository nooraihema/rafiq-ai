// dreaming_mode.js v6.0 - Sentient Dream Weaver (Merged Beast)
// Purpose: Comprehensive autonomous dreaming engine:
//  - produces insights (dreams) from emotion curve & graph
//  - clustering + salience scoring + contextual narratives
//  - reinforcement of repeating dreams
//  - decay (forgetting) with configurable rates
//  - meta-dreams (dreams from dreams) and meta-clustering
//  - integrates strongest insights into user_profiles.json (uses fingerprint)
// Storage files auto-created under ./data:
//  - emotions_curve.json
//  - emotions_graph.json
//  - dreams.json
//  - user_profiles.json
//
// Exports:
//  - runDreamingMode(opts)
//  - getDreams(opts)
//  - purgeOldDreams(opts)
//  - integrateDreamIntoProfile(dream, profile)
//  - summarizeDream(dream)
//
// Usage ideas:
//  - schedule runDreamingMode({ fingerprint: null }) daily or hourly
//  - call runDreamingMode({ fingerprint }) to update for a single user
//  - use getDreams to display insights on dashboard

import fs from "fs";
import path from "path";
import crypto from "crypto";

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
// -------------------- Configuration --------------------
// Path to the data directory (as per user specification)
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================


const FILES = {
  CURVE: path.join(DATA_DIR, "emotions_curve.json"),
  GRAPH: path.join(DATA_DIR, "emotions_graph.json"),
  DREAMS: path.join(DATA_DIR, "dreams.json"),
  PROFILES: path.join(DATA_DIR, "user_profiles.json")
};

// Tunables
const DEFAULT_DECAY_DAYS = 7;         // after this many days decay starts stronger
const DECAY_BASE = 0.985;            // daily multiplier baseline for decay
const MIN_CONFIDENCE_KEEP = 0.05;    // dreams below this are purged
const REINFORCE_OVERLAP = 0.45;      // text overlap threshold to consider reinforcement
const MAX_META = 6;                  // max meta-dreams returned
const MAX_CLUSTERS = 5;              // default k for clustering words

// -------------------- Safe IO --------------------
function safeRead(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("[DreamingMode] safeRead error", filePath, e.message);
    return fallback;
  }
}
function safeWrite(filePath, obj) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error("[DreamingMode] safeWrite error", filePath, e.message);
  }
}

// -------------------- Small NLP utils (Arabic-aware lightweight) --------------------
function normalizeArabic(text = "") {
  return String(text || "")
    .replace(/[\u064B-\u0652]/g, "") // remove diacritics
    .replace(/ـ/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .toLowerCase()
    .trim();
}
function tokenizeArabic(text = "") {
  const t = normalizeArabic(text);
  if (!t) return [];
  return t.split(/\s+/).filter(Boolean);
}
function intersectCount(a = [], b = []) {
  const B = new Set(b);
  let c = 0;
  a.forEach(x => { if (B.has(x)) c++; });
  return c;
}
function similarityText(a = "", b = "") {
  const ta = tokenizeArabic(a), tb = tokenizeArabic(b);
  if (!ta.length || !tb.length) return 0;
  const inter = intersectCount(ta, tb);
  return inter / Math.max(ta.length, tb.length);
}

// -------------------- Math helpers --------------------
function avg(arr = []) { if (!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length; }
function nowMs() { return Date.now(); }
function daysToMs(d) { return d * 24*60*60*1000; }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// Euclidean distance for clustering
function euclideanDistance(a = [], b = []) {
  const n = Math.max(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const av = a[i] || 0, bv = b[i] || 0;
    const d = av - bv;
    s += d*d;
  }
  return Math.sqrt(s);
}
function arraysClose(a, b, eps = 1e-6) {
  if (a.length !== b.length) return false;
  for (let i=0;i<a.length;i++) if (Math.abs(a[i]-b[i])>eps) return false;
  return true;
}

// -------------------- Aggregation for graph -> word vectors --------------------
// graph nodes expected: { id, word, emotion, weight, fingerprint, timestamp }
// returns { emotions: [...], items: [{ key: word, vector: [..], raw: {emotion:weight,...} }] }
function aggregateWordVectors(graphNodes) {
  const emotionSet = new Set(graphNodes.map(n => n.emotion));
  const emotions = Array.from(emotionSet);
  const map = {}; // word -> emotion-indexed weights
  graphNodes.forEach(n => {
    if (!map[n.word]) map[n.word] = Array(emotions.length).fill(0);
    const idx = emotions.indexOf(n.emotion);
    if (idx >= 0) map[n.word][idx] += (n.weight || 0);
  });
  // normalize each vector to sum 1 (if sum >0)
  const items = Object.keys(map).map(word => {
    const raw = map[word];
    const s = raw.reduce((a,b)=>a+b,0) || 1;
    const vector = raw.map(v => v / s);
    return { key: word, vector, raw };
  });
  return { emotions, items };
}

// -------------------- k-means clustering (simple) --------------------
function kMeans(items = [], k = 3, iterations = 30) {
  if (!items.length) return [];
  if (k <= 0) k = 1;
  // init centroids
  let centroids = items.slice(0, Math.min(k, items.length)).map(it => it.vector.slice());
  while (centroids.length < k) centroids.push(items[Math.floor(Math.random()*items.length)].vector.slice());

  for (let iter = 0; iter < iterations; iter++) {
    const clusters = Array.from({length: centroids.length}, ()=>[]);
    // assign
    for (const it of items) {
      let best = 0, bestD = Infinity;
      for (let c=0;c<centroids.length;c++) {
        const d = euclideanDistance(it.vector, centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      clusters[best].push(it);
    }
    // recompute centroids
    let moved = false;
    for (let c=0;c<centroids.length;c++) {
      if (!clusters[c].length) continue;
      const dim = centroids[c].length;
      const newC = Array(dim).fill(0);
      clusters[c].forEach(m => {
        for (let i=0;i<dim;i++) newC[i] += m.vector[i] || 0;
      });
      for (let i=0;i<dim;i++) newC[i] /= Math.max(1, clusters[c].length);
      if (!arraysClose(newC, centroids[c])) {
        centroids[c] = newC;
        moved = true;
      }
    }
    if (!moved) break;
  }
  // build result
  return centroids.map((centroid, idx) => {
    const members = items.filter(it => {
      const distances = centroids.map(ct => euclideanDistance(it.vector, ct));
      return distances.indexOf(Math.min(...distances)) === idx;
    }).map(m => m.key);
    return { centroid, members };
  });
}

// -------------------- DREAM GENERATION LOGIC --------------------
// Each dream: {
//   id, fingerprint (nullable), createdAt, summary, hypotheses: [{text, confidence, evidence:[]}],
//   initialConfidence, confidence, decayRate, hits, lastReinforced
// }
function buildHypothesesFromClusters(clusters, detectedEmotions, wordItems) {
  const hypos = [];
  clusters.forEach((c, idx) => {
    if (!c.members.length) return;
    const topWords = c.members.slice(0, Math.min(8, c.members.length));
    // approximate cluster emotion profile by averaging raw vectors if present
    const clusterVectors = topWords.map(w => {
      const found = wordItems.find(it => it.key === w);
      return found ? found.vector : Array(detectedEmotions.length).fill(0);
    });
    const profile = Array(detectedEmotions.length).fill(0);
    clusterVectors.forEach(v => v.forEach((val, i) => profile[i] += val));
    for (let i=0;i<profile.length;i++) profile[i] = profile[i] / Math.max(1, clusterVectors.length);
    const dominantIdx = profile.indexOf(Math.max(...profile));
    const dominantEmotion = detectedEmotions[dominantIdx] || `محور${dominantIdx}`;
    const strength = clamp01(avg(profile));
    const text = `الكتلة ${idx+1} مرتبطة بـ (${topWords.slice(0,5).join(", ")}) وتميل إلى "${dominantEmotion}"`;
    hypos.push({ text, confidence: Number(strength.toFixed(3)), evidence: topWords.slice() });
  });
  return hypos;
}

function computeSalienceForHypo(hypo, curve, graph) {
  // heuristics: frequency of evidence words, recency, avg intensity in curve
  const evidence = hypo.evidence || [];
  const wordCounts = evidence.map(w => graph.filter(n => n.word === w).length);
  const freqScore = clamp01(avg(wordCounts) / 5);
  // recency weight: is any supporting node recent?
  const now = nowMs();
  const recentHits = evidence.flatMap(w => graph.filter(n => n.word === w && (now - n.timestamp) < daysToMs(14)));
  const recencyScore = clamp01(recentHits.length / Math.max(1, evidence.length * 2));
  // emotion intensity around matches
  const intensitySamples = curve.filter(p => {
    const tks = p.keywords || [];
    return evidence.some(w => tks.includes(normalizeArabic(w)));
  }).map(p => p.intensity || avg(p.vector || []));
  const intensityScore = clamp01(avg(intensitySamples) || 0);
  // compose salience
  return clamp01(0.45 * hypo.confidence + 0.25 * freqScore + 0.2 * recencyScore + 0.1 * intensityScore);
}

// -------------------- DREAM DECAY & REINFORCEMENT --------------------
function applyDecayToDreams(dreams, nowTs = nowMs(), decayDays = DEFAULT_DECAY_DAYS) {
  // lower confidence gradually; preserve hits reinforcement
  return dreams.map(d => {
    const ageDays = (nowTs - (d.createdAt || d.createdAt === 0 ? d.createdAt : d.createdAt)) / (1000*60*60*24);
    const baseMultiplier = Math.pow(DECAY_BASE, Math.max(0, ageDays / Math.max(1, (d.decayRate || 1))));
    d.confidence = clamp01((d.initialConfidence || d.confidence || 0.5) * baseMultiplier + (d.hits || 0) * 0.02);
    return d;
  }).filter(d => (d.confidence || 0) >= MIN_CONFIDENCE_KEEP);
}

function mergeHypotheses(existing = [], incoming = []) {
  const out = existing.slice();
  incoming.forEach(inc => {
    const match = out.find(e => similarityText(e.text, inc.text) > 0.5);
    if (match) {
      match.confidence = clamp01(Math.max(match.confidence || 0, inc.confidence) + 0.05);
      match.evidence = Array.from(new Set([...(match.evidence||[]), ...(inc.evidence||[])]));
    } else {
      out.push(inc);
    }
  });
  return out;
}

// -------------------- META-DREAM GENERATION --------------------
function buildMetaDreams(dreams) {
  // cluster hypotheses across dreams by token-overlap, then create meta hypotheses
  const hypoList = [];
  dreams.forEach(d => {
    (d.hypotheses || []).forEach(h => hypoList.push({ dreamId: d.id, text: h.text, weight: h.confidence || 0.5 }));
  });
  if (!hypoList.length) return [];
  // naive grouping
  const groups = [];
  hypoList.forEach(h => {
    const tks = tokenizeArabic(h.text);
    let placed = false;
    for (const g of groups) {
      const overlap = intersectCount(g.tokens, tks) / Math.max(1, Math.min(g.tokens.length, tks.length));
      if (overlap > 0.4) {
        g.members.push(h);
        g.tokens = Array.from(new Set([...g.tokens, ...tks]));
        placed = true;
        break;
      }
    }
    if (!placed) groups.push({ tokens: tks.slice(), members: [h] });
  });
  // build meta dreams
  return groups.map(g => ({
    id: crypto.randomUUID(),
    createdAt: nowMs(),
    type: "meta-dream",
    summary: g.tokens.slice(0,8).join(" "),
    hypotheses: [{
      text: `Meta-insight: ${g.tokens.slice(0,6).join(" ")}`,
      confidence: Number(avg(g.members.map(m=>m.weight)).toFixed(3)),
      evidence: g.members.slice(0,6).map(m=>m.text)
    }],
    initialConfidence: Number(avg(g.members.map(m=>m.weight)).toFixed(3)),
    confidence: Number(avg(g.members.map(m=>m.weight)).toFixed(3)),
    decayRate: 1.2,
    hits: g.members.length,
    lastReinforced: nowMs()
  })).sort((a,b)=>b.confidence - a.confidence).slice(0, MAX_META);
}

// -------------------- INTEGRATION TO PROFILE --------------------
export function integrateDreamIntoProfile(dream, profile = {}) {
  if (!dream || !profile) return false;
  profile.insights = profile.insights || [];
  profile.insights.push({
    id: dream.id,
    summary: dream.summary || (dream.hypotheses && dream.hypotheses[0] && dream.hypotheses[0].text) || "",
    confidence: dream.confidence || dream.initialConfidence || 0,
    at: dream.createdAt || nowMs()
  });
  // example: flagging logic for "work" anxiety
  const strong = (dream.hypotheses || []).find(h => /شغل|عمل|وظيف|وظيفة|انهيار/i.test(h.text));
  if (strong && dream.confidence > 0.5) {
    profile.flags = profile.flags || [];
    if (!profile.flags.includes("work_anxiety")) profile.flags.push("work_anxiety");
  }
  profile.lastDreamAt = nowMs();
  return true;
}

// -------------------- MAIN: runDreamingMode --------------------
/*
 options:
  - fingerprint: null | string  => analyze global or per-user
  - force: boolean => create dream even if minimal
  - maxClusters: number => k for clustering
*/
export async function runDreamingMode({ fingerprint = null, force = false, maxClusters = MAX_CLUSTERS } = {}) {
  // load
  const curve = safeRead(FILES.CURVE, []);
  const graph = safeRead(FILES.GRAPH, []);
  let dreams = safeRead(FILES.DREAMS, []);
  const profiles = safeRead(FILES.PROFILES, {});

  // filter by fingerprint if provided
  const filteredCurve = fingerprint ? curve.filter(c => c.fingerprint === fingerprint) : curve;
  const filteredGraph = fingerprint ? graph.filter(g => g.fingerprint === fingerprint) : graph;

  if (!filteredCurve.length || !filteredGraph.length) {
    return { status: "no-data", message: "لا توجد بيانات كافية للحلم", produced: 0 };
  }

  // Aggregate word vectors
  const { emotions: detectedEmotions, items: wordItems } = aggregateWordVectors(filteredGraph);

  // decide k for clustering
  const k = Math.min(maxClusters, Math.max(1, Math.floor(Math.sqrt(wordItems.length || 1))));
  const clusters = kMeans(wordItems, k, 30);

  // build hypotheses from clusters
  const hypos = buildHypothesesFromClusters(clusters, detectedEmotions, wordItems);

  // compute salience per hypo and attach
  hypos.forEach(h => { h.salience = computeSalienceForHypo(h, filteredCurve, filteredGraph); });

  // temporal patterns (naive): words appearing mostly at night
  const wordTimes = {};
  filteredGraph.forEach(n => {
    if (!wordTimes[n.word]) wordTimes[n.word] = [];
    wordTimes[n.word].push(n.timestamp);
  });
  const temporalHypotheses = [];
  Object.entries(wordTimes).forEach(([word, times]) => {
    if (times.length < 3) return;
    const hours = times.map(t => new Date(t).getUTCHours());
    const avgHour = Math.round(avg(hours));
    if (avgHour <= 6 || avgHour >= 22) {
      const text = `الكلمة "${word}" تظهر غالبًا في منتصف الليل/الصباح الباكر (${avgHour}h)`;
      temporalHypotheses.push({ text, confidence: 0.45, evidence: [word], salience: 0.35 });
    }
  });

  // compose dream
  const hypotheses = hypos.concat(temporalHypotheses).sort((a,b)=>b.salience - a.salience);
  const initialConfidence = clamp01(0.45 + Math.min(0.45, avg(hypotheses.map(h=>h.confidence || 0)) || 0));
  const dream = {
    id: crypto.randomUUID(),
    fingerprint,
    createdAt: nowMs(),
    summary: hypotheses.slice(0,3).map(h=>h.text).join(" | "),
    hypotheses: hypotheses.map(h => ({ text: h.text, confidence: h.confidence || 0.4, evidence: h.evidence || [] })),
    initialConfidence,
    confidence: initialConfidence,
    decayRate: 1.0,
    hits: 0,
    lastReinforced: nowMs()
  };

  // reinforcement: if similar recent dream exists, merge/reinforce
  const recent = dreams.filter(d => (!fingerprint || d.fingerprint === fingerprint)).slice(-12);
  let reinforced = false;
  for (const rd of recent) {
    const overlap = similarityText(rd.summary || "", dream.summary || "");
    if (overlap > REINFORCE_OVERLAP) {
      rd.hypotheses = mergeHypotheses(rd.hypotheses || [], dream.hypotheses || []);
      rd.initialConfidence = clamp01(Math.min(0.98, (rd.initialConfidence || rd.confidence || 0.5) + dream.initialConfidence * 0.35));
      rd.confidence = clamp01((rd.confidence || rd.initialConfidence) + dream.initialConfidence * 0.25);
      rd.hits = (rd.hits || 0) + 1;
      rd.lastReinforced = nowMs();
      reinforced = true;
      break;
    }
  }
  if (!reinforced && (force || dream.hypotheses.length > 0)) {
    dreams.push(dream);
  }

  // decay existing dreams
  dreams = applyDecayToDreams(dreams, nowMs(), DEFAULT_DECAY_DAYS);

  // meta-dreams: cluster hypotheses across dreams
  const metaDreams = buildMetaDreams(dreams);
  // integrate meta-dreams by reinforcement (if similar to an existing dream, reinforce)
  metaDreams.forEach(md => {
    const match = dreams.find(d => similarityText(d.summary||"", md.summary||"") > REINFORCE_OVERLAP);
    if (match) {
      match.hypotheses = mergeHypotheses(match.hypotheses || [], md.hypotheses || []);
      match.confidence = clamp01((match.confidence || match.initialConfidence || 0.5) + md.confidence * 0.2);
      match.hits = (match.hits || 0) + (md.hits || 1);
      match.lastReinforced = nowMs();
    } else {
      dreams.push(md);
    }
  });

  // persist dreams
  safeWrite(FILES.DREAMS, dreams);

  // update user profile if fingerprint provided: integrate strongest insights
  if (fingerprint) {
    const profiles = safeRead(FILES.PROFILES, {});
    const profile = profiles[fingerprint] || { fingerprint, insights: [], flags: [] };
    // pick top dreams for this user
    const userDreams = dreams.filter(d => d.fingerprint === fingerprint).sort((a,b)=>b.confidence - a.confidence).slice(0,3);
    userDreams.forEach(d => {
      const modified = integrateDreamIntoProfile(d, profile);
      if (modified) {
        // appended inside integrateDreamIntoProfile
      }
    });
    profiles[fingerprint] = profile;
    safeWrite(FILES.PROFILES, profiles);
  }

  // return report
  return {
    status: "ok",
    produced: reinforced ? 0 : 1,
    reinforced,
    dream: reinforced ? null : dream,
    topHypotheses: dream.hypotheses ? dream.hypotheses.slice(0,6) : [],
    metaDreams: metaDreams.slice(0, MAX_META)
  };
}

// -------------------- Query / maintenance helpers --------------------
export function getDreams({ fingerprint = null, sinceDays = 365, minConfidence = 0 } = {}) {
  const dreams = safeRead(FILES.DREAMS, []);
  const cutoff = nowMs() - daysToMs(sinceDays);
  return dreams.filter(d => (!fingerprint || d.fingerprint === fingerprint) && (d.confidence || 0) >= minConfidence && (d.createdAt || 0) >= cutoff).sort((a,b)=>b.createdAt - a.createdAt);
}

export function purgeOldDreams({ olderThanDays = 365 } = {}) {
  let dreams = safeRead(FILES.DREAMS, []);
  const cutoff = nowMs() - daysToMs(olderThanDays);
  const kept = dreams.filter(d => (d.createdAt || 0) >= cutoff);
  safeWrite(FILES.DREAMS, kept);
  return { removed: dreams.length - kept.length, remaining: kept.length };
}

export function summarizeDream(d) {
  if (!d) return null;
  return {
    id: d.id,
    fingerprint: d.fingerprint,
    createdAt: d.createdAt,
    summary: d.summary,
    confidence: Number((d.confidence || 0).toFixed(3)),
    hypotheses: (d.hypotheses || []).map(h => ({ text: h.text, confidence: h.confidence }))
  };
}

// -------------------- Default export --------------------
export default {
  runDreamingMode,
  getDreams,
  purgeOldDreams,
  integrateDreamIntoProfile,
  summarizeDream
};

// -------------------- quick demo when run directly --------------------
// This check might fail if using ES modules without specific config.
// For library use, this part is not critical.
// if (require.main === module) {
//   (async () => {
//     console.log("Running dreaming_mode demo (v6.0) ...");
//     const res = await runDreamingMode({ fingerprint: null, force: true, maxClusters: 4 });
//     console.log("Result: produced:", res.produced, "reinforced:", res.reinforced);
//     console.log("Top meta-dreams:", res.metaDreams.map(m => ({ id: m.id, confidence: m.confidence, summary: m.summary })));
//     const recent = getDreams({ sinceDays: 30 }).slice(0,5).map(summarizeDream);
//     console.log("Recent dreams sample:", recent);
//   })();
// }
