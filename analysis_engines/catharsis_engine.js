
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v3.5 - The Encyclopedic & Strategic Architect
 * وظيفته: هندسة الرد النهائي بدمج (الاستدلال الاستراتيجي + المراجع الطبية + التعاطف الروحي).
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v3.5] تهيئة محرك الاستجابة الموسوعي...", "color: #4CAF50; font-weight: bold;");

        // 1. فك تغليف القواميس
        const dynModule = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.dynamics = dynModule.EMOTIONAL_DYNAMICS || dynModule.default?.EMOTIONAL_DYNAMICS || dynModule;
        
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.patterns = dictionaries.PATTERNS || {}; 
        this.memory = memorySystem;

        console.log("✅ [CatharsisEngine] جاهز لصياغة الردود العلمية الحنونة.");
    }

    /**
     * الوظيفة الرئيسية: توليد الرد "المتكامل"
     */
    async generateResponse(insight) {
        console.log("\n" + "%c[Response Engineering] STARTING...".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");
        
        try {
            if (!insight || !insight.emotionProfile) throw new Error("بيانات التحليل غير مكتملة.");

            const { emotionProfile, synthesisProfile, strategicInsight, clinicalInsights, rawText } = insight;
            const primaryLabel = emotionProfile.primaryEmotion.name || "neutral";
            const intensity = emotionProfile.intensity?.overall || 0.5;

            // 1. فحص الأمان (Crisis Check)
            const crisis = this._performCrisisCheck(primaryLabel, intensity, rawText || "");
            if (crisis.isCrisis) {
                console.log("   🚨 [Crisis]: تفعيل بروتوكول الإنقاذ الفوري.");
                return this._generateCrisisPayload();
            }

            // 2. تحليل الحالة المركبة (Dynamics)
            console.log("   🔸 [Step 2: Dynamics] البحث في عمق الحالة...");
            const compositeState = this._detectCompositeState(emotionProfile);

            // 3. تحديد النية (Intent) بناءً على قرار محرك الاستدلال
            console.log("   🔸 [Step 3: Strategy] استلام التوجه من محرك الاستدلال...");
            const intent = this._determineIntent(primaryLabel, synthesisProfile, strategicInsight);

            // 4. اختيار الحمض النووي (DNA) للرد
            console.log("   🔸 [Step 4: DNA] ضبط نبرة الصوت...");
            const dnaMix = this._selectDNA(primaryLabel, intensity, strategicInsight);

            // 5. بناء الرد "الساندوتش الموسوعي" (Layered Construction)
            console.log("   🔸 [Step 5: Construction] صياغة الرد من المراجع والمشاعر...");
            const responseText = this._buildEncyclopedicResponse(insight, compositeState, clinicalInsights);

            console.log(`✅ [Catharsis Success] State: ${compositeState?.name || primaryLabel} | Intent: ${intent}`);

            return {
                responseText,
                intent,
                emotionalDNA: dnaMix,
                metadata: {
                    vadLabel: primaryLabel,
                    clinicalRefsCount: clinicalInsights?.length || 0,
                    strategicIntent: intent
                }
            };

        } catch (err) {
            console.error("❌ [CatharsisEngine Error]:", err);
            return { 
                responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك بكل اهتمام.",
                intent: "fallback_empathy",
                emotionalDNA: { name: "dynamic" }
            };
        }
    }

    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'أقتل نفسي', 'أنهي حياتي', 'أذي نفسي'];
        const hasDangerWord = dangerWords.some(w => normalizeArabic(text).includes(w));
        const isCrisis = hasDangerWord || (intensity > 0.97 && label.includes('depression'));
        return { isCrisis };
    }

    _detectCompositeState(emotionProfile) {
        const detectedMap = emotionProfile.detectedEmotions || {};
        if (Object.keys(detectedMap).length === 0) return null;

        for (const [key, state] of Object.entries(this.dynamics)) {
            if (state && Array.isArray(state.core_emotions)) {
                const matchCount = state.core_emotions.filter(e => detectedMap[e]).length;
                if (matchCount >= 1 && emotionProfile.intensity?.overall > 0.6) {
                    console.log(`      🧩 [Dynamics]: رصد حالة "${state.name}"`);
                    return state;
                }
            }
        }
        return null;
    }

    _determineIntent(label, synthesis, strategicInsight) {
        // الأولوية القصوى لقرار محرك الاستدلال (Reasoning Engine)
        if (strategicInsight && strategicInsight.masterIntent) {
            return strategicInsight.masterIntent.type;
        }
        return "empathy";
    }

    _selectDNA(label, intensity, strategicInsight) {
        const dna = this.generative.EMOTIONAL_DNA || { dynamic: { name: "dynamic" } };
        
        // إذا كان القرار الاستراتيجي هو التنشيط السلوكي
        if (strategicInsight?.masterIntent?.type === "GENTLE_ACTIVATION") return dna.grounded;
        
        if (label.includes('depression') || intensity > 0.8) return dna.tender;
        return dna.dynamic;
    }

    /**
     * بناء الرد "الساندوتش الموسوعي":
     * طبقة 1: احتواء عاطفي (من الـ Dynamics)
     * طبقة 2: بصيرة علمية (من المكتبة السريرية)
     * طبقة 3: إعادة تأطير (Reframing)
     * طبقة 4: تفعيل سلوكي (Action Steps)
     */
    _buildEncyclopedicResponse(insight, composite, clinicalInsights) {
        const layers = [];

        // 1. طبقة الاحتواء (Opening)
        const intro = (composite && composite.dialogue_prompt) 
            ? composite.dialogue_prompt 
            : "أنا سامعك، وحاسس بتقل المشاعر اللي بتوصفها.";
        layers.push(intro);

        // 2. طبقة المراجع السريرية (Clinical Insights)
        if (clinicalInsights && clinicalInsights.length > 0) {
            console.log(`   📚 [Catharsis]: دمج ${clinicalInsights.length} مراجع علمية في الرد.`);
            
            // نأخذ المرجع الأول كقاعدة أساسية
            const mainRef = clinicalInsights[0];
            layers.push(`زي ما المراجع النفسية بتوضح (${mainRef.source})، إن ${mainRef.clinical_fact}`);
            
            // ندمج المنطق العلاجي من المرجع الثاني لو وجد
            if (clinicalInsights[1]) {
                layers.push(`كمان، ${clinicalInsights[1].reframing_logic}`);
            }
        } else {
            // Fallback إذا لم نجد مراجع
            layers.push("المشاعر دي صعبة، ومهم إننا نتعامل معاها براحة وهدوء.");
        }

        // 3. طبقة الفعل (Action Step)
        if (clinicalInsights && clinicalInsights.length > 0) {
            const action = clinicalInsights[0].action_step;
            layers.push(`إيه رأيك نجرب حاجة صغيرة دلوقتي؟ ${action}`);
        } else if (insight.synthesisProfile?.dominantPattern?.immediate_actions) {
            layers.push(`ممكن نجرب سوا: ${sample(insight.synthesisProfile.dominantPattern.immediate_actions)}`);
        }

        // 4. الخاتمة
        layers.push("أنا موجود هنا جنبك، كمل حكيك لو حابب.");

        return layers.join(' ');
    }

    _generateCrisisPayload() {
        return {
            responseText: "أنا مهتم جداً بسلامتك. اللي بتمر بيه صعب ومحتاج دعم متخصص وفوري. أرجوك تواصل مع شخص بتثق فيه أو كلم الخط الساخن للدعم النفسي فوراً. أنا هنا عشان أسمعك، بس سلامتك هي الأهم دلوقتي.",
            intent: "crisis_intervention",
            emotionalDNA: { name: "protective" }
        };
    }
}

export default CatharsisEngine;
