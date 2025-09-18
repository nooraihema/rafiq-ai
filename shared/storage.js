// storage.js v14.0 - Asynchronous & Resilient Storage (with Meta-Learning)

import fs from 'fs/promises';
import crypto from "crypto";
import path from "path";
// =================================================================
// START: PATH UPDATES FOR NEW STRUCTURE
// =================================================================
import { DATA_DIR, USERS_FILE, LEARNING_QUEUE_FILE, DEBUG } from './config.js';
// =================================================================
// END: PATH UPDATES FOR NEW STRUCTURE
// =================================================================

const THRESHOLDS_FILE = path.join(DATA_DIR, "intent_thresholds.json");
const OCCURRENCE_FILE = path.join(DATA_DIR, "occurrence_counters.json");

// --- Directory Setup ---
(async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("❌ CRITICAL_STORAGE_ERROR: Could not create data directory.", e);
  }
})();

// ------------ Users storage ------------
export async function loadUsers() {
  try {
    await fs.access(USERS_FILE);
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    if (e.code === 'ENOENT') {
      if (DEBUG) console.log("INFO: users.json not found. Creating a new one.");
      await saveUsers({});
      return {};
    }
    console.error("❌ STORAGE_ERROR: Failed to load users file:", e);
    return {};
  }
}

export async function saveUsers(users) {
  try {
    const tempFile = `${USERS_FILE}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(users, null, 2), "utf8");
    await fs.rename(tempFile, USERS_FILE);
    if (DEBUG) console.log("✅ Users data saved successfully.");
  } catch (e) {
    console.error("❌ STORAGE_ERROR: Failed to save users file:", e);
  }
}

export function makeUserId() {
  return crypto.randomBytes(8).toString("hex");
}

// ------------ Learning queue ------------
export async function appendLearningQueue(entry) {
  let queue = [];
  try {
    await fs.access(LEARNING_QUEUE_FILE);
    const raw = await fs.readFile(LEARNING_QUEUE_FILE, "utf8");
    queue = JSON.parse(raw || "[]");
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error("❌ STORAGE_ERROR: Failed to read learning_queue.json:", e);
    }
  }

  try {
    queue.push({ ts: new Date().toISOString(), ...entry });
    await fs.writeFile(LEARNING_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
    if (DEBUG) console.log("Appended to learning queue.");
  } catch (e) {
    console.error("❌ STORAGE_ERROR: Failed to append to learning queue:", e);
  }
}

// ------------ Profile updaters ------------
export function updateProfileWithEntities(profile, entities, mood, rootCause) {
  profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
  for (const ent of entities) {
    if (!profile.longTermProfile.mentioned_entities[ent]) {
      profile.longTermProfile.mentioned_entities[ent] = {
        type: "topic",
        sentiment_associations: {},
        last_mentioned: new Date().toISOString(),
        mention_count: 0,
        last_root_causes: []
      };
    }
    const obj = profile.longTermProfile.mentioned_entities[ent];
    obj.mention_count++;
    obj.sentiment_associations[mood] = (obj.sentiment_associations[mood] || 0) + 1;
    obj.last_mentioned = new Date().toISOString();
    if (rootCause) {
      obj.last_root_causes.unshift({ cause: rootCause, ts: new Date().toISOString() });
      if (obj.last_root_causes.length > 5) obj.last_root_causes.pop();
    }
  }
}

export function recordRecurringTheme(profile, tag) {
  if (!profile) return;
  profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
  profile.longTermProfile.recurring_themes[tag] = (profile.longTermProfile.recurring_themes[tag] || 0) + 1;
}

// ------------ Meta-Learning: Intent Thresholds ------------
export async function loadIntentThresholds() {
  try {
    await fs.access(THRESHOLDS_FILE);
    const raw = await fs.readFile(THRESHOLDS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    if (e.code === 'ENOENT') {
      if (DEBUG) console.log("INFO: intent_thresholds.json not found. Creating a new one.");
      await saveIntentThresholds({});
      return {};
    }
    console.error("❌ STORAGE_ERROR: Failed to load thresholds:", e);
    return {};
  }
}

export async function saveIntentThresholds(thresholds) {
  try {
    const tempFile = `${THRESHOLDS_FILE}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(thresholds, null, 2), "utf8");
    await fs.rename(tempFile, THRESHOLDS_FILE);
    if (DEBUG) console.log("✅ Intent thresholds saved.");
  } catch (e) {
    console.error("❌ STORAGE_ERROR: Failed to save thresholds:", e);
  }
}

// ------------ Meta-Learning: Occurrence Counters ------------
export async function loadOccurrenceCounters() {
  try {
    await fs.access(OCCURRENCE_FILE);
    const raw = await fs.readFile(OCCURRENCE_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    if (e.code === 'ENOENT') {
      if (DEBUG) console.log("INFO: occurrence_counters.json not found. Creating a new one.");
      await saveOccurrenceCounters({});
      return {};
    }
    console.error("❌ STORAGE_ERROR: Failed to load occurrence counters:", e);
    return {};
  }
}

export async function saveOccurrenceCounters(counters) {
  try {
    const tempFile = `${OCCURRENCE_FILE}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(counters, null, 2), "utf8");
    await fs.rename(tempFile, OCCURRENCE_FILE);
    if (DEBUG) console.log("✅ Occurrence counters saved.");
  } catch (e) {
    console.error("❌ STORAGE_ERROR: Failed to save occurrence counters:", e);
  }
}
