
/**
 * /core/knowledge_engine.js
 * KnowledgeEngine v3.0 - The Strategic Clinical Librarian
 * وظيفته: استشارة المكتبة السريرية ودمج المعرفة العلمية بناءً على (الأثر الدلالي + طاقة الانتباه + رنين الـ VAD).
 */

import { CLINICAL_LIBRARY } from '../knowledge_base/clinical_library.js';

export class KnowledgeEngine {
    constructor() {
        this.library = CLINICAL_LIBRARY;
        this.MAX_CAPSULES = 3; 
        this.MIN_RELEVANCE_SCORE = 0.35;
        console.log("%c📚 [KnowledgeEngine v3.0] تم تشغيل أمين المكتبة الاستراتيجي في الفضاء الموحد.", "color: #795548; font-weight: bold;");
    }

    /**
     * المهمة الكبرى: استخراج "مزيج الحكمة السريرية" المتوافق مع الحالة
     */
    async consultLibrary(workspace) {
        console.log("\n" + "%c[Clinical Consultation] STARTING DEEP SEARCH...".repeat(1), "background: #795548; color: #fff; padding: 2px 5px;");

        try {
            // 1. صمام أمان البيانات
            if (!workspace || !workspace.semantic || !workspace.emotion) {
                console.warn("   ⚠️ [KnowledgeEngine]: بيانات الفضاء الموحد غير مكتملة للبحث السريري.");
                return [];
            }

            const { semantic, emotion, attentionMap } = workspace;
            const detectedConceptIds = Object.keys(semantic.concepts || {});
            const currentVAD = emotion.stateModel;

            console.log(`   🔸 [Context]: جاري البحث عن مراجع لـ ${detectedConceptIds.length} مفاهيم مع مراعاة بصمة VAD.`);

            // 2. تقييم المراجع بناءً على "خوارزمية الرنين الثلاثي"
            const candidates = this._rankClinicalCapsules(
                detectedConceptIds, 
                semantic.concepts, 
                attentionMap || {}, 
                currentVAD
            );

            // 3. اختيار المراجع الأكثر تنوعاً ودقة
            const selected = this._selectDiverseCapsules(candidates);

            if (selected.length > 0) {
                console.log(`   ✅ [Consultation Success]: تم جلب ${selected.length} مراجع علمية "رنانة" مع الحالة.`);
                selected.forEach((ref, i) => {
                    console.log(`      📖 [${i+1}] مرجع: [${ref.source}] | نوع التدخل: ${ref.id}`);
                });
            } else {
                console.log("   ℹ️ [KnowledgeEngine]: لم يتم العثور على مراجع تحقق حد الرنين المطلوب.");
            }

            return selected;

        } catch (err) {
            console.error("❌ [KnowledgeEngine Error]:", err);
            return [];
        }
    }

    /**
     * خوارزمية الرنين (Resonance Algorithm):
     * تحسب درجة الصلة بناءً على: (قوة المفهوم * وزن الانتباه * التوافق مع إحداثيات VAD)
     */
    _rankClinicalCapsules(detectedIds, conceptDetails, attentionMap, currentVAD) {
        const ranked = [];

        for (const [key, capsule] of Object.entries(this.library)) {
            let baseScore = 0;
            let matchCount = 0;

            // أ. مطابقة المفاهيم والانتباه
            capsule.triggers.forEach(trigger => {
                if (detectedIds.includes(trigger)) {
                    const impact = conceptDetails[trigger]?.impact || 1.0;
                    const salience = attentionMap[trigger] || 0.5;
                    
                    // وزن المفهوم = الأثر السريري × (1 + طاقة الانتباه)
                    baseScore += (impact * (1 + salience));
                    matchCount++;
                }
            });

            if (matchCount > 0) {
                // ب. حساب "الرنين العاطفي" (Emotional Resonance) 🔥 NEW
                // هل النصيحة في الكبسولة مناسبة لمستوى الطاقة (Arousal) الحالي؟
                const resonanceMultiplier = this._calculateVADResonance(key, currentVAD);
                
                // النتيجة النهائية = (متوسط قوة المفاهيم) × معامل الرنين
                const finalScore = (baseScore / Math.sqrt(capsule.triggers.length)) * resonanceMultiplier;

                ranked.push({ id: key, score: finalScore, data: capsule });
            }
        }

        return ranked.sort((a, b) => b.score - a.score);
    }

    /**
     * ذكاء اصطناعي: يحدد مدى ملاءمة المرجع للحالة المزاجية الحالية
     */
    _calculateVADResonance(capsuleId, vad) {
        let multiplier = 1.0;

        // حالة الاكتئاب الخامل (Low Arousal)
        if (vad.a < -0.3) {
            // المراجع التي تدعم "التنشيط" تأخذ أولوية قصوى
            if (capsuleId.includes('activation') || capsuleId.includes('action')) multiplier = 1.5;
            // المراجع التي تطلب تفكيراً عميقاً جداً قد تكون مجهدة، فنقلل وزنها قليلاً
            if (capsuleId.includes('complex_analysis')) multiplier = 0.8;
        }

        // حالة القلق المستنفر (High Arousal)
        if (vad.a > 0.5) {
            // المراجع التي تدعم "التأريض" (Grounding) والهدوء تأخذ الأولوية
            if (capsuleId.includes('cbt_anxiety') || capsuleId.includes('grounding')) multiplier = 1.6;
        }

        // حالة فقدان السيطرة (Low Dominance)
        if (vad.d < -0.5) {
            // المراجع التي تعطي "خطوات صغيرة" تنجح أكثر
            if (capsuleId.includes('micro_step') || capsuleId.includes('small_wins')) multiplier = 1.4;
        }

        return multiplier;
    }

    /**
     * يضمن عدم تكرار نفس المصادر لضمان شمولية الرد
     */
    _selectDiverseCapsules(candidates) {
        const selected = [];
        const seenSources = new Set();

        for (const candidate of candidates) {
            if (selected.length >= this.MAX_CAPSULES) break;
            if (candidate.score < this.MIN_RELEVANCE_SCORE) continue;

            // تجنب اختيار مرجعين من نفس الكتاب لزيادة التنوع الثقافي للرد
            if (!seenSources.has(candidate.data.source)) {
                selected.push(candidate.data);
                seenSources.add(candidate.data.source);
            } else if (candidate.score > 1.5) {
                // إذا كان المرجع قوياً جداً، نقبله حتى لو تكرر المصدر
                selected.push(candidate.data);
            }
        }
        return selected;
    }
}

export default KnowledgeEngine;
