// /api/chat.js
// رفيق - محرك نوايا متقدّم (الإصدار المعاد هيكلته)

import { THRESHOLD, SHORT_MEMORY_LIMIT, LONG_TERM_LIMIT, DEBUG } from './config.js';
import { detectMood, detectCritical, extractEntities, extractRootCause, cairoGreetingPrefix, adaptReplyBase, criticalSafetyReply } from './utils.js';
import { loadUsers, saveUsers, makeUserId, appendLearningQueue, updateProfileWithEntities, recordRecurringTheme } from './storage.js';
import { intentIndex, tagToIdx, buildIndexSync, ensureIntentEmbeddings, scoreIntent, buildMessageTfVec, embedMessageIfPossible, callTogetherAPI } from './intent_engine.js';
import { getHistoricalContext, getProactiveOpening, analyzePatterns, composeResponse } from './intelligence_layer.js';

// ------------ Initialization ------------
// This code runs once when the server starts
buildIndexSync();
(async () => { 
  await ensureIntentEmbeddings().catch(e => { if (DEBUG) console.warn("Embedding init failed:", e.message || e); });
})();

// ------------ Main handler ------------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString();
    if (!rawMessage || !rawMessage.trim()) return res.status(400).json({ error: "Empty message" });

    const users = loadUsers();
    let userId = body.userId || null;
    if (!userId || !users[userId]) {
      userId = makeUserId();
      users[userId] = {
        id: userId, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString(),
        preferredTone: "warm", shortMemory: [], longMemory: [],
        longTermProfile: { recurring_themes: {}, mentioned_entities: {}, communication_style: "neutral" },
        moodHistory: [], flags: {}, expectingFollowUp: null
      };
      if (DEBUG) console.log("Created user", userId);
    }
    const profile = users[userId];
    profile.lastSeen = new Date().toISOString();

    if (detectCritical(rawMessage)) {
      profile.flags.critical = true;
      saveUsers(users);
      return res.status(200).json({ reply: criticalSafetyReply(), source: "safety", userId });
    }

    const mood = detectMood(rawMessage);
    const entities = extractEntities(rawMessage);
    const rootCause = extractRootCause(rawMessage);
    
    updateProfileWithEntities(profile, entities, mood, rootCause);
    
    profile.moodHistory.push({ mood, ts: new Date().toISOString() });
    if (profile.moodHistory.length > LONG_TERM_LIMIT) profile.moodHistory.shift();

    const msgTf = buildMessageTfVec(rawMessage);
    await embedMessageIfPossible(msgTf, rawMessage);

    let allowedIdxs = null;
    if (profile.expectingFollowUp && profile.expectingFollowUp.expiresTs > Date.now()) {
      allowedIdxs = (profile.expectingFollowUp.allowedTags || []).map(t => tagToIdx[t]).filter(i=>typeof i==="number");
      if (DEBUG) console.log("Follow-up allowed indices", allowedIdxs);
    } else {
      profile.expectingFollowUp = null;
    }

    let best = { idx: -1, score: 0, details: null };
    const candidateIdxs = (Array.isArray(allowedIdxs) && allowedIdxs.length) ? allowedIdxs : intentIndex.map((_,i)=>i);

    for (const i of candidateIdxs) {
      const intent = intentIndex[i];
      const sc = scoreIntent(rawMessage, msgTf.vec, msgTf.norm, intent);
      if (sc.final > best.score) best = { idx: i, score: sc.final, details: sc };
      if (DEBUG) console.log(`[SCORE] tag=${intent.tag} final=${sc.final.toFixed(3)} matched=${JSON.stringify(sc.matchedTerms)} embed=${sc.embedSim?.toFixed?.(3) || 0}`);
    }

    if (best.idx !== -1 && best.score >= THRESHOLD) {
      const intent = intentIndex[best.idx];
      recordRecurringTheme(profile, intent.tag); // Record theme when intent is confirmed

      if (intent.safety === "CRITICAL") {
        profile.flags.critical = true; 
        saveUsers(users);
        return res.status(200).json({ reply: criticalSafetyReply(), source: "intent_critical", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }
      
      let baseReply;
      
      if (intent.response_constructor) {
          const historicalInsight = getHistoricalContext(entities, profile);
          const context = {
              mood: mood,
              entities: entities,
              isRecurring: (profile.longTermProfile.recurring_themes[intent.tag] || 0) > 3,
              intentTag: intent.tag,
              profile: profile,
              historicalInsight: historicalInsight
          };
          baseReply = composeResponse(intent.response_constructor, context);
      } else if (intent.responses && intent.responses.length > 0) {
          baseReply = intent.responses[Math.floor(Math.random() * intent.responses.length)];
      }
      
      if (!baseReply) {
          baseReply = "أنا سامعك وبكل هدوء معاك. احكيلي أكتر 💙";
      }

      let insightReply = null;
      const totalMessages = (profile.shortMemory?.length || 0) + (profile.longMemory?.length || 0) + profile.moodHistory.length;
      if ([10, 25, 50, 100].includes(totalMessages) && !(profile.flags?.shared_pattern_insight)) {
          insightReply = analyzePatterns(profile);
          if (insightReply) {
              profile.flags = profile.flags || {};
              profile.flags.shared_pattern_insight = true;
          }
      }

      if (insightReply) {
          baseReply = `${baseReply}\n\nبالمناسبة، ${insightReply}`;
      }
      
      if (intent.follow_up_question && Array.isArray(intent.follow_up_intents) && intent.follow_up_intents.length) {
        profile.expectingFollowUp = { parentTag: intent.tag, allowedTags: intent.follow_up_intents, expiresTs: Date.now() + (5*60*1000) };
        const question = intent.follow_up_question;
        const reply = adaptReplyBase(`${baseReply}\n\n${question}`, profile, mood);
        profile.shortMemory.push({ message: rawMessage, reply, mood, tag: intent.tag, ts: new Date().toISOString() });
        if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
        users[userId] = profile; 
        saveUsers(users);
        return res.status(200).json({ reply, source: "intent_followup", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
      }

      const personalized = adaptReplyBase(baseReply, profile, mood);
      profile.shortMemory.push({ message: rawMessage, reply: personalized, mood, tag: intent.tag, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      
      if (mood !== "محايد" && Math.random() < 0.25) {
        profile.longMemory = profile.longMemory || [];
        profile.longMemory.push({ key: "mood_note", value: mood, ts: new Date().toISOString() });
        if (profile.longMemory.length > LONG_TERM_LIMIT) profile.longMemory.shift();
      }
      users[userId] = profile; 
      saveUsers(users);
      return res.status(200).json({ reply: personalized, source: "intent", tag: intent.tag, score: Number(best.score.toFixed(3)), userId });
    }

    if (process.env.TOGETHER_API_KEY) {
      const ext = await callTogetherAPI(rawMessage);
      appendLearningQueue({ message: rawMessage, userId, provider: "together", extResponse: ext, ts: new Date().toISOString() });
      profile.shortMemory.push({ message: rawMessage, reply: ext, mood, ts: new Date().toISOString() });
      if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
      users[userId] = profile; 
      saveUsers(users);
      return res.status(200).json({ reply: ext, source: "together", userId });
    }

    let fallback;
    if (!profile.shortMemory || profile.shortMemory.length === 0) {
        const proactiveOpening = getProactiveOpening(profile);
        fallback = proactiveOpening || `${cairoGreetingPrefix()}، أنا رفيقك هنا. احكيلي إيه اللي بيحصل معاك النهاردة؟`;
    } else {
        const lastMood = profile.moodHistory?.slice(-1)[0]?.mood;
        if (lastMood && lastMood !== "محايد") {
            fallback = `لسه فاكرة إنك قلت إنك حاسس بـ"${lastMood}" قبل كده. تحب تحكيلي لو الحالة اتغيرت؟`;
        } else {
            fallback = "محتاج منك توضيح بسيط كمان 💜 احكيلي بالراحة وأنا سامعك.";
        }
    }
    
    profile.shortMemory.push({ message: rawMessage, reply: fallback, mood, ts: new Date().toISOString() });
    if (profile.shortMemory.length > SHORT_MEMORY_LIMIT) profile.shortMemory.shift();
    users[userId] = profile; 
    saveUsers(users);

    return res.status(200).json({ reply: fallback, source: "fallback", userId });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
```
