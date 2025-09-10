// storage.js v13.0 - Asynchronous & Resilient Storage

import fs from 'fs/promises'; // Import the promise-based version of fs
import crypto from "crypto";
import path from "path";
import { DATA_DIR, USERS_FILE, LEARNING_QUEUE_FILE, DEBUG } from './config.js';

// --- Directory Setup (Asynchronous) ---
(async () => {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (e) {
        console.error("❌ CRITICAL_STORAGE_ERROR: Could not create data directory.", e);
    }
})();


// ------------ Users storage (Asynchronous & Safe) ------------
export async function loadUsers() {
  try {
    await fs.access(USERS_FILE); // Check if file exists
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    // If file doesn't exist or is invalid, create it and return empty object
    if (e.code === 'ENOENT') {
        if (DEBUG) console.log("INFO: users.json not found. Creating a new one.");
        await saveUsers({}); // Create an empty file
        return {};
    }
    console.error("❌ STORAGE_ERROR: Failed to load users file:", e);
    return {}; // Return empty object on any other error
  }
}

export async function saveUsers(users) {
  try {
    // Write to a temporary file first, then rename. This prevents data corruption if the server crashes during write.
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

// ------------ Learning queue (Asynchronous & Safe) ------------
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
    // If file doesn't exist or is invalid, start with an empty queue
  }

  try {
    queue.push({ ts: new Date().toISOString(), ...entry });
    await fs.writeFile(LEARNING_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
    if (DEBUG) console.log("Appended to learning queue.");
  } catch (e) {
    console.error("❌ STORAGE_ERROR: Failed to append to learning queue:", e);
  }
}

// ------------ Profile updaters (No changes needed here, they are synchronous logic) ------------
export function updateProfileWithEntities(profile, entities, mood, rootCause) {
  profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
  for (const ent of entities) {
    const key = ent;
    if (!profile.longTermProfile.mentioned_entities[key]) {
      profile.longTermProfile.mentioned_entities[key] = {
        type: "topic", sentiment_associations: {}, last_mentioned: new Date().toISOString(), mention_count: 0, last_root_causes: []
      };
    }
    const obj = profile.longTermProfile.mentioned_entities[key];
    obj.mention_count = (obj.mention_count || 0) + 1;
    obj.sentiment_associations[mood] = (obj.sentiment_associations[mood] || 0) + 1;
    obj.last_mentioned = new Date().toISOString();
    if (rootCause) {
      obj.last_root_causes = obj.last_root_causes || [];
      obj.last_root_causes.unshift({ cause: rootCause, ts: new Date().toISOString() });
      if (obj.last_root_causes.length > 5) obj.last_root_causes.pop();
    }
  }
}

export function recordRecurringTheme(profile, tag) {
    if(!profile) return;
    profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
    profile.longTermProfile.recurring_themes = profile.longTermProfile.recurring_themes || {};
    profile.longTermProfile.recurring_themes[tag] = (profile.longTermProfile.recurring_themes[tag] || 0) + 1;
}
