

// meta_router.js v3.0 - The Orchestrator Beast
// Features:
//  - Priority queue for tasks with dynamic priorities
//  - Event bus (publish/subscribe) for internal events
//  - Adaptive idle detection per-fingerprint (learns typical return times)
//  - Self-orchestration: metrics, auto-tuning priorities, backoff for noisy tasks
//  - Safe persistence of router state & activity logs under ./memory/meta_router_state.json
//
// Exports:
//  - processMeta(userMessage, responsePayload, fingerprint, userProfile)
//  - on(eventName, handler) / off(eventName, handler) / emit(eventName, payload)
//  - startBackgroundWorker() optional (starts internal worker processing queue)
//  - getRouterState(), resetRouterState()
//
// Usage: call processMeta(...) from chat finalizer; optionally call startBackgroundWorker()
// to have worker process queued tasks if your environment is long-running.

import fs from "fs";
import path from "path";

// ------------- Imports from your engines (assumed available) -------------
import { runLearningEngine } from "./learning_engine.js";        // returns analysis {logEntry, suggestion, improvedResponse}
import { trackEmotion } from "./emotion_tracker.js";            // returns point info
import { runDreamingMode } from "./dreaming_mode.js";           // returns dream report

// ------------- Config & Files -------------
const DATA_DIR = path.join(process.cwd(), "memory");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const ROUTER_STATE_FILE = path.join(DATA_DIR, "meta_router_state.json");

// Tunables (you can tweak)
const DEFAULT_IDLE_MS = 1000 * 60 * 15;         // baseline idle to consider dreaming (15min)
const WORKER_LOOP_MS = 1000;                    // worker tick
const MAX_QUEUE_SIZE = 200;                     // prevent runaway
const BACKOFF_BASE_MS = 1000 * 30;              // base backoff (30s) for failing tasks
const DREAM_MIN_CONF_THRESH = 0.35;             // min threshold to trigger dreaming for fingerprint

// Priority buckets (lower number = higher priority)
const PRIORITY = {
  EMOTION_SPIKE: 0,
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  BACKGROUND: 5
};

// ------------- Router State Persistence -------------
function loadState() {
  try {
    if (!fs.existsSync(ROUTER_STATE_FILE)) return defaultState();
    const raw = fs.readFileSync(ROUTER_STATE_FILE, "utf8");
    return raw ? JSON.parse(raw) : defaultState();
  } catch (e) {
    console.error("[meta_router] loadState error:", e.message);
    return defaultState();
  }
}
function saveState(state) {
  try {
    fs.writeFileSync(ROUTER_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("[meta_router] saveState error:", e.message);
  }
}
function defaultState() {
  return {
    lastActivityAt: {},        // fingerprint -> timestamp
    idleThresholdMs: {},       // fingerprint -> threshold ms (adaptive)
    activityHistory: {},       // fingerprint -> [timestamps]
    queueHistory: [],          // recent queue operations
    metrics: { taskCounts: {}, failures: {} },
    backoffs: {}               // taskKey -> nextAvailableTs
  };
}
let ROUTER_STATE = loadState();

// ------------- Simple Event Bus -------------
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
    this._arr = []; // array of {priority, ts, id, task}
  }

  push(priority, task) {
    if (this._arr.length >= this.maxSize) {
      console.warn("[meta_router] queue full - dropping low priority tasks");
      // drop lowest priority if new task is higher
      const worstIndex = this._arr.reduce((acc, curr, idx) => curr.priority > this._arr[acc].priority ? idx : acc, 0);
      if (this._arr[worstIndex].priority > priority) {
        this._arr.splice(worstIndex, 1);
      } else {
        return false;
      }
    }
    const entry = { priority, ts: Date.now(), id: cryptoId(), task };
    this._arr.push(entry);
    // keep sorted ascending (small array ok)
    this._arr.sort((a,b) => a.priority - b.priority || a.ts - b.ts);
    ROUTER_STATE.queueHistory.push({ op: "push", id: entry.id, priority, ts: entry.ts });
    saveState(ROUTER_STATE);
    return true;
  }

  pop() {
    const e = this._arr.shift();
    if (e) {
      ROUTER_STATE.queueHistory.push({ op: "pop", id: e.id, priority: e.priority, ts: Date.now() });
      saveState(ROUTER_STATE);
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

// Task factories: each returns async function() performing task when executed
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
      const res = await trackEmotion(fingerprint, userMessage, responsePayload);
      ROUTER_STATE.metrics.taskCounts["emotion"] = (ROUTER_STATE.metrics.taskCounts["emotion"] || 0) + 1;
      emit("emotion_tracked", { fingerprint, res });
      // if high intensity, emit spike event
      if ((res.intensity || avgVector(res.vector || [])) > 0.75) {
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
      // check backoff
      const key = `dream_${fingerprint || "global"}`;
      const now = Date.now();
      const nextAvail = ROUTER_STATE.backoffs[key] || 0;
      if (now < nextAvail) {
        return { ok: false, reason: "backoff", nextAvail };
      }
      const res = await runDreamingMode({ fingerprint, force, maxClusters: 5 });
      ROUTER_STATE.metrics.taskCounts["dreaming"] = (ROUTER_STATE.metrics.taskCounts["dreaming"] || 0) + 1;
      emit("dreaming_done", { fingerprint, res });
      // if dreaming produced a high-confidence dream, reduce backoff; otherwise increase
      if (res && res.dream && res.dream.initialConfidence > 0.6) {
        ROUTER_STATE.backoffs[key] = Date.now() + Math.floor(BACKOFF_BASE_MS * 0.5);
      } else {
        ROUTER_STATE.backoffs[key] = Date.now() + BACKOFF_BASE_MS;
      }
      saveState(ROUTER_STATE);
      return { ok: true, res };
    } catch (e) {
      ROUTER_STATE.metrics.failures["dreaming"] = (ROUTER_STATE.metrics.failures["dreaming"] || 0) + 1;
      // exponential backoff increment
      const key = `dream_${fingerprint || "global"}`;
      ROUTER_STATE.backoffs[key] = (ROUTER_STATE.backoffs[key] || Date.now()) + BACKOFF_BASE_MS * 2;
      saveState(ROUTER_STATE);
      throw e;
    }
  };
}

