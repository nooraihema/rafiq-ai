
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v5.1 - The Narrative Alchemist (Sovereign Edition)
 * التحديث: دمج ذكي للمراجع السريرية دون ذكر المصادر، مع أنسنة كاملة للمعلومات العلمية.
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v5.1] تهيئة محرك البلاغة السريرية الموحد...", "color: #4CAF50; font-weight: bold;");

        const dynModule = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.dynamics = dynModule.EMOTIONAL_DYNAMICS || dynModule.default?.EMOTIONAL_DYNAMICS || dynModule;
        
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.patterns = dictionaries.PATTERNS || {}; 
        this.memory = memorySystem;

        console.log("✅ [CatharsisEngine] نظام الأنسنة والدمج السريري مفعل.");
    }

    async generateResponse(workspace) {
        try {
            if (!workspace || !workspace.emotion || !workspace.semantic) {
                throw new Error("بيانات الفضاء الموحد غير مكتملة.");
            }

            const { emotion, clinicalInsights, rawText } = workspace;
            const primaryLabel = emotion.primaryEmotion.name || "neutral";
            const intensity = emotion.intensity?.overall || 0.5;

            // 1. فحص الأمان
            if (this._performCrisisCheck(primaryLabel, intensity, rawText || "")) {
                return this._generateCrisisPayload();
            }

            // 2. تحليل نمط المستخدم
            const userStyle = this._analyzeUserVerbalStyle(workspace);

            // 3. تحليل الحالة المركبة
            const compositeState = this._detectCompositeState(workspace);

            // 4. تحديد النية والـ DNA
            const reasoning = workspace.reasoning;
            const dnaMix = this._selectDNA(primaryLabel, intensity, reasoning, userStyle);

            // 5. الخيمياء اللغوية (بناء الرد المنسوج)
            const responseText = this._weaveResponseText(workspace, compositeState, userStyle);

            return {
                responseText,
                intent: reasoning?.masterIntent?.type || "EMPATHETIC_LISTENING",
                emotionalDNA: dnaMix,
                metadata: {
                    userStyle,
                    clinicalImpact: clinicalInsights?.length || 0
                }
            };

        } catch (err) {
            console.error("❌ [CatharsisEngine Error]:", err);
            return { 
                responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك بكل اهتمام.",
                intent: "fallback",
                emotionalDNA: { name: "tender" }
            };
        }
    }

    _analyzeUserVerbalStyle(workspace) {
        const wordCount = workspace.state?.wordCount || 0;
        const selfFocus = workspace.semantic?.concepts?.self_focus?.impact > 1.5;
        
        if (wordCount > 15) return "EXPRESSIVE_DEEP";
        if (selfFocus) return "INTROSPECTIVE";
        return "CONCISE_DIRECT";
    }

    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'أقتل نفسي', 'أنهي حياتي', 'أذي نفسي', 'موت'];
        const normalized = normalizeArabic(text);
        return dangerWords.some(w => normalized.includes(w)) || (intensity > 0.98 && label.includes('depression'));
    }

    _detectCompositeState(workspace) {
        const detectedMap = workspace.emotion.detectedEmotions || {};
        for (const [key, state] of Object.entries(this.dynamics)) {
            if (state && Array.isArray(state.core_emotions)) {
                if (state.core_emotions.some(e => detectedMap[e])) return state;
            }
        }
        return null;
    }

    _selectDNA(label, intensity, reasoning, style) {
        const dna = this.generative.EMOTIONAL_DNA || { dynamic: { name: "dynamic" } };
        if (style === "EXPRESSIVE_DEEP") return dna.poetic || dna.tender;
        if (reasoning?.masterIntent?.type === "GENTLE_ACTIVATION") return dna.grounded;
        return (label.includes('depression') || intensity > 0.7) ? dna.tender : dna.dynamic;
    }

    /**
     * الطبقة الجوهرية: نسج النص دون "برودة" أكاديمية
     */
    _weaveResponseText(workspace, composite, style) {
        const { clinicalInsights, emotion, semantic } = workspace;
        const layers = [];

        // 1. طبقة الاحتواء (الافتتاحية) - تم حذف الهلوسة بالذكريات
        const introPool = [
            "أنا سامعك وحاسس بكل كلمة بتقولها، الكلام ده تقيل ومحتاج شجاعة عشان يتقال.",
            "مقدر جداً إنك بتشاركني اللي بتمور بيه دلوقتي، أنا هنا معاك وبكل اهتمام.",
            "واضح إنك شايل كتير في قلبك، ومهم تعرف إنك مش لوحدك في الإحساس ده."
        ];
        layers.push(sample(introPool));

        // 2. طبقة الدمج السريري (Clinical Humanization) - التعديل الجوهري هنا
        if (clinicalInsights && clinicalInsights.length > 0) {
            const insight = clinicalInsights[0];
            
            // تحويل "الحقيقة العلمية" إلى "دردشة ودودة"
            const bridge = sample([
                "عارف.. الحقيقة إن اللي بتمر بيه ده ليه تفسير بيطمن شوية، ",
                "أوقات عقلنا بيتعامل مع الضغط بطريقة معينة، العلم بيقول إن ",
                "مهم تعرف إن اللي بتحسه ده مش عيب فيك، ده رد فعل طبيعي لأن "
            ]);

            // دمج منطق إعادة التأطير (Reframing) بدلاً من الحقيقة الجافة فقط
            const humanizedFact = insight.reframing_logic || insight.clinical_fact;
            layers.push(`${bridge}${humanizedFact}`);
        } else {
            // بصيرة مشاعرية إذا لم يتوفر مرجع
            if (emotion.primaryEmotion.name.includes('depression')) {
                layers.push("أوقات بنحس إن طاقتنا خلصت تماماً، وده بيكون إشارة من جسمنا إنه محتاج يهدى بعيد عن الضغط.");
            }
        }

        // 3. طبقة التوجيه (The Action Step)
        if (clinicalInsights && clinicalInsights.length > 0) {
            const actionBridge = sample([
                "إيه رأيك نجرب حاجة مجهرية سوا؟ ",
                "ممكن نكسر الحالة دي بخطوة بسيطة جداً: ",
                "لو عندك طاقة بسيطة، ممكن نجرب ده: "
            ]);
            layers.push(`${actionBridge}${clinicalInsights[0].action_step}`);
        }

        // 4. طبقة الخاتمة
        const closures = [
            "أنا موجود هنا لو حابب تحكي أكتر..",
            "خد وقتك تماماً، أنا بسمعك.",
            "إحنا سوا، كمل كلامك لو ده هيريحك."
        ];
        layers.push(sample(closures));

        // التحكم في طول الرد بناءً على نمط المستخدم
        if (style === "CONCISE_DIRECT") {
            // للمستخدم المختصر: ندمج الطبقات بشكل أكثر تكثيفاً
            return `${layers[0]} ${layers[1]} ${layers[2]}`;
        }

        return layers.join('\n\n');
    }

    _generateCrisisPayload() {
        return {
            responseText: "أنا قلقان عليك جداً وسلامتك هي أهم حاجة عندي دلوقتي. اللي بتمر بيه محتاج دعم متخصص وفوري. أرجوك تواصل مع الخط الساخن للدعم النفسي أو كلم شخص بتثق فيه فوراً. أنا هنا عشان أسمعك، بس أرجوك اطلب المساعدة المتخصصة.",
            intent: "crisis_intervention",
            emotionalDNA: { name: "protective" }
        };
    }
}

export default CatharsisEngine;
