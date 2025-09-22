// intelligence/HybridComposer.js v6.0 - The Decisive & Conscious Maestro
// This final version implements the strict, hierarchical decision-making logic.
// It prioritizes active protocols, understands context, and eliminates chaotic merging.
// ALL ORIGINAL FUNCTIONS AND LOGIC ARE PRESERVED.

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
   THE MAESTRO'S WEAVING ROOM (Preserved for specific use)
   ================================================= */
function createEmpathyBridge() {
    const bridges = [
        "أتفهم أنك تتعامل مع أكثر من شيء في نفس الوقت. دعنا نبدأ بالجزء الأكثر إلحاحًا، ثم ننظر في الباقي.",
        "شكرًا لمشاركة كل هذا. يبدو أن هناك جانبًا عاطفيًا وجانبًا عمليًا للموقف. ما رأيك أن نبدأ بالجانب العاطفي أولاً لتهدأ الأمور؟"
    ];
    return sample(bridges);
}

// --- [NEW] A smarter, more contextual weave function ---
function smartWeave(activeCandidate, newCandidate, fingerprint) {
    if (DEBUG) console.log("MAESTRO: Engaging SMART WEAVING.");
    
    // Acknowledge the interruption gracefully
    const acknowledgement = `أتفهم أننا كنا نتحدث عن ${activeCandidate.metadata?.intentTag?.split('_')[1] || 'موضوع سابق'}، ولكن يبدو أن هناك شيئًا جديدًا ومهمًا ظهر الآن وهو '${newCandidate.metadata?.intentTag?.split('_')[1] || 'موضوع جديد'}'.`;
    const bridge = "دعنا نركز على هذا الآن.";
    const newResponse = firstSentence(newCandidate.reply);

    return {
        reply: `${acknowledgement}\n\n${bridge}\n\n${newResponse}`,
        source: `maestro_weaver:smart_weave`,
        confidence: 0.99,
        metadata: { 
            strategy: 'smart_weave',
            components: [activeCandidate.source, newCandidate.source] 
        }
    };
}


/* =========================
   API: synthesizeHybridResponse (The Final, Decisive Logic)
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

  let finalDecision;

  // --- [THE DECISIVE MAESTRO'S HIERARCHY OF RULES] ---
  const activeCandidate = candidates.find(c => activeProtocol && c.source.includes(activeProtocol.intent.tag));
  const newCandidate = candidates.find(c => potentialNewProtocols && potentialNewProtocols[0] && c.source.includes(potentialNewProtocols[0].tag));
  const empathicCandidate = candidates.find(c => c.source === 'empathic_safety_net');

  // RULE 1: HANDLE CONVERSATION INTERRUPTIONS (The most complex case)
  // If we are in an active conversation AND a new, different, strong protocol appears.
  if (activeCandidate && newCandidate && activeCandidate.source !== newCandidate.source) {
      if (DEBUG) console.log("MAESTRO: Rule 1 - Handling conversation interruption.");
      finalDecision = smartWeave(activeCandidate, newCandidate, fingerprint);
  }
  // RULE 2: TRUST THE ACTIVE PROTOCOL
  // If we are continuing a conversation and there's no strong interruption.
  else if (activeCandidate) {
      if (DEBUG) console.log("MAESTRO: Rule 2 - Trusting the active protocol's expert response.");
      finalDecision = activeCandidate;
  }
  // RULE 3: TRUST THE NEW PROTOCOL
  // If we are starting a new conversation.
  else if (newCandidate) {
      if (DEBUG) console.log("MAESTRO: Rule 3 - Trusting the new protocol's expert response.");
      finalDecision = newCandidate;
  }
  // RULE 4: FALLBACK TO THE ORCHESTRA
  // If no protocol was found at all.
  else {
      if (DEBUG) console.log("MAESTRO: Rule 4 - No protocol found, defaulting to the safest empathic response.");
      finalDecision = empathicCandidate || candidates[0]; // Prioritize the safety net
  }
  
  // --- [THE FINAL MEMORY FIX: THE MEMORY PASSPORT] ---
  // The memory passport always comes from the protocol that is NOW active.
  const primaryProtocolForMemory = newCandidate || activeCandidate; // The new one takes precedence
  if (primaryProtocolForMemory && primaryProtocolForMemory.metadata?.nextSessionContext) {
      finalDecision.metadata = finalDecision.metadata || {};
      finalDecision.metadata.nextSession_context = primaryProtocolForMemory.metadata.nextSessionContext;
      if (DEBUG) console.log("MAESTRO: Memory passport attached.", finalDecision.metadata.nextSessionContext);
  }
  
  // Ensure the final object is well-formed
  if (!finalDecision.metadata) {
    finalDecision = {
      ...finalDecision, // Keep reply, source, etc.
      metadata: { source: finalDecision.source || 'maestro_final_decision' }
    };
  }

  // Add the final note if it's a simple selection, not a complex weave
  if (!finalDecision.source.includes('weaver')) {
      finalDecision.reply = `${finalDecision.reply}\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات.]`;
  }

  return finalDecision;
}

export default { synthesizeHybridResponse };
