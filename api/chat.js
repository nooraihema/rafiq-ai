/**
 * api/chat.js
 * 
 * تم تعديل المسارات لتتوافق مع هيكلة الفولدرات الجديدة: src/core/
 */

// المسار الصحيح للوصول من /api إلى /src/core
import { AkashaEngine } from '../src/core/akashaengine.js';
import { Tensor } from '../src/core/tensor.js';
// تأكد أن ملف brain.js موجود أيضاً داخل src/core/
import { AkashaBrain } from '../src/core/brain.js'; 

import fs from 'fs';
import path from 'path';

let engineInstance = null;
let brainInstance = null;
let datasetContent = null;

/**
 * تهيئة المحرك وربطه بكرت الشاشة
 */
async function initHardware() {
    if (engineInstance) return;

    try {
        // التحقق من دعم WebGPU في البيئة الحالية
        if (!navigator.gpu) {
            throw new Error("WebGPU is not supported in this environment.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        
        engineInstance = new AkashaEngine(device);
        brainInstance = new AkashaBrain(engineInstance);
        
        console.log("🌌 [HARDWARE]: Akasha Engine Armed via src/core/");
    } catch (err) {
        console.error("❌ Hardware Init Failed:", err);
        throw err;
    }
}

// ... بقية دالة getRandomChunk كما هي ...

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { message, userId } = req.body;
        const rawMessage = (message || "").trim();

        if (!rawMessage) return res.status(400).json({ error: "No message provided" });

        // 1. التأكد من المسارات والجاهزية
        await initHardware();

        // 2. التدريب الصامت (Background Training)
        const trainingChunk = getRandomChunk(128); 
        if (trainingChunk) {
            await brainInstance.train(trainingChunk);
        }

        // 3. المعالجة والرد
        const result = await brainInstance.process(rawMessage, userId);

        return res.status(200).json({
            reply: result.text,
            status: "fused_execution_active"
        });

    } catch (err) {
        console.error("🚨 Akasha Engine Failure:", err);
        return res.status(500).json({ 
            error: "فشل في تحميل الأنظمة الأساسية من src/core/",
            details: err.message 
        });
    }
}
