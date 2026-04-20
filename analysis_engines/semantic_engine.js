
/**
 * /analysis_engines/semantic_engine.js
 * SemanticEngine v7.0 - [GOLD PLATE REASONING EDITION]
 * وظيفته: استخلاص المعنى النفسي العميق من "طبق الذهب" وتحليل الأوزان الإكلينيكية.
 */

export class SemanticEngine {
    constructor(dictionaries = {}) {
        console.log("%c🧠 [SemanticEngine v7.0] تهيئة المحرك الدلالي المعتمد على طبق الذهب...", "color: #673AB7; font-weight: bold;");

        // القواميس تستخدم هنا فقط لاسترجاع التعريفات الروابط (Links)
        this.conceptDefs = dictionaries.CONCEPT_DEFINITIONS || {};

        // الأوزان الإكلينيكية الصارمة لضمان عدم تمييع الحالة
        this.CLINICAL_WEIGHTS = {
            depression_symptom: 2.5, // رفع الوزن لضمان رصده
            helplessness: 2.2,
            self_blame: 2.0,
            anxiety: 1.8,
            sadness: 1.4,
            general_distress: 0.9,
            neutral: 0.5
        };
    }

    async analyze(workspace, context = {}) {
        console.log("\n%c[Semantic Reasoning v7.0] PROCESSING GOLD PLATE...", "background:#673AB7;color:#fff;");

        const goldPlate = workspace.goldPlate;
        if (!goldPlate) {
            console.error("❌ [SemanticEngine]: طبق الذهب مفقود. تأكد من تشغيل LexicalProcessor أولاً.");
            return;
        }

        try {
            const nodes = goldPlate.nodes;
            const isShortInput = nodes.length <= 4;
            const attentionMap = workspace.attentionMap || {};

            // 1. استخراج وتحجيم المفاهيم (Hyper-Weighted Extraction)
            const weightedConcepts = this._processConceptsFromNodes(nodes, attentionMap, isShortInput);

            // 2. بناء شبكة العلاقات (Semantic Network)
            const network = this._buildConceptNetwork(weightedConcepts);

            // 3. تحديد الثيمة المسيطرة (Dominant Theme)
            const dominant = this._resolveDominantTheme(weightedConcepts, isShortInput);

            // 4. حساب معامل اليقين (Uncertainty)
            const uncertainty = this._calculatePrecision(nodes, weightedConcepts, isShortInput);

            // =====================================================
            // 🚀 حقن النتائج النهائية في الـ Workspace
            // =====================================================
            workspace.semantic = {
                concepts: weightedConcepts,
                network,
                dominantTheme: dominant.id,
                clinicalFocus: dominant,
                uncertainty,
                _meta: { version: "7.0-Gold-Plate-Ready" }
            };

            // تحديث الحالة العالمية للفضاء
            workspace.state.dominantConcept = dominant.id;
            workspace.state.semanticImpact = dominant.totalWeight;
            workspace.state.semanticUncertainty = uncertainty.score;

            console.log(`   ✅ [Semantic Complete] Focus: ${dominant.id} | Impact: ${dominant.totalWeight.toFixed(2)}`);

        } catch (err) {
            console.error("❌ [SemanticEngine Error]:", err);
        }
    }

    /**
     * معالجة المفاهيم المستخرجة من طبق الذهب ودمجها مع الأوزان الإكلينيكية
     */
    _processConceptsFromNodes(nodes, attentionMap, isShortInput) {
        const found = {};

        nodes.forEach(node => {
            if (!node.concepts || node.concepts.length === 0) return;

            // جلب طاقة الانتباه لهذه العقدة
            const attentionBoost = 1 + (attentionMap[node.text] || 0.5) * 2;
            const shortInputBonus = isShortInput ? 1.5 : 1.0;

            node.concepts.forEach(c => {
                const id = c.id;
                const clinicalBase = this.CLINICAL_WEIGHTS[id] || this.CLINICAL_WEIGHTS.neutral;
                
                // المعادلة الذهبية: وزن القاموس × الوزن الإكلينيكي × طاقة الانتباه × بونص الجمل القصيرة
                const finalImpact = c.weight * clinicalBase * attentionBoost * shortInputBonus;

                if (!found[id]) {
                    found[id] = {
                        id,
                        impact: finalImpact,
                        occurrenceCount: 1,
                        definition: this.conceptDefs[id] || {}
                    };
                } else {
                    found[id].impact += finalImpact;
                    found[id].occurrenceCount++;
                }
            });
        });

        return found;
    }

    /**
     * تحديد المفهوم القائد للحالة
     */
    _resolveDominantTheme(concepts, isShortInput) {
        const sorted = Object.entries(concepts)
            .sort((a, b) => b[1].impact - a[1].impact);

        if (!sorted.length) {
            return {
                id: isShortInput ? "sadness" : "general_distress",
                totalWeight: isShortInput ? 0.5 : 0.2,
                confidence: 0.3
            };
        }

        return {
            id: sorted[0][0],
            totalWeight: sorted[0][1].impact,
            confidence: Math.min(1, sorted[0][1].impact / 4)
        };
    }

    /**
     * بناء شبكة الروابط بين المفاهيم المكتشفة (من التعريفات)
     */
    _buildConceptNetwork(foundConcepts) {
        const connections = [];
        const ids = Object.keys(foundConcepts);

        ids.forEach(id => {
            const links = foundConcepts[id].definition?.links || [];
            links.forEach(link => {
                if (ids.includes(link.concept)) {
                    connections.push({ from: id, to: link.concept, type: link.type });
                }
            });
        });

        return connections;
    }

    /**
     * حساب دقة التشخيص (كلما زاد عدد المفاهيم بالنسبة للكلمات، زاد اليقين)
     */
    _calculatePrecision(nodes, concepts, isShortInput) {
        const knownCount = Object.keys(concepts).length;
        const totalCount = nodes.length || 1;

        let ratio = knownCount / totalCount;
        if (isShortInput) ratio *= 1.2; // في الجمل القصيرة، كلمة واحدة كافية لليقين

        const score = Math.min(0.95, Math.max(0.1, 1 - ratio));

        return {
            score: score,
            level: score > 0.7 ? "HIGH_UNCERTAINTY" : (score > 0.4 ? "MEDIUM" : "LOW")
        };
    }
}

export default SemanticEngine;

