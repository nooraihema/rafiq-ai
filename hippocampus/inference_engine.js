// /hippocampus/inference_engine.js
// InferenceEngine v3.1 - The Transcendent Mind (Adapted for the new Cognitive Architecture)
// This version is adapted to work with the new UserMemoryGraph and its
// ComprehensiveInsight objects, replacing the dependency on the legacy KnowledgeAtomizer.

// --- Helper Functions ---
function nowISO() { return new Date().toISOString(); }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// Default motivations can be overridden in options
const DEFAULT_MOTIVATIONS = [
  { id: "validation", keywords: ["validation", "approval", "تقدير", "اعجاب"], weight: 1 },
  { id: "belonging", keywords: ["انتماء", "صحبة", "وحيد"], weight: 1 },
  { id: "control", keywords: ["تحكم", "سيطرة", "خوف من فقدان"], weight: 1 },
  { id: "safety", keywords: ["أمان", "استقرار", "خوف"], weight: 1 },
  { id: "meaning", keywords: ["معنى", "هدف", "رسالة"], weight: 1 }
];

export class InferenceEngine {
  /**
   * @param {UserMemoryGraph} memoryGraph - An instance of the adapted UserMemoryGraph.
   * @param {object} options - { debug: bool, motivations: Array }
   */
  constructor(memoryGraph, options = {}) {
    if (!memoryGraph) throw new Error("InferenceEngine requires a UserMemoryGraph instance.");
    this.graph = memoryGraph;
    this.beliefs = new Map(); // beliefId -> belief object
    this.options = options || {};
    this.DEBUG = this.options.debug || process.env.NODE_ENV !== 'production';
    this.motivations = this.options.motivations || DEFAULT_MOTIVATIONS;
    this.meta = { lastRun: null, cycles: 0 };
  }

  // ---------- Main public API ----------
  /**
   * Orchestrates the whole reasoning cycle and returns a rich cognitive profile.
   */
  async generateCognitiveProfile({ forceRevalidate = false } = {}) {
    if (this.DEBUG) console.log("\n🧠 [InferenceEngine.v3.1] starting cognitive cycle...");

    // 1. Introspection (discover patterns)
    const insights = this._performIntrospection();

    // 1b. Generate counterfactual hypotheses from insights (creative)
    const counterfactuals = this._generateCounterfactuals(insights);

    // 2. Belief formation & updating (incorporate provenance)
    this._updateBeliefs(insights);

    // 3. Test beliefs (validate against memory via replay & hypothesis testing)
    const beliefTests = this._testBeliefs({ forceRevalidate });

    // 4. Meta-cognition: estimate uncertainty and propose corrective actions
    const uncertaintyProfile = this._estimateUncertainty(insights, beliefTests);

    // 5. Theory of Mind: predict feelings, needs, motivations, conflict
    const theoryOfMind = this._developTheoryOfMind();

    // 6. Self-healing: generate corrective or probing questions / actions
    const correctiveActions = this._generateCorrectiveActions(uncertaintyProfile, theoryOfMind);

    // 7. Decay & Housekeeping for beliefs
    this._decayBeliefs();

    this.meta.lastRun = nowISO();
    this.meta.cycles += 1;

    const profile = {
      timestamp: nowISO(),
      insights,
      counterfactuals,
      beliefs: Array.from(this.beliefs.values()),
      beliefTests,
      uncertaintyProfile,
      theoryOfMind,
      correctiveActions,
      meta: this.meta
    };

    if (this.DEBUG) console.log("✅ [InferenceEngine.v3.1] profile ready.");
    return profile;
  }

