// meta_router.js v3.1 - Vercel-Compatible & Async Edition
// This version is updated to be fully compatible with Vercel's read-only file system
// by using the central DATA_DIR config and asynchronous file operations.

import fs from "fs/promises"; // MODIFICATION: Using the asynchronous 'fs/promises' module
import path from "path";
import crypto from "crypto"; // ADDED: crypto is needed for cryptoId function

// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { runLearningEngine } from "../intelligence/learning_engine.js";
import { trackEmotion } from "../intelligence/emotion_tracker.js";
import { runDreamingMode } from "../intelligence/dreaming_mode.js";

// MODIFICATION: Import DATA_DIR from the single source of truth (config.js)
import { DATA_DIR } from '../shared/config.js'; 
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================

const ROUTER_STATE_FILE = path.join(DATA_DIR, "meta_router_state.json");

// Tunables (you can tweak) - Unchanged
const DEFAULT_IDLE_MS = 1000 * 60 * 15;
const WORKER_LOOP_MS = 1000;
const MAX_QUEUE_SIZE = 200;
const BACKOFF_BASE_MS = 1000 * 30;
const DREAM_MIN_CONF_THRESH = 0.35;

// Priority buckets (lower number = higher priority) - Unchanged
const PRIORITY = {
  EMOTION_SPIKE: 0,
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  BACKGROUND: 5
};

// ------------- Router State Persistence (MODIFIED to be Async) -------------
let ROUTER_STATE = defaultState(); // Initialize with default
let isStateInitialized = false;

async function initializeState() {
    if (isStateInitialized) return;
    ROUTER_STATE = await loadState();
    isStateInitialized = true;
}

async function loadState() {
  try {
    await fs.access(ROUTER_STATE_FILE);
    const raw = await fs.readFile(ROUTER_STATE_FILE, "utf8");
    return raw ? JSON.parse(raw) : defaultState();
  } catch (e) {
    if (e.code !== 'ENOENT') {
        console.error("[meta_router] loadState error:", e.message);
    }
    return defaultState();
  }
}

