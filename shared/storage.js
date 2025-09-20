// storage.js v15.0 - Vercel KV Integration

import { kv } from "@vercel/kv";
import crypto from "crypto";
import { DEBUG } from "./config.js";

// --- Key names for Vercel KV ---
// We use these constants instead of file paths now.
const USERS_KEY = "rafiq_users";
const LEARNING_QUEUE_KEY = "rafiq_learning_queue";
const THRESHOLDS_KEY = "rafiq_intent_thresholds";
const OCCURRENCE_KEY = "rafiq_occurrence_counters";

// --- Directory Setup ---
// This block is no longer needed as Vercel KV doesn't use local directories.
// (async () => {
//   try {
//     await fs.mkdir(DATA_DIR, { recursive: true });
//   } catch (e) {
//     console.error("❌ CRITICAL_STORAGE_ERROR: Could not create data directory.", e);
//   }
// })();

// ------------ Users storage ------------
export async function loadUsers() {
  try {
    const raw = await kv.get(USERS_KEY);
    // If 'raw' is null (key doesn't exist), return an empty object.
    if (raw === null) {
      if (DEBUG) console.log("INFO: User data not found in KV. Returning empty object.");
      return {};
    }
    return raw;
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to load users from KV:", e);
    return {}; // Return empty object on error to prevent crashes.
  }
}

export async function saveUsers(users) {
  try {
    await kv.set(USERS_KEY, users);
    if (DEBUG) console.log("✅ Users data saved successfully to Vercel KV.");
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to save users to KV:", e);
  }
}

export function makeUserId() {
  return crypto.randomBytes(8).toString("hex");
}

// ------------ Learning queue ------------
export async function appendLearningQueue(entry) {
  let queue = [];
  try {
    // Get the current queue from KV
    const currentQueue = await kv.get(LEARNING_QUEUE_KEY);
    // If it exists and is an array, use it. Otherwise, start fresh.
    if (Array.isArray(currentQueue)) {
      queue = currentQueue;
    }
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to read learning_queue from KV:", e);
  }

  try {
    queue.push({ ts: new Date().toISOString(), ...entry });
    // Save the entire updated queue back to KV
    await kv.set(LEARNING_QUEUE_KEY, queue);
    if (DEBUG) console.log("Appended to learning queue in Vercel KV.");
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to append to learning queue in KV:", e);
  }
}

// ------------ Profile updaters ------------
// NO CHANGES WERE MADE TO THE LOGIC OF THESE FUNCTIONS.
// They don't interact with storage directly, so they remain identical.

export function updateProfileWithEntities(profile = {}, entities = [], mood = null, rootCause = null) {
  try {
    // Ensure structure
    profile.longTermProfile = profile.longTermProfile || {
      recurring_themes: {},
      mentioned_entities: {},
      communication_style: "neutral",
    };

    profile.emotions = profile.emotions || {};

    // Record mood safely
    if (mood) {
      if (!profile.emotions[mood]) profile.emotions[mood] = 0;
      profile.emotions[mood] += 1;
    }

    // Process entities
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
    // This first check is good and already exists
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
  try {
    const raw = await kv.get(THRESHOLDS_KEY);
    if (raw === null) {
      if (DEBUG) console.log("INFO: intent_thresholds not found in KV. Returning empty object.");
      return {};
    }
    return raw;
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to load thresholds from KV:", e);
    return {};
  }
}

export async function saveIntentThresholds(thresholds) {
  try {
    await kv.set(THRESHOLDS_KEY, thresholds);
    if (DEBUG) console.log("✅ Intent thresholds saved to Vercel KV.");
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to save thresholds to KV:", e);
  }
}

// ------------ Meta-Learning: Occurrence Counters ------------
export async function loadOccurrenceCounters() {
  try {
    const raw = await kv.get(OCCURRENCE_KEY);
    if (raw === null) {
      if (DEBUG) console.log("INFO: occurrence_counters not found in KV. Returning empty object.");
      return {};
    }
    return raw;
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to load occurrence counters from KV:", e);
    return {};
  }
}

export async function saveOccurrenceCounters(counters) {
  try {
    await kv.set(OCCURRENCE_KEY, counters);
    if (DEBUG) console.log("✅ Occurrence counters saved to Vercel KV.");
  } catch (e) {
    console.error("❌ KV_STORAGE_ERROR: Failed to save occurrence counters to KV:", e);
  }
}
