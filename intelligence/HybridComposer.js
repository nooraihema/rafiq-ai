// intelligence/HybridComposer.js v2.2-maestro (FINAL COMPLETE & CORRECTED VERSION)
// THE HYBRID COMPOSER — "THE CONSCIOUS MAESTRO"

const DEBUG = false;

/* =========================
   Tunables & Config
   ========================= */
const DEFAULT_PERSONAS = [
  { id: "logical", weight: 1.0, desc: "منطق، أسباب، خطوات" },
  { id: "empathic", weight: 1.0, desc: "تعاطف، تطبيع، تأييد" },
  { id: "pragmatic", weight: 1.0, desc: "خطوات عملية قابلة للتنفيذ" },
  { id: "visionary", weight: 0.9, desc: "سناريوهات مستقبلية" },
  { id: "playful", weight: 0.4, desc: "خفيف، تقليل توتر" }
];

const MAX_VARIANTS = 4;
const MAX_FRAGMENTS = 4;
const NOVELTY_DECAY_WINDOW = 6;

/* =========================
   Helpers
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
   Persona modules (Self-contained)
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
        return { persona: "empathic", segment, seg, score: 0.98 };
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
   Inner Critics / Validators (Self-contained)
   ========================= */
function safetyCheck(fingerprint, candidates) {
  const flags = [];
  const text = safeStr(fingerprint?.originalMessage).toLowerCase();
  for (const e of ["انتحار", "بموت", "أقتل", "أذبح"]) if (text.includes(e)) flags.push("emergency_critical");
  return { ok: flags.length === 0, flags };
}

function contradictionDetector(segments) {
    const highConflict = [];
    const opposites = [["افعل", "لا تفعل"], ["ابدأ", "انتظر"], ["تسرع", "تمهل"]];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const a = segments[i], b = segments[j];
            for (const [p, q] of opposites) {
                if ((a.includes(p) && b.includes(q)) || (a.includes(q) && b.includes(p))) {
                    highConflict.push({ pair: [i, j], words: [p, q], segments: [a, b] });
                }
            }
        }
    }
    return { highConflict, conflict: highConflict.length > 0 };
}


/* =========================
   Fusion Core (Self-contained)
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

function composeFragmentsFromAnalysis(analyzed) {
  const topN = Math.min(analyzed.length, MAX_FRAGMENTS);
  const engines = analyzed.slice(0, topN);
  const fragments = [];
  for (const eng of engines) {
      // Simplified fragment creation
      const bestPersona = Object.keys(PERSONA_FUNCS).reduce((best, pid) => {
          const score = jaccardSim(eng.candidate.reply, PERSONA_FUNCS[pid](eng.candidate).segment);
          return score > best.score ? { pid, score } : best;
      }, { pid: 'logical', score: 0 });
      fragments.push({ persona: bestPersona.pid, segment: eng.candidate.reply });
  }
  return { fragments, provenance: { chosen_engines: engines.map(e => e.candidate.source) } };
}

function surfaceRealizer(fragments) {
    if (!fragments || fragments.length === 0) return "يمكننا استكشاف هذا الأمر معًا خطوة بخطوة.";
    return fragments.map(f => firstSentence(f.segment)).join('\n\n');
}

function generateVariants(fusedText, fragments) {
    const empathicSeg = fragments.find(f => f.persona === "empathic")?.segment || fusedText;
    const pragmaticSeg = fragments.find(f => f.persona === "pragmatic")?.segment || fusedText;
    return [
      { id: "compact", text: `${firstSentence(empathicSeg)}\n\nاقتراح سريع: ${firstSentence(pragmaticSeg)}`, confidence: 0.9 },
      { id: "expanded", text: fusedText, confidence: 0.85 }
    ];
}


/* =================================================
   THE MAESTRO'S WEAVING ROOM: From Selection to Artful Synthesis
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
   API: synthesizeHybridResponse (THE MAESTRO'S PODIUM)
   ========================= */
function synthesizeHybridResponse(candidates = [], context = {}) {
  const { tracker = null, fingerprint = {} } = context;

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
  
  // --- [MAESTRO STRATEGIC LOGIC] ---
  const primaryEmotion = fingerprint?.primaryEmotion?.type || 'neutral';
  const hasProblemContext = fingerprint?.concepts?.some(c => ['decision_making', 'work', 'procrastination'].includes(c.concept));
  
  // STRATEGY 1: Weaving for complex emotional + practical situations
  if ((primaryEmotion === 'anxiety' || primaryEmotion === 'sadness') && hasProblemContext) {
      if (DEBUG) console.log("MAESTRO STRATEGY: Weaving Empathy with Action.");
      
      const empathicSource = analyzed.find(c => c.candidate.source === 'empathic_safety_net' || c.personaAvg > 0.6);
      const practicalSource = analyzed.find(c => c.candidate.source.includes('v9engine') || c.candidate.source.includes('synthesizer'));

      if (empathicSource && practicalSource) {
          return weaveEmpathyAndAction(empathicSource.candidate, practicalSource.candidate, fingerprint);
      }
  }

  // STRATEGY 2: Default to the best-analyzed candidate (Conductor Strategy)
  if (DEBUG) console.log("MAESTRO STRATEGY: Conducting - Selecting the best single performer.");
  const topCandidate = analyzed[0].candidate;
  
  const { fragments } = composeFragmentsFromAnalysis(analyzed);
  const fusedText = surfaceRealizer(fragments);
  const variants = generateVariants(fusedText, fragments);
  let primaryVariant = variants.find(v => v.id === "expanded") || variants[0] || { text: topCandidate.reply };

  return {
    reply: `${primaryVariant.text}\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات.]`,
    variants,
    metadata: { source: `maestro_conductor:${topCandidate.source}` }
  };
}

// --- Standardized default export ---
export default { synthesizeHybridResponse };
