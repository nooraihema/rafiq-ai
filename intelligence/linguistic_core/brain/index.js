// intelligence/linguistic_core/brain/index.js
/**
 * The Big Brain module — integrates:
 * - Emotional Graph (dynamic per-user)
 * - Memory Shaping (topic -> emotional summary store)
 * - Cognitive Patterns Engine (CBT-like pattern detectors)
 * - Mood Analyzer adapter hooks (consumes summarizer)
 * - Hybrid Generator (contextual + therapeutic responses)
 * - Feedback loop API for updating weights
 *
 * Usage:
 *   import { processMessage, provideFeedback } from './brain/index.js'
 *   const result = processMessage({ semanticMap, fingerprint, userId: 'u123' })
 */

// --- [تصحيح المسارات] --- تم تعديل المسارات لتكون صحيحة بالنسبة لموقع الملف
import { Dictionaries } from '../dictionaries/index.js';
import { safeStr, sample } from '../utils.js';

// -----------------------------
// In-memory stores (pluggable)
// -----------------------------
const UserState = new Map(); // userId -> { emotionalGraph, memoryNodes, moodHistory, lastMood, moodStreak }
const GlobalStats = {
  messagesProcessed: 0,
  feedbacks: 0
};

// -----------------------------
// Helpers
// -----------------------------
function ensureUser(userId) {
  if (!UserState.has(userId)) {
    UserState.set(userId, {
      emotionalGraph: {},    // concept -> score (can be negative/positive)
      memoryNodes: {},       // topicKey -> summary {concepts, tags, lastSeen}
      moodHistory: [],       // array of mood strings
      lastMood: null,
      moodStreak: 0
    });
  }
  return UserState.get(userId);
}

function clamp(v, min = -10, max = 10) { return Math.max(min, Math.min(max, v)); }

// -----------------------------
// 1) Emotional Graph (per user)
// -----------------------------
function updateEmotionalGraph(userState, conceptsWithWeights, decay = 0.95) {
  for (const k of Object.keys(userState.emotionalGraph)) {
    userState.emotionalGraph[k] *= decay;
  }
  for (const [concept, w] of Object.entries(conceptsWithWeights)) {
    userState.emotionalGraph[concept] = clamp((userState.emotionalGraph[concept] || 0) + w, -20, 20);
  }
  return userState.emotionalGraph;
}

// -----------------------------
// 2) Memory Shaping
// -----------------------------
function shapeMemory(userState, semanticMap, fingerprint) {
  const concepts = semanticMap?.list?.allConcepts || [];
  if (concepts.length === 0) return userState.memoryNodes;

  const top = concepts.slice(0, 3).join('|');
  const now = Date.now();

  userState.memoryNodes[top] = userState.memoryNodes[top] || {
    concepts: {},
    tags: new Set(),
    lastSeen: now,
    count: 0,
    sampleMessages: []
  };

  const node = userState.memoryNodes[top];
  const frequencies = semanticMap?.frequencies?.concepts || {};
  for (const [c, f] of Object.entries(frequencies)) node.concepts[c] = (node.concepts[c] || 0) + f;
  node.count += 1;
  node.lastSeen = now;
  if (fingerprint?.originalMessage) {
    node.sampleMessages.push({
      time: now,
      text: safeStr(fingerprint.originalMessage).slice(0, 200)
    });
    if (node.sampleMessages.length > 6) node.sampleMessages.shift();
  }
  node.tags.add(top);
  return userState.memoryNodes;
}

// -----------------------------
// 3) Cognitive Patterns Engine (CBT-ish quick detectors)
// -----------------------------
const CBT_PATTERNS = [
  { id: 'catastrophize', regex: /\b(هينتهي كل شيء|مش هينفع|هتدمر|انتهى كل شيء|مستحيل أتحسن)\b/u, weight: 0.9 },
  { id: 'overgeneralize', regex: /\b(دايماً|أبداً|كل حاجة|مفيش أي حد)\b/u, weight: 0.8 },
  { id: 'self_blame', regex: /\b(خطأي|دا ذنبي|أنا السبب)\b/u, weight: 0.7 },
  { id: 'personalization', regex: /\b(علشان أنا|بسببي)\b/u, weight: 0.6 },
];

function detectCognitivePatterns(text) {
  const t = safeStr(text).toLowerCase();
  const found = [];
  for (const p of CBT_PATTERNS) {
    if (p.regex.test(t)) {
      found.push({ id: p.id, severity: p.weight });
    }
  }
  return found;
}

// -----------------------------
// 4) Integration with Mood Analyzer (hook safe adapter)
// -----------------------------
function runMoodAnalyzerHook(semanticMap, fingerprint, userState, options = {}) {
  // This hook is designed to be flexible. The actual analyzer function is passed in via `options`.
  const analyzer = options.moodAnalyzer;
  try {
    if (typeof analyzer === 'function') {
      return analyzer(semanticMap, fingerprint, userState.lastMood || 'supportive', userState.moodStreak || 0);
    }
  } catch (e) {
    console.warn('[Brain] mood analyzer hook failed', e);
  }
  // Fallback simple mood
  const probs = {};
  for (const m of Dictionaries.AVAILABLE_MOODS || ['supportive']) probs[m] = 1 / (Dictionaries.AVAILABLE_MOODS?.length || 1);
  return { mood: 'supportive', confidence: 0.6, intensity: 0.2, distribution: probs, isComposite: false };
}

