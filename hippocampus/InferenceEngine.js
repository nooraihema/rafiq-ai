
// hippocampus/InferenceEngine.js v3.0 - The Transcendent Mind
// "النسخة الثالثة المعززة" - inference + meta-cognition + hypothesis testing + ToM + motivations
// - يبني معتقدات مع مصادر (provenance)
// - يولد مضادات افتراضية (counterfactuals) ويختبرها عبر الذاكرة
// - يُقيّم مستوى اليقين (uncertainty) ويضع استراتيجيات تصحيح (self-healing)
// - ينتج Theory-of-Mind غنيًا بالاحتياجات والدوافع المحتملة
//
// يعتمد على: MemoryGraph (instance) — يوفر nodes, edges, workingMemory, hypotheses
// متوقع توفر: memoryGraph.getNeighbors, memoryGraph.nodes, memoryGraph.edges, memoryGraph.workingMemory
//
// Export: InferenceEngine class
//
// Usage:
//   const ie = new InferenceEngine(memoryGraph, { DEBUG: true });
//   const profile = await ie.generateCognitiveProfile();

import { DEBUG } from "../shared/config.js";

// مفيد لعمل حسابات تاريخية بسيطة
function nowISO() { return new Date().toISOString(); }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// الافتراضي للدوافع — يمكن تحميله من knowledge_base لاحقًا
const DEFAULT_MOTIVATIONS = [
  { id: "validation", keywords: ["validation", "approval", "تقدير", "اعجاب"], weight: 1 },
  { id: "belonging", keywords: ["انتماء", "صحبة", "وحيد"], weight: 1 },
  { id: "control", keywords: ["تحكم", "سيطرة", "خوف من فقدان"], weight: 1 },
  { id: "safety", keywords: ["أمان", "استقرار", "خوف"], weight: 1 },
  { id: "meaning", keywords: ["معنى", "هدف", "رسالة"], weight: 1 }
];

export class InferenceEngine {
  /**
   * @param {MemoryGraph} memoryGraph - instance of MemoryGraph
   * @param {object} options - { debug: bool, motivations: Array }
   */
  constructor(memoryGraph, options = {}) {
    if (!memoryGraph) throw new Error("InferenceEngine requires a MemoryGraph instance.");
    this.graph = memoryGraph;
    this.beliefs = new Map(); // beliefId -> belief object
    this.options = options || {};
    this.DEBUG = this.options.debug || DEBUG || false;
    this.motivations = this.options.motivations || DEFAULT_MOTIVATIONS;
    this.meta = { lastRun: null, cycles: 0 };
  }

  // ---------- Main public API ----------
  /**
   * Orchestrates the whole reasoning cycle and returns a rich cognitive profile.
   */
  async generateCognitiveProfile({ forceRevalidate = false } = {}) {
    if (this.DEBUG) console.log("\n🧠 [InferenceEngine.v3] starting cognitive cycle...");

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

    if (this.DEBUG) console.log("✅ [InferenceEngine.v3] profile ready.", profile);
    return profile;
  }

  // ---------- STEP 1: Introspection (extended) ----------
  _performIntrospection() {
    const insights = [];
    const nodes = Array.from(this.graph.nodes.values());
    const edges = Array.from(this.graph.edges.values());

    // A. Paradoxical co-occurrence (extended to many pairs)
    // find top N nodes and search for strong but semantically opposite co-occurrences
    const topNodes = nodes.sort((a,b)=>b.strength - a.strength).slice(0, 40);
    for (let i = 0; i < topNodes.length; i++) {
      for (let j = i+1; j < Math.min(topNodes.length, i+8); j++) {
        const A = topNodes[i], B = topNodes[j];
        // heuristic: semantic opposition by tag mismatch and high co-occurrence via neighbors
        const common = this._commonNeighbors(A.id, B.id);
        if (common.length > 1 && this._areConceptuallyDistant(A.value, B.value)) {
          insights.push({
            type: "paradox_insight",
            title: `Paradox: ${A.value} ↔ ${B.value}`,
            description: `Fragments '${A.value}' and '${B.value}' appear together across contexts ${common.slice(0,3).join(", ")}`,
            nodes: [A.id, B.id],
            strength: clamp01((A.strength + B.strength) / 10)
          });
        }
      }
    }

    // B. Causal chain detection (A -> B -> C)
    const causalEdges = edges.filter(e => e.type === "causes");
    for (const e1 of causalEdges) {
      for (const e2 of causalEdges) {
        if (e1.target === e2.source) {
          const A = this.graph.nodes.get(e1.source);
          const B = this.graph.nodes.get(e1.target);
          const C = this.graph.nodes.get(e2.target);
          insights.push({
            type: "causal_chain",
            title: `Causal chain: ${A?.value} → ${B?.value} → ${C?.value}`,
            description: `Detected potential chain where '${A?.value}' leads to '${B?.value}' and then to '${C?.value}'.`,
            nodes: [A?.id, B?.id, C?.id].filter(Boolean),
            strength: clamp01((e1.strength + e2.strength) / 2)
          });
        }
      }
    }

    // C. Chronic pattern detection (topics repeating in working memory)
    const wm = this.graph.workingMemory || [];
    const flatConcepts = wm.flatMap(w => (w.atom?.concepts||[]).map(c => c.concept));
    const freq = {};
    for (const c of flatConcepts) freq[c] = (freq[c]||0)+1;
    for (const [concept, count] of Object.entries(freq)) {
      if (count >= 2) {
        insights.push({
          type: "repetitive_pattern",
          title: `Repetition: ${concept}`,
          description: `Concept '${concept}' repeated ${count} times in short-term context.`,
          nodes: [ `concept:${concept}` ],
          strength: clamp01(count / Math.max(3, wm.length))
        });
      }
    }

    // D. Hypothesis-driven insight: Check graph hypotheses support
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

    if (this.DEBUG) this._log("introspection", {insightsCount: insights.length});
    return insights;
  }

