
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v3.3 - The Robust Soulful Responder
 * وظيفته: هندسة الردود البشرية بناءً على مخرجات الـ VAD والأنماط النفسية.
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v3.3] جاري تشغيل مهندس الردود الذكي...", "color: #4CAF50; font-weight: bold;");

        // 1. فك تغليف القواميس (Unwrapping) لضمان الوصول للبيانات الصحيحة
        const dynModule = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.dynamics = dynModule.EMOTIONAL_DYNAMICS || dynModule.default?.EMOTIONAL_DYNAMICS || dynModule;
        
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.patterns = dictionaries.PATTERNS || {}; 
        this.protocols = protocols || {};
        this.memory = memorySystem;

        // 2. إعداد مشغل الـ DNA من القاموس الخامس
        this.orchestrator = null;
        if (this.generative.ResponseOrchestrator) {
            const Orchestrator = this.generative.ResponseOrchestrator;
            this.orchestrator = new Orchestrator({
                dnaLibrary: this.generative.EMOTIONAL_DNA || {},
                lexicalPools: this.generative.LEXICAL_POOLS || {},
                memory: this.memory
            });
        }

        console.log("✅ [CatharsisEngine] صمامات الأمان نشطة ونظام الـ DNA جاهز.");
    }

    /**
     * الوظيفة الرئيسية: توليد الرد النهائي الموزون
     */
    async generateResponse(insight) {
        console.log("\n" + "%c[Response Architecture] START".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");
        
        try {
            // صمام أمان 1: التحقق من وجود البيانات الأساسية
            if (!insight || !insight.emotionProfile || !insight.emotionProfile.primaryEmotion) {
                console.warn("⚠️ [Catharsis]: بيانات Insight ناقصة، استخدام الرد الدفاعي.");
                return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك.", intent: "fallback" };
            }

            const { emotionProfile, synthesisProfile, rawText } = insight;
            const primaryLabel = emotionProfile.primaryEmotion.name || "neutral";
            const intensity = emotionProfile.intensity?.overall || 0.5;

            // 1. فحص الأزمات (Crisis Check)
            const crisis = this._performCrisisCheck(primaryLabel, intensity, rawText || "");
            if (crisis.isCrisis) {
                console.log("   🚨 [Crisis]: تفعيل بروتوكول التدخل العاجل.");
                return this._generateCrisisPayload();
            }

            // 2. تحليل الحالة المركبة (Dynamics)
            console.log("   🔸 [Step 2: Dynamics] جاري البحث في الحالات المركبة...");
            const compositeState = this._detectCompositeState(emotionProfile);

            // 3. اختيار النية (Intent)
            console.log("   🔸 [Step 3: Intent] تحديد نية الرد...");
            const intent = this._determineIntent(primaryLabel, synthesisProfile);

            // 4. اختيار الحمض النووي (DNA) للرد
            console.log("   🔸 [Step 4: DNA] تركيب نبرة الصوت...");
            const dnaMix = this._selectDNA(primaryLabel, intensity);

            // 5. بناء الرد النهائي "الساندوتش"
            console.log("   🔸 [Step 5: Construction] بناء الجمل النهائية...");
            const responseText = this._buildLayeredResponse(insight, compositeState);

            console.log(`✅ [Catharsis Success] Label: ${primaryLabel} | Intent: ${intent}`);

            return {
                responseText,
                intent,
                emotionalDNA: dnaMix, // يتم إرجاعه ككائن (Object)
                metadata: {
                    vadLabel: primaryLabel,
                    compositeState: compositeState?.name,
                    intensity: intensity,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (err) {
            console.error("❌ [CatharsisEngine Error]:", err);
            return { 
                responseText: "أنا هنا معاك، حاسس بقل اللي بتمر بيه.. كمل كلامك أنا سامعك بكل اهتمام.",
                intent: "fallback_empathy",
                emotionalDNA: { name: "default" }
            };
        }
    }

    /**
     * فحص الأزمات بناءً على الشدة والكلمات
     */
    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'قتل', 'اذي نفسي', 'اموت', 'نهاية حياتي'];
        const hasDangerWord = dangerWords.some(w => normalizeArabic(text).includes(w));
        // الخطر = كلمة خطر OR (شدة > 0.95 + حالة اكتئابية)
        const isCrisis = hasDangerWord || (intensity > 0.96 && label.includes('depression'));
        return { isCrisis };
    }

    /**
     * اكتشاف الحالة المركبة من قاموس الديناميكيات
     */
    _detectCompositeState(emotionProfile) {
        const detectedMap = emotionProfile.detectedEmotions || {};
        const detectedKeys = Object.keys(detectedMap);
        
        if (detectedKeys.length === 0) return null;

        // التحقق من أن dynamics عبارة عن كائن قابل للتكرار
        if (!this.dynamics || typeof this.dynamics !== 'object') return null;

        for (const [key, state] of Object.entries(this.dynamics)) {
            if (state && Array.isArray(state.core_emotions)) {
                // البحث عن أي مشاعر مشتركة بين ما تم اكتشافه وبين تعريف الحالة المركبة
                const matchCount = state.core_emotions.filter(e => detectedMap[e]).length;
                
                if (matchCount >= 1 && emotionProfile.intensity?.overall > 0.6) {
                    console.log(`      🧩 [Dynamics Found]: ${state.name}`);
                    return state;
                }
            }
        }
        return null;
    }

    /**
     * تحديد نية الرد بناءً على بؤرة التركيز
     */
    _determineIntent(label, synthesis) {
        if (label.includes('helplessness')) return "empowerment";
        if (label.includes('depression')) return "validation_and_support";
        if (synthesis && synthesis.dominantPattern) return "pattern_intervention";
        return "empathy";
    }

    /**
     * اختيار الـ DNA المناسب من القاموس الخامس
     */
    _selectDNA(label, intensity) {
        const dna = this.generative.EMOTIONAL_DNA || { dynamic: { name: "dynamic" } };
        
        if (label.includes('depression') || label.includes('sadness')) {
            return (intensity > 0.7) ? dna.tender : dna.poetic;
        }
        if (label.includes('distress')) return dna.grounded;
        
        return dna.dynamic;
    }

    /**
     * بناء الرد "الساندوتش": (افتتاحية + تحليل + فعل + خاتمة)
     */
    _buildLayeredResponse(insight, composite) {
        const layers = [];

        // 1. الافتتاحية (من الحالة المركبة أو افتراضية)
        const intro = (composite && composite.dialogue_prompt) 
            ? composite.dialogue_prompt 
            : "أنا سامعك، وحاسس بتقل المشاعر اللي بتوصفها.";
        layers.push(intro);

        // 2. البصيرة العلاجية (من النمط المكتشف)
        if (insight.synthesisProfile && insight.synthesisProfile.dominantPattern) {
            layers.push(`ملاحظة بسيطة: ${insight.synthesisProfile.dominantPattern.therapeutic_insight}`);
        } else if (insight.emotionProfile.primaryEmotion.name.includes('depression')) {
            layers.push("عقلك الآن بيحاول يحميك بأنه يفصلك عن الألم عشان ترتاح، وده اللي مسبب الإحساس بالجمود.");
        }

        // 3. الفعل المقترح (من النمط المكتشف)
        if (insight.synthesisProfile && insight.synthesisProfile.dominantPattern?.immediate_actions) {
            const action = sample(insight.synthesisProfile.dominantPattern.immediate_actions);
            layers.push(`إيه رأيك نجرب حاجة صغيرة دلوقتي؟ ${action}`);
        }

        // 4. الخاتمة
        layers.push("أنا موجود هنا جنبك، كمل حكيك لو حابب.");

        return layers.join(' ');
    }

    _generateCrisisPayload() {
        return {
            responseText: "أنا مهتم جداً بسلامتك. اللي بتمر بيه محتاج دعم متخصص وفوري. أرجوك تواصل مع شخص بتثق فيه أو كلم الخط الساخن للدعم النفسي. أنا هنا عشان أسمعك، بس سلامتك هي الأهم دلوقتي.",
            intent: "crisis_intervention",
            emotionalDNA: { name: "protective" }
        };
    }
}

export default CatharsisEngine;
