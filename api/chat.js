/**
 * api/chat.js
 * 
 * المشغل النهائي لنظام أكاشا (Akasha System Handler).
 * يربط الـ Frontend بالـ Graph Compiler الموجود في src/core/.
 */

import { AkashaRunner } from '../src/core/akasharunner.js';
import fs from 'fs';
import path from 'path';

// المتغيرات العامة لضمان عدم إعادة التهيئة مع كل طلب
let runnerInstance = null;
let datasetContent = null;

/**
 * تهيئة المحرك وربطه بالـ GPU (مرة واحدة فقط)
 */
async function getRunner() {
    if (runnerInstance) return runnerInstance;

    try {
        // التحقق من وجود navigator.gpu (WebGPU)
        // ملاحظة: في بيئات السيرفر قد تحتاج لمكتبة محاكاة، 
        // ولكن هذا الكود مصمم للعمل في بيئة تدعم WebGPU.
        if (typeof navigator === 'undefined' || !navigator.gpu) {
            throw new Error("WebGPU is not supported in this environment (Server-side limitation).");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("No GPU Adapter found.");
        
        const device = await adapter.requestDevice();
        
        // إنشاء نسخة من المشغل الثامن
        runnerInstance = new AkashaRunner(device);
        console.log("🌌 [SYSTEM]: AkashaRunner linked with 7 Core Files successfully.");
        
        return runnerInstance;
    } catch (err) {
        console.error("🚨 GPU Init Error:", err.message);
        throw err;
    }
}

/**
 * دالة جلب البيانات للتدريب الخلفي
 */
function getTrainingData(size = 512) {
    try {
        if (!datasetContent) {
            const filePath = path.join(process.cwd(), 'dataset.txt');
            if (fs.existsSync(filePath)) {
                datasetContent = fs.readFileSync(filePath, 'utf-8');
            }
        }
        
        // تحويل جزء من النص لأرقام (Mock Data) ليفهمها الـ Tensor
        const mockArray = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            mockArray[i] = Math.random(); // تبسيط للتدريب
        }
        return mockArray;
    } catch (e) {
        return new Float32Array(size).fill(0.1);
    }
}

export default async function handler(req, res) {
    // السماح بطلبات POST فقط
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, userId } = req.body;
        const rawMessage = (message || "").trim();

        if (!rawMessage) {
            return res.status(400).json({ error: "Empty message" });
        }

        // 1. الحصول على المحرك (Runner + 7 Files)
        const runner = await getRunner();

        // 2. التدريب الصامت (Background Evolution)
        // نقوم بتحديث الأوزان بناءً على بيانات الـ dataset
        const trainData = getTrainingData(512);
        await runner.runTrainingStep(trainData);

        // 3. معالجة رسالة المستخدم (Inference)
        // نحول طول الرسالة أو محتواها لبيانات رقمية بسيطة للتجربة
        const inputData = new Float32Array(512).fill(rawMessage.length / 100);
        const output = await runner.runInference(inputData);

        // 4. الرد النهائي
        return res.status(200).json({
            reply: `تمت معالجة النص [${rawMessage.length}] بنجاح عبر نظام الـ Graph Compiler.`,
            engine_status: output.status,
            gpu_sample: Array.from(output.data), // تحويل الـ TypedArray لمصفوفة عادية للـ JSON
            userId: userId || "anonymous"
        });

    } catch (err) {
        console.error("🚨 Akasha Handler Error:", err);
        return res.status(500).json({ 
            error: "فشل النظام في دمج ملفات src/core/",
            details: err.message 
        });
    }
}
