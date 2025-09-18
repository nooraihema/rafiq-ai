
// hippocampus/MemoryGraph.js v3.0 - The Mad Dreamer
// "MemoryGraph v3.0 — Emotional, Temporal, Self-Healing, Dreaming Hypotheses"
// - Working memory + Long-term memory
// - Emotional tags and emotion-weighted reinforcement
// - Memory Fusion integration with KnowledgeAtomizer atoms
// - Dreaming produces hypothesized links & hypotheses (meta-knowledge)
// - Self-healing / archive policy & memory replay
// - Meta-statistics and diagnostics
//
// Expected imports (project):
//  - ../shared/config.js  (DEBUG, DATA_DIR, DEFAULTS...)
//  - ../shared/utils.js   (normalizeArabic, tokenize)
//  - ../hippocampus/KnowledgeAtomizer.js (optional) - not required but useful for replay validation
//
// No external libs other than node built-ins.

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { DEBUG, DATA_DIR } from "../shared/config.js";
import { normalizeArabic, tokenize } from "../shared/utils.js";

// ---------- Tunables (brain chemistry v3.0) ----------
const NODES_FILE = path.join(DATA_DIR, "memory_graph_nodes.json");
const EDGES_FILE = path.join(DATA_DIR, "memory_graph_edges.json");
const HYPOTHESES_FILE = path.join(DATA_DIR, "memory_graph_hypotheses.json");

const WORKING_WINDOW = 50; // messages kept in working memory snapshot
const PROMOTION_THRESHOLD = 3; // number of reinforcements before promoting to long-term
const INITIAL_NODE_STRENGTH = 1.0;
const INITIAL_EDGE_STRENGTH = 1.0;
const REINFORCEMENT_FACTOR = 1.18;    // recall boost
const ASSOCIATIVE_FACTOR = 1.08;      // neighbor boost on reinforcement
const DECAY_RATE_PER_DAY = 0.985;     // slower forgetting
const ARCHIVE_THRESHOLD = 0.08;       // below this -> archive
const DREAM_LINK_THRESHOLD = 0.35;    // nodes considered for dreaming
const DREAM_COMMON_NEIGHBORS = 2;     // heuristic for dreaming link creation
const SELF_HEAL_GRACE = 1.5;          // multiplier to delay deletion if neighbors support
const MAX_HYPOTHESIS_PER_DREAM = 10;
const REPLAY_BATCH = 10;              // how many memories to replay in a dream
const METASTATS_RETENTION = 2000;     // how many events to keep in meta log

// ---------- Data structures ----------
// Node:
// {
//   id: "concept:anxiety",
//   type: "concept" | "entity" | "compound",
//   value: "anxiety",
//   strength: 1.0,
//   lastAccessed: ISOString,
//   createdAt: ISOString,
//   promotions: number,        // how many times reinforced (for promotion rule)
//   emotionalWeights: { fear:0.6, sadness:0.2, joy:0.0 },
//   tags: ["work_related","chronic"],
//   working: true|false,       // whether in working memory / short-term
//   archived: false
// }
//
// Edge:
// {
//   id: "causes:concept:work:concept:anxiety",
//   source: "concept:work",
//   target: "concept:anxiety",
//   type: "causes" | "related_to" | "hypothesized" | ...,
//   strength: 1.0,
//   lastAccessed: ISOString,
//   createdAt: ISOString,
//   archived: false
// }
//
// Hypothesis:
// {
//   id, generatedAt, nodes: [idA,idB], type: 'hypothesized', evidence: [...], strength
// }

class MemoryGraph {
  constructor() {
    this.nodes = new Map(); // id -> node
    this.edges = new Map(); // id -> edge
    this.hypotheses = new Map(); // id -> hypothesis
    this._initialized = false;

    // Working memory snapshot: array of recent atoms/messages (keeps context)
    this.workingMemory = [];

    // meta-log for diagnostics (capped)
    this.metaLog = [];
  }

