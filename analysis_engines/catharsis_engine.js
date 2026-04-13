
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v3.1 - The Soulful Response Architect (VAD Compatible)
 * وظيفته: هندسة الردود بناءً على إحداثيات الحالة النفسية والأنماط المكتشفة.
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v3.1] جاري تشغيل مهندس الردود الذكي...", "color: #4CAF50; font-weight: bold;");

        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.dynamics = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.patterns = dictionaries.PATTERNS || {}; 
        this.protocols = protocols || {};
        this.memory = memorySystem;

        // إعداد مشغل الـ DNA من القاموس الخامس
        if (this.generative.ResponseOrchestrator) {
            const Orchestrator = this.generative.ResponseOrchestrator;
            this.orchestrator = new Orchestrator({
                dnaLibrary: this.generative.EMOTIONAL_DNA,
                lexicalPools: this.generative.LEXICAL_POOLS,
                memory: this.memory
            });
        }

        console.log("✅ [CatharsisEngine] المحرك متصل بنظام الـ VAD وجاهز للعمل.");
    }

    /**
     * الوظيفة الرئيسية: توليد الرد النهائي
     */
    async generateResponse(insight) {
        console.log("\n" + "%c[Response Construction] START".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");
        
        try {
            if (!insight || !insight.emotionProfile) throw new Error("بيانات التحليل (Insight) غير مكتملة.");

            const { emotionProfile, synthesisProfile, rawText } = insight;
            const primaryLabel = emotionProfile.primaryEmotion.name;
            const intensity = emotionProfile.intensity.overall;

            // 1. فحص الأمان (Crisis Check) باستخدام ملصقات VAD
            const crisis = this._performCrisisCheck(primaryLabel, intensity, rawText);
            if (crisis.isCrisis) {
                console.log("   🚨 [Crisis]: تم رصد حالة طارئة، تفعيل بروتوكول الإنقاذ.");
                return this._generateCrisisPayload();
            }

            // 2. تحديد الحالة الديناميكية (Dynamics)
            console.log("   🔸 [Step 2: Dynamics] تحليل الحالة المركبة...");
            const compositeState = this._detectCompositeState(emotionProfile);

            // 3. اختيار النية (Intent) بناءً على Label الـ VAD
            console.log("   🔸 [Step 3: Intent] تحديد الهدف من الرد...");
            const intent = this._determineIntent(primaryLabel, synthesisProfile);

            // 4. مزج الـ DNA العاطفي
            console.log("   🔸 [Step 4: DNA Mixing] اختيار نبرة الصوت...");
            const dnaMix = this._blendDNA(primaryLabel, intensity);

            // 5. بناء الرد النهائي "الساندوتش"
            console.log("   🔸 [Step 5: Synthesis] تجميع طبقات الرد...");
            const responseText = this._buildLayeredResponse(insight, compositeState, dnaMix);

            console.log(`✅ [Response Ready] Label: ${primaryLabel} | Intent: ${intent}`);

            return {
                responseText,
                intent,
                emotionalDNA: dnaMix,
                metadata: {
                    vadLabel: primaryLabel,
                    compositeState: compositeState?.name,
                    intensity: intensity
                }
            };

        } catch (err) {
            console.error("❌ [CatharsisEngine] Critical Error:", err);
            return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك بكل اهتمام." };
        }
    }

    /**
     * فحص الأزمات بناءً على بصمة الـ VAD والكلمات
     */
    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'قتل', 'اذي نفسي', 'اموت', 'نهاية حياتي'];
        const hasDangerWord = dangerWords.some(w => normalizeArabic(text).includes(w));
        
        // الخطر = كلمة خطر OR (شدة > 0.9 + حالة اكتئاب أو عجز)
        const isCriticalState = label.includes('depression') || label.includes('helplessness');
        const isCrisis = hasDangerWord || (intensity > 0.92 && isCriticalState);
        
        return { isCrisis };
    }

    /**
     * البحث في القاموس الرابع باستخدام المشاعر المكتشفة في VAD
     */
    _detectCompositeState(emotionProfile) {
        const detectedKeys = Object.keys(emotionProfile.detectedEmotions || {});
        
        for (const [key, state] of Object.entries(this.dynamics)) {
            const matches = state.core_emotions.filter(e => detectedKeys.includes(e));
            // تطابق إذا وجدنا مشاعر الحالة أو إذا كان الـ Label يحتوي على اسم الحالة
            if (matches.length >= 1 && emotionProfile.intensity.overall > 0.6) {
                console.log(`      🧩 [Dynamics Found]: ${state.name}`);
                return state;
            }
        }
        return null;
    }

    _determineIntent(label, synthesis) {
        if (label.includes('helplessness')) return "empowerment";
        if (label.includes('depression')) return "validation_and_support";
        if (synthesis.dominantPattern) return "pattern_intervention";
        return "empathy";
    }

    _blendDNA(label, intensity) {
        const dna = this.generative.EMOTIONAL_DNA || {};
        
        // اختيار الـ DNA بناءً على محتوى الـ Label
        if (label.includes('depression') || label.includes('sadness')) return dna.tender || dna.poetic;
        if (label.includes('distress')) return dna.grounded;
        if (intensity > 0.8) return dna.tender;

        return dna.dynamic;
    }

    /**
     * بناء الرد النهائي باستخدام القواميس
     */
    _buildLayeredResponse(insight, composite, dna) {
        const layers = [];

        // 1. الافتتاحية (من الحالة المركبة أو افتراضية)
        const intro = composite ? composite.dialogue_prompt : "أنا سامعك، وحاسس بتقل المشاعر اللي بتوصفها.";
        layers.push(intro);

        // 2. التحليل (من النمط المكتشف أو فرضية دلالية)
        if (insight.synthesisProfile?.dominantPattern) {
            layers.push(`ملاحظة بسيطة: ${insight.synthesisProfile.dominantPattern.therapeutic_insight}`);
        } else if (insight.emotionProfile.primaryEmotion.name.includes('helplessness')) {
            layers.push("الإحساس بالعجز ده جزء من محاولة عقلك إنه يحميك، مش علامة فشل.");
        }

        // 3. الفعل (من النمط)
        if (insight.synthesisProfile?.dominantPattern?.immediate_actions) {
            const action = sample(insight.synthesisProfile.dominantPattern.immediate_actions);
            layers.push(`إيه رأيك نجرب حاجة صغيرة دلوقتي؟ ${action}`);
        }

        // 4. الخاتمة
        layers.push("أنا موجود هنا جنبك، كمل حكيك لو حابب.");

        return layers.join(' ');
    }

    _generateCrisisPayload() {
        return {
            responseText: "أنا مهتم جداً بسلامتك. اللي بتمر بيه محتاج دعم متخصص وفوري. أرجوك تواصل مع شخص بتثق فيه أو كلم الخط الساخن للدعم النفسي. أنا هنا عشان أسمعك، بس سلامتك هي أهم حاجة دلوقتي.",
            intent: "crisis_intervention"
        };
    }
}

export default CatharsisEngine;
