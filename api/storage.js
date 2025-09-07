// storage.js

import fs from "fs";
import crypto from "crypto";
import { DATA_DIR, USERS_FILE, LEARNING_QUEUE_FILE, DEBUG } from './config.js';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ------------ Users storage ------------
export function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}), "utf8");
      return {};
    }
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.error("Failed to load users file:", e);
    return {};
  }
}

export function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    if (DEBUG) console.log("Saved users");
  } catch (e) {
    console.error("Failed to save users file:", e);
  }
}

export function makeUserId() {
  return crypto.randomBytes(8).toString("hex");
}

// ------------ Learning queue ------------
export function appendLearningQueue(entry) {
  try {
    let q = [];
    if (fs.existsSync(LEARNING_QUEUE_FILE)) {
      q = JSON.parse(fs.readFileSync(LEARNING_QUEUE_FILE, "utf8") || "[]");
    }
    q.push(Object.assign({ ts: new Date().toISOString() }, entry));
    fs.writeFileSync(LEARNING_QUEUE_FILE, JSON.stringify(q, null, 2), "utf8");
    if (DEBUG) console.log("Appended to learning queue");
  } catch (e) {
    console.error("Failed to append learning queue:", e);
  }
}

// ------------ Profile updaters ------------
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
  profile.longTermProfile = profile.longTermProfile || { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" };
  profile.longTermProfile.recurring_themes[tag] = (profile.longTermProfile.recurring_themes[tag] || 0) + 1;
}
```
