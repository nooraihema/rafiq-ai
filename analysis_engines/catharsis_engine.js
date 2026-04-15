
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v5.0 - The Narrative Alchemist (Unified Workspace Edition)
 * وظيفته: هندسة الرد النهائي بدمج (الاستدلال الاستراتيجي + التحليل الأسلوبي + المراجع السريرية).
 * التغيير الجوهري: تحليل نبرة المستخدم لضبط "بلاغة" الرد وضمان الرنين العاطفي.
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v5.0] تهيئة محرك البلاغة السريرية الموحد...", "color: #4CAF50; font-weight: bold;");

        // 1. فك تغليف القواميس لضمان الوصول للبيانات
        const dynModule = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.dynamics = dynModule.EMOTIONAL_DYNAMICS || dynModule.default?.EMOTIONAL_DYNAMICS || dynModule;
        
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.patterns = dictionaries.PATTERNS || {}; 
        this.memory = memorySystem;

        console.log("✅ [CatharsisEngine] جاهز لصياغة ردود منسوجة بذكاء أسلوبي.");
    }

    /**
     * الوظيفة الرئيسية: هندسة الرد المنسوج (The Woven Response)
     */
    async generateResponse(workspace) {
        console.log("\n" + "%c[Narrative Alchemy] STARTING FINAL SYNTHESIS...".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");
        
        try {
            if (!workspace || !workspace.emotion || !workspace.semantic) {
                throw new Error("بيانات الفضاء الموحد غير مكتملة.");
            }

            const { emotion, semantic, synthesis, reasoning, clinicalInsights, rawText } = workspace;
            const primaryLabel = emotion.primaryEmotion.name || "neutral";
            const intensity = emotion.intensity?.overall || 0.5;

            // 1. فحص الأمان (Crisis Check)
            const isCrisis = this._performCrisisCheck(primaryLabel, intensity, rawText || "");
            if (isCrisis) return this._generateCrisisPayload();

            // 2. التحليل الأسلوبي للمستخدم (Verbal Style Analysis) 🔥 NEW
            const userStyle = this._analyzeUserVerbalStyle(workspace);
            console.log(`   🔸 [Style Intelligence]: تم رصد نمط لغوي [${userStyle}]`);

            // 3. تحليل الحالة المركبة (Dynamics)
            const compositeState = this._detectCompositeState(workspace);

            // 4. تحديد النية والـ DNA (بناءً على قرار الاستدلال)
            const intent = reasoning?.masterIntent?.type || "empathy";
            const dnaMix = this._selectDNA(primaryLabel, intensity, reasoning, userStyle);

            // 5. الخيمياء اللغوية: بناء الرد المنسوج
            console.log("   🔸 [Step 5: Weaving] جاري دمج المراجع في نسيج تعاطفي...");
            const responseText = this._weaveResponseText(workspace, compositeState, userStyle);

            console.log(`✅ [Alchemy Success] Style: ${userStyle} | Intent: ${intent}`);

            return {
                responseText,
                intent,
                emotionalDNA: dnaMix,
                metadata: {
                    userStyle,
                    vadLabel: primaryLabel,
                    clinicalImpact: clinicalInsights?.length || 0,
                    dnaName: dnaMix.name
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

    /**
     * ذكاء اصطناعي أسلوبي: يحدد كيف يكتب المستخدم لكي نرد بنفس مستواه
     */
    _analyzeUserVerbalStyle(workspace) {
        const wordCount = workspace.state.wordCount || 0;
        const selfFocus = workspace.state.dominantConcept === "self_blame" || (workspace.semantic?.concepts?.self_focus?.impact > 1);
        
        if (wordCount > 12) return "EXPRESSIVE_DEEP"; // مستخدم مفصل
        if (selfFocus) return "INTROSPECTIVE";       // مستخدم منغلق على ذاته
        return "CONCISE_DIRECT";                      // مستخدم مختصر
    }

    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'أقتل نفسي', 'أنهي حياتي', 'أذي نفسي'];
        const hasDangerWord = dangerWords.some(w => normalizeArabic(text).includes(w));
        return hasDangerWord || (intensity > 0.96 && label.includes('depression'));
    }

    _detectCompositeState(workspace) {
        const detectedMap = workspace.emotion.detectedEmotions || {};
        if (Object.keys(detectedMap).length === 0) return null;

        for (const [key, state] of Object.entries(this.dynamics)) {
            if (state && Array.isArray(state.core_emotions)) {
                const matchCount = state.core_emotions.filter(e => detectedMap[e]).length;
                if (matchCount >= 1 && workspace.emotion.intensity?.overall > 0.6) {
                    return state;
                }
            }
        }
        return null;
    }

    _selectDNA(label, intensity, reasoning, style) {
        const dna = this.generative.EMOTIONAL_DNA || { dynamic: { name: "dynamic" } };
        
        // إذا كان المستخدم مفصل وعميق، نستخدم الـ DNA الشاعري
        if (style === "EXPRESSIVE_DEEP") return dna.poetic || dna.tender;
        
        // إذا كان القرار الاستراتيجي هو التنشيط
        if (reasoning?.masterIntent?.type === "GENTLE_ACTIVATION") return dna.grounded;
        
        if (label.includes('depression') || intensity > 0.8) return dna.tender;
        return dna.dynamic;
    }

    /**
     * قلب المحرك: نسج الرد من 4 طبقات بأسلوب بلاغي
     */
    _weaveResponseText(workspace, composite, style) {
        const { clinicalInsights, synthesis, emotion } = workspace;
        const layers = [];

        // 1. طبقة الاحتواء (Opening)
        const introPool = (composite && composite.dialogue_prompt) 
            ? [composite.dialogue_prompt] 
            : [
                "أنا حاسس بتقل الكلام اللي بتقوله، ومقدر جداً إنك قدرت توصفه.",
                "كلامك واصل لقلبي، وحاسس بمدى صعوبة اللحظة دي عليك.",
                "أنا سامعك، وشايف الوجع اللي بين السطور في كلامك."
            ];
        layers.push(sample(introPool));

        // 2. طبقة الخيمياء السريرية (Clinical Weaving)
        if (clinicalInsights && clinicalInsights.length > 0) {
            const mainRef = clinicalInsights[0];
            // بدلاً من لغة جافة، نستخدم لغة دافئة ومسندة
            let factText = `عارف، في مراجع النفس (زي ${mainRef.source})، بنتعلم إن ${mainRef.clinical_fact}`;
            
            // إذا كان المستخدم "عميق"، نضيف له منطق إعادة التأطير (Reframing)
            if (style !== "CONCISE_DIRECT") {
                factText += ` وده معناه إن اللي بتحسه ده هو محاولة من عقلك عشان يحميك.`;
            }
            layers.push(factText);
        } else {
            // بصيرة مستنتجة لو مفيش مراجع
            if (emotion.primaryEmotion.name.includes('depression')) {
                layers.push("أحياناً العقل بيختار 'الجمود' كحيلة أخيرة عشان يفصلنا عن ألم مش قادرين نتحمله.");
            }
        }

        // 3. طبقة التوجيه الاستراتيجي (Strategic Action)
        if (clinicalInsights && clinicalInsights.length > 0) {
            layers.push(`إيه رأيك نكسر الحالة دي بحاجة بسيطة جداً؟ ${clinicalInsights[0].action_step}`);
        } else if (synthesis?.dominantPattern?.immediate_actions) {
            layers.push(`ممكن نجرب خطوة مجهرية سوا: ${sample(synthesis.dominantPattern.immediate_actions)}`);
        }

        // 4. طبقة الخاتمة (Closing)
        const closures = [
            "أنا موجود هنا، مش هسيبك لوحدك في ده.",
            "كمل حكيك، أنا هنا بسمعك بكل هدوء.",
            "إحنا سوا في الرحلة دي، احكي لي أكتر لو حابب."
        ];
        layers.push(sample(closures));

        // دمج الطبقات مع مراعاة أسلوب المستخدم (طول الرد)
        return style === "CONCISE_DIRECT" 
            ? layers.slice(0, 3).join(' ') // رد أسرع للمستخدم المختصر
            : layers.join(' ');           // رد كامل للمستخدم العميق
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
