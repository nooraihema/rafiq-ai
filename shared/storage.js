// storage.js v17.0 - The Smartest Solution: In-Memory Temporary Storage

import crypto from "crypto";
import { DEBUG } from "./config.js";

// --- The "Magic" Database ---
// This simple object will act as our temporary database.
// It will hold all data for the duration of a user's session.
// It will be automatically cleared when the Vercel function goes to sleep.
const memoryStore = {
  users: {},
  learning_queue: [],
  intent_thresholds: {},
  occurrence_counters: {}
};

if (DEBUG) console.log("✅ [STORAGE_MODE] Running in smart In-Memory Temporary Storage mode.");

// ------------ Users storage ------------
export async function loadUsers() {
  // We wrap the result in Promise.resolve to keep the function `async`
  // and maintain compatibility with the rest of the app.
  return Promise.resolve(memoryStore.users || {});
}

export async function saveUsers(users) {
  memoryStore.users = users;
  if (DEBUG) console.log("📝 In-Memory: Users data saved.");
  return Promise.resolve();
}

export function makeUserId() {
  return crypto.randomBytes(8).toString("hex");
}

// ------------ Learning queue ------------
export async function appendLearningQueue(entry) {
  memoryStore.learning_queue.push({ ts: new Date().toISOString(), ...entry });
  if (DEBUG) console.log("📝 In-Memory: Appended to learning queue.");
  return Promise.resolve();
}

// ------------ Profile updaters ------------
// NO CHANGES WERE MADE TO THE LOGIC OF THESE FUNCTIONS.
// They don't interact with storage directly, so they remain identical.

export function updateProfileWithEntities(profile = {}, entities = [], mood = null, rootCause = null) {
  try {
    profile.longTermProfile = profile.longTermProfile || {
      recurring_themes: {},
      mentioned_entities: {},
      communication_style: "neutral",
    };
    profile.emotions = profile.emotions || {};
    if (mood) {
      if (!profile.emotions[mood]) profile.emotions[mood] = 0;
      profile.emotions[mood] += 1;
    }
    for (const ent of entities) {
      if (!profile.longTermProfile.mentioned_entities[ent]) {
        profile.longTermProfile.mentioned_entities[ent] = {
          type: "topic",
          sentiment_associations: {},
          last_mentioned: new Date().toISOString(),
          mention_count: 0,
          last_root_causes: [],
        };
      }
      const obj = profile.longTermProfile.mentioned_entities[ent];
      obj.mention_count++;
      if (mood) {
        obj.sentiment_associations[mood] =
          (obj.sentiment_associations[mood] || 0) + 1;
      }
      obj.last_mentioned = new Date().toISOString();
      if (rootCause) {
        obj.last_root_causes.unshift({ cause: rootCause, ts: new Date().toISOString() });
        if (obj.last_root_causes.length > 5) obj.last_root_causes.pop();
      }
    }
  } catch (err) {
    console.error("❌ PROFILE_UPDATE_ERROR:", err);
  }
  return profile;
}

export function recordRecurringTheme(profile = {}, tag) {
  try {
    profile.longTermProfile = profile.longTermProfile || {
      recurring_themes: {},
      mentioned_entities: {},
      communication_style: "neutral",
    };
    profile.longTermProfile.recurring_themes = profile.longTermProfile.recurring_themes || {};
    profile.longTermProfile.recurring_themes[tag] =
      (profile.longTermProfile.recurring_themes[tag] || 0) + 1;
  } catch (err) {
    console.error("❌ THEME_RECORD_ERROR:", err);
  }
  return profile;
}

// ------------ Meta-Learning: Intent Thresholds ------------
export async function loadIntentThresholds() {
  return Promise.resolve(memoryStore.intent_thresholds || {});
}

export async function saveIntentThresholds(thresholds) {
  memoryStore.intent_thresholds = thresholds;
  if (DEBUG) console.log("📝 In-Memory: Intent thresholds saved.");
  return Promise.resolve();
}

// ------------ Meta-Learning: Occurrence Counters ------------
export async function loadOccurrenceCounters() {
  return Promise.resolve(memoryStore.occurrence_counters || {});
}

export async function saveOccurrenceCounters(counters) {
  memoryStore.occurrence_counters = counters;
  if (DEBUG) console.log("📝 In-Memory: Occurrence counters saved.");
  return Promise.resolve();
}
