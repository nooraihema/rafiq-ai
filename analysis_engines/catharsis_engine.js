
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v3.2 - The Soulful Response Architect (Robust Edition)
 * نظام هندسة الردود المتوافق مع نموذج VAD مع نظام صمامات أمان لمنع الانهيار.
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v3.2] تهيئة محرك الردود الذكي...", "color: #4CAF50; font-weight: bold;");

        // 1. فك تغليف القواميس (Unwrapping) لضمان الوصول للبيانات الصحيحة
        const dynModule = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.dynamics = dynModule.EMOTIONAL_DYNAMICS || dynModule.default?.EMOTIONAL_DYNAMICS || dynModule;
        
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.patterns = dictionaries.PATTERNS || {}; 
        this.protocols = protocols || {};
        this.memory = memorySystem;

        // 2. إعداد مشغل الـ DNA
        this.orchestrator = null;
        if (this.generative.ResponseOrchestrator) {
            const Orchestrator = this.generative.ResponseOrchestrator;
            this.orchestrator = new Orchestrator({
                dnaLibrary: this.generative.EMOTIONAL_DNA || {},
                lexicalPools: this.generative.LEXICAL_POOLS || {},
                memory: this.memory
            });
        }

        console.log("✅ [CatharsisEngine] تم التحميل بنجاح وصمامات الأمان نشطة.");
    }

    /**
     * الوظيفة الرئيسية لتوليد الرد
     */
    async generateResponse(insight) {
        console.log("\n" + "%c[Response Construction] STARTING...".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");
        
        try {
            // صمام أمان 1: التحقق من وجود البيانات الأساسية
            if (!insight || !insight.emotionProfile || !insight.emotionProfile.primaryEmotion) {
                throw new Error("بيانات التحليل (Insight) مفقودة أو غير مكتملة.");
            }

            const { emotionProfile, synthesisProfile, rawText } = insight;
            const primaryLabel = emotionProfile.primaryEmotion.name || "neutral";
            const intensity = emotionProfile.intensity?.overall || 0.5;

            // 1. فحص الأزمات (Crisis Check)
            const crisis = this._performCrisisCheck(primaryLabel, intensity, rawText || "");
            if (crisis.isCrisis) {
                console.log("   🚨 [Crisis Detected]: تفعيل رد الطوارئ.");
                return this._generateCrisisPayload();
            }

            // 2. تحليل الحالة المركبة (Dynamics)
            console.log("   🔸 [Step 2: Dynamics] جاري البحث في الحالات المركبة...");
            const compositeState = this._detectCompositeState(emotionProfile);

            // 3. اختيار النية (Intent)
            console.log("   🔸 [Step 3: Intent] تحديد نية الرد...");
            const intent = this._determineIntent(primaryLabel, synthesisProfile);

            // 4. مزج الـ DNA العاطفي
            console.log("   🔸 [Step 4: DNA] تركيب نبرة الصوت...");
            const dnaMix = this._blendDNA(primaryLabel, intensity);

            // 5. بناء الرد الطبقي (Layered Response)
            console.log("   🔸 [Step 5: Construction] بناء الجمل النهائية...");
            const responseText = this._buildLayeredResponse(insight, compositeState, dnaMix);

            console.log(`✅ [Catharsis Success] Label: ${primaryLabel} | DNA: ${dnaMix?.name || 'Standard'}`);

            return {
                responseText,
                intent,
                emotionalDNA: dnaMix,
                metadata: {
                    vadLabel: primaryLabel,
                    compositeState: compositeState?.name,
                    intensity: intensity,
                    generatedAt: new Date().toISOString()
                }
            };

        } catch (err) {
            console.error("❌ [CatharsisEngine Error]:", err);
            // رد الطوارئ البرمجي لمنع توقف التطبيق
            return { 
                responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك بكل اهتمام.",
                intent: "fallback_empathy"
            };
        }
    }

    /**
     * فحص الأزمات
     */
    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'قتل', 'اذي نفسي', 'اموت', 'نهاية حياتي'];
        const hasDangerWord = dangerWords.some(w => text.includes(w));
        const isCrisis = hasDangerWord || (intensity > 0.95 && label.includes('depression'));
        return { isCrisis };
    }

    /**
     * دالة اكتشاف الحالة المركبة (تم إصلاحها لمنع TypeError)
     */
    _detectCompositeState(emotionProfile) {
        // الحصول على قائمة المشاعر المكتشفة من EmotionEngine v5.2
        const detectedMap = emotionProfile.detectedEmotions || {};
        const detectedKeys = Object.keys(detectedMap);
        
        if (detectedKeys.length === 0) return null;

        // التحقق من أن dynamics عبارة عن كائن قابل للتكرار
        if (!this.dynamics || typeof this.dynamics !== 'object') return null;

        for (const [key, state] of Object.entries(this.dynamics)) {
            // التأكد من أن الحالة تحتوي على مصفوفة مشاعر أساسية
            if (state && Array.isArray(state.core_emotions)) {
                const matchCount = state.core_emotions.filter(e => detectedMap[e]).length;
                
                // إذا وجدنا تطابقاً كافياً
                if (matchCount >= 1 && emotionProfile.intensity?.overall > 0.6) {
                    console.log(`      🧩 [Dynamics Found]: ${state.name}`);
                    return state;
                }
            }
        }
        return null;
    }

    _determineIntent(label, synthesis) {
        if (label.includes('helplessness')) return "empowerment";
        if (label.includes('depression')) return "validation_and_support";
        if (synthesis && synthesis.dominantPattern) return "pattern_intervention";
        return "empathy";
    }

    _blendDNA(label, intensity) {
        const dna = this.generative.EMOTIONAL_DNA || {};
        if (label.includes('depression') || label.includes('sadness')) return dna.tender || dna.poetic;
        return dna.dynamic;
    }

    /**
     * بناء الرد "الساندوتش"
     */
    _buildLayeredResponse(insight, composite, dna) {
        const layers = [];

        // 1. الافتتاحية
        const intro = (composite && composite.dialogue_prompt) 
            ? composite.dialogue_prompt 
            : "أنا سامعك، وحاسس بتقل المشاعر اللي بتوصفها.";
        layers.push(intro);

        // 2. التحليل (بصيرة علاجية)
        if (insight.synthesisProfile && insight.synthesisProfile.dominantPattern) {
            layers.push(`ملاحظة بسيطة: ${insight.synthesisProfile.dominantPattern.therapeutic_insight}`);
        } else if (insight.emotionProfile.primaryEmotion.name.includes('depression')) {
            layers.push("عقلك الآن بيحاول يحميك بأنه يفصلك عن الألم، وده اللي مسبب الإحساس بالجمود.");
        }

        // 3. الفعل والمقترح
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
            intent: "crisis_intervention"
        };
    }
}

export default CatharsisEngine;
