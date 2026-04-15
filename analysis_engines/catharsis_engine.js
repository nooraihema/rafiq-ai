
/**
 * /analysis_engines/catharsis_engine.js
 * CatharsisEngine v6.0 - Integrated Dynamic Weaver
 * التحديث: الدمج الكامل مع DYNAMIC_LEXICON v2.0 لإلغاء التكرار وأنسنة الرد.
 */

import { sample, normalizeArabic } from '../core/utils.js';
import { DYNAMIC_LEXICON } from '../core/dynamic_lexicon_v2.js'; // تأكد من المسار

export class CatharsisEngine {
    constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
        console.log("%c💬 [CatharsisEngine v6.0] تهيئة المحرك المدمج...", "color: #4CAF50; font-weight: bold;");
        
        this.lexicon = DYNAMIC_LEXICON;
        this.generative = dictionaries.GENERATIVE_ENGINE || {};
        this.memory = memorySystem;
    }

    async generateResponse(workspace) {
        try {
            const { emotion, clinicalInsights, rawText, reasoning } = workspace;
            const primaryLabel = emotion.primaryEmotion.name || "neutral";
            const intensity = emotion.intensity?.overall || 0.5;

            // 1. فحص الأمان
            if (this._performCrisisCheck(primaryLabel, intensity, rawText || "")) {
                return this._generateCrisisPayload();
            }

            const userStyle = this._analyzeUserVerbalStyle(workspace);
            const dnaMix = this._selectDNA(primaryLabel, intensity, reasoning, userStyle);

            // 2. الخيمياء اللغوية (بناء الرد من القاموس الديناميكي)
            const responseText = this._weaveResponseText(workspace);

            return {
                responseText,
                intent: reasoning?.masterIntent?.type || "EMPATHETIC_LISTENING",
                emotionalDNA: dnaMix,
                metadata: { userStyle, intensity }
            };
        } catch (err) {
            console.error("❌ [CatharsisEngine Error]:", err);
            return { responseText: "أنا هنا معاك، حاسس بيك.. كمل كلامك أنا سامعك." };
        }
    }

    /**
     * بناء الرد باستخدام مسارات التوجيه (Routing) والذرات (Atoms)
     */
    _weaveResponseText(workspace) {
        const { emotion, clinicalInsights } = workspace;
        const label = emotion.primaryEmotion.name || "neutral";
        const intensity = emotion.intensity?.overall || 0.5;

        // تحديد المسار بناءً على الحالة (مثلاً: اكتئاب، قلق، حزن)
        const route = this.lexicon.ROUTING[label] || this.lexicon.ROUTING.neutral;
        const layers = [];

        route.forEach(step => {
            switch (step) {
                case "VALIDATION":
                    // اختيار ذرة احتواء تناسب شدة الانفعال
                    const valAtom = this.lexicon.VALIDATION
                        .filter(a => intensity >= a.intensity[0] && intensity <= a.intensity[1])
                    layers.push(sample(valAtom || this.lexicon.VALIDATION).text);
                    break;

                case "MIRRORING":
                    // اختيار مرآة عاطفية تطابق التصنيف
                    const mirAtom = this.lexicon.MIRRORING.find(m => m.mapsTo.includes(label));
                    if (mirAtom) layers.push(mirAtom.text);
                    break;

                case "BRIDGES":
                    layers.push(sample(this.lexicon.BRIDGES).text);
                    break;

                case "ACTIONS":
                    // دمج النصيحة العلمية مع ذرة فعل ناعمة
                    if (clinicalInsights && clinicalInsights.length > 0) {
                        const actionAtom = this.lexicon.ACTIONS
                            .filter(a => intensity >= a.intensity[0] && intensity <= a.intensity[1]);
                        const actionBase = sample(actionAtom || this.lexicon.ACTIONS).text;
                        layers.push(`${actionBase} ${clinicalInsights[0].action_step}`);
                    }
                    break;

                case "CLOSURES":
                    layers.push(sample(this.lexicon.CLOSURES).text);
                    break;
            }
        });

        // دمج الطبقة العلمية (Reframing) في وسط الرد إذا وجدت
        if (clinicalInsights && clinicalInsights.length > 0 && layers.length > 2) {
            const reframeText = clinicalInsights[0].reframing_logic;
            layers.splice(3, 0, reframeText); // حقن المعلومة العلمية بعد الجسر
        }

        return layers.join(" ");
    }

    _analyzeUserVerbalStyle(workspace) {
        const wordCount = workspace.state?.wordCount || 0;
        return wordCount > 15 ? "EXPRESSIVE_DEEP" : "CONCISE_DIRECT";
    }

    _performCrisisCheck(label, intensity, text) {
        const dangerWords = ['انتحار', 'أقتل نفسي', 'أنهي حياتي', 'أذي نفسي'];
        return dangerWords.some(w => normalizeArabic(text).includes(w)) || (intensity > 0.98 && label.includes('depression'));
    }

    _selectDNA(label, intensity, reasoning, style) {
        const dna = this.generative.EMOTIONAL_DNA || { dynamic: { name: "dynamic" } };
        if (style === "EXPRESSIVE_DEEP") return dna.poetic || dna.tender;
        return (label.includes('depression') || intensity > 0.7) ? dna.tender : dna.dynamic;
    }

    _generateCrisisPayload() {
        return { responseText: "أنا قلقان عليك جداً، سلامتك أهم حاجة.. أرجوك تواصل مع مختص فوراً.", intent: "crisis" };
    }
}

export default CatharsisEngine;
