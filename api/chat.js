/**
 * api/chat.js
 * 
 * المشغل الرئيسي لنواة أكاشا - نسخة الـ Graph Compiler v1.0
 * وظيفته: الربط بين واجهة المستخدم، محرك الـ GPU، وعملية التدريب التلقائي.
 */

import { AkashaEngine } from '../core/akashaengine.js';
import { Tensor } from '../core/tensor.js';
import { AkashaBrain } from '../core/brain.js';
import fs from 'fs';
import path from 'path';

// متغيرات الحالة (State) - ثابتة طوال فترة تشغيل السيرفر
let engineInstance = null;
let brainInstance = null;
let datasetContent = null;

/**
 * دالة تهيئة الهاردوير (Initialize WebGPU)
 * لازم نتأكد إن الـ GPU متاح قبل أي عملية حسابية
 */
async function initHardware() {
    if (engineInstance) return;

    // في بيئة المتصفح نستخدم navigator.gpu، وفي Node نستخدم مكتبات مثل gpu.js أو wgpu-native
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    
    // إنشاء المحرك (المايسترو) وإرسال الـ device له
    engineInstance = new AkashaEngine(device);
    
    // إنشاء المخ (Brain) وربطه بالمحرك
    brainInstance = new AkashaBrain(engineInstance);
    
    console.log("🌌 [HARDWARE]: WebGPU Initialized - Akasha Engine Armed.");
}

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
        console.log("⚠️ [DATASET]: Could not read dataset.");
    }
    return null;
}

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { message, userId } = req.body;
        const rawMessage = (message || "").trim();

        if (!rawMessage) return res.status(400).json({ error: "No message provided" });

        // 1. التأكد من جاهزية المحرك والـ GPU
        await initHardware();

        // --- [ دورة التدريب الذكي بالكومبايلر ] ---
        const trainingChunk = getRandomChunk(128); 
        if (trainingChunk) {
            console.time("🔥 TrainingSync");
            
            // هنا الـ Brain هيعمل Trace لعمليات الـ Backpropagation 
            // والـ Engine هيدمجهم (Fuse) ويشغلهم في خبطة واحدة على كارت الشاشة
            await brainInstance.train(trainingChunk);
            
            console.timeEnd("🔥 TrainingSync");
        }
        // ----------------------------------------

        // 2. معالجة رسالة المستخدم (Inference)
        // الـ process الآن بتعتمد على الـ Graph Compiler لإنتاج الرد
        const result = await brainInstance.process(rawMessage, userId);

        // 3. الرد النهائي
        return res.status(200).json({
            reply: result.text,
            userId: userId || "anonymous",
            engineStatus: "fused_execution_active",
            performance: "optimized_by_graph_compiler"
        });

    } catch (err) {
        console.error("🚨 Akasha Engine Runtime Error:", err);
        return res.status(500).json({ 
            error: "النواة تعاني من تداخل في الـ Graph Execution",
            details: err.message 
        });
    }
}