  // ----------------- Persistence -----------------
  async initialize() {
    if (this._initialized) return;
    try {
      const nRaw = await fs.readFile(NODES_FILE, "utf8");
      const nArr = JSON.parse(nRaw);
      this.nodes = new Map(nArr.map(n => [n.id, n]));
    } catch (e) {
      if (e.code !== "ENOENT") console.error("[MemoryGraph] load nodes error", e);
      else if (DEBUG) console.log("[MemoryGraph] No nodes file found — starting fresh.");
    }
    try {
      const eRaw = await fs.readFile(EDGES_FILE, "utf8");
      const eArr = JSON.parse(eRaw);
      this.edges = new Map(eArr.map(e => [e.id, e]));
    } catch (e) {
      if (e.code !== "ENOENT") console.error("[MemoryGraph] load edges error", e);
      else if (DEBUG) console.log("[MemoryGraph] No edges file found — starting fresh.");
    }
    try {
      const hRaw = await fs.readFile(HYPOTHESES_FILE, "utf8");
      const hArr = JSON.parse(hRaw);
      this.hypotheses = new Map(hArr.map(h => [h.id, h]));
    } catch (e) {
      if (e.code !== "ENOENT") console.error("[MemoryGraph] load hypotheses error", e);
      else if (DEBUG) console.log("[MemoryGraph] No hypotheses file found — starting fresh.");
    }
    this._initialized = true;
    if (DEBUG) this._meta("init", `Loaded ${this.nodes.size} nodes, ${this.edges.size} edges, ${this.hypotheses.size} hypotheses`);
  }

  async persist() {
    if (!this._initialized) throw new Error("MemoryGraph not initialized");
    try {
      await fs.writeFile(NODES_FILE, JSON.stringify(Array.from(this.nodes.values()), null, 2));
      await fs.writeFile(EDGES_FILE, JSON.stringify(Array.from(this.edges.values()), null, 2));
      await fs.writeFile(HYPOTHESES_FILE, JSON.stringify(Array.from(this.hypotheses.values()), null, 2));
      if (DEBUG) this._meta("persist", `Persisted nodes:${this.nodes.size} edges:${this.edges.size} hyp:${this.hypotheses.size}`);
    } catch (e) {
      console.error("[MemoryGraph] persist error", e);
    }
  }

  // ----------------- Utilities -----------------
  _id(prefix = "") {
    return prefix + crypto.randomBytes(8).toString("hex");
  }

  _nodeId(type, value) {
    return `${type}:${normalizeArabic(String(value || "")).replace(/\s+/g, "_")}`;
  }

