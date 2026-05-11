// /api/chat.js - المشغل المباشر لنواة أكاشا
import { AkashaBrain } from '../core/brain.js';

// نسخة واحدة من المخ لضمان استقرار الأداء (Singleton)
let brainInstance = null;

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { message, userId } = req.body;
        const rawMessage = (message || "").trim();

        if (!rawMessage) {
            return res.status(400).json({ error: "No message provided" });
        }

        // 1. تشغيل المحرك فوراً (بدون استدعاء init الخارجى)
        if (!brainInstance) {
            brainInstance = new AkashaBrain();
            console.log("🌌 [SYSTEM]: Akasha Core Sparked - Version 35.0");
        }

        // 2. المعالجة المباشرة (Direct Processing)
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
