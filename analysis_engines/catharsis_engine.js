/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v4.0 - Unified Workspace Strategic Architect
 * وظيفته: صياغة الرد النهائي بدمج (الحالة الموحدة + المراجع السريرية + التوجيه الاستراتيجي).
 * التغيير الجوهري: استهلاك البيانات مباشرة من هيكل الـ Workspace الموحد.
 */

import { sample, normalizeArabic } from '../core/utils.js';

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v4.0] تهيئة مهندس الاستجابة في الفضاء الموحد...", "color: #4CAF50; font-weight: bold;");

        // 1. فك تغليف القواميس لضمان الوصول للبيانات (Unwrapping)
        const dynModule = dictionaries.EMOTIONAL_DYNAMICS || {};
        this.dynamics = dynModule.EMOTIONAL_DYNAMICS || dynModule.default?.EMOTIONAL_DYNAMICS || dynModule;
        
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.patterns = dictionaries.PATTERNS || {}; 
        this.memory = memorySystem;

        console.log("✅ [CatharsisEngine] المحرك متصل بنسيج الوعي الموحد وجاهز للرد.");
    }

    /**
     * الوظيفة الرئيسية: توليد الرد "المتكامل" من الفضاء الموحد
     * التعديل: المحرك الآن يستقبل الـ Workspace ككتلة واحدة (Insight)
     */
    async generateResponse(workspace) {
        console.log("\n" + "%c[Response Engineering] ORCHESTRATING FINAL FIELD...".repeat(1), "background: #4CAF50; color: #fff; padding: 2px 5px;");
        
        try {
            // صمام أمان: التحقق من اكتمال نسيج البيانات في الـ Workspace
            if (!workspace || !workspace.emotion || !workspace.semantic) {
                throw new Error("بيانات الفضاء الموحد (Workspace) غير مكتملة.");
            }

            // استخراج كافة الأبعاد من الفضاء الموحد
            const { emotion, semantic, synthesis, reasoning, clinicalInsights, rawText } = workspace;
            
            const primaryLabel = emotion.primaryEmotion.name || "neutral";
            const intensity = emotion.intensity?.overall || 0.5;

            // 1. فحص الأمان (Crisis Check) - يعتمد على النص الخام وشدة المجال
            const crisis = this._performCrisisCheck(primaryLabel, intensity, rawText || "");
            if (crisis.isCrisis) {
                console.log("   🚨 [Crisis]: تفعيل بروتوكول الإنقاذ الفوري بناءً على شدة المجال.");
                return this._generateCrisisPayload();
            }

            // 2. تحليل الحالة المركبة (Dynamics) - يقرأ من الـ Detected Emotions الموحدة
            console.log("   🔸 [Step 2: Dynamics] البحث في رنين الحالة المركبة...");
            const compositeState = this._detectCompositeState(workspace);

            // 3. تحديد النية (Intent) - الأولوية لقرار محرك الاستدلال (Reasoning Hub)
            console.log("   🔸 [Step 3: Strategy] تنفيذ الأمر الاستراتيجي للمجال...");
            const intent = this._determineIntent(primaryLabel, synthesis, reasoning);

            // 4. اختيار الحمض النووي (DNA) - ضبط نبرة الصوت لتوافق الحالة الاستراتيجية
            console.log("   🔸 [Step 4: DNA] موازنة نبرة الصوت العاطفية...");
            const dnaMix = this._selectDNA(primaryLabel, intensity, reasoning);

            // 5. بناء الرد "الساندوتش الموسوعي" (Multi-Layer Construction)
            console.log("   🔸 [Step 5: Construction] صياغة الرد من نسيج المراجع والمشاعر...");
            const responseText = this._buildEncyclopedicResponse(workspace, compositeState);

            console.log(`✅ [Catharsis Success] Final State: ${compositeState?.name || primaryLabel} | Master Intent: ${intent}`);

            return {
                responseText,
                intent,
                emotionalDNA: dnaMix,
                metadata: {
                    vadLabel: primaryLabel,
                    clinicalRefsCount: clinicalInsights?.length || 0,
                    strategicIntent: intent,
                    fieldIntensity: intensity,
                    generatedAt: new Date().toISOString()
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

    /**
     * نظام حماية الوعي: فحص الأزمات
     */
    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'أقتل نفسي', 'أنهي حياتي', 'أذي نفسي', 'مش عايز اعيش'];
        const hasDangerWord = dangerWords.some(w => normalizeArabic(text).includes(w));
        // معيار الخطر: كلمة خطر أو (شدة قصوى + حالة اكتئاب/عجز)
        const isCrisis = hasDangerWord || (intensity > 0.96 && (label.includes('depression') || label.includes('helplessness')));
        return { isCrisis };
    }

    /**
     * اكتشاف الحالة المركبة: الربط بين مشاعر الـ Workspace وقاموس الديناميكيات
     */
    _detectCompositeState(workspace) {
        const emotion = workspace.emotion;
        const detectedMap = emotion.detectedEmotions || {};
        if (Object.keys(detectedMap).length === 0) return null;

        for (const [key, state] of Object.entries(this.dynamics)) {
            if (state && Array.isArray(state.core_emotions)) {
                // البحث عن الرنين (Resonance) بين المشاعر المكتشفة وتعريف الحالة
                const matchCount = state.core_emotions.filter(e => detectedMap[e]).length;
                
                // شرط المطابقة: وجود مشعر واحد على الأقل مع شدة عالية، أو مشاعر متعددة
                if (matchCount >= 1 && emotion.intensity?.overall > 0.6) {
                    console.log(`      🧩 [Field Dynamics Found]: ${state.name}`);
                    return state;
                }
            }
        }
        return null;
    }

    /**
     * تنفيذ التوجه الاستراتيجي الموحد
     */
    _determineIntent(label, synthesis, reasoning) {
        // القاعدة الذهبية: قرار محرك الاستدلال (Reasoning Engine) هو القائد
        if (reasoning && reasoning.masterIntent) {
            return reasoning.masterIntent.type;
        }
        
        // Fallback للمنطق التقليدي إذا فشل الاستدلال
        if (label.includes('helplessness')) return "empowerment";
        if (label.includes('depression')) return "validation_and_support";
        return "empathy";
    }

    /**
     * اختيار الـ DNA من القاموس الخامس بناءً على حالة المجال
     */
    _selectDNA(label, intensity, reasoning) {
        const dna = this.generative.EMOTIONAL_DNA || { dynamic: { name: "dynamic" } };
        
        // الالتزام بالقرار الاستراتيجي (مثلاً Grounded للتنشيط)
        if (reasoning?.masterIntent?.type === "GENTLE_ACTIVATION") return dna.grounded;
        
        if (label.includes('depression') || label.includes('sadness')) {
            return (intensity > 0.7) ? dna.tender : dna.poetic;
        }
        
        return dna.dynamic;
    }

    /**
     * بناء الرد "الساندوتش الموسوعي" (Layered Construction)
     * يدمج 4 طبقات: (فتح عاطفي + بصيرة سريرية + إعادة تأطير + تفعيل سلوكي)
     */
    _buildEncyclopedicResponse(workspace, composite) {
        const { clinicalInsights, synthesis, emotion } = workspace;
        const layers = [];

        // 1. طبقة الافتتاحية والاحتواء (من الديناميكيات أو افتراضية)
        const intro = (composite && composite.dialogue_prompt) 
            ? composite.dialogue_prompt 
            : "أنا سامعك، وحاسس بتقل المشاعر اللي بتوصفها في اللحظة دي.";
        layers.push(intro);

        // 2. طبقة الدمج السريري (المراجع من أمين المكتبة)
        if (clinicalInsights && clinicalInsights.length > 0) {
            console.log(`   📚 [Field Synthesis]: دمج ${clinicalInsights.length} مراجع علمية في نسيج الرد.`);
            
            const mainRef = clinicalInsights[0];
            layers.push(`زي ما المراجع النفسية بتوضح (${mainRef.source})، إن ${mainRef.clinical_fact}`);
            
            // دمج المنطق العلاجي من مرجع إضافي لو وجد لزيادة الشمولية
            if (clinicalInsights[1]) {
                layers.push(`كمان، ${clinicalInsights[1].reframing_logic}`);
            }
        } else {
            // حالة عدم وجود مراجع: نستخدم البصيرة الناتجة عن المحرك الدلالي
            if (emotion.primaryEmotion.name.includes('depression')) {
                layers.push("عقلك دلوقتي بيحاول يحميك بأنه يفصلك عن الألم عشان ترتاح، وده اللي مسبب الإحساس بالجمود.");
            } else {
                layers.push("المشاعر دي جزء من رحلة إنسانية صعبة، ومهم إننا نتعامل معاها براحة وهدوء.");
            }
        }

        // 3. طبقة الفعل السلوكي (Actionable Steps)
        if (clinicalInsights && clinicalInsights.length > 0) {
            const action = clinicalInsights[0].action_step;
            layers.push(`إيه رأيك نجرب حاجة صغيرة دلوقتي؟ ${action}`);
        } else if (synthesis && synthesis.dominantPattern?.immediate_actions) {
            // استخدام الأفعال من الأنماط المكتشفة في محرك التركيب
            layers.push(`ممكن نجرب سوا: ${sample(synthesis.dominantPattern.immediate_actions)}`);
        }

        // 4. طبقة الخاتمة والاحتواء المستمر
        layers.push("أنا موجود هنا جنبك، كمل حكيك لو حابب، أنا بسمعك.");

        return layers.join(' ');
    }

    /**
     * توليد رد الطوارئ (Crisis Management)
     */
    _generateCrisisPayload() {
        return {
            responseText: "أنا مهتم جداً بسلامتك. اللي بتمر بيه دلوقتي صعب ومحتاج دعم متخصص وفوري. أرجوك تواصل مع شخص بتثق فيه أو كلم الخط الساخن للدعم النفسي فوراً. أنا هنا عشان أسمعك، بس سلامتك هي الأهم دلوقتي.",
            intent: "crisis_intervention",
            emotionalDNA: { name: "protective" }
        };
    }
}

export default CatharsisEngine;
