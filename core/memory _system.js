// /core/memory_system.js
// UserMemoryGraph v1.0 - The Evolving Mind
// This is an adaptation of MemoryGraph v3.0, retrofitted to serve as the core
// memory system for the new cognitive architecture. It ingests ComprehensiveInsight
// objects from the LinguisticBrain to build a rich, long-term psychodynamic profile.

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
// --- [تعديل] الاعتماد على utils.js الجديد ---
import { normalizeArabic } from './utils.js';

// --- [تعديل] جعل الإعدادات محلية وقابلة للتعديل ---
const WORKING_WINDOW = 50;
const PROMOTION_THRESHOLD = 3;
const INITIAL_NODE_STRENGTH = 1.0;
const INITIAL_EDGE_STRENGTH = 1.0;
const REINFORCEMENT_FACTOR = 1.18;
const ASSOCIATIVE_FACTOR = 1.08;
const DECAY_RATE_PER_DAY = 0.985;
const ARCHIVE_THRESHOLD = 0.08;
const DREAM_LINK_THRESHOLD = 0.35;
const DREAM_COMMON_NEIGHBORS = 2;
const SELF_HEAL_GRACE = 1.5;
const MAX_HYPOTHESIS_PER_DREAM = 10;
const REPLAY_BATCH = 10;
const METASTATS_RETENTION = 2000;
const DEBUG = process.env.NODE_ENV !== 'production';

export class UserMemoryGraph {
    constructor({ userId }) {
        if (!userId) throw new Error("UserMemoryGraph requires a userId.");
        this.userId = userId;
        
        // --- [تعديل] جعل مسارات التخزين خاصة بالمستخدم ---
        const DATA_DIR = path.join(process.cwd(), ".data"); // استخدام مجلد مخفي للبيانات
        this.NODES_FILE = path.join(DATA_DIR, `${userId}_nodes.json`);
        this.EDGES_FILE = path.join(DATA_DIR, `${userId}_edges.json`);
        this.HYPOTHESES_FILE = path.join(DATA_DIR, `${userId}_hypotheses.json`);

        this.nodes = new Map();
        this.edges = new Map();
        this.hypotheses = new Map();
        this.workingMemory = []; // سيحتوي الآن على ComprehensiveInsight
        this._initialized = false;
        this.metaLog = [];
    }

    // ----------------- Persistence -----------------
    async initialize() {
        if (this._initialized) return;
        try {
            const dataDir = path.dirname(this.NODES_FILE);
            // Check if directory exists, if not, create it.
            try {
                await fs.access(dataDir);
            } catch {
                await fs.mkdir(dataDir, { recursive: true });
            }

            const nRaw = await fs.readFile(this.NODES_FILE, "utf8");
            const nArr = JSON.parse(nRaw);
            this.nodes = new Map(nArr.map(n => [n.id, n]));
        } catch (e) {
            if (e.code !== "ENOENT") console.error(`[MemoryGraph:${this.userId}] load nodes error`, e);
            else if (DEBUG) console.log(`[MemoryGraph:${this.userId}] No nodes file found — starting fresh.`);
        }
        try {
            const eRaw = await fs.readFile(this.EDGES_FILE, "utf8");
            const eArr = JSON.parse(eRaw);
            this.edges = new Map(eArr.map(e => [e.id, e]));
        } catch (e) {
            if (e.code !== "ENOENT") console.error(`[MemoryGraph:${this.userId}] load edges error`, e);
            else if (DEBUG) console.log(`[MemoryGraph:${this.userId}] No edges file found — starting fresh.`);
        }
        try {
            const hRaw = await fs.readFile(this.HYPOTHESES_FILE, "utf8");
            const hArr = JSON.parse(hRaw);
            this.hypotheses = new Map(hArr.map(h => [h.id, h]));
        } catch (e) {
            if (e.code !== "ENOENT") console.error(`[MemoryGraph:${this.userId}] load hypotheses error`, e);
            else if (DEBUG) console.log(`[MemoryGraph:${this.userId}] No hypotheses file found — starting fresh.`);
        }
        this._initialized = true;
        if (DEBUG) this._meta("init", `Loaded ${this.nodes.size} nodes, ${this.edges.size} edges, ${this.hypotheses.size} hypotheses`);
    }