  _edgeId(type, sourceId, targetId) {
    return `${type}:${sourceId}->${targetId}`;
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _meta(event, detail) {
    const entry = { ts: Date.now(), event, detail };
    this.metaLog.push(entry);
    if (this.metaLog.length > METASTATS_RETENTION) this.metaLog.shift();
    if (DEBUG) console.log("[MemoryGraph.meta]", event, detail);
  }

  // ----------------- Node & Edge APIs -----------------
  getNode(nodeId) { return this.nodes.get(nodeId) || null; }
  getEdge(edgeId) { return this.edges.get(edgeId) || null; }

  getNeighbors(nodeId) {
    const nb = new Set();
    for (const e of this.edges.values()) {
      if (e.archived) continue;
      if (e.source === nodeId) nb.add(e.target);
      if (e.target === nodeId) nb.add(e.source);
    }
    return Array.from(nb);
  }

  findEdgeBetween(aId, bId) {
    for (const e of this.edges.values()) {
      if (e.archived) continue;
      if (e.source === aId && e.target === bId) return e;
      if (e.source === bId && e.target === aId) return e;
    }
    return null;
  }

  // ----------------- Ingestion & Reinforcement -----------------
  /**
   * Ingest a Knowledge Atom (from KnowledgeAtomizer) into the graph.
   * This will:
   *  - update working memory
   *  - reinforce nodes & edges
   *  - register emotional weights & tags
   *  - optionally create compound nodes for combined concepts/emotions
   */
  ingest(knowledgeAtom = {}) {
    if (!this._initialized) throw new Error("MemoryGraph not initialized");
    if (!knowledgeAtom || typeof knowledgeAtom !== "object") return;

    const now = this._nowISO();

    // push to working memory (keep text + atom)
    this.workingMemory.push({ ts: now, atom: knowledgeAtom });
    if (this.workingMemory.length > WORKING_WINDOW) this.workingMemory.shift();

    // extract concepts and emotions
    const concepts = (knowledgeAtom.concepts || []).map(c => c.concept);
    const emotionProfile = knowledgeAtom.emotionProfile || {}; // {fear:0.6,...}
    const tags = knowledgeAtom.tags || [];
    const dissonance = knowledgeAtom.dissonanceFlags || [];
    const subtext = knowledgeAtom.subtextIntents || [];

    // reinforce each concept node, attach emotionalWeights and tags
    const nodesArray = [];
    for (const c of concepts) {
      const id = this._nodeId("concept", c);
      const node = this._ensureNode(id, { type: "concept", value: c, createdAt: now });
      // reinforce
      this._reinforceNode(node, emotionProfile, tags, knowledgeAtom);
      nodesArray.push(node);
    }

    // create & reinforce relations (edges) from atom.relations
    for (const rel of (knowledgeAtom.relations || [])) {
      const src = this._nodeId("concept", rel.subject);
      const tgt = this._nodeId("concept", rel.object);
      // ensure nodes
      const nSrc = this._ensureNode(src, { type: "concept", value: rel.subject, createdAt: now });
      const nTgt = this._ensureNode(tgt, { type: "concept", value: rel.object, createdAt: now });
      // reinforce nodes again (context)
      this._reinforceNode(nSrc, emotionProfile, tags, knowledgeAtom);
      this._reinforceNode(nTgt, emotionProfile, tags, knowledgeAtom);
      // edge
      const eid = this._edgeId(rel.verb, src, tgt);
      this._ensureEdge(eid, { source: src, target: tgt, type: rel.verb, createdAt: now });
      this._reinforceEdge(eid, knowledgeAtom);
    }

    // create compound node linking top concept + top emotion (helps later retrieval)
    const topEmotion = Object.keys(emotionProfile || {})[0] || null;
    if (topEmotion && concepts.length > 0) {
      const topConceptId = this._nodeId("concept", concepts[0]);
      const compoundId = this._nodeId("compound", `${concepts[0]}+${topEmotion}`);
      const comp = this._ensureNode(compoundId, { type: "compound", value: `${concepts[0]}|${topEmotion}`, createdAt: now });
      this._reinforceNode(comp, emotionProfile, tags, knowledgeAtom);
      // link compound to concept
      const ceId = this._edgeId("expresses_emotion", compoundId, topConceptId);
      this._ensureEdge(ceId, { source: compoundId, target: topConceptId, type: "expresses_emotion", createdAt: now });
      this._reinforceEdge(ceId, knowledgeAtom);
    }

    // perform fast self-heal check to prevent premature deletion of related nodes
    this._selfHealNeighbors(nodesArray);

    this._meta("ingest", `ingested atom ${knowledgeAtom.atomId || "(anon)"} concepts:${concepts.length} relations:${(knowledgeAtom.relations||[]).length}`);
  }

  _ensureNode(nodeId, base = {}) {
    let node = this.nodes.get(nodeId);
    if (!node) {
      node = {
        id: nodeId,
        type: base.type || "concept",
        value: base.value || nodeId.split(":").slice(1).join(":"),
        strength: INITIAL_NODE_STRENGTH,
        createdAt: base.createdAt || this._nowISO(),
        lastAccessed: this._nowISO(),
        promotions: 0,
        emotionalWeights: {},
        tags: base.tags || [],
        working: true,
        archived: false
      };
      this.nodes.set(nodeId, node);
      if (DEBUG) this._meta("node_create", nodeId);
    }
    return node;
  }

  _reinforceNode(node, emotionProfile = {}, tags = [], atom = {}) {
    // reinforcement multiplier depends on presence of emotions & tags
    const emoBoost = Math.min(1 + (Object.values(emotionProfile || {}).reduce((a,b)=>a+b,0) || 0) * 0.35, 2.0);
    node.strength = Math.min(node.strength * REINFORCEMENT_FACTOR * emoBoost, 1000);
    node.lastAccessed = this._nowISO();
    node.promotions = (node.promotions || 0) + 1;

    // merge emotional weights (weighted average)
    for (const [e, v] of Object.entries(emotionProfile || {})) {
      node.emotionalWeights[e] = Math.max(node.emotionalWeights[e] || 0, v);
    }

    // merge tags
    for (const t of (tags || [])) {
      if (!node.tags.includes(t)) node.tags.push(t);
    }

    // keep as working memory if recent
    node.working = true;

    // associative reinforcement to neighbors
    const neighbors = this.getNeighbors(node.id);
    for (const nid of neighbors) {
      const nb = this.nodes.get(nid);
      if (nb) {
        nb.strength = Math.min(nb.strength * ASSOCIATIVE_FACTOR, 1000);
      }
    }

    // promote to long term if promotions exceed threshold
    if (node.promotions >= PROMOTION_THRESHOLD && node.working) {
      node.working = false; // promote
      if (DEBUG) this._meta("promote", `node ${node.id} promoted to long-term`);
    }

    // auto-archive guard: if node strength dropped then we'll check later in decay
    this.nodes.set(node.id, node);
  }

  _ensureEdge(edgeId, base = {}) {
    let edge = this.edges.get(edgeId);
    if (!edge) {
      edge = {
        id: edgeId,
        source: base.source,
        target: base.target,
        type: base.type || "related_to",
        strength: INITIAL_EDGE_STRENGTH,
        createdAt: base.createdAt || this._nowISO(),
        lastAccessed: this._nowISO(),
        archived: false
      };
      this.edges.set(edgeId, edge);
      if (DEBUG) this._meta("edge_create", edgeId);
    }
    return edge;
  }

  _reinforceEdge(edgeId, atom = {}) {
    const edge = this._ensureEdge(edgeId, { source: this.edges.get(edgeId)?.source, target: this.edges.get(edgeId)?.target, type: this.edges.get(edgeId)?.type });
    edge.strength = Math.min(edge.strength * REINFORCEMENT_FACTOR, 1000);
    edge.lastAccessed = this._nowISO();
    this.edges.set(edge.id, edge);
  }

  // ----------------- Decay & Self-Healing -----------------
  applyDecay() {
    const now = new Date();
    // nodes
    for (const node of Array.from(this.nodes.values())) {
      if (node.archived) continue;
      const last = new Date(node.lastAccessed);
      const days = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        node.strength *= Math.pow(DECAY_RATE_PER_DAY, days);
      }
      // if it's very weak, consider archive but run self-heal check
      if (node.strength < ARCHIVE_THRESHOLD) {
        const neighbors = this.getNeighbors(node.id).map(id => this.nodes.get(id)).filter(Boolean);
        const neighborSupport = neighbors.reduce((a,b)=>a + (b.strength || 0), 0);
        if (neighborSupport > SELF_HEAL_GRACE) {
          // postpone deletion - boost slightly to keep it alive
          node.strength *= 1.05;
          if (DEBUG) this._meta("self_heal_delay", node.id);
        } else {
          // archive (delete from active graph)
          node.archived = true;
          this.nodes.delete(node.id);
          if (DEBUG) this._meta("archive_node", node.id);
          // also remove edges connected
          for (const eid of Array.from(this.edges.keys())) {
            const e = this.edges.get(eid);
            if (e.source === node.id || e.target === node.id) {
              this.edges.delete(eid);
              if (DEBUG) this._meta("archive_edge", eid);
            }
          }
        }
      }
    }

    // edges
    for (const edge of Array.from(this.edges.values())) {
      if (edge.archived) continue;
      const last = new Date(edge.lastAccessed);
      const days = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
      if (days > 0) edge.strength *= Math.pow(DECAY_RATE_PER_DAY, days);
      if (edge.strength < ARCHIVE_THRESHOLD) {
        this.edges.delete(edge.id);
        if (DEBUG) this._meta("archive_edge", edge.id);
      }
    }

    if (DEBUG) this._meta("decay", `decay applied nodes:${this.nodes.size} edges:${this.edges.size}`);
  }

