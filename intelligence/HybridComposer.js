// intelligence/HybridComposer.js v5.0 - The Multi-Dimensional Maestro
// This final version is designed to understand the full "Cognitive Briefing".
// It can now consciously decide to weave responses from MULTIPLE active protocols.
// ALL ORIGINAL LOGIC IS PRESERVED.

const DEBUG = false;

/* =========================
   Tunables & Config (Preserved)
   ========================= */
const DEFAULT_PERSONAS = [
  { id: "logical", weight: 1.0, desc: "منطق، أسباب، خطوات" },
  { id: "empathic", weight: 1.0, desc: "تعاطف، تطبيع، تأييد" },
  { id: "pragmatic", weight: 1.0, desc: "خطوات عملية قابلة للتنفيذ" },
];

const MAX_VARIANTS = 4;
const MAX_FRAGMENTS = 4;
const NOVELTY_DECAY_WINDOW = 6;

/* =========================
   Helpers (Preserved)
   ========================= */
function safeStr(s) { return (s === null || s === undefined) ? "" : String(s); }
function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function sample(arr) { if (!arr || arr.length === 0) return null; return arr[Math.floor(Math.random() * arr.length)]; }
function nowISO() { return (new Date()).toISOString(); }

function tokenizeWords(text) {
  if (!text) return [];
  return safeStr(text).toLowerCase().split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}_]+/gu, "")).filter(Boolean);
}

function jaccardSim(a = "", b = "") {
  const s1 = new Set(tokenizeWords(a));
  const s2 = new Set(tokenizeWords(b));
  if (s1.size === 0 && s2.size === 0) return 1;
  const inter = [...s1].filter(x => s2.has(x)).length;
  const union = new Set([...s1, ...s2]).size || 1;
  return inter / union;
}

function firstSentence(text) {
  if (!text) return "";
  const m = text.split(/(?<=[.؟!?])\s+/);
  return m[0] || text;
}

/* =========================
   Persona modules (Preserved)
   ========================= */
const PERSONA_FUNCS = {
    logical: (candidate) => {
        const reply = safeStr(candidate.reply);
        let segment = /لأن|بسبب|because|due to/i.test(reply)
            ? firstSentence(reply) + " دعنا نلخّص الأسباب خطوة بخطوة."
            : "اقتراح منطقي: حاول كتابة الخيارات ثم قيّم كل خيار.";
        return { persona: "logical", segment, score: 0.95 };
    },
    empathic: (candidate) => {
        const seed = firstSentence(candidate.reply) || "واضح إن الوضع صعب.";
        const seg = `${seed} أنا معاك — مشاعرك مفهومة ومن الطبيعي أن تتردد.`;
        return { persona: "empathic", segment: seg, score: 0.98 };
    },
    pragmatic: (candidate) => {
        const small = [
            "اقتراح عملي: جرّب تنفيذ أصغر نسخة من القرار لمدة 24 ساعة.",
            "قائمة سريعة: 1) اكتب 3 خيارات 2) قيّم كل واحد 3) اختر واحد للتجربة."
        ];
        return { persona: "pragmatic", segment: sample(small), score: 0.97 };
    }
};

/* =========================
   Inner Critics / Validators (Preserved)
   ========================= */
function safetyCheck(fingerprint, candidates) {
  const flags = [];
  const text = safeStr(fingerprint?.originalMessage).toLowerCase();
  for (const e of ["انتحار", "بموت", "أقتل", "أذبح"]) if (text.includes(e)) flags.push("emergency_critical");
  return { ok: flags.length === 0, flags };
}

/* =========================
   Fusion Core (Preserved)
   ========================= */
function analyzeCandidates(candidates = [], tracker = null, fingerprint = {}) {
  const history = tracker?.getHistory ? tracker.getHistory() : [];
  const recent = history.slice(-NOVELTY_DECAY_WINDOW).map(t => safeStr(t.ai_response?.reply || ""));
  
  return candidates.map(c => {
    const baseConf = clamp(Number(c.confidence ?? 0.6), 0, 1);
    let personaAggregateScore = 0;
    Object.keys(PERSONA_FUNCS).forEach(pid => {
        const res = PERSONA_FUNCS[pid](c);
        const align = jaccardSim(c.reply || "", res.segment || "");
        personaAggregateScore += clamp(res.score * 0.6 + align * 0.4, 0, 1);
    });
    const personaAvg = personaAggregateScore / Math.max(1, Object.keys(PERSONA_FUNCS).length);
    const maxSim = recent.reduce((m, r) => Math.max(m, jaccardSim(c.reply || "", r || "")), 0);
    const novelty = 1 - maxSim;
    const calibrated = clamp(baseConf * 0.7 + personaAvg * 0.2 + novelty * 0.1, 0, 1);
    return { candidate: c, calibratedScore: calibrated, personaAvg, novelty };
  }).sort((a, b) => b.calibratedScore - a.calibratedScore);
}

/* =================================================
   THE MAESTRO'S WEAVING ROOM (Upgraded for Multi-Protocol)
   ================================================= */
function createEmpathyBridge(fingerprint) {
    const bridges = [
        "أتفهم أنك تتعامل مع أكثر من شيء في نفس الوقت. دعنا نتناولهم واحدًا تلو الآخر.",
        "من الواضح أن هناك طبقات مختلفة لما تشعر به. لنبدأ بالجزء الأكثر إلحاحًا.",
        "شكرًا لمشاركة كل هذا. يبدو أن هناك جانبًا عاطفيًا وجانبًا عمليًا للموقف. ما رأيك أن نبدأ بالجانب العاطفي أولاً؟"
    ];
    return sample(bridges);
}