async function saveState(state) {
  try {
    await fs.mkdir(path.dirname(ROUTER_STATE_FILE), { recursive: true });
    await fs.writeFile(ROUTER_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("[meta_router] saveState error:", e.message);
  }
}

function defaultState() {
  return {
    lastActivityAt: {},
    idleThresholdMs: {},
    activityHistory: {},
    queueHistory: [],
    metrics: { taskCounts: {}, failures: {} },
    backoffs: {}
  };
}

// Initialize the state when the module first loads.
initializeState();


// ------------- Simple Event Bus (Unchanged) -------------
const EVENT_HANDLERS = {};
export function on(event, handler) {
  if (!EVENT_HANDLERS[event]) EVENT_HANDLERS[event] = new Set();
  EVENT_HANDLERS[event].add(handler);
}
export function off(event, handler) {
  if (!EVENT_HANDLERS[event]) return;
  EVENT_HANDLERS[event].delete(handler);
}
export function emit(event, payload = {}) {
  if (!EVENT_HANDLERS[event]) return;
  for (const h of EVENT_HANDLERS[event]) {
    try { h(payload); } catch (e) { console.error("[meta_router] event handler error", e.message); }
  }
}

// ------------- Priority Queue Implementation -------------
class PriorityQueue {
  constructor(maxSize = MAX_QUEUE_SIZE) {
    this.maxSize = maxSize;
    this._arr = [];
  }

  push(priority, task) {
    if (this._arr.length >= this.maxSize) {
      console.warn("[meta_router] queue full - dropping low priority tasks");
      const worstIndex = this._arr.reduce((acc, curr, idx) => curr.priority > this._arr[acc].priority ? idx : acc, 0);
      if (this._arr[worstIndex].priority > priority) {
        this._arr.splice(worstIndex, 1);
      } else {
        return false;
      }
    }
    const entry = { priority, ts: Date.now(), id: cryptoId(), task };
    this._arr.push(entry);
    this._arr.sort((a,b) => a.priority - b.priority || a.ts - b.ts);
    ROUTER_STATE.queueHistory.push({ op: "push", id: entry.id, priority, ts: entry.ts });
    saveState(ROUTER_STATE); // This is now async, let it run in the background
    return true;
  }

  pop() {
    const e = this._arr.shift();
    if (e) {
      ROUTER_STATE.queueHistory.push({ op: "pop", id: e.id, priority: e.priority, ts: Date.now() });
      saveState(ROUTER_STATE); // This is now async, let it run in the background
    }
    return e;
  }

  peek() { return this._arr[0]; }
  size() { return this._arr.length; }
  clear() { this._arr = []; saveState(ROUTER_STATE); }
  toArray() { return this._arr.slice(); }
}
function cryptoId() { return (Date.now().toString(36) + Math.random().toString(36).slice(2,8)); }

// ------------- Router Worker & Task Types -------------
const QUEUE = new PriorityQueue();

function taskLearning(userMessage, responsePayload, fingerprint) {
  return async () => {
    try {
      const res = await runLearningEngine(userMessage, responsePayload, fingerprint);
      ROUTER_STATE.metrics.taskCounts["learning"] = (ROUTER_STATE.metrics.taskCounts["learning"] || 0) + 1;
      emit("learning_done", { fingerprint, res });
      return { ok: true, res };
    } catch (e) {
      ROUTER_STATE.metrics.failures["learning"] = (ROUTER_STATE.metrics.failures["learning"] || 0) + 1;
      throw e;
    }
  };
}

function taskEmotion(userMessage, responsePayload, fingerprint) {
  return async () => {
    try {
      const res = await trackEmotion(userMessage, fingerprint);
      ROUTER_STATE.metrics.taskCounts["emotion"] = (ROUTER_STATE.metrics.taskCounts["emotion"] || 0) + 1;
      emit("emotion_tracked", { fingerprint, res });
      if ((res.last && res.last.intensity) > 0.75) {
        emit("emotion_spike", { fingerprint, res });
      }
      return { ok: true, res };
    } catch (e) {
      ROUTER_STATE.metrics.failures["emotion"] = (ROUTER_STATE.metrics.failures["emotion"] || 0) + 1;
      throw e;
    }
  };
}

function taskDreaming(fingerprint, force = false) {
  return async () => {
    try {
      const key = `dream_${fingerprint || "global"}`;
      const now = Date.now();
      const nextAvail = ROUTER_STATE.backoffs[key] || 0;
      if (now < nextAvail) {
        return { ok: false, reason: "backoff", nextAvail };
      }
      const res = await runDreamingMode({ fingerprint, force, maxClusters: 5 });
      ROUTER_STATE.metrics.taskCounts["dreaming"] = (ROUTER_STATE.metrics.taskCounts["dreaming"] || 0) + 1;
      emit("dreaming_done", { fingerprint, res });
      if (res && res.dream && res.dream.initialConfidence > 0.6) {
        ROUTER_STATE.backoffs[key] = Date.now() + Math.floor(BACKOFF_BASE_MS * 0.5);
      } else {
        ROUTER_STATE.backoffs[key] = Date.now() + BACKOFF_BASE_MS;
      }
      await saveState(ROUTER_STATE);
      return { ok: true, res };
    } catch (e) {
      ROUTER_STATE.metrics.failures["dreaming"] = (ROUTER_STATE.metrics.failures["dreaming"] || 0) + 1;
      const key = `dream_${fingerprint || "global"}`;
      ROUTER_STATE.backoffs[key] = (ROUTER_STATE.backoffs[key] || Date.now()) + BACKOFF_BASE_MS * 2;
      await saveState(ROUTER_STATE);
      throw e;
    }
  };
}

// Helper: average of vector
function avgVector(v = []) { if (!v.length) return 0; return v.reduce((a,b)=>a+b,0)/v.length; }

// ------------- Adaptive Idle Detection (per fingerprint) -------------
function recordActivity(fingerprint) {
  const ts = Date.now();
  ROUTER_STATE.lastActivityAt[fingerprint || "anon"] = ts;
  ROUTER_STATE.activityHistory[fingerprint || "anon"] = ROUTER_STATE.activityHistory[fingerprint || "anon"] || [];
  const arr = ROUTER_STATE.activityHistory[fingerprint || "anon"];
  arr.push(ts);
  if (arr.length > 50) arr.splice(0, arr.length - 50);
  if (arr.length >= 4) {
    const intervals = [];
    for (let i=1;i<arr.length;i++) intervals.push(arr[i]-arr[i-1]);
    intervals.sort((a,b)=>a-b);
    const mid = Math.floor(intervals.length/2);
    const median = intervals.length % 2 === 1 ? intervals[mid] : (intervals[mid-1]+intervals[mid])/2;
    const factor = 1.2;
    const threshold = Math.max(1000*60*3, Math.min(1000*60*60*6, Math.round(median * factor)));
    ROUTER_STATE.idleThresholdMs[fingerprint || "anon"] = threshold;
  } else {
    ROUTER_STATE.idleThresholdMs[fingerprint || "anon"] = DEFAULT_IDLE_MS;
  }
  saveState(ROUTER_STATE);
}

// ------------- Self-Orchestration & Priority Adjustment -------------
function computeDynamicPriority(fingerprint, context = {}) {
  let p = PRIORITY.MEDIUM;
  if (context.urgent) p = Math.min(p, PRIORITY.CRITICAL);
  if (context.emotionIntensity && context.emotionIntensity > 0.8) p = Math.min(p, PRIORITY.EMOTION_SPIKE);
  if (context.userFlags && context.userFlags.includes && context.userFlags.includes("work_anxiety")) {
    p = Math.min(p, PRIORITY.HIGH);
  }
  return p;
}

// ------------- Public API: processMeta -------------
export async function processMeta(userMessage, responsePayload, fingerprint = "anon", userProfile = {}) {
  await initializeState(); // Ensure state is loaded
  recordActivity(fingerprint);
  const context = {};
  if (userProfile && typeof userProfile === "object") {
    context.userFlags = userProfile.flags || [];
    if (userProfile.lastEmotionIntensity) context.emotionIntensity = userProfile.lastEmotionIntensity;
  }
  const learnPriority = computeDynamicPriority(fingerprint, { ...context, urgent: false });
  QUEUE.push(learnPriority, { type: "learning", exec: taskLearning(userMessage, responsePayload, fingerprint) });
  const emotionPriority = computeDynamicPriority(fingerprint, { ...context, emotionIntensity: context.emotionIntensity || 0.0 });
  QUEUE.push(emotionPriority, { type: "emotion", exec: taskEmotion(userMessage, fingerprint) });
  const lastAt = ROUTER_STATE.lastActivityAt[fingerprint] || 0;
  const idleMs = ROUTER_STATE.idleThresholdMs[fingerprint] || DEFAULT_IDLE_MS;
  const since = Date.now() - lastAt;
  const dreamPriority = (since > idleMs) ? PRIORITY.HIGH : PRIORITY.BACKGROUND;
  QUEUE.push(dreamPriority, { type: "dreaming", exec: taskDreaming(fingerprint, false) });
  emit("meta_enqueued", { fingerprint, queueSize: QUEUE.size(), priorities: { learnPriority, emotionPriority, dreamPriority } });
  if (emotionPriority <= PRIORITY.HIGH) {
    try {
      const eTask = QUEUE.pop();
      if (eTask && eTask.task && eTask.task.type === "emotion") {
        await eTask.task.exec();
      } else if (eTask) {
        QUEUE.push(eTask.priority, eTask.task);
      }
    } catch (e) {
      console.error("[meta_router] inline emotion task failed:", e.message);
    }
  }
  startBackgroundWorker();
  return { status: "enqueued", queueSize: QUEUE.size() };
}

// ------------- Background Worker (process queue) -------------
let WORKER_RUNNING = false;
function startBackgroundWorker() {
  if (WORKER_RUNNING) return;
  WORKER_RUNNING = true;
  (async function loop() {
    while (WORKER_RUNNING) {
      await initializeState(); // Ensure state is loaded in the loop
      const entry = QUEUE.pop();
      if (!entry) {
        await sleep(WORKER_LOOP_MS);
        continue;
      }
      const { task } = entry;
      const taskKey = `${task.type}:${entry.id || cryptoId()}`;
      const blockedUntil = ROUTER_STATE.backoffs[taskKey] || 0;
      if (Date.now() < blockedUntil) {
        QUEUE.push(entry.priority + 1, task);
        await sleep(200);
        continue;
      }
      try {
        await task.exec();
      } catch (e) {
        console.error("[meta_router] task exec error:", task.type, e.message);
        ROUTER_STATE.metrics.failures[task.type] = (ROUTER_STATE.metrics.failures[task.type] || 0) + 1;
        ROUTER_STATE.backoffs[taskKey] = Date.now() + BACKOFF_BASE_MS;
      }
      await saveState(ROUTER_STATE);
      await sleep(60);
    }
  })();
}
function stopBackgroundWorker() { WORKER_RUNNING = false; }

// ------------- Utilities & admin -------------
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
export function getRouterState() { return ROUTER_STATE; }
export function resetRouterState() {
  ROUTER_STATE = defaultState();
  saveState(ROUTER_STATE);
  return ROUTER_STATE;
}

// ------------- quick observability helpers -------------
on("emotion_spike", ({ fingerprint, res }) => {
  QUEUE.push(PRIORITY.HIGH, { type: "dreaming", exec: taskDreaming(fingerprint, true) });
  emit("meta_alert", { type: "emotion_spike", fingerprint, intensity: avgVector(res.last?.vector || []) });
});

export async function forceDreamNow(fingerprint) {
  QUEUE.push(PRIORITY.HIGH, { type: "dreaming", exec: taskDreaming(fingerprint, true) });
  startBackgroundWorker();
  return { status: "enqueued" };
}

// ------------- boot/save on exit -------------
process.on("exit", () => saveState(ROUTER_STATE));
process.on("SIGINT", () => { saveState(ROUTER_STATE); process.exit(); });
process.on("SIGTERM", () => { saveState(ROUTER_STATE); process.exit(); });

// ------------- Export defaults -------------
export default {
  processMeta,
  on,
  off,
  emit,
  startBackgroundWorker,
  stopBackgroundWorker,
  getRouterState,
  resetRouterState,
  forceDreamNow
};
