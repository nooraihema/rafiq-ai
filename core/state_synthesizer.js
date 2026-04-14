
/**
 * /core/state_synthesizer.js
 * StateSynthesizer v2.1 - Robust & Crash-Proof Edition
 * وظيفته: تحويل شبكة الكلمات إلى "مسار نفسي" متكامل وتأمين البيانات ضد الانهيار.
 */

export class StateSynthesizer {
    constructor() {
        console.log("%c🎭 [StateSynthesizer v2.1] تفعيل محرك إدراك الحالة المستقر...", "color: #FF5722; font-weight: bold;");
        
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
     * المهمة الكبرى: تركيب الوعي الموقفي وتأمين المسار
     */
    synthesize(readerResult, history = []) {
        console.log("\n" + "%c[Deep Synthesis] STARTING...".repeat(1), "background: #FF5722; color: #fff; padding: 2px 5px;");

        try {
            const { sequence } = readerResult;
            if (!sequence || !Array.isArray(sequence)) throw new Error("بيانات التسلسل غير صالحة");

            // 1. تحديد النقطة المفصلية
            const pivotData = this._findSmartPivot(sequence);

            // 2. تحليل الصراع الداخلي
            const segments = this._splitByPivot(sequence, pivotData);
            const conflict = this._detectInternalConflict(segments);

            // 3. استنتاج النية
            const intent = this._detectIntent(sequence);

            // 4. حساب المود والمسار الزمني (Trajectory) مع تأمين الذاكرة
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
                    trajectory: trajectory,
                    tension: conflict.score > 0.5 ? "HIGH" : "NORMAL"
                },
                focus: {
                    selfCentric: sequence.filter(t => t.role === "IDENTITY_MARKER").length > 1,
                    hasExternalActor: sequence.some(t => t.relations && t.relations.next && t.relations.next.includes("الناس"))
                },
                signals: conflict.signals
            };

            console.log(`   ✅ [Synthesis Result]: النية (${intent.primary}) | الصراع (${conflict.score.toFixed(2)}) | المسار (${trajectory}).`);
            return globalState;

        } catch (err) {
            console.error("❌ [StateSynthesizer Error]:", err);
            // الرد الدفاعي في حالة حدوث خطأ
            return {
                core: { intent: { primary: "general" }, conflictScore: 0 },
                atmosphere: { mood: 0, trajectory: "STABLE" },
                focus: {},
                signals: []
            };
        }
    }

    _findSmartPivot(sequence) {
        for (let i = sequence.length - 1; i >= 0; i--) {
            const token = sequence[i];
            if (token && this.PIVOT_RULES[token.core]) {
                return { ...this.PIVOT_RULES[token.core], index: i, word: token.original };
            }
        }
        return null;
    }

    _detectInternalConflict(segments) {
        if (!segments || !segments.after) return { score: 0, signals: [] };

        const beforeScore = this._getSegmentPolarity(segments.before);
        const afterScore = this._getSegmentPolarity(segments.after);

        const diff = Math.abs(beforeScore - afterScore);
        const signals = [];
        if (diff > 0.6) signals.push("EMOTIONAL_DISSONANCE");
        if (beforeScore > 0.3 && afterScore < -0.3) signals.push("MASKING_BREACH");

        return { score: diff, signals };
    }

    _detectIntent(sequence) {
        const scores = { venting: 0, seeking_help: 0, testing: 0, confirmation: 0 };
        const text = sequence.map(t => t.core).join(' ');

        for (const [intent, keywords] of Object.entries(this.INTENT_MARKERS)) {
            keywords.forEach(kw => {
                if (text.includes(kw)) scores[intent]++;
            });
        }

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const primary = sorted[0];

        return {
            primary: (primary && primary[1] > 0) ? primary[0] : "general_sharing",
            confidence: (primary && primary[1] > 0) ? 0.8 : 0.4
        };
    }

    /**
     * تأمين حساب المسار التاريخي (حل مشكلة الـ Initial State)
     */
    _calculateTrajectory(currentMood, history) {
        // إذا لم تكن هناك ذاكرة سابقة، فهذه بداية الهوية الرقمية للمستخدم
        if (!history || !Array.isArray(history) || history.length === 0) {
            return "INITIAL_STATE";
        }
        
        // محاولة جلب آخر مود مسجل (V من مكعب VAD)
        const lastEntry = history[history.length - 1];
        const lastMood = lastEntry?.emotionProfile?.stateModel?.v || lastEntry?.mood || 0;

        const diff = currentMood - lastMood;
        if (diff < -0.3) return "DETERIORATING"; // تدهور
        if (diff > 0.3) return "IMPROVING";    // تحسن
        return "STABLE";                       // استقرار
    }

    _splitByPivot(sequence, pivot) {
        if (!pivot) return { before: sequence, after: null };
        return {
            before: sequence.slice(0, pivot.index),
            after: sequence.slice(pivot.index + 1)
        };
    }

    _getSegmentPolarity(tokens) {
        if (!tokens || !Array.isArray(tokens)) return 0;
        let score = 0;
        tokens.forEach(t => {
            if (t.classification && (t.classification.isClin || t.classification.isEmo)) score -= 0.5;
            if (t.role === "INTENSIFIER") score *= 1.2;
        });
        return score;
    }

    _calculateIntegratedMood(sequence, pivot) {
        const segments = this._splitByPivot(sequence, pivot);
        const b = this._getSegmentPolarity(segments.before);
        if (!segments.after) return b;
        const a = this._getSegmentPolarity(segments.after);
        return (b * 0.3) + (a * 0.7);
    }
}

export default StateSynthesizer;
