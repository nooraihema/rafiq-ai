
/**
 * /core/cognitive_governor.js
 * Cognitive Governor v1.0 - Stability & Decision Fusion Layer
 * وظيفته: دمج نتائج Semantic + Emotion + Workspace state
 * ومنع تقلب الحالة + إنتاج قرار نهائي موحد.
 */

export class CognitiveGovernor {
    constructor(options = {}) {
        console.log("%c🧠 [CognitiveGovernor v1.0] Initializing Stability Layer...", "color:#009688;font-weight:bold;");

        this.history = [];
        this.maxHistory = options.maxHistory || 5;

        this.stabilityBias = options.stabilityBias || 0.7; // كلما زاد = ثبات أعلى
    }

    /**
     * 🔥 MAIN DECISION FUNCTION
     */
    resolve(workspace) {
        if (!workspace) return null;

        const semantic = workspace.semantic || {};
        const emotion = workspace.emotion || {};
        const state = workspace.state || {};

        const semanticImpact = state.semanticImpact || 0;
        const uncertainty = state.semanticUncertainty || 0.5;

        const emotionIntensity = emotion?.intensity?.overall || 0;
        const arousal = emotion?.stateModel?.a || 0;

        const dominantConcept = state.dominantConcept || "neutral";
        const mood = state.globalMood || "neutral";

        // =====================================================
        // 🧠 1. Compute weighted cognitive score
        // =====================================================
        let semanticScore = semanticImpact * 0.5;
        let emotionScore = emotionIntensity * 0.4;
        let stabilityPenalty = uncertainty * 0.3;

        let rawScore = semanticScore + emotionScore - stabilityPenalty;

        // =====================================================
        // 🔥 2. Apply stability memory (anti-flip)
        // =====================================================
        const last = this.history[this.history.length - 1];

        if (last && last.dominantConcept === dominantConcept) {
            rawScore *= (1 + this.stabilityBias * 0.2);
        } else if (last && last.dominantConcept !== dominantConcept) {
            rawScore *= (1 - this.stabilityBias * 0.15);
        }

        // =====================================================
        // 🧠 3. Decision classification
        // =====================================================
        let finalIntent = "EMPATHIC_LISTENING";
        let certainty = Math.min(1, Math.abs(rawScore));

        if (rawScore < -0.3) {
            finalIntent = "SUPPORTIVE_INTERVENTION";
        } else if (rawScore > 0.5) {
            finalIntent = "POSITIVE_REINFORCEMENT";
        }

        // =====================================================
        // 🔥 4. Mood smoothing (prevents jumping)
        // =====================================================
        let stabilizedMood = mood;

        if (last?.mood === mood) {
            stabilizedMood = mood;
        } else if (last?.mood && Math.abs(arousal - (last.arousal || 0)) < 0.2) {
            stabilizedMood = last.mood;
        }

        // =====================================================
        // 🧠 5. Save history
        // =====================================================
        this.history.push({
            dominantConcept,
            mood: stabilizedMood,
            arousal,
            score: rawScore
        });

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // =====================================================
        // 📊 OUTPUT FINAL STATE
        // =====================================================
        const result = {
            intent: finalIntent,
            certainty,
            mood: stabilizedMood,
            dominantConcept,
            rawScore,
            trajectory: this._getTrajectory(),
            stability: this._calculateStability()
        };

        // inject back into workspace
        workspace.state.intent = finalIntent;
        workspace.state.certainty = certainty;
        workspace.state.trajectory = result.trajectory;

        console.log("🎯 [Governor Decision]", result);

        return result;
    }

    /**
     * 📈 Track movement trend
     */
    _getTrajectory() {
        if (this.history.length < 2) return "INITIAL";

        const last = this.history[this.history.length - 1].score;
        const prev = this.history[this.history.length - 2].score;

        if (last > prev) return "IMPROVING";
        if (last < prev) return "DECLINING";
        return "STABLE";
    }

    /**
     * 🧠 System stability metric
     */
    _calculateStability() {
        if (this.history.length < 2) return 1;

        let variance = 0;
        for (let i = 1; i < this.history.length; i++) {
            variance += Math.abs(
                this.history[i].score - this.history[i - 1].score
            );
        }

        return Math.max(0, 1 - variance / this.history.length);
    }
}

export default CognitiveGovernor;
