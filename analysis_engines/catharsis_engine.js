
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v3.0 - The Soulful Response Architect
 * وظيفته: هندسة الردود البشرية، إدارة الأزمات، ودمج الحمض النووي العاطفي.
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine] جاري تشغيل مهندس الردود الذكي...", "color: #4CAF50; font-weight: bold;");

        // 1. ربط الموارد المركزية
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.dynamics = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.patterns = dictionaries.PATTERNS || {}; // القاموس التاسع
        this.protocols = protocols || {};
        this.memory = memorySystem;

        // 2. إعداد مشغل الـ DNA
        if (this.generative.ResponseOrchestrator) {
            const Orchestrator = this.generative.ResponseOrchestrator;
            this.orchestrator = new Orchestrator({
                dnaLibrary: this.generative.EMOTIONAL_DNA,
                lexicalPools: this.generative.LEXICAL_POOLS,
                memory: this.memory
            });
        }

        console.log("✅ [CatharsisEngine] المحرك جاهز للرد بوعي سياقي كامل.");
    }

    /**
     * الوظيفة الرئيسية: توليد رد "متعدد الطبقات"
     */
    async generateResponse(insight) {
        console.log("\n" + "%c[Response Architecture] STARTING...".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");
        
        try {
            // 1. فحص الأمان والأزمات (Safety First)
            const crisis = this._performCrisisCheck(insight);
            if (crisis.isCrisis) {
                console.log("   🚨 [Action]: تفعيل بروتوكول التدخل العاجل.");
                return this._generateCrisisPayload(crisis);
            }

            // 2. تحديد الحالة الديناميكية (Dynamics Detection)
            console.log("   🔸 [Step 2: Dynamics] البحث عن الحالة المركبة...");
            const compositeState = this._detectCompositeState(insight.emotionProfile);

            // 3. صياغة النية العاطفية (Intent Selection)
            console.log("   🔸 [Step 3: Intent] تحديد الهدف من الرد...");
            const intent = this._determineIntent(insight, compositeState);

            // 4. مزج الـ DNA (Styling)
            console.log("   🔸 [Step 4: DNA] تركيب نبرة الصوت الموزونة...");
            const dnaMix = this._blendDNA(insight, compositeState);

            // 5. بناء طبقات الرد (Layering)
            console.log("   🔸 [Step 5: Construction] تجميع طبقات الرد النهائي...");
            const responseText = this._buildLayeredResponse(insight, compositeState, dnaMix);

            console.log(`✅ [Catharsis Complete] Intent: ${intent} | DNA: ${dnaMix.name}`);

            return {
                responseText,
                intent,
                emotionalDNA: dnaMix,
                metadata: {
                    state: compositeState?.name || "stable",
                    intensity: insight.emotionProfile.intensity.overall,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (err) {
            console.error("❌ [CatharsisEngine] Error during generation:", err);
            return { responseText: "أنا هنا معك، أسمعك بكل جوارحي. كمل حكيك." };
        }
    }

    /**
     * نظام كشف الأزمات المعتمد على الكلمات والشدة
     */
    _performCrisisCheck(insight) {
        const text = normalizeArabic(insight.rawText);
        const intensity = insight.emotionProfile.intensity.overall;
        
        // كلمات الخطر القصوى
        const dangerWords = ['انتحار', 'قتل', 'اذي نفسي', 'اموت', 'نهاية حياتي'];
        const hasDanger = dangerWords.some(w => text.includes(w));

        const isCrisis = hasDanger || (intensity > 0.92 && insight.emotionProfile.primaryEmotion.name === 'sadness');
        
        if (isCrisis) {
            console.log(`   ⚠️ [Crisis Found]: Intensity: ${intensity}, DangerWord: ${hasDanger}`);
        }
        
        return { isCrisis, level: isCrisis ? 2 : 0 };
    }

    /**
     * استخدام القاموس الرابع لاكتشاف حالات مثل (الاحتراق النفسي / اليأس)
     */
    _detectCompositeState(emotionProfile) {
        const detectedKeys = Object.keys(emotionProfile.detectedEmotions || {});
        
        for (const [key, state] of Object.entries(this.dynamics)) {
            const matches = state.core_emotions.filter(e => detectedKeys.includes(e));
            // إذا كان هناك تطابق في المشاعر الأساسية للحالة المركبة
            if (matches.length >= 2 || (matches.length >= 1 && emotionProfile.intensity.overall > 0.8)) {
                console.log(`      🧩 [Detected State]: ${state.name}`);
                return state;
            }
        }
        return null;
    }

    /**
     * تحديد نية الرد بناءً على نتائج التحليل السابقة
     */
    _determineIntent(insight, composite) {
        if (composite) return "validation_and_insight";
        if (insight.synthesisProfile.dominantPattern) return "pattern_intervention";
        if (insight.emotionProfile.intensity.overall > 0.8) return "grounding";
        return "exploratory";
    }

    /**
     * استخدام القاموس الخامس لمزج نبرة الرد
     */
    _blendDNA(insight, composite) {
        const dna = this.generative.EMOTIONAL_DNA || {};
        const primary = insight.emotionProfile.primaryEmotion.name;

        if (primary === 'sadness' || primary === 'hopelessness') return dna.tender;
        if (primary === 'anxiety') return dna.grounding || dna.dynamic;
        if (insight.synthesisProfile.dominantPattern) return dna.grounded;
        
        return dna.dynamic;
    }

    /**
     * بناء الرد "الساندوتش": (تعاطف + تحليل + فعل)
     */
    _buildLayeredResponse(insight, composite, dna) {
        const layers = [];

        // الطبقة 1: الافتتاحية التعاطفية (من قاموس الديناميكيات)
        const intro = composite ? composite.dialogue_prompt : "أنا حاسس بيك وسامع ثقل كلامك.";
        layers.push(intro);

        // الطبقة 2: التحليل المعرفي (من قاموس الأنماط التاسع)
        if (insight.synthesisProfile.dominantPattern) {
            const pattern = insight.synthesisProfile.dominantPattern;
            layers.push(`ملاحظة بسيطة: ${pattern.therapeutic_insight}`);
        } else if (insight.synthesisProfile.cognitiveHypotheses?.length > 0) {
            layers.push(insight.synthesisProfile.cognitiveHypotheses[0].statement);
        }

        // الطبقة 3: تمرين أو فعل (من قاموس الأنماط)
        if (insight.synthesisProfile.dominantPattern?.immediate_actions) {
            const action = sample(insight.synthesisProfile.dominantPattern.immediate_actions);
            layers.push(`إيه رأيك نجرب حاجة صغيرة؟ ${action}`);
        }

        // الطبقة 4: الخاتمة الحنونة
        layers.push("أنا معاك، كمل حكيك، حابب أسمع أكتر.");

        return layers.join(' ');
    }

    _generateCrisisPayload(crisis) {
        return {
            responseText: "أنا مهتم جداً بسلامتك. اللي بتمر بيه صعب ومحتاج دعم متخصص. أرجوك تواصل مع الخط الساخن للدعم النفسي أو كلم شخص بتثق فيه فوراً. أنا هنا عشان أسمعك، بس سلامتك هي الأهم دلوقتي.",
            intent: "crisis_intervention",
            crisisLevel: 2
        };
    }
}

export default CatharsisEngine;
