
/**
 * /core/state_synthesizer.js
 * StateSynthesizer v3.0 - Unified Context Architect
 * وظيفته: استنتاج "الحالة الموقفية" وربط الماضي بالحاضر داخل الفضاء الموحد.
 */

export class StateSynthesizer {
    constructor() {
        console.log("%c🎭 [StateSynthesizer v3.0] تهيئة مهندس الحالات الموقفية...", "color: #FF5722; font-weight: bold;");
        
        // قواعد المفاصل المنطقية (نفس منطقك الأصلي)
        this.PIVOT_RULES = {
            'بس': { strength: 1.0, type: 'CONTRAST' },
            'لكن': { strength: 0.9, type: 'CONTRAST' },
            'رغم': { strength: 0.7, type: 'CONCESSION' },
            'مع ان': { strength: 0.7, type: 'CONCESSION' },
            'حتى لو': { strength: 0.6, type: 'RESILIENCE' }
        };

        // علامات النية (نفس منطقك الأصلي)
        this.INTENT_MARKERS = {
            venting: ['مخنوق', 'تعبان', 'زهقت', 'خلاص'],
            seeking_help: ['اعمل ايه', 'ازاي', 'ساعدني', 'حل'],
            testing: ['انت مين', 'فاهم', 'عارف'],
            confirmation: ['صح؟', 'مش كده؟', 'تمام؟']
        };
    }

    /**
     * المهمة: قراءة نسيج العقد في الـ Workspace واستنتاج الموقف الكلي
     */
    async synthesize(workspace, history = []) {
        console.log("\n" + "%c[Situational Synthesis] STARTING...".repeat(1), "background: #FF5722; color: #fff; padding: 2px 5px;");

        if (!workspace || !workspace.nodes) {
            console.error("❌ [StateSynthesizer]: نسيج العقد مفقود.");
            return;
        }

        try {
            const nodes = workspace.nodes;

            // 1. تحديد النقطة المفصلية في النسيج (Smart Pivot)
            const pivotData = this._findSmartPivot(nodes);

            // 2. تحليل الصراع والتناقض بين الكتل اللغوية
            const segments = this._splitByPivot(nodes, pivotData);
            const conflict = this._detectInternalConflict(segments);

            // 3. استنتاج النية العليا للمستخدم (Intent)
            const intent = this._detectIntent(nodes);

            // 4. حساب المود المدمج والمسار الزمني من الذاكرة
            const currentMood = this._calculateIntegratedMood(nodes, pivotData);
            const trajectory = this._calculateTrajectory(currentMood, history);

            // =========================================================
            // 🚀 حقن "تقرير الموقف" في الـ Workspace
            // =========================================================
            workspace.situational = {
                intent: intent,
                conflict: conflict,
                pivot: pivotData,
                integratedMood: currentMood,
                _meta: { version: "3.0-Workspace-Ready" }
            };

            // تحديث الحالة العالمية (Global State) لتوجيه المحركات القادمة
            workspace.state.trajectory = trajectory;
            workspace.state.intent = intent.primary;
            workspace.state.tensionLevel = conflict.score > 0.5 ? "HIGH" : "NORMAL";
            workspace.state.isContrastive = !!pivotData;

            console.log(`   ✅ [Synthesis Complete]: النية [${intent.primary}] | المسار [${trajectory}] | التناقض [${conflict.score.toFixed(2)}]`);

        } catch (err) {
            console.error("❌ [StateSynthesizer Error]:", err);
        }
    }

    /**
     * يبحث عن المفصل في مصفوفة العقد
     */
    _findSmartPivot(nodes) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            if (this.PIVOT_RULES[node.core]) {
                console.log(`      ⚖️ [Pivot Found]: "${node.original}" صُنفت كنقطة تحول (${this.PIVOT_RULES[node.core].type})`);
                return { ...this.PIVOT_RULES[node.core], index: i, word: node.original };
            }
        }
        return null;
    }

    /**
     * كشف التناقض العاطفي بين ما قبل وما بعد المفصل
     */
    _detectInternalConflict(segments) {
        if (!segments.after) return { score: 0, signals: [] };

        const beforeScore = this._getSegmentPolarity(segments.before);
        const afterScore = this._getSegmentPolarity(segments.after);

        const diff = Math.abs(beforeScore - afterScore);
        const signals = [];
        
        if (diff > 0.6) signals.push("EMOTIONAL_DISSONANCE");
        if (beforeScore > 0.3 && afterScore < -0.3) {
            signals.push("MASKING_BREACH");
            console.log("      🎭 [Signal]: تم اكتشاف سقوط القناع الإيجابي (Masking Breach).");
        }

        return { score: diff, signals };
    }

    /**
     * تحديد نية المستخدم من خلال نسيج الكلمات
     */
    _detectIntent(nodes) {
        const scores = { venting: 0, seeking_help: 0, testing: 0, confirmation: 0 };
        const text = nodes.map(n => n.core).join(' ');

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
     * تحليل المسار الزمني (أهم ميزة للذكاء الاستراتيجي)
     */
    _calculateTrajectory(currentMood, history) {
        if (!history || history.length === 0) return "INITIAL_STATE";
        
        // جلب آخر حالة مزاجية مسجلة من الذاكرة
        const lastEntry = history[history.length - 1];
        const lastMood = lastEntry?.insight?.emotionProfile?.stateModel?.v || lastEntry?.mood || 0;

        const diff = currentMood - lastMood;
        if (diff < -0.3) return "DETERIORATING";
        if (diff > 0.3) return "IMPROVING";
        return "STABLE";
    }

    _splitByPivot(nodes, pivot) {
        if (!pivot) return { before: nodes, after: null };
        return {
            before: nodes.slice(0, pivot.index),
            after: nodes.slice(pivot.index + 1)
        };
    }

    /**
     * قياس قطبية الكتلة اللغوية بناءً على تصنيف العقد
     */
    _getSegmentPolarity(nodes) {
        if (!nodes || nodes.length === 0) return 0;
        let score = 0;
        nodes.forEach(n => {
            if (n.classification.isClin || n.classification.isEmo) score -= 0.5;
            if (n.role === "INTENSIFIER") score *= 1.2;
        });
        return score;
    }

    /**
     * دمج المود العام مع ترجيح ما بعد المفصل بنسبة 70%
     */
    _calculateIntegratedMood(nodes, pivot) {
        const segments = this._splitByPivot(nodes, pivot);
        const b = this._getSegmentPolarity(segments.before);
        if (!segments.after) return b;
        const a = this._getSegmentPolarity(segments.after);
        return (b * 0.3) + (a * 0.7);
    }
}

export default StateSynthesizer;
