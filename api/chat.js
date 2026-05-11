// /api/chat.js - Akasha Stable Training Engine v2.0

import { AkashaBrain } from '../core/brain.js';
import fs from 'fs';
import path from 'path';

let brainInstance = null;
let datasetContent = null;
let isTraining = false;

// ==========================
// 📦 DATASET LOADER
// ==========================
function loadDataset() {
    try {
        if (!datasetContent) {
            const filePath = path.join(process.cwd(), 'dataset.txt');
            if (fs.existsSync(filePath)) {
                datasetContent = fs.readFileSync(filePath, 'utf-8');
                console.log("📚 [DATASET]: Loaded successfully");
            }
        }
    } catch (e) {
        console.log("⚠️ [DATASET]: Load failed");
    }
}

// ==========================
// 🎲 RANDOM TRAIN CHUNK
// ==========================
function getRandomChunk(size = 80) {
    if (!datasetContent) return null;

    const clean = datasetContent.replace(/\s+/g, " ").trim();
    if (clean.length <= size) return clean;

    const start = Math.floor(Math.random() * (clean.length - size));
    return clean.substring(start, start + size);
}

// ==========================
// 🧠 SAFE TRAIN STEP
// ==========================
async function safeTrain(brain, chunk) {
    if (isTraining) {
        console.log("⏳ [TRAIN]: Skipped (already training)");
        return;
    }

    try {
        isTraining = true;

        console.log("\n🧬 [EVOLVE]: Training chunk start");
        console.log("📦 [CHUNK]:", chunk.substring(0, 50));

        const result = await brain.trainStep(chunk);

        console.log("✅ [EVOLVE]: Training complete");
        return result;

    } catch (e) {
        console.log("🚨 [TRAIN ERROR]:", e.message);
    } finally {
        isTraining = false;
    }
}

// ==========================
// 🚀 MAIN HANDLER
// ==========================
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, userId } = req.body;
        const rawMessage = (message || "").trim();

        if (!rawMessage) {
            return res.status(400).json({ error: "Empty message" });
        }

        // ==========================
        // 🧠 INIT BRAIN
        // ==========================
        if (!brainInstance) {
            brainInstance = new AkashaBrain();
            loadDataset();
            console.log("🌌 [SYSTEM]: Akasha Core Initialized");
        }

        // ==========================
        // 🔥 BACKGROUND TRAINING
        // ==========================
        const chunk = getRandomChunk(100);
        if (chunk) {
            safeTrain(brainInstance, chunk);
        }

        // ==========================
        // 💬 USER RESPONSE (SAFE MODE)
        // ==========================
        console.log("\n💬 [USER INPUT]:", rawMessage);

        const result = await brainInstance.process(rawMessage, userId);

        if (!result || !result.text) {
            throw new Error("Invalid model output");
        }

        // ==========================
        // 📤 RESPONSE
        // ==========================
        return res.status(200).json({
            reply: result.text,
            userId: userId || "anonymous",
            status: "akasha_stable_v2"
        });

    } catch (err) {
        console.error("🚨 [ENGINE CRASH]:", err);

        return res.status(500).json({
            error: "Akasha Engine Failure",
            details: err.message
        });
    }
}