function weaveEmpathyAndAction(empathicCandidate, practicalCandidate, fingerprint) {
    const validation = firstSentence(empathicCandidate.reply);
    const bridge = createEmpathyBridge(fingerprint);
    const practicalConcept = practicalCandidate.metadata?.intentTag?.split('_')[1] || 'الجزء العملي'; // Extracts "act" from "cbt_act_choice_point"
    const gentleAction = `وبخصوص ${practicalConcept}، ${firstSentence(practicalCandidate.reply).replace(/اقتراح عملي:|قائمة سريعة:/gi, "").trim()}`;

    const finalReplyText = `${validation}\n\n${bridge}\n\n${gentleAction}`;
    
    return { 
        reply: finalReplyText, 
        source: 'maestro_weaver:empathy_to_action',
        confidence: 0.98,
        metadata: { strategy: 'weave', components: [empathicCandidate.source, practicalCandidate.source] },
        variants: []
    };
}

// --- [NEW] Advanced weaving for two different protocols ---
function advancedWeave(activeProtocolCandidate, newProtocolCandidate, fingerprint) {
    if (DEBUG) console.log("MAESTRO: Engaging ADVANCED WEAVING between two protocols.");
    const reply1 = `بخصوص ما كنا نتحدث عنه، ${firstSentence(activeProtocolCandidate.reply)}`;
    const bridge = "ولاحظت أنك ذكرت أيضًا شيئًا جديدًا ومهمًا...";
    const reply2 = firstSentence(newProtocolCandidate.reply);

    return {
        reply: `${reply1}\n\n${bridge}\n\n${reply2}`,
        source: `maestro_weaver:advanced_multi_protocol`,
        confidence: 0.99,
        metadata: { strategy: 'advanced_weave', components: [activeProtocolCandidate.source, newProtocolCandidate.source] },
        variants: []
    };
}


/* =========================
   API: synthesizeHybridResponse (The Final Upgrade)
   ========================= */
function synthesizeHybridResponse(candidates = [], briefing = {}, context = {}) {
  const { tracker = null, fingerprint = {} } = context;
  const { activeProtocol, potentialNewProtocols } = briefing;

  const fallbackResponse = {
    reply: "أنا معاك، ممكن توضّح أكتر؟", source: "hybrid_composer_fallback",
    variants: [], metadata: { reason: "no_candidates_or_analysis_failed" }
  };

  if (!Array.isArray(candidates) || candidates.length === 0) return fallbackResponse;
  
  const safety = safetyCheck(fingerprint, candidates);
  if (!safety.ok) {
    return { reply: "لاحظت إشارات للخطر...", source: "hybrid_safety", variants: [], metadata: { safetyFlags: safety.flags } };
  }

  const analyzed = analyzeCandidates(candidates, tracker, fingerprint);
  if (!analyzed || analyzed.length === 0) return fallbackResponse;
  
  let finalDecision;

  // --- [THE ULTIMATE STRATEGIC CORE] ---
  const activeProtocolCandidate = candidates.find(c => activeProtocol && c.source.includes(activeProtocol.intent.tag));
  const newProtocolCandidate = candidates.find(c => potentialNewProtocols && potentialNewProtocols[0] && c.source.includes(potentialNewProtocols[0].tag));
  const empathicCandidate = candidates.find(c => c.source === 'empathic_safety_net');

  // STRATEGY 1: Advanced Multi-Protocol Weaving (The Dream)
  if (activeProtocolCandidate && newProtocolCandidate && activeProtocolCandidate.source !== newProtocolCandidate.source) {
      if (DEBUG) console.log("MAESTRO: Activating ADVANCED WEAVE strategy.");
      finalDecision = advancedWeave(activeProtocolCandidate, newProtocolCandidate, fingerprint);
  }
  // STRATEGY 2: Simple Weaving (Empathy + Action)
  else if (fingerprint?.primaryEmotion?.type !== 'neutral' && (activeProtocolCandidate || newProtocolCandidate) && empathicCandidate) {
      if (DEBUG) console.log("MAESTRO: Activating simple EMPATHY WEAVE strategy.");
      const practical = activeProtocolCandidate || newProtocolCandidate;
      finalDecision = weaveEmpathyAndAction(empathicCandidate, practical, fingerprint);
  }
  // STRATEGY 3: Direct Protocol Execution
  else if (activeProtocolCandidate || newProtocolCandidate) {
      if (DEBUG) console.log("MAESTRO: Activating DIRECT PROTOCOL strategy.");
      finalDecision = activeProtocolCandidate || newProtocolCandidate;
  }
  // STRATEGY 4: Orchestra Fallback
  else {
      if (DEBUG) console.log("MAESTRO: No protocol. Defaulting to best orchestra performer.");
      const topCandidate = analyzed[0].candidate;
      finalDecision = {
            reply: `${topCandidate.reply}\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات.]`,
            variants: [],
            metadata: { source: `maestro_conductor:${topCandidate.source}` }
        };
  }
  
  // --- [THE FINAL MEMORY FIX: THE MEMORY PASSPORT] ---
  // Always attach the next step from the PRIMARY protocol candidate, which is the
  // NEW one if it exists, otherwise the ACTIVE one. This ensures the conversation flows forward.
  const primaryProtocolForMemory = newProtocolCandidate || activeProtocolCandidate;
  if (primaryProtocolForMemory && primaryProtocolForMemory.metadata?.nextSessionContext) {
      finalDecision.metadata = finalDecision.metadata || {};
      finalDecision.metadata.nextSessionContext = primaryProtocolForMemory.metadata.nextSessionContext;
      if (DEBUG) console.log("MAESTRO: Memory passport attached.", finalDecision.metadata.nextSessionContext);
  }
  
  return finalDecision;
}

export default { synthesizeHybridResponse };
