// /api/chat.js - المشغل المباشر لنواة أكاشا (نسخة التدريب المستمر)
import { AkashaBrain } from '../core/brain.js';
import fs from 'fs';
import path from 'path';

let brainInstance = null;
let datasetContent = null;

// دالة لجلب جزء عشوائي من ملف البيانات للتدريب
function getRandomChunk(size = 64) {
    try {
        if (!datasetContent) {
            const filePath = path.join(process.cwd(), 'dataset.txt');
            if (fs.existsSync(filePath)) {
                datasetContent = fs.readFileSync(filePath, 'utf-8');
            }
        }
        if (datasetContent && datasetContent.length > size) {
            const start = Math.floor(Math.random() * (datasetContent.length - size));
            return datasetContent.substring(start, start + size);
        }
    } catch (e) {
        console.log("⚠️ [DATASET]: Could not read dataset for training.");
    }
    return null;
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { message, userId } = req.body;
        const rawMessage = (message || "").trim();

        if (!rawMessage) {
            return res.status(400).json({ error: "No message provided" });
        }

        // 1. تشغيل المحرك فوراً
        if (!brainInstance) {
            brainInstance = new AkashaBrain();
            console.log("🌌 [SYSTEM]: Akasha Core Sparked - Training Mode Active");
        }

        // --- [ خطوة التدريب الإضافية ] ---
        // قبل الرد على المستخدم، نأخذ جزءاً من الـ dataset وندرب النموذج عليه "خلف الكواليس"
        const trainingChunk = getRandomChunk(100); 
        if (trainingChunk) {
            // التدريب الصامت (Background Training)
            // نمرر النص للدالة process عشان تشغل الـ Backward وتحدث الأوزان
            await brainInstance.process(trainingChunk);
            console.log("🧬 [EVOLVE]: Akasha trained on a new chunk from dataset.");
        }
        // --------------------------------

        // 2. المعالجة والرد على المستخدم (Direct Processing)
        const result = await brainInstance.process(rawMessage, userId);

        // 3. الرد النهائي للواجهة
        return res.status(200).json({
            reply: result.text,
            userId: userId || "anonymous",
            status: "sovereign_active"
        });

    } catch (err) {
        console.error("🚨 Akasha Engine Failure:", err);
        return res.status(500).json({ 
            error: "النواة تواجه صعوبة في المعالجة اللحظية",
            details: err.message 
        });
    }
}