  // helper: common neighbors
  _commonNeighbors(aId, bId) {
    const na = new Set(this.graph.getNeighbors(aId));
    const nb = new Set(this.graph.getNeighbors(bId));
    return Array.from(na).filter(x => nb.has(x));
  }

  // heuristic: are two concepts "distant" (rudimentary semantic check)
  _areConceptuallyDistant(a, b) {
    // simple heuristics: string difference, opposing tags, length difference, etc.
    if (!a || !b) return false;
    if (a === b) return false;
    const la = a.length, lb = b.length;
    const diffLen = Math.abs(la-lb);
    // if words share little substring
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
        // update strength using an evidence-weighted average
        b.strength = clamp01((b.strength * (b.evidenceCount || 1) + (ins.strength || 0)) / ((b.evidenceCount||1) + 1));
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
          status: "tentative" // tentative | supported | contradicted | resolved
        };
        this.beliefs.set(beliefId, belief);
      }
    }

    // Auto-promote beliefs with repeated evidence
    for (const [id, b] of this.beliefs.entries()) {
      if (b.evidenceCount >= 3 && b.strength > 0.4) b.status = "supported";
      if (b.evidenceCount >= 6 && b.strength > 0.65) b.status = "established";
    }

    if (this.DEBUG) this._log("beliefs_update", { count: this.beliefs.size });
  }

  // ---------- STEP 3: Belief testing / validation ----------
  _testBeliefs({ forceRevalidate = false } = {}) {
    const results = [];
    // For each belief, try basic validation: search workingMemory and hypotheses for supporting/contradicting evidence
    const atoms = this.graph.workingMemory.map(w => w.atom).slice(-200);
    for (const [id, belief] of this.beliefs.entries()) {
      let support = 0, contradict = 0;
      // use provenance nodes as keywords
      const provNodes = (belief.provenance || []).flatMap(p => p.nodes || []);
      const provValues = provNodes.map(nid => this.graph.nodes.get(nid)?.value).filter(Boolean);
      for (const atom of atoms) {
        const atomConcepts = (atom.concepts || []).map(c => c.concept);
        // supporting if all provValues appear in atom concepts
        if (provValues.length && provValues.every(v => atomConcepts.includes(v))) support += 1;
        // contradiction heuristic: atom explicitly marks opposite (dissonance, negation)
        if ((atom.dissonanceFlags||[]).length && atom.dissonanceFlags.some(f => f.includes("hidden_negative") || f.includes("masked"))) {
          contradict += 1;
        }
      }
      // hypothesis validation: does graph hypotheses connect belief nodes?
      const hypSupport = Array.from(this.graph.hypotheses.values()).filter(h => (belief.provenance||[]).some(p => p.nodes && p.nodes.every(n=>h.nodes.includes(n)))).length;

      const rawScore = support + hypSupport*1.5 - contradict*0.8;
      const normalized = clamp01((rawScore / Math.max(1, atoms.length * 0.5)) + (belief.strength * 0.3));

      // update belief status based on test
      if (normalized > 0.6) belief.status = "supported";
      else if (normalized < 0.2) belief.status = "contradicted";
      else belief.status = "tentative";

      results.push({
        beliefId: id,
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
    // uncertainty is higher when:
    // - many tentative beliefs
    // - low normalized scores in beliefTests
    // - many counterfactuals exist
    const tentativeCount = Array.from(this.beliefs.values()).filter(b => b.status === "tentative").length;
    const avgTestScore = (beliefTests.length ? beliefTests.reduce((a,b)=>a+b.normalizedScore,0)/beliefTests.length : 1);
    const uncertainty = clamp01(1 - avgTestScore) * clamp01(tentativeCount / Math.max(1, this.beliefs.size || 1));

    const suggestions = [];
    if (uncertainty > 0.6) suggestions.push("probe_user"); // ask clarifying Qs
    if (uncertainty > 0.4) suggestions.push("gather_more_memory"); // increase replay / observation
    if (uncertainty < 0.2) suggestions.push("act_confident"); // use stronger language

    const profile = { uncertainty: Number(uncertainty.toFixed(3)), suggestions };
    if (this.DEBUG) this._log("uncertainty", profile);
    return profile;
  }

  // ---------- STEP 5: Theory of Mind (richer with motivations & needs) ----------
  _developTheoryOfMind() {
    const tom = {
      predictedFeelings: {}, // emotion -> score
      activeBeliefs: [],
      predictedNeeds: [],
      motivations: {},
      conflictState: "none"
    };

    // activate beliefs related to recent concepts
    const recent = this.graph.workingMemory.slice(-6);
    const recentConcepts = new Set(recent.flatMap(r => (r.atom?.concepts||[]).map(c=>c.concept)));

    // active beliefs: any belief whose provenance mentions recent concepts
    for (const b of this.beliefs.values()) {
      const provVals = (b.provenance||[]).flatMap(p => p.nodes.map(nid => this.graph.nodes.get(nid)?.value).filter(Boolean));
      if (provVals.some(v => recentConcepts.has(v))) tom.activeBeliefs.push(b);
    }

    // predicted feelings: aggregate emotionalWeights from neighbors of recent concepts
    for (const concept of recentConcepts) {
      const nodeId = `concept:${concept}`;
      const neighbors = this.graph.getNeighbors(nodeId);
      for (const nId of neighbors) {
        const n = this.graph.nodes.get(nId);
        if (!n) continue;
        // if node carries emotionalWeights, add them
        for (const [emo, val] of Object.entries(n.emotionalWeights || {})) {
          tom.predictedFeelings[emo] = (tom.predictedFeelings[emo] || 0) + (val * (n.strength || 1));
        }
      }
    }
    // normalize top feelings
    const totalFeeling = Object.values(tom.predictedFeelings).reduce((a,b)=>a+b,0) || 1;
    Object.keys(tom.predictedFeelings).forEach(k => tom.predictedFeelings[k] = Number((tom.predictedFeelings[k]/totalFeeling).toFixed(3)));

    // motivations inference: map recentConcepts to motivations using simple keyword heuristics
    for (const m of this.motivations) tom.motivations[m.id] = 0;
    for (const concept of recentConcepts) {
      for (const m of this.motivations) {
        for (const kw of m.keywords) {
          if ((concept || "").toLowerCase().includes(kw)) tom.motivations[m.id] += 1 * (m.weight || 1);
        }
      }
    }
    // normalize motivations
    const totalMot = Object.values(tom.motivations).reduce((a,b)=>a+b,0) || 1;
    Object.keys(tom.motivations).forEach(k => tom.motivations[k] = Number((tom.motivations[k]/totalMot).toFixed(3)));

    // predicted needs: from active beliefs (heuristics)
    if (tom.activeBeliefs.some(b => b.id.includes("paradox") || b.statement?.toLowerCase?.()?.includes("lonely"))) tom.predictedNeeds.push("need_for_integration");
    if (tom.activeBeliefs.some(b => b.id.includes("causal_chain"))) tom.predictedNeeds.push("need_for_insight");
    if (Object.keys(tom.predictedFeelings).length && (tom.predictedFeelings.anxiety || tom.predictedFeelings.fear)) tom.predictedNeeds.push("need_for_reassurance");

    // conflict state: evaluate last atom dissonance
    const lastAtom = (this.graph.workingMemory.slice(-1)[0] || {}).atom || null;
    if (lastAtom && (lastAtom.dissonanceFlags||[]).length > 0) {
      tom.conflictState = lastAtom.dissonanceFlags[0];
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

    // if there are tentative beliefs with low test scores, plan targeted probes
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
        // propose removing middle link
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
    // simple decay: older beliefs lose a fraction unless recently confirmed
    const now = Date.now();
    for (const [id, b] of this.beliefs.entries()) {
      const last = new Date(b.lastConfirmed).getTime();
      const ageDays = Math.max(0, (now - last) / (1000*60*60*24));
      const decay = Math.pow(0.98, ageDays);
      b.strength = clamp01(b.strength * decay);
      // if strength very low and evidenceCount small -> remove
      if (b.strength < 0.05 && (b.evidenceCount || 0) < 2) {
        this.beliefs.delete(id);
        if (this.DEBUG) this._metaLog(`belief_pruned:${id}`);
      }
    }
  }

  // small helper for debug logging
  _log(tag, data) {
    if (!this.DEBUG) return;
    console.log(`[InferenceEngine.v3.${tag}]`, data);
  }

  _metaLog(msg) {
    if (!this.DEBUG) return;
    console.log(`[InferenceEngine.meta] ${nowISO()} - ${msg}`);
  }
}

// ----------------- quick demo when run directly (node) -----------------
// if (require.main === module) {
  (async () => {
    // This demo expects a MemoryGraph instance to exist at ../hippocampus/MemoryGraph.js and be initialized.
    try {
      const mg = (await import("../hippocampus/MemoryGraph.js")).memoryGraph;
      await mg.initialize();
      const ie = new InferenceEngine(mg, { debug: true });
      const profile = await ie.generateCognitiveProfile();
      console.log("Cognitive profile:", JSON.stringify(profile, null, 2));
    } catch (e) {
      console.error("Demo failed - ensure MemoryGraph available and initialized.", e);
    }
  })();