    async persist() {
        if (!this._initialized) throw new Error("MemoryGraph not initialized");
        try {
            await fs.writeFile(this.NODES_FILE, JSON.stringify(Array.from(this.nodes.values()), null, 2));
            await fs.writeFile(this.EDGES_FILE, JSON.stringify(Array.from(this.edges.values()), null, 2));
            await fs.writeFile(this.HYPOTHESES_FILE, JSON.stringify(Array.from(this.hypotheses.values()), null, 2));
            if (DEBUG) this._meta("persist", `Persisted nodes:${this.nodes.size} edges:${this.edges.size} hyp:${this.hypotheses.size}`);
        } catch (e) {
            console.error(`[MemoryGraph:${this.userId}] persist error`, e);
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
        if (DEBUG) console.log(`[MemoryGraph:${this.userId}.meta]`, event, detail);
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
     * [REWRITTEN] Ingests a ComprehensiveInsight object from the LinguisticBrain.
     * @param {Object} insight - The rich insight object.
     */
    ingest(insight = {}) {
        if (!this._initialized) throw new Error("MemoryGraph not initialized");
        if (!insight || !insight.semanticMap || !insight.emotionProfile || !insight.synthesisProfile) return;

        const now = this._nowISO();

        // 1. Update working memory with the full insight object
        this.workingMemory.push({ ts: now, insight });
        if (this.workingMemory.length > WORKING_WINDOW) this.workingMemory.shift();

        // 2. Extract key data structures from the insight object
        const concepts = insight.semanticMap.conceptInsights || {};
        const emotionProfile = insight.emotionProfile.affectVector || {};
        const topPattern = insight.synthesisProfile.dominantPattern;
        const topConflict = insight.synthesisProfile.coreConflict;

        const reinforcedNodes = [];

        // 3. Reinforce concept nodes based on their semantic weight
        for (const [conceptKey, conceptData] of Object.entries(concepts)) {
            const nodeId = this._nodeId("concept", conceptKey);
            const node = this._ensureNode(nodeId, { type: "concept", value: conceptKey, createdAt: now });
            
            this._reinforceNode(node, emotionProfile, { weight: conceptData.totalWeight });
            reinforcedNodes.push(node);
        }

        // 4. Create and reinforce nodes for detected patterns and conflicts
        if (topPattern) {
            const patternId = this._nodeId("pattern", topPattern.pattern_id);
            const patternNode = this._ensureNode(patternId, { type: "pattern", value: topPattern.pattern_id, createdAt: now });
            this._reinforceNode(patternNode, emotionProfile);
            reinforcedNodes.push(patternNode);

            const patternConcepts = [...(topPattern.trigger_concepts || []), ...(topPattern.resulting_concepts || [])];
            for (const concept of patternConcepts) {
                const conceptId = this._nodeId("concept", concept);
                this._ensureNode(conceptId, { type: "concept", value: concept }); // Ensure concept node exists
                const edgeId = this._edgeId("contains_concept", patternId, conceptId);
                this._ensureEdge(edgeId, { source: patternId, target: conceptId, type: "contains_concept" });
                this._reinforceEdge(edgeId);
            }
        }

        if (topConflict) {
            const conflictId = this._nodeId("conflict", topConflict.tension_id);
            const conflictNode = this._ensureNode(conflictId, { type: "conflict", value: topConflict.tension_id, createdAt: now });
            this._reinforceNode(conflictNode, emotionProfile);
            reinforcedNodes.push(conflictNode);
        }

        // 5. Perform self-healing check on affected nodes
        this._selfHealNeighbors(reinforcedNodes);

        this._meta("ingest", `Ingested insight. Concepts: ${Object.keys(concepts).length}, Pattern: ${topPattern?.pattern_id || 'None'}, Conflict: ${topConflict?.tension_id || 'None'}`);
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

    /**
     * [ADAPTED] Reinforces a node, now with weighted reinforcement from insights.
     */
    _reinforceNode(node, emotionProfile = {}, options = {}) {
        const weight = options.weight || 1.0;
        const emoBoost = 1 + (Object.values(emotionProfile).reduce((a, b) => a + b, 0) || 0);
        
        node.strength = Math.min(node.strength * (REINFORCEMENT_FACTOR * emoBoost * weight), 1000);
        node.lastAccessed = this._nowISO();
        node.promotions = (node.promotions || 0) + 1;

        // Merge emotional weights using a moving average to stabilize them
        for (const [e, v] of Object.entries(emotionProfile)) {
            node.emotionalWeights[e] = (node.emotionalWeights[e] || 0) * 0.7 + v * 0.3;
        }

        if (node.promotions >= PROMOTION_THRESHOLD && node.working) {
            node.working = false; // promote to long-term memory
            if (DEBUG) this._meta("promote", `node ${node.id} promoted to long-term`);
        }
        
        this.nodes.set(node.id, node);
        
        // Associative reinforcement to neighbors
        const neighbors = this.getNeighbors(node.id);
        for (const nid of neighbors) {
            const nb = this.nodes.get(nid);
            if (nb) {
                nb.strength = Math.min(nb.strength * ASSOCIATIVE_FACTOR, 1000);
            }
        }
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

    _reinforceEdge(edgeId, insight = {}) {
        const edge = this.edges.get(edgeId);
        if(edge){
            edge.strength = Math.min(edge.strength * REINFORCEMENT_FACTOR, 1000);
            edge.lastAccessed = this._nowISO();
            this.edges.set(edge.id, edge);
        }
    }

    // ----------------- Decay & Self-Healing -----------------
    applyDecay() {
        const now = new Date();
        for (const node of this.nodes.values()) {
            if (node.archived) continue;
            const last = new Date(node.lastAccessed);
            const days = Math.max(0, (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
            if (days > 0) {
                node.strength *= Math.pow(DECAY_RATE_PER_DAY, days);
            }
            if (node.strength < ARCHIVE_THRESHOLD) {
                const neighbors = this.getNeighbors(node.id).map(id => this.nodes.get(id)).filter(Boolean);
                const neighborSupport = neighbors.reduce((a, b) => a + (b.strength || 0), 0);
                if (neighborSupport > SELF_HEAL_GRACE) {
                    node.strength *= 1.05;
                } else {
                    node.archived = true;
                    this.nodes.delete(node.id);
                    if (DEBUG) this._meta("archive_node", node.id);
                }
            }
        }
        for (const edge of this.edges.values()) {
            if (edge.archived) continue;
            const last = new Date(edge.lastAccessed);
            const days = Math.max(0, (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
            if (days > 0) edge.strength *= Math.pow(DECAY_RATE_PER_DAY, days);
            if (edge.strength < ARCHIVE_THRESHOLD) {
                this.edges.delete(edge.id);
                if (DEBUG) this._meta("archive_edge", edge.id);
            }
        }
        if (DEBUG) this._meta("decay", `Decay applied. Nodes: ${this.nodes.size}, Edges: ${this.edges.size}`);
    }

    _selfHealNeighbors(nodesArray = []) {
        for (const node of nodesArray) {
            const n = this.nodes.get(node.id);
            if (!n) continue;
            const neighbors = this.getNeighbors(n.id);
            for (const nid of neighbors) {
                const nb = this.nodes.get(nid);
                if (nb && nb.strength < (INITIAL_NODE_STRENGTH * 2)) {
                    nb.strength *= 1.02; // tiny uplift
                }
            }
        }
    }

    // ----------------- Dreaming & Hypothesis Generation -----------------
    dream({ replay = true, creativeBias = 1.0 } = {}) {
        if (!this._initialized) throw new Error("MemoryGraph not initialized");
        if (DEBUG) this._meta("dream_start", `Working Memory Size: ${this.workingMemory.length}`);

        const strongNodes = Array.from(this.nodes.values()).filter(n => !n.archived && n.strength > DREAM_LINK_THRESHOLD);
        strongNodes.sort((a, b) => b.strength - a.strength);

        if (replay && this.workingMemory.length) {
            const batch = this.workingMemory.slice(-REPLAY_BATCH);
            for (const rec of batch) {
                const insight = rec.insight;
                if (!insight || !insight.semanticMap) continue;
                for (const conceptKey of Object.keys(insight.semanticMap.conceptInsights || {})) {
                    const nid = this._nodeId("concept", conceptKey);
                    const node = this.nodes.get(nid);
                    if (node) {
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
                const pairKey1 = `${a.id}::${b.id}`, pairKey2 = `${b.id}::${a.id}`;
                if (consideredPairs.has(pairKey1)) continue;
                consideredPairs.add(pairKey1);
                consideredPairs.add(pairKey2);
                
                const existing = this.findEdgeBetween(a.id, b.id);
                if (existing && existing.strength > 0.6) continue;

                const common = this.getNeighbors(a.id).filter(x => this.getNeighbors(b.id).includes(x));
                if (common.length >= DREAM_COMMON_NEIGHBORS) {
                    const eid = this._edgeId("hypothesized_by_dream", a.id, b.id);
                    if (!this.edges.has(eid)) {
                        const hypId = this._id("hyp_");
                        const hypothesis = {
                            id: hypId,
                            generatedAt: this._nowISO(),
                            nodes: [a.id, b.id],
                            type: "cooccurrence_hypothesis",
                            evidence: common.slice(0, 3),
                            strength: 0.4 + Math.min(0.5, (a.strength + b.strength) / 100),
                        };
                        this.hypotheses.set(hypId, hypothesis);
                        this._ensureEdge(eid, { source: a.id, target: b.id, type: "hypothesized_by_dream", createdAt: this._nowISO() });
                        const createdEdge = this.edges.get(eid);
                        if(createdEdge) {
                           createdEdge.strength = hypothesis.strength;
                           createdEdge.lastAccessed = this._nowISO();
                        }
                        newHypotheses++;
                    }
                }
            }
            if (newHypotheses >= MAX_HYPOTHESIS_PER_DREAM) break;
        }

        for (const hyp of this.hypotheses.values()) {
            const support = hyp.nodes.reduce((s, nid) => s + (this.nodes.get(nid)?.strength || 0), 0);
            hyp.strength = Math.min(hyp.strength + support * 0.0005, 1.0);
        }

        if (DEBUG) this._meta("dream_end", `New Hypotheses: ${newHypotheses}`);
        return { newHypotheses, hypotheses: Array.from(this.hypotheses.values()).slice(-newHypotheses) };
    }
}