// Helper: average of vector
function avgVector(v = []) { if (!v.length) return 0; return v.reduce((a,b)=>a+b,0)/v.length; }

// ------------- Adaptive Idle Detection (per fingerprint) -------------
// Keep activity history (timestamps) per fingerprint and infer typical idle time (median)
// We'll use that median * factor to set idle threshold
function recordActivity(fingerprint) {
  const ts = Date.now();
  ROUTER_STATE.lastActivityAt[fingerprint || "anon"] = ts;
  ROUTER_STATE.activityHistory[fingerprint || "anon"] = ROUTER_STATE.activityHistory[fingerprint || "anon"] || [];
  const arr = ROUTER_STATE.activityHistory[fingerprint || "anon"];
  arr.push(ts);
  // keep last 30
  if (arr.length > 50) arr.splice(0, arr.length - 50);
  // recompute median intervals
  if (arr.length >= 4) {
    const intervals = [];
    for (let i=1;i<arr.length;i++) intervals.push(arr[i]-arr[i-1]);
    intervals.sort((a,b)=>a-b);
    const mid = Math.floor(intervals.length/2);
    const median = intervals.length % 2 === 1 ? intervals[mid] : (intervals[mid-1]+intervals[mid])/2;
    // set adaptive threshold to median * factor (between 0.6 and 2.0)
    const factor = 1.2;
    const threshold = Math.max(1000*60*3, Math.min(1000*60*60*6, Math.round(median * factor))); // min 3min, max 6hr
    ROUTER_STATE.idleThresholdMs[fingerprint || "anon"] = threshold;
  } else {
    ROUTER_STATE.idleThresholdMs[fingerprint || "anon"] = DEFAULT_IDLE_MS;
  }
  saveState(ROUTER_STATE);
}

// ------------- Self-Orchestration & Priority Adjustment -------------
function computeDynamicPriority(fingerprint, context = {}) {
  // context may contain flags: emotionIntensity, userFlags, urgent
  // base: MEDIUM
  let p = PRIORITY.MEDIUM;
  if (context.urgent) p = Math.min(p, PRIORITY.CRITICAL);
  if (context.emotionIntensity && context.emotionIntensity > 0.8) p = Math.min(p, PRIORITY.EMOTION_SPIKE);
  if (context.userFlags && context.userFlags.includes && context.userFlags.includes("work_anxiety")) {
    // raise priority for learning/insight tasks
    p = Math.min(p, PRIORITY.HIGH);
  }
  return p;
}