  // Self-heal: prevent premature deletion of neighbors by slight reinforcement
  _selfHealNeighbors(nodesArray = []) {
    for (const node of nodesArray) {
      const n = this.nodes.get(node.id);
      if (!n) continue;
      const neighbors = this.getNeighbors(n.id);
      for (const nid of neighbors) {
        const nb = this.nodes.get(nid);
        if (nb && nb.strength < nb.initialStrength * 2) {
          nb.strength *= 1.02; // tiny uplift
        }
      }
    }
  }

  // ----------------- Dreaming & Hypothesis Generation -----------------
  /**
   * Dream: analyze strongly activated nodes and hypothesize new links or rules.
   * Produces hypothesis objects and creates 'hypothesized' edges.
   */
  dream({ replay = true, creativeBias = 1.0 } = {}) {
    if (!this._initialized) throw new Error("MemoryGraph not initialized");
    if (DEBUG) this._meta("dream_start", `workingMemory:${this.workingMemory.length}`);

    const strongNodes = Array.from(this.nodes.values()).filter(n => !n.archived && n.strength > DREAM_LINK_THRESHOLD);
    // sort by strength descending
    strongNodes.sort((a,b)=>b.strength - a.strength);

    // Optionally replay recent memories to boost relevant nodes (memory consolidation)
    if (replay && this.workingMemory.length) {
      const batch = this.workingMemory.slice(-REPLAY_BATCH);
      for (const rec of batch) {
        const atom = rec.atom;
        for (const c of (atom.concepts || [])) {
          const nid = this._nodeId("concept", c.concept);
          const node = this.nodes.get(nid);
          if (node) {
            // small replay reinforcement
            node.strength = Math.min(node.strength * (1 + 0.02 * creativeBias), 1000);
            node.lastAccessed = this._nowISO();
          }
        }
      }
    }

    let newHypotheses = 0;
    const consideredPairs = new Set();

    for (let i = 0; i < strongNodes.length; i++) {
      for (let j = i + 1; j < strongNodes.length; j++) {
        if (newHypotheses >= MAX_HYPOTHESIS_PER_DREAM) break;
        const a = strongNodes[i], b = strongNodes[j];
        const pairKey = `${a.id}::${b.id}`;
        if (consideredPairs.has(pairKey)) continue;
        consideredPairs.add(pairKey);

        // existing strong edge? skip
        const existing = this.findEdgeBetween(a.id, b.id);
        if (existing && existing.strength > 0.6) continue;

        // common neighbors heuristic
        const neighA = this.getNeighbors(a.id);
        const neighB = this.getNeighbors(b.id);
        const common = neighA.filter(x => neighB.includes(x));
        if (common.length >= DREAM_COMMON_NEIGHBORS) {
          // create hypothesized edge
          const eid = this._edgeId("hypothesized_by_dream", a.id, b.id);
          if (!this.edges.has(eid)) {
            const evidence = common.slice(0,3);
            const hypId = this._id("hyp_");
            const hypothesis = {
              id: hypId,
              generatedAt: this._nowISO(),
              nodes: [a.id, b.id],
              type: "cooccurrence_hypothesis",
              evidence,
              strength: 0.4 + Math.min(0.5, (a.strength + b.strength)/100), // base confidence
            };
            this.hypotheses.set(hypId, hypothesis);
            // create edge and set moderate strength
            this._ensureEdge(eid, { source: a.id, target: b.id, type: "hypothesized_by_dream", createdAt: this._nowISO() });
            const createdEdge = this.edges.get(eid);
            createdEdge.strength = hypothesis.strength;
            createdEdge.lastAccessed = this._nowISO();
            newHypotheses++;
            this._meta("dream_hypothesis", `hyp:${hypId} edge:${eid}`);
          }
        }
      }
      if (newHypotheses >= MAX_HYPOTHESIS_PER_DREAM) break;
    }

    // After dreaming, slightly consolidate hypothesized links by associative boost
    for (const hyp of this.hypotheses.values()) {
      // if hypothesis nodes still have supporting neighbors, increase strength
      const support = hyp.nodes.reduce((s, nid) => {
        const n = this.nodes.get(nid);
        return s + (n ? n.strength : 0);
      }, 0);
      hyp.strength = Math.min(hyp.strength + support * 0.0005, 1.0);
    }

    if (DEBUG) this._meta("dream_end", `newHypotheses:${newHypotheses}`);
    return { newHypotheses, hypotheses: Array.from(this.hypotheses.values()).slice(-newHypotheses) };
  }