  // ---------- STEP 1: Introspection (extended) ----------
  _performIntrospection() {
    const insights = [];
    const nodes = Array.from(this.graph.nodes.values());
    const edges = Array.from(this.graph.edges.values());

    // A. Paradoxical co-occurrence
    const topNodes = nodes.sort((a,b)=>b.strength - a.strength).slice(0, 40);
    for (let i = 0; i < topNodes.length; i++) {
      for (let j = i + 1; j < Math.min(topNodes.length, i + 8); j++) {
        const A = topNodes[i], B = topNodes[j];
        const common = this._commonNeighbors(A.id, B.id);
        if (common.length > 1 && this._areConceptuallyDistant(A.value, B.value)) {
          insights.push({
            type: "paradox_insight",
            title: `Paradox: ${A.value} ↔ ${B.value}`,
            description: `Concepts '${A.value}' and '${B.value}' appear together across contexts ${common.slice(0,3).join(", ")}`,
            nodes: [A.id, B.id],
            strength: clamp01((A.strength + B.strength) / 10)
          });
        }
      }
    }

    // B. Causal chain detection (A -> B -> C)
    const causalEdges = edges.filter(e => e.type === "causes" || e.type === "contains_concept");
    for (const e1 of causalEdges) {
      for (const e2 of causalEdges) {
        if (e1.target === e2.source) {
          const A = this.graph.nodes.get(e1.source);
          const B = this.graph.nodes.get(e1.target);
          const C = this.graph.nodes.get(e2.target);
          if (A && B && C) {
            insights.push({
              type: "causal_chain",
              title: `Causal chain: ${A.value} → ${B.value} → ${C.value}`,
              description: `Detected potential chain where '${A.value}' leads to '${B.value}' and then to '${C.value}'.`,
              nodes: [A.id, B.id, C.id],
              strength: clamp01((e1.strength + e2.strength) / 2)
            });
          }
        }
      }
    }

    // C. Chronic pattern detection (from new insight structure)
    const wm = this.graph.workingMemory || [];
    const flatConcepts = wm.flatMap(w => w.insight?.semanticMap?.allConcepts || []);
    const freq = {};
    for (const c of flatConcepts) freq[c] = (freq[c] || 0) + 1;
    for (const [concept, count] of Object.entries(freq)) {
      if (count >= 2) {
        insights.push({
          type: "repetitive_pattern",
          title: `Repetition: ${concept}`,
          description: `Concept '${concept}' repeated ${count} times in short-term context.`,
          nodes: [`concept:${concept}`],
          strength: clamp01(count / Math.max(3, wm.length))
        });
      }
    }

    // D. Hypothesis-driven insight
    const hyps = Array.from(this.graph.hypotheses.values()).slice(-50);
    for (const h of hyps) {
      if (h.strength > 0.6) {
        insights.push({
          type: "supported_hypothesis",
          title: `Hypothesis supported: ${h.type}`,
          description: `Hypothesis ${h.id} linking ${h.nodes.join(", ")} has strength ${h.strength.toFixed(2)}`,
          hypothesis: h,
          nodes: h.nodes,
          strength: h.strength
        });
      }
    }

    if (this.DEBUG) this._log("introspection", { insightsCount: insights.length });
    return insights;
  }

  _commonNeighbors(aId, bId) {
    const na = new Set(this.graph.getNeighbors(aId));
    const nb = new Set(this.graph.getNeighbors(bId));
    return Array.from(na).filter(x => nb.has(x));
  }

  _areConceptuallyDistant(a, b) {
    if (!a || !b || a === b) return false;
    const la = a.length, lb = b.length;
    const diffLen = Math.abs(la - lb);
    const shared = (a.split(" ").filter(tok => b.includes(tok))).length;
    return (shared === 0 && diffLen > 0);
  }

  // ---------- STEP 2: Belief formation / update (with provenance) ----------
  _updateBeliefs(insights = []) {
    for (const ins of insights) {
      const beliefId = `${ins.type}:${ins.title}`;
      const now = nowISO();
      const provenance = { discoveredAt: now, nodes: ins.nodes || [], source: ins.type, meta: ins };

      if (this.beliefs.has(beliefId)) {
        const b = this.beliefs.get(beliefId);
        b.strength = clamp01((b.strength * (b.evidenceCount || 1) + (ins.strength || 0)) / ((b.evidenceCount || 1) + 1));
        b.evidenceCount = (b.evidenceCount || 1) + 1;
        b.lastConfirmed = now;
        b.provenance.push(provenance);
      } else {
        const belief = {
          id: beliefId,
          statement: ins.description,
          strength: clamp01(ins.strength || 0.2),
          evidenceCount: 1,
          firstFormed: now,
          lastConfirmed: now,
          provenance: [provenance],
          status: "tentative"
        };
        this.beliefs.set(beliefId, belief);
      }
    }

    for (const b of this.beliefs.values()) {
      if (b.evidenceCount >= 3 && b.strength > 0.4) b.status = "supported";
      if (b.evidenceCount >= 6 && b.strength > 0.65) b.status = "established";
    }

    if (this.DEBUG) this._log("beliefs_update", { count: this.beliefs.size });
  }