// -----------------------------
// 5) Hybrid Generator (therapeutic + generative)
// -----------------------------
function hybridGenerateReply({ summary, semanticMap, fingerprint, userState, moodInfo, cognitivePatterns }) {
  const moodKey = (moodInfo?.mood || 'supportive').split('+')[0];
  const lexicon = Dictionaries.GENERATIVE_LEXICON[moodKey] || Dictionaries.GENERATIVE_LEXICON['supportive'];

  const opener = sample(lexicon.openers);
  const connector = sample(lexicon.connectors);
  const closer = sample(lexicon.closers);

  // 1) Memory recall
  let memoryNote = '';
  const recentNodes = Object.values(userState.memoryNodes || {}).sort((a,b) => b.lastSeen - a.lastSeen);
  if (recentNodes.length > 0) {
    const topNode = recentNodes[0];
    const overlap = (summary.allConcepts || []).filter(c => Object.keys(topNode.concepts || {}).includes(c));
    if (overlap.length > 0) {
      memoryNote = `فاكر لما حكينا عن ${overlap.slice(0,2).join(' و ')}؟ ممكن يكون ده مرتبط باللي بتحس بيه دلوقتي.`;
    }
  }

  // 2) Cognitive pattern corrective snippet
  let cognitiveNote = '';
  if (cognitivePatterns && cognitivePatterns.length > 0) {
    const strongest = cognitivePatterns.sort((a, b) => b.severity - a.severity)[0];
    const reframes = {
      catastrophize: 'أحيانًا عقلنا بيرسم أسوأ سيناريو ممكن. خلينا نفحص الحقايق مع بعض خطوة بخطوة.',
      overgeneralize: 'ملاحظ إننا استخدمنا كلمة زي "دايمًا" أو "أبدًا". هل فيه أي استثناء للقاعدة دي؟',
      self_blame: 'حاسس إنك شايل حمل كبير. إيه رأيك نحلل كل العوامل اللي أدت للموقف ده؟',
      personalization: 'سهل نحس إننا السبب في كل حاجة. تفتكر فيه أي عوامل تانية ممكن تكون أثرت؟'
    };
    cognitiveNote = reframes[strongest.id] || 'خلينا نعيد صياغة الفكرة دي مع بعض.';
  }

  // Compose reply
  const replyParts = [opener];
  if (memoryNote) replyParts.push(memoryNote);
  if (cognitiveNote) replyParts.push(cognitiveNote);
  else { // If no specific cognitive note, add a general insight
      const insight = sample(lexicon.connectors) + " " + (summary.dominantConcept || 'اللي بتحس بيه');
      replyParts.push(insight);
  }
  replyParts.push(closer);

  const replyText = replyParts.join(' ');
  
  return { reply: replyText, diagnostics: { moodInfo, cognitivePatterns } };
}

// -----------------------------
// 6) Feedback loop API
// -----------------------------
export function provideFeedback(userId, { success = 0.0, targetConcept = null, mood = null } = {}) {
  GlobalStats.feedbacks += 1;
  if (!targetConcept || !mood || !Dictionaries.CONCEPT_DEFINITIONS) return { ok: false, note: 'dependencies missing' };

  const cd = Dictionaries.CONCEPT_DEFINITIONS[targetConcept];
  if (!cd) return { ok: false, note: 'concept not found' };
  cd.mood_weights = cd.mood_weights || {};
  cd.mood_weights[mood] = (cd.mood_weights[mood] || 0) * 0.9 + success * 0.1;
  return { ok: true };
}

// -----------------------------
// Main entry: processMessage
// -----------------------------
export function processMessage({ semanticMap = {}, fingerprint = {}, userId = 'anon', options = {} } = {}) {
  GlobalStats.messagesProcessed += 1;
  const userState = ensureUser(userId);

  // 1) Update emotional graph
  const freq = semanticMap?.frequencies?.concepts || {};
  const conceptWeights = {};
  const intensity = fingerprint?.intensity || 1.0;
  for (const [c, f] of Object.entries(freq)) {
    conceptWeights[c] = (conceptWeights[c] || 0) + Math.log1p(f) * intensity;
  }
  updateEmotionalGraph(userState, conceptWeights);

  // 2) Memory shaping
  shapeMemory(userState, semanticMap, fingerprint);

  // 3) Cognitive pattern detection
  const cognitivePatterns = detectCognitivePatterns(fingerprint?.originalMessage || '');

  // 4) Mood analysis
  const moodInfo = runMoodAnalyzerHook(semanticMap, fingerprint, userState, { moodAnalyzer: options.moodAnalyzer });

  // Update user's mood history
  if (userState.lastMood === moodInfo.mood.split('+')[0]) {
    userState.moodStreak++;
  } else {
    userState.moodStreak = 0;
    userState.lastMood = moodInfo.mood.split('+')[0];
  }
  userState.moodHistory.push({ mood: moodInfo.mood, time: Date.now(), confidence: moodInfo.confidence });
  if(userState.moodHistory.length > 20) userState.moodHistory.shift();

  // 5) Create summary
  const summary = {
    dominantConcept: semanticMap?.list?.allConcepts?.[0] || null,
    allConcepts: semanticMap?.list?.allConcepts || Object.keys(freq)
  };

  // 6) Generate reply
  const { reply, diagnostics } = hybridGenerateReply({ summary, semanticMap, fingerprint, userState, moodInfo, cognitivePatterns });

  // 7) Pack final result
  const result = {
    userId,
    reply,
    diagnostics: {
      ...diagnostics,
      memoryKeys: Object.keys(userState.memoryNodes).slice(-5),
      emotionalGraphSnapshot: Object.entries(userState.emotionalGraph).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,5),
    }
  };

  if (options.debug) {
    console.log('[Brain.processMessage] result diagnostics:', result.diagnostics);
  }

  return result;
}

// -----------------------------
// Utilities for external use
// -----------------------------
export function resetUserState(userId) {
  UserState.delete(userId);
  return { ok: true };
}

export function inspectUserState(userId) {
  return UserState.get(userId) || null;
}

export function getGlobalStats() {
  return GlobalStats;
}
