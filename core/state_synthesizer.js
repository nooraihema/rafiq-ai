
/**
 * /core/state_synthesizer.js
 * StateSynthesizer v2.0 - "The Soulful Weaver"
 * وظيفته: تحويل شبكة الكلمات إلى "مسار نفسي" متكامل.
 * الميزات الجديدة: (Smarter Pivots, Conflict Detection, Intent Analysis, Trajectory)
 */

export class StateSynthesizer {
    constructor() {
        console.log("%c🎭 [StateSynthesizer v2.0] تفعيل محرك إدراك الحالة النفسية...", "color: #FF5722; font-weight: bold;");
        
        // أنواع المفاصل وقوتها
        this.PIVOT_RULES = {
            'بس': { strength: 1.0, type: 'CONTRAST' },
            'لكن': { strength: 0.9, type: 'CONTRAST' },
            'رغم': { strength: 0.7, type: 'CONCESSION' },
            'مع ان': { strength: 0.7, type: 'CONCESSION' },
            'حتى لو': { strength: 0.6, type: 'RESILIENCE' }
        };

        // محددات النية (Intent Markers)
        this.INTENT_MARKERS = {
            venting: ['مخنوق', 'تعبان', 'زهقت', 'خلاص'],
            seeking_help: ['اعمل ايه', 'ازاي', 'ساعدني', 'حل'],
            testing: ['انت مين', 'فاهم', 'عارف'],
            confirmation: ['صح؟', 'مش كده؟', 'تمام؟']
        };
    }

    /**
     * المهمة الكبرى: تركيب الوعي الموقفي
     */
    synthesize(readerResult, history = []) {
        const { sequence } = readerResult;
        console.log("\n" + "%c[Deep Synthesis] STARTING...".repeat(1), "background: #FF5722; color: #fff; padding: 2px 5px;");

        // 1. تحديد النقطة المفصلية (The Smart Pivot)
        const pivotData = this._findSmartPivot(sequence);

        // 2. تحليل الصراع الداخلي (Conflict Detection)
        const segments = this._splitByPivot(sequence, pivotData);
        const conflict = this._detectInternalConflict(segments);

        // 3. استنتاج النية (Intent Detection)
        const intent = this._detectIntent(sequence);

        // 4. حساب المسار (Trajectory) - الربط بالماضي
        const currentMood = this._calculateIntegratedMood(sequence, pivotData);
        const trajectory = this._calculateTrajectory(currentMood, history);

        const globalState = {
            core: {
                intent: intent,
                conflictScore: conflict.score,
                logicType: pivotData ? pivotData.type : "LINEAR"
            },
            atmosphere: {
                mood: currentMood,
                trajectory: trajectory, // (DETERIORATING, IMPROVING, STABLE)
                tension: conflict.score > 0.5 ? "HIGH" : "NORMAL"
            },
            focus: {
                selfCentric: readerResult.sequence.filter(t => t.role === "IDENTITY_MARKER").length > 1,
                hasExternalActor: readerResult.sequence.some(t => t.relations.next && t.relations.next.includes("الناس"))
            },
            signals: conflict.signals
        };

        console.log(`   ✅ [Synthesis Result]: النية (${intent.primary}) | الصراع (${conflict.score.toFixed(2)}) | المسار (${trajectory}).`);
        return globalState;
    }

    /**
     * يبحث عن المفصل ويحدد قوته ونوعه
     */
    _findSmartPivot(sequence) {
        for (let i = sequence.length - 1; i >= 0; i--) {
            const token = sequence[i];
            if (this.PIVOT_RULES[token.core]) {
                return { ...this.PIVOT_RULES[token.core], index: i, word: token.original };
            }
        }
        return null;
    }

    /**
     * كشف التناقض: هل الجزء الأول عكس الجزء الثاني؟
     */
    _detectInternalConflict(segments) {
        if (!segments.after) return { score: 0, signals: [] };

        // هنا بنقيس "المسافة العاطفية" بين اللي قبل "بس" واللي بعدها
        // (ملاحظة: بنعتمد على الـ tags المبدئية للـ Tokens)
        const beforeScore = this._getSegmentPolarity(segments.before);
        const afterScore = this._getSegmentPolarity(segments.after);

        const diff = Math.abs(beforeScore - afterScore);
        const signals = [];
        if (diff > 0.6) signals.push("EMOTIONAL_DISSONANCE"); // تناقض حاد
        if (beforeScore > 0.5 && afterScore < 0) signals.push("MASKING_BREACH"); // سقوط القناع الإيجابي

        return { score: diff, signals };
    }

    /**
     * تحديد نية المستخدم: هو بيكلمنا ليه؟
     */
    _detectIntent(sequence) {
        const scores = { venting: 0, seeking_help: 0, testing: 0 };
        const text = sequence.map(t => t.core).join(' ');

        for (const [intent, keywords] of Object.entries(this.INTENT_MARKERS)) {
            keywords.forEach(kw => {
                if (text.includes(kw)) scores[intent] += 1;
            });
        }

        const primary = Object.entries(scores).sort((a,b) => b[1] - a[1])[0];
        return {
            primary: primary[1] > 0 ? primary[0] : "general_sharing",
            confidence: primary[1] > 0 ? 0.8 : 0.4
        };
    }

    /**
     * تحليل المسار الزمني: هل الحالة بتتحسن ولا بتسوء؟
     */
    _calculateTrajectory(currentMood, history) {
        if (!history || history.length === 0) return "NEW_IDENTITY";
        
        const lastMood = history[history.length - 1].mood;
        const diff = currentMood - lastMood;

        if (diff < -0.3) return "DETERIORATING"; // تدهور
        if (diff > 0.3) return "IMPROVING";    // تحسن
        return "STABLE";                       // استقرار
    }

    // وظائف مساعدة مبسطة
    _splitByPivot(sequence, pivot) {
        if (!pivot) return { before: sequence, after: null };
        return {
            before: sequence.slice(0, pivot.index),
            after: sequence.slice(pivot.index + 1)
        };
    }

    _getSegmentPolarity(tokens) {
        // حساب مبدئي للقطبية (إيجابي/سلبي) بناءً على الـ Role
        let score = 0;
        tokens.forEach(t => {
            if (t.classification.isClin || t.classification.isEmo) score -= 0.5;
            if (t.role === "INTENSIFIER") score *= 1.5;
        });
        return score;
    }

    _calculateIntegratedMood(sequence, pivot) {
        // حساب المود العام مع إعطاء وزن 70% لما بعد الـ Pivot
        const segments = this._splitByPivot(sequence, pivot);
        const b = this._getSegmentPolarity(segments.before);
        if (!segments.after) return b;
        const a = this._getSegmentPolarity(segments.after);
        return (b * 0.3) + (a * 0.7);
    }
}

export default StateSynthesizer;