  // ---------- STEP 3: Belief testing / validation ----------
  _testBeliefs({ forceRevalidate = false } = {}) {
    const results = [];
    const insightsFromMemory = this.graph.workingMemory.map(w => w.insight).slice(-200);

    for (const belief of this.beliefs.values()) {
      let support = 0, contradict = 0;
      const provNodes = (belief.provenance || []).flatMap(p => p.nodes || []);
      const provValues = provNodes.map(nid => this.graph.nodes.get(nid)?.value).filter(Boolean);

      for (const insight of insightsFromMemory) {
        if (!insight) continue;
        const insightConcepts = insight.semanticMap?.allConcepts || [];
        if (provValues.length && provValues.every(v => insightConcepts.includes(v))) {
            support += 1;
        }
        if (insight.emotionProfile?.dissonance?.dissonanceScore > 0.6) {
            contradict += 1;
        }
      }
      
      const hypSupport = Array.from(this.graph.hypotheses.values()).filter(h => 
        (belief.provenance || []).some(p => p.nodes && p.nodes.every(n => h.nodes.includes(n)))
      ).length;

      const rawScore = support + hypSupport * 1.5 - contradict * 0.8;
      const normalized = clamp01((rawScore / Math.max(1, insightsFromMemory.length * 0.5)) + (belief.strength * 0.3));

      if (normalized > 0.6) belief.status = "supported";
      else if (normalized < 0.2) belief.status = "contradicted";
      else belief.status = "tentative";

      results.push({
        beliefId: belief.id,
        support,
        contradict,
        hypSupport,
        normalizedScore: Number(normalized.toFixed(3)),
        status: belief.status
      });
    }

    if (this.DEBUG) this._log("belief_tests", { tested: results.length });
    return results;
  }

  // ---------- STEP 4: Uncertainty estimation & meta-cognition ----------
  _estimateUncertainty(insights, beliefTests) {
    const tentativeCount = Array.from(this.beliefs.values()).filter(b => b.status === "tentative").length;
    const avgTestScore = (beliefTests.length ? beliefTests.reduce((a, b) => a + b.normalizedScore, 0) / beliefTests.length : 1);
    const uncertainty = clamp01(1 - avgTestScore) * clamp01(tentativeCount / Math.max(1, this.beliefs.size || 1));

    const suggestions = [];
    if (uncertainty > 0.6) suggestions.push("probe_user");
    if (uncertainty > 0.4) suggestions.push("gather_more_memory");
    if (uncertainty < 0.2) suggestions.push("act_confident");

    const profile = { uncertainty: Number(uncertainty.toFixed(3)), suggestions };
    if (this.DEBUG) this._log("uncertainty", profile);
    return profile;
  }

  // ---------- STEP 5: Theory of Mind (richer with motivations & needs) ----------
  _developTheoryOfMind() {
    const tom = {
      predictedFeelings: {},
      activeBeliefs: [],
      predictedNeeds: [],
      motivations: {},
      conflictState: "none"
    };

    const recentInsights = this.graph.workingMemory.slice(-6).map(r => r.insight);
    const recentConcepts = new Set(recentInsights.flatMap(i => i?.semanticMap?.allConcepts || []));

    for (const b of this.beliefs.values()) {
      const provVals = (b.provenance || []).flatMap(p => p.nodes.map(nid => this.graph.nodes.get(nid)?.value).filter(Boolean));
      if (provVals.some(v => recentConcepts.has(v))) tom.activeBeliefs.push(b);
    }

    for (const concept of recentConcepts) {
      const nodeId = `concept:${concept}`;
      const neighbors = this.graph.getNeighbors(nodeId);
      for (const nId of neighbors) {
        const n = this.graph.nodes.get(nId);
        if (!n) continue;
        for (const [emo, val] of Object.entries(n.emotionalWeights || {})) {
          tom.predictedFeelings[emo] = (tom.predictedFeelings[emo] || 0) + (val * (n.strength || 1));
        }
      }
    }
    const totalFeeling = Object.values(tom.predictedFeelings).reduce((a, b) => a + b, 0) || 1;
    Object.keys(tom.predictedFeelings).forEach(k => tom.predictedFeelings[k] = Number((tom.predictedFeelings[k] / totalFeeling).toFixed(3)));

    for (const m of this.motivations) tom.motivations[m.id] = 0;
    for (const concept of recentConcepts) {
      for (const m of this.motivations) {
        for (const kw of m.keywords) {
          if ((concept || "").toLowerCase().includes(kw)) tom.motivations[m.id] += 1 * (m.weight || 1);
        }
      }
    }
    const totalMot = Object.values(tom.motivations).reduce((a, b) => a + b, 0) || 1;
    Object.keys(tom.motivations).forEach(k => tom.motivations[k] = Number((tom.motivations[k] / totalMot).toFixed(3)));

    if (tom.activeBeliefs.some(b => b.id.includes("paradox") || b.statement?.toLowerCase?.().includes("lonely"))) tom.predictedNeeds.push("need_for_integration");
    if (tom.activeBeliefs.some(b => b.id.includes("causal_chain"))) tom.predictedNeeds.push("need_for_insight");
    if (Object.keys(tom.predictedFeelings).length && (tom.predictedFeelings.anxiety || tom.predictedFeelings.fear)) tom.predictedNeeds.push("need_for_reassurance");

    const lastInsight = recentInsights[recentInsights.length - 1] || null;
    if (lastInsight && lastInsight.emotionProfile?.dissonance?.flags.length > 0) {
      tom.conflictState = lastInsight.emotionProfile.dissonance.flags[0];
    }

    if (this.DEBUG) this._log("theory_of_mind", { activeBeliefs: tom.activeBeliefs.length, topMotivation: Object.entries(tom.motivations).sort((a,b)=>b[1]-a[1])[0] });
    return tom;
  }