// ------------- Public API: processMeta -------------
// This is the function you call from chat finalizer.
// It performs: record activity, enqueue tasks with dynamic priorities, optionally run worker inline.
export async function processMeta(userMessage, responsePayload, fingerprint = "anon", userProfile = {}) {
  // 1. record activity & update thresholds
  recordActivity(fingerprint);

  // 2. compute context for priorities
  // we attempt to detect quick emotion intensity from userProfile if available, else 0
  const context = {};
  if (userProfile && typeof userProfile === "object") {
    context.userFlags = userProfile.flags || [];
    // userProfile may have recent emotion summary
    if (userProfile.lastEmotionIntensity) context.emotionIntensity = userProfile.lastEmotionIntensity;
  }

  // 3. create tasks with priorities
  // learning task (medium-high)
  const learnPriority = computeDynamicPriority(fingerprint, { ...context, urgent: false });
  QUEUE.push(learnPriority, { type: "learning", exec: taskLearning(userMessage, responsePayload, fingerprint) });

  // emotion tracking (high priority if intensity suspected)
  const emotionPriority = computeDynamicPriority(fingerprint, { ...context, emotionIntensity: context.emotionIntensity || 0.0 });
  QUEUE.push(emotionPriority, { type: "emotion", exec: taskEmotion(userMessage, responsePayload, fingerprint) });

  // dreaming: schedule as background/low priority; but if idle threshold passed, escalate to higher priority
  const lastAt = ROUTER_STATE.lastActivityAt[fingerprint] || 0;
  const idleMs = ROUTER_STATE.idleThresholdMs[fingerprint] || DEFAULT_IDLE_MS;
  const since = Date.now() - lastAt;
  const dreamPriority = (since > idleMs) ? PRIORITY.HIGH : PRIORITY.BACKGROUND;
  QUEUE.push(dreamPriority, { type: "dreaming", exec: taskDreaming(fingerprint, false) });

  // emit summary event for observability
  emit("meta_enqueued", { fingerprint, queueSize: QUEUE.size(), priorities: { learnPriority, emotionPriority, dreamPriority } });

  // 4. optionally process inline small tasks quickly (emotion) to update profile before response returns
  // Here we pick to run emotion tracking inline if priority critical/emotion spike probable:
  if (emotionPriority <= PRIORITY.HIGH) {
    try {
      const eTask = QUEUE.pop();
      if (eTask && eTask.task && eTask.task.type === "emotion") {
        // our queue stores {type, exec} inside entry.task
        await eTask.task.exec();
      } else if (eTask) {
        // if popped task is not emotion, push it back
        QUEUE.push(eTask.priority, eTask.task);
      }
    } catch (e) {
      console.error("[meta_router] inline emotion task failed:", e.message);
    }
  }

  // 5. kick background worker if not running (start automatically)
  startBackgroundWorker();

  // return immediate basic observability info (no blocking)
  return { status: "enqueued", queueSize: QUEUE.size() };
}

// ------------- Background Worker (process queue) -------------
let WORKER_RUNNING = false;
function startBackgroundWorker() {
  if (WORKER_RUNNING) return;
  WORKER_RUNNING = true;
  (async function loop() {
    while (WORKER_RUNNING) {
      const entry = QUEUE.pop();
      if (!entry) {
        // nothing to do
        await sleep(WORKER_LOOP_MS);
        continue;
      }
      const { task } = entry;
      // task: { type, exec }
      const taskKey = `${task.type}:${entry.id || cryptoId()}`;
      // check backoff for this taskKey
      const blockedUntil = ROUTER_STATE.backoffs[taskKey] || 0;
      if (Date.now() < blockedUntil) {
        // push back with slightly lower priority to avoid busy spin
        QUEUE.push(entry.priority + 1, task);
        await sleep(200);
        continue;
      }
      try {
        await task.exec();
      } catch (e) {
        console.error("[meta_router] task exec error:", task.type, e.message);
        ROUTER_STATE.metrics.failures[task.type] = (ROUTER_STATE.metrics.failures[task.type] || 0) + 1;
        // set backoff for task key
        ROUTER_STATE.backoffs[taskKey] = Date.now() + BACKOFF_BASE_MS;
      }
      saveState(ROUTER_STATE);
      // small pause to let other system things breathe
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
  // When emotion spike occurs, escalate dreaming for this fingerprint
  // push high-priority dream job
  QUEUE.push(PRIORITY.HIGH, { type: "dreaming", exec: taskDreaming(fingerprint, true) });
  emit("meta_alert", { type: "emotion_spike", fingerprint, intensity: avgVector(res.vector || []) });
});

// expose function to run a forced dreaming cycle for a fingerprint (admin)
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
