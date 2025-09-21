// intelligence/HybridComposer.js v3.0 - The Final Conductor
// This version is now fully integrated with the Strategic Planner and Protocol Executor.
// It uses the strategic recommendations from the "Protocol Packet" to make its final decision.
// ALL ORIGINAL LOGIC IS PRESERVED and used as part of the new strategic flow.

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
   THE MAESTRO'S WEAVING ROOM (Preserved)
   ================================================= */
function createEmpathyBridge(fingerprint) {
    const bridges = [
        "أنا هنا معك في هذا الشعور. وعندما تشعر أنك مستعد، يمكننا أن نلقي نظرة على خطوة صغيرة جدًا قد تساعد.",
        "من المهم أن نعطي هذا الشعور حقه. وفي نفس الوقت، أحيانًا خطوة عملية بسيطة يمكن أن تخفف بعض العبء. ما رأيك أن نجرب؟",
        "دعنا لا نحاول حل المشكلة الكبيرة الآن، بل فقط نضيء شمعة صغيرة في هذا المكان المظلم. إليك فكرة بسيطة:"
    ];
    return sample(bridges);
}

function weaveEmpathyAndAction(empathicCandidate, practicalCandidate, fingerprint) {
    const validation = firstSentence(empathicCandidate.reply);
    const bridge = createEmpathyBridge(fingerprint);
    const gentleAction = `كخطوة أولى، ${firstSentence(practicalCandidate.reply).replace(/اقتراح عملي:|قائمة سريعة:/gi, "").trim()}`;

    const finalReplyText = `${validation}\n\n${bridge}\n\n${gentleAction}`;
    
    return { 
        reply: finalReplyText, 
        source: 'maestro_weaver:empathy_to_action',
        confidence: 0.98,
        metadata: { strategy: 'weave', components: [empathicCandidate.source, practicalCandidate.source] },
        variants: []
    };
}

/* =========================
   API: synthesizeHybridResponse (THE UPGRADED MAESTRO'S PODIUM)
   ========================= */
// --- MODIFICATION: The function now accepts the "protocolPacket" from the Strategic Planner ---
function synthesizeHybridResponse(candidates = [], protocolPacket = {}, context = {}) {
  const { tracker = null, fingerprint = {} } = context;
  const { strategicRecommendation } = protocolPacket; // Extract the strategy

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
  
  // --- [THE NEW STRATEGIC DECISION CORE] ---
  // The Maestro now reads the strategic recommendation from the packet and executes it.
  if (DEBUG) console.log(`MAESTRO: Executing strategy -> "${strategicRecommendation}"`);

  switch (strategicRecommendation) {
    case 'WEAVE_EMPATHY_WITH_INTENT':
      const empathicSource = analyzed.find(c => c.candidate.source === 'empathic_safety_net');
      // Find the candidate that came from the protocol engine
      const protocolCandidate = analyzed.find(c => c.candidate.source.includes('protocol_engine'));
      
      if (empathicSource && protocolCandidate) {
          return weaveEmpathyAndAction(empathicSource.candidate, protocolCandidate.candidate, fingerprint);
      }
      // Fallback if one is missing, prioritize the protocol response
      return protocolCandidate?.candidate || empathicSource?.candidate || fallbackResponse;

    case 'EMPATHY_FIRST':
      const bestEmpathic = analyzed.find(c => c.candidate.source === 'empathic_safety_net');
      if (bestEmpathic) return bestEmpathic.candidate;
      // Fallback to the highest-scored candidate if the safety net isn't there for some reason
      return analyzed[0].candidate;

    case 'EXECUTE_INTENT_DIRECTLY':
        const directCandidate = analyzed.find(c => c.candidate.source.includes('protocol_engine'));
        if (directCandidate) return directCandidate.candidate;
        return analyzed[0].candidate; // Fallback
        
    case 'EXPLORE_AND_CLARIFY':
    default: // Default fallback strategy
        if (DEBUG) console.log("MAESTRO: Defaulting to best single performer.");
        const topCandidate = analyzed[0].candidate;
        return {
            reply: `${topCandidate.reply}\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات.]`,
            variants: [], // Simplified for now
            metadata: { source: `maestro_conductor:${topCandidate.source}` }
        };
  }
}

export default { synthesizeHybridResponse };