  // ----------------- Hypothesis testing via replay (validate) -----------------
  /**
   * Validate hypotheses by attempting to find corroborating atoms in working memory or stored events.
   * Simple heuristic scoring: find atoms that mention both nodes and contain related relation types.
   */
  validateHypotheses(limit = 50) {
    const results = [];
    const atoms = this.workingMemory.map(w => w.atom).slice(-limit);
    for (const hyp of Array.from(this.hypotheses.values())) {
      let score = 0;
      for (const atom of atoms) {
        const atomConcepts = (atom.concepts || []).map(c => c.concept);
        const names = hyp.nodes.map(nid => this.nodes.get(nid)?.value).filter(Boolean);
        if (names.every(n => atomConcepts.includes(n))) score += 1;
        // check relations
        for (const rel of (atom.relations || [])) {
          if (names.includes(rel.subject) && names.includes(rel.object)) score += 2;
        }
      }
      results.push({ hypothesisId: hyp.id, rawScore: score, normalized: Math.min(1, score / (atoms.length || 1)) });
    }
    return results;
  }

  // ----------------- Meta stats & queries -----------------
  getStats() {
    const topNodes = Array.from(this.nodes.values()).sort((a,b)=>b.strength - a.strength).slice(0,10);
    const topEdges = Array.from(this.edges.values()).sort((a,b)=>b.strength - a.strength).slice(0,10);
    return {
      nodesCount: this.nodes.size,
      edgesCount: this.edges.size,
      hypothesesCount: this.hypotheses.size,
      topNodes: topNodes.map(n => ({ id: n.id, value: n.value, strength: n.strength })),
      topEdges: topEdges.map(e => ({ id: e.id, type: e.type, strength: e.strength })),
      workingMemoryLen: this.workingMemory.length,
      metaLogLen: this.metaLog.length
    };
  }

