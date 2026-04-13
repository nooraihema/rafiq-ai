
/**
 * /core/knowledge_engine.js
 * KnowledgeEngine v1.0 - The Smart Librarian
 * وظيفته: استشارة "المكتبة السريرية" واختيار عدة مراجع تتوافق مع (المفاهيم، الانتباه، والشدة).
 */

import { CLINICAL_LIBRARY } from '../knowledge_base/clinical_library.js';

export class KnowledgeEngine {
    constructor() {
        this.library = CLINICAL_LIBRARY;
        this.MAX_CAPSULES = 3; // أقصى عدد من المراجع لضمان عدم تشتيت المستخدم
        this.MIN_RELEVANCE_SCORE = 0.4; // الحد الأدنى للقبول
    }

    /**
     * المهمة: استخراج "حزمة الحكمة" (Wisdom Bundle)
     */
    async consultLibrary(analysis) {
        console.log("\n" + "%c📚 [Knowledge Engine] جاري البحث في المراجع العلمية لتعميق الرد...".repeat(1), "background: #795548; color: #fff; padding: 2px 5px;");

        const { semanticMap, attentionMap } = analysis;
        const detectedConceptIds = Object.keys(semanticMap.concepts || {});
        
        if (detectedConceptIds.length === 0) {
            console.log("   ⚠️ [Knowledge Engine]: لم يتم اكتشاف مفاهيم دقيقة للبحث عنها في الكتب.");
            return [];
        }

        // 1. تقييم كل كبسولة في المكتبة بناءً على "درجة الصلة" (Relevance Score)
        const candidates = this._rankCapsules(detectedConceptIds, semanticMap.concepts, attentionMap);

        // 2. اختيار أفضل الكبسولات المتنوعة
        const selectedCapsules = candidates
            .filter(c => c.score >= this.MIN_RELEVANCE_SCORE)
            .slice(0, this.MAX_CAPSULES);

        if (selectedCapsules.length > 0) {
            console.log(`   ✅ [Library Search Complete]: تم اختيار ${selectedCapsules.length} مراجع علمية.`);
            selectedCapsules.forEach(c => {
                console.log(`      📖 المرجع: [${c.data.source}] | درجة الصلة: ${c.score.toFixed(2)}`);
            });
        }

        return selectedCapsules.map(c => c.data);
    }

    /**
     * خوارزمية الترتيب: تجمع بين (ثقل المفهوم) و (وزن الانتباه)
     */
    _rankCapsules(detectedIds, conceptDetails, attentionMap) {
        const ranked = [];

        for (const [key, capsule] of Object.entries(this.library)) {
            let totalScore = 0;
            let matchCount = 0;

            // فحص كل "محفز" (Trigger) داخل الكبسولة
            capsule.triggers.forEach(trigger => {
                if (detectedIds.includes(trigger)) {
                    const conceptImpact = conceptDetails[trigger]?.impact || 1.0;
                    
                    // البحث عن وزن الانتباه للكلمات المرتبطة بهذا المفهوم
                    // نأخذ متوسط الانتباه للجملة لو لم نجد الكلمة تحديداً
                    const attentionWeight = attentionMap[trigger] || 0.5;

                    // المعادلة: درجة المرجع = ثقل المفهوم السريري * وزن الانتباه
                    totalScore += (conceptImpact * (1 + attentionWeight));
                    matchCount++;
                }
            });

            if (matchCount > 0) {
                // حساب المتوسط لضمان عدم تفضيل الكبسولات التي بها triggers كثيرة عشوائياً
                const finalScore = totalScore / Math.sqrt(capsule.triggers.length);
                ranked.push({ id: key, score: finalScore, data: capsule });
            }
        }

        // ترتيب من الأعلى للأقل
        return ranked.sort((a, b) => b.score - a.score);
    }
}

export default KnowledgeEngine;
