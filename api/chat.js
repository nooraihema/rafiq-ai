/**
 * api/chat.js
 * تم التعديل لإلغاء خاصية الـ Strict Error ومنح فرصة للـ CPU Fallback
 */

import { AkashaRunner } from '../src/core/akasharunner.js';

let runnerInstance = null;

async function getRunner() {
    if (runnerInstance) return runnerInstance;

    let device = null;
    try {
        // بنحاول نشوف في GPU ولا لا، بس مش هنوقف الكود لو مفيش
        if (typeof navigator !== 'undefined' && navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                device = await adapter.requestDevice();
                console.log("🌌 [GPU]: Hardware acceleration initialized.");
            }
        }
    } catch (err) {
        console.log("⚠️ [SYSTEM]: WebGPU not found, switching to CPU Mode.");
    }

    // هنا السر: بنبعت الـ device سواء كان موجود أو null
    // والـ WebGPUBackend اللي عدلناه هيتصرف
    runnerInstance = new AkashaRunner(device);
    return runnerInstance;
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { message } = req.body;
        
        // 1. الحصول على الـ Runner (دلوقتي مش هيضرب Error)
        const runner = await getRunner();

        // 2. تشغيل المحرك (هينفذ CPU لو إنت على Vercel، وهينفذ GPU لو إنت على الموبايل)
        const inputData = new Float32Array(512).fill((message || "").length / 100);
        const output = await runner.runInference(inputData);

        return res.status(200).json({
            reply: "تم تشغيل المحرك بنجاح (وضع الهجين نشط).",
            mode: runner.engine.backend.device ? "GPU" : "CPU Fallback",
            sample: Array.from(output.data || [0])
        });

    } catch (err) {
        console.error("🚨 Critical Failure:", err);
        return res.status(500).json({ 
            error: "فشل المحرك في العمل حتى في وضع CPU",
            details: err.message 
        });
    }
}
