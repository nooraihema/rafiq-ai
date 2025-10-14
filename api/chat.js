// /api/chat.js
// API Endpoint v3.0 - Fully Integrated with the New Cognitive Architecture
// This version replaces the entire legacy pipeline with clean, powerful calls to the
// new, unified LinguisticBrain, UserMemoryGraph, and InferenceEngine.

import { LinguisticBrain } from '../core/linguistic_brain.js';
import { UserMemoryGraph } from '../core/memory_system.js';
import { InferenceEngine } from '../hippocampus/inference_engine.js';
import { makeUserId } from '../core/utils.js';

// =================================================================
// SINGLETON MANAGEMENT (إدارة النسخ الفريدة)
// To ensure we have one brain and one memory instance per user across requests.
// =================================================================

let brainInstance = null;
const userMemoryGraphs = new Map(); // Stores a UserMemoryGraph instance for each user

/**
 * Initializes and returns a single instance of the LinguisticBrain.
 */
async function getBrainInstance() {
    if (brainInstance) return brainInstance;

    // The brain is stateless, so we only need one for the entire application.
    // We pass null for memory here because the CatharsisEngine within the brain
    // will receive the user-specific memory during the generateResponse call.
    const brain = new LinguisticBrain(null); // Passing null temporarily
    await brain.init();
    brainInstance = brain;
    console.log("✅ LinguisticBrain initialized successfully.");
    return brainInstance;
}

/**
 * Retrieves or creates a dedicated UserMemoryGraph instance for a given user.
 * @param {string} userId
 */
async function getUserMemoryGraph(userId) {
    if (userMemoryGraphs.has(userId)) {
        return userMemoryGraphs.get(userId);
    }
    // Create and initialize a new memory graph for the new user.
    const newMemoryGraph = new UserMemoryGraph({ userId });
    await newMemoryGraph.initialize(); // Load user's past memory if it exists
    userMemoryGraphs.set(userId, newMemoryGraph);
    console.log(`🧠 New or returning user. Initialized memory graph for: ${userId}`);
    return newMemoryGraph;
}

// =================================================================
// MAIN API HANDLER
// =================================================================
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawMessage = (body.message || "").toString().trim();
    if (!rawMessage) return res.status(400).json({ error: "Empty message" });

    const userId = body.userId || makeUserId();
    console.log(`\n\n- - - [ NEW TURN: User ${userId} ] - - -\n📨 Incoming: "${rawMessage}"`);

    // --- [THE NEW, INTEGRATED PIPELINE] ---

    // 1. Get Core Components: The Brain and the User-Specific Memory
    const brain = await getBrainInstance();
    const memoryGraph = await getUserMemoryGraph(userId);
    
    // Inject the correct, user-specific memory into the brain's final engine for this request
    brain.engines.catharsis.memory = memoryGraph;

    // 2. Conscious Mind: Perform real-time analysis of the current message
    console.log(`[1/4] Running real-time analysis (Conscious Mind)...`);
    const insight = await brain.analyze(rawMessage, {
        previousEmotion: memoryGraph.workingMemory.slice(-1)[0]?.insight?.emotionProfile?.primaryEmotion
    });

    // 3. Subconscious Mind: Ingest the new experience and run deep inference
    console.log(`[2/4] Ingesting insight into memory and running inference (Subconscious Mind)...`);
    if (insight) {
        memoryGraph.ingest(insight);
    }
    const inferenceEngine = new InferenceEngine(memoryGraph);
    const cognitiveProfile = await inferenceEngine.generateCognitiveProfile();

    // 4. Expressive Mind: Generate the final, soulful response
    console.log(`[3/4] Generating response (Expressive Mind)...`);
    const response = await brain.generateResponse(insight);

    // 5. Post-Response Housekeeping (run asynchronously to not delay the user)
    setTimeout(() => {
        console.log(`[4/4] Performing post-response housekeeping (dreaming, persisting)...`);
        memoryGraph.dream();
        memoryGraph.persist();
    }, 0);

    // 6. Send the final response to the user
    console.log(`✅ Pipeline complete. Sending reply.`);
    return res.status(200).json({
      reply: response.responseText,
      userId,
      _meta: {
          realtime_insight: insight,
          longterm_profile: cognitiveProfile,
          response_details: response._meta
      }
    });
    // --- [END OF THE NEW PIPELINE] ---

  } catch (err) {
    console.error("🚨 API Handler Error:", err);
    // In production, avoid sending detailed stack traces to the client
    return res.status(500).json({ error: "An internal server error occurred." });
  }
}
