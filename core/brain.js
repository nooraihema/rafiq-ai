// /core/brain.js
export class MasterBrain {
    constructor(engines, memory) {
        this.engines = engines; // (Semantic, Emotion, Synthesis, etc.)
        this.memory = memory;   // UserMemoryGraph
    }

    async processMessage(rawText) {
        // 1. إنشاء "كائن الإدراك" (The Insight Object)
        // هذا هو الوعاء الذي سيمر على كل المحركات لتمتصه
        let insight = {
            raw: rawText,
            timestamp: Date.now(),
            analysis: {}, 
            decision: {},
            context: this.memory.getQuickContext() // جلب آخر 5 رسائل
        };

        // 2. طبقة الحواس (Preprocessing)
        const cleanText = normalizeArabic(rawText);

        // 3. التحليل المتوازي (Parallel Analysis)
        // هنا نجعل المحركات "تصب" نتائجها في الوعاء
        insight.analysis.emotions = this.engines.emotion.analyze(cleanText);
        insight.analysis.concepts = this.engines.semantic.analyze(cleanText);
        insight.analysis.intensity = this.engines.intensity.analyze(cleanText);

        // 4. طبقة الحكمة (The Logic Jump) - أهم خطوة احترافية
        // هنا "السينثسيز" يربط بين المشاعر والمفاهيم
        insight.decision.synthesis = this.engines.synthesis.analyze({
            semanticMap: insight.analysis.concepts,
            emotionProfile: insight.analysis.emotions
        });

        // 5. استدعاء الذاكرة العميقة (Deep Memory Inference)
        // هل هذا النمط تكرر؟ الاستنتاج يعمل هنا
        insight.decision.inference = await this.engines.inference.generateCognitiveProfile();

        // 6. اختيار "الغرفة العلاجية" (Protocol Selection)
        // بناءً على كل ما سبق، أي بروتوكول سنتبع؟
        const selectedProtocol = this._selectBestProtocol(insight);

        // 7. توليد الرد النهائي (Final Expression)
        const finalResponse = await this.engines.catharsis.generateResponse(insight, selectedProtocol);

        // 8. التخزين في الذاكرة (Memory Ingestion)
        this.memory.ingest(insight);

        return finalResponse;
    }

    _selectBestProtocol(insight) {
        // منطق احترافي: إذا كان هناك "عجز" + "حزن عالي" -> فعل بروتوكول الاكتئاب
        if (insight.decision.synthesis.dominantPattern?.id === "helplessness_loop") {
            return "depression_gateway_ultra_rich";
        }
        return "general_support";
    }
}