  // Search by text (normalized) across nodes
  searchNodes(q = "") {
    const nq = normalizeArabic(q || "").replace(/\s+/g, "_");
    return Array.from(this.nodes.values()).filter(n => (n.value || "").includes(nq));
  }

  // ----------------- Helper utilities -----------------
  // average emotional profile across nodes
  aggregateEmotion({ top = 5 } = {}) {
    const emo = {};
    for (const n of Array.from(this.nodes.values()).slice(0, top)) {
      for (const [k, v] of Object.entries(n.emotionalWeights || {})) {
        emo[k] = (emo[k] || 0) + v;
      }
    }
    // normalize
    const total = Object.values(emo).reduce((a,b)=>a+b,0) || 1;
    for (const k of Object.keys(emo)) emo[k] = Number((emo[k]/total).toFixed(3));
    return emo;
  }

  // ----------------- Public maintenance ops -----------------
  // prune weak stuff immediately (hard delete)
  pruneArchive() {
    let removed = 0;
    for (const [id, n] of Array.from(this.nodes.entries())) {
      if (n.archived) { this.nodes.delete(id); removed++; }
    }
    for (const [id, e] of Array.from(this.edges.entries())) {
      if (e.archived) { this.edges.delete(id); removed++; }
    }
    for (const [id, h] of Array.from(this.hypotheses.entries())) {
      // optionally prune low-strength hypotheses
      if (h.strength < 0.05) this.hypotheses.delete(id);
    }
    this._meta("prune", `removed:${removed}`);
    return removed;
  }

  // manual merge two nodes (useful for synonym consolidation)
  mergeNodes(aId, bId, keepId = null) {
    const a = this.nodes.get(aId);
    const b = this.nodes.get(bId);
    if (!a || !b) return null;
    const target = keepId ? this.nodes.get(keepId) || a : a;
    // absorb b into target
    target.strength = Math.max(target.strength, b.strength) * 1.05;
    target.tags = Array.from(new Set([...(target.tags||[]), ...(b.tags||[])]));
    // rewire edges from b to target
    for (const e of Array.from(this.edges.values())) {
      if (e.source === bId) e.source = target.id;
      if (e.target === bId) e.target = target.id;
      // fix id string? keep it simple: leave id as-is (edges are unique strings)
    }
    this.nodes.delete(bId);
    this._meta("merge", `merged ${bId} -> ${target.id}`);
    return target;
  }
}

// Export singleton
export const memoryGraph = new MemoryGraph();

// ---------- fallback normalization (in case shared utils differ) ----------
export function normalizeArabicLocal(text = "") {
  return normalizeArabic ? normalizeArabic(text) : text.toString().toLowerCase().replace(/[^ء-ي0-9a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

// ----------------- Quick demo runner when executed directly -----------------
// if (require.main === module) {
  (async () => {
    await memoryGraph.initialize();
    // small demo atom (mock)
    const atom = {
      atomId: "demo1",
      concepts: [{ concept: "work" }, { concept: "anxiety" }],
      relations: [{ subject: "work", verb: "causes", object: "anxiety" }],
      emotionProfile: { fear: 0.7, sadness: 0.2 },
      tags: ["work_related", "distress"],
      dissonanceFlags: []
    };
    memoryGraph.ingest(atom);
    memoryGraph.applyDecay();
    const dreamRes = memoryGraph.dream({ replay: true });
    console.log("Dream result:", dreamRes);
    console.log("Stats:", memoryGraph.getStats());
    await memoryGraph.persist();
  })();