  // ---------- STEP 6: Generate corrective/probing actions (self-healing) ----------
  _generateCorrectiveActions(uncertaintyProfile, theoryOfMind) {
    const actions = [];
    if (uncertaintyProfile.uncertainty > 0.6) {
      actions.push({ type: "ask_probe", text: "هل تحب تتكلم أكثر عن هذا الموضوع؟" , reason: "high_uncertainty" });
      actions.push({ type: "soft_validation", text: "فهمت إن ده مهم ليك — هل هذا صحيح؟", reason: "confirm_importance" });
    } else if (theoryOfMind.predictedNeeds.includes("need_for_integration")) {
      actions.push({ type: "integration_prompt", text: "أشعر بوجود جوانب متضاربة — هل تفضّل أن نربطهم سويًا؟", reason: "integration" });
    } else {
      actions.push({ type: "reflective_statement", text: "أفهم أنك تمر بشيء مهم — أنا هون معك.", reason: "support" });
    }

    const tentativeLow = Array.from(this.beliefs.values()).filter(b => b.status === "tentative" && (b.strength || 0) < 0.4);
    for (const t of tentativeLow.slice(0,3)) {
      actions.push({ type: "targeted_probe", text: `هل صحيح أن ${t.statement}?`, beliefId: t.id, reason: "resolve_belief" });
    }

    if (this.DEBUG) this._log("corrective_actions", { count: actions.length });
    return actions;
  }

  // ---------- utilities: generate counterfactuals from insights ----------
  _generateCounterfactuals(insights = []) {
    const cfs = [];
    for (const ins of insights) {
      if (ins.type === "causal_chain") {
        cfs.push({
          id: `cf:${ins.title}:${Date.now()}`,
          type: "remove_middle",
          premise: ins,
          hypothesis: `If the middle factor ( ${ins.nodes[1]} ) were absent, the chain may collapse.`,
          confidence: clamp01(1 - (ins.strength || 0))
        });
      } else if (ins.type === "paradox_insight") {
        cfs.push({
          id: `cf:paradox:${Date.now()}`,
          type: "alternate_explanation",
          premise: ins,
          hypothesis: `Maybe ${ins.nodes[0]} and ${ins.nodes[1]} co-occur because of a hidden mediator.`,
          confidence: clamp01(1 - (ins.strength || 0))
        });
      }
    }
    if (this.DEBUG) this._log("counterfactuals", { count: cfs.length });
    return cfs;
  }

  // ---------- Belief decay over time (keeps beliefs fresh) ----------
  _decayBeliefs() {
    const now = Date.now();
    for (const b of this.beliefs.values()) {
      const last = new Date(b.lastConfirmed).getTime();
      const ageDays = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
      const decay = Math.pow(0.98, ageDays);
      b.strength = clamp01(b.strength * decay);
      if (b.strength < 0.05 && (b.evidenceCount || 0) < 2) {
        this.beliefs.delete(b.id);
        if (this.DEBUG) this._metaLog(`belief_pruned:${b.id}`);
      }
    }
  }

  // small helper for debug logging
  _log(tag, data) {
    if (!this.DEBUG) return;
    console.log(`[InferenceEngine.v3.1.${tag}]`, data);
  }

  _metaLog(msg) {
    if (!this.DEBUG) return;
    console.log(`[InferenceEngine.meta] ${nowISO()} - ${msg}`);
  }
}
