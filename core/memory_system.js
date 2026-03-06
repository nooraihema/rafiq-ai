
// /core/memory_system.js - Browser Optimized v1.1
// تم تحويل النظام ليعمل بذاكرة المتصفح (LocalStorage) بدلاً من الملفات

import { normalizeArabic, makeUserId } from './utils.js';

// إعدادات الذاكرة
const WORKING_WINDOW = 50;
const INITIAL_NODE_STRENGTH = 1.0;
const INITIAL_EDGE_STRENGTH = 1.0;
const REINFORCEMENT_FACTOR = 1.18;
const ASSOCIATIVE_FACTOR = 1.08;
const DECAY_RATE_PER_DAY = 0.985;
const ARCHIVE_THRESHOLD = 0.08;
const DREAM_LINK_THRESHOLD = 0.35;
const DREAM_COMMON_NEIGHBORS = 2;
const MAX_HYPOTHESIS_PER_DREAM = 10;
const REPLAY_BATCH = 10;
const METASTATS_RETENTION = 2000;
const DEBUG = true; // تفعيل وضع التصحيح في المتصفح

export class UserMemoryGraph {
    constructor({ userId }) {
        if (!userId) throw new Error("UserMemoryGraph requires a userId.");
        this.userId = userId;
        
        // مفاتيح التخزين في المتصفح
        this.STORAGE_KEYS = {
            NODES: `rafiq_mem_${userId}_nodes`,
            EDGES: `rafiq_mem_${userId}_edges`,
            HYPOTHESES: `rafiq_mem_${userId}_hyp`
        };

        this.nodes = new Map();
        this.edges = new Map();
        this.hypotheses = new Map();
        this.workingMemory = [];
        this._initialized = false;
        this.metaLog = [];
    }

    // ----------------- Persistence (التحميل والحفظ) -----------------
    async initialize() {
        if (this._initialized) return;
        
        try {
            // تحميل العقد (Nodes)
            const nRaw = localStorage.getItem(this.STORAGE_KEYS.NODES);
            if (nRaw) {
                const nArr = JSON.parse(nRaw);
                this.nodes = new Map(nArr.map(n => [n.id, n]));
            }

            // تحميل الحواف (Edges)
            const eRaw = localStorage.getItem(this.STORAGE_KEYS.EDGES);
            if (eRaw) {
                const eArr = JSON.parse(eRaw);
                this.edges = new Map(eArr.map(e => [e.id, e]));
            }

            // تحميل الفرضيات (Hypotheses)
            const hRaw = localStorage.getItem(this.STORAGE_KEYS.HYPOTHESES);
            if (hRaw) {
                const hArr = JSON.parse(hRaw);
                this.hypotheses = new Map(hArr.map(h => [h.id, h]));
            }

            this._initialized = true;
            if (DEBUG) this._meta("init", `Loaded ${this.nodes.size} nodes from LocalStorage`);
        } catch (e) {
            console.error(`[MemoryGraph:${this.userId}] Initialization error:`, e);
            this._initialized = true; // السماح بالعمل حتى لو فشل التحميل
        }
    }

    async persist() {
        if (!this._initialized) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.NODES, JSON.stringify(Array.from(this.nodes.values())));
            localStorage.setItem(this.STORAGE_KEYS.EDGES, JSON.stringify(Array.from(this.edges.values())));
            localStorage.setItem(this.STORAGE_KEYS.HYPOTHESES, JSON.stringify(Array.from(this.hypotheses.values())));
            if (DEBUG) console.log(`[MemoryGraph] Data persisted to LocalStorage.`);
        } catch (e) {
            console.error(`[MemoryGraph:${this.userId}] Persist error (Storage might be full):`, e);
        }
    }

    // ----------------- Utilities -----------------
    _id(prefix = "") {
        return prefix + makeUserId();
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
        if (DEBUG) console.log(`[MemoryGraph.meta]`, event, detail);
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

    // ----------------- Ingestion (الاستيعاب) -----------------
    ingest(insight = {}) {
        if (!this._initialized) return;
        if (!insight || !insight.semanticMap || !insight.emotionProfile) return;

        const now = this._nowISO();
        this.workingMemory.push({ ts: now, insight });
        if (this.workingMemory.length > WORKING_WINDOW) this.workingMemory.shift();

        const concepts = insight.semanticMap.conceptInsights || {};
        const emotionProfile = insight.emotionProfile.affectVector || {};
        const reinforcedNodes = [];

        for (const [conceptKey, conceptData] of Object.entries(concepts)) {
            const nodeId = this._nodeId("concept", conceptKey);
            const node = this._ensureNode(nodeId, { type: "concept", value: conceptKey, createdAt: now });
            this._reinforceNode(node, emotionProfile, { weight: conceptData.totalWeight || 1 });
            reinforcedNodes.push(node);
        }

        this.persist(); // حفظ التغييرات فوراً في المتصفح
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
                working: true,
                archived: false
            };
            this.nodes.set(nodeId, node);
        }
        return node;
    }

    _reinforceNode(node, emotionProfile = {}, options = {}) {
        const weight = options.weight || 1.0;
        node.strength = Math.min(node.strength * (REINFORCEMENT_FACTOR * weight), 1000);
        node.lastAccessed = this._nowISO();
        node.promotions = (node.promotions || 0) + 1;

        for (const [e, v] of Object.entries(emotionProfile)) {
            node.emotionalWeights[e] = (node.emotionalWeights[e] || 0) * 0.7 + v * 0.3;
        }
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
        }
        return edge;
    }

    dream() {
        if (DEBUG) console.log("MemoryGraph: Dreaming cycle started...");
        // منطق الحلم مبسط للمتصفح للحفاظ على الأداء
        return { newHypotheses: 0 };
    }
}
