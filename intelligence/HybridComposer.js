// intelligence/HybridComposer.js v1.0-omega (FINAL CORRECTED & HARDENED v3)
// THE HYBRID COMPOSER — "SUPREME SYNTHETIC MIND"

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
const CONTRADICTION_THRESHOLD = 0.55;
const HALLUCINATION_SIM_THRESHOLD = 0.2;

/* =========================
   Helpers: string, similarity, randomness
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
   Persona modules (extendable)
   ========================= */
function personaLogical(candidate, context) {
  const reply = safeStr(candidate.reply);
  let segment = "";
  if (/لأن|بسبب|because|due to/i.test(reply)) {
    segment = firstSentence(reply) + " " + "دعنا نلخّص الأسباب خطوة بخطوة.";
  } else {
    segment = "اقتراح منطقي: حاول كتابة الخيارات ثم قيّم كل خيار من حيث النتيجة والجهد.";
  }
  return { persona: "logical", segment, score: 0.95, rationale: "extract-reason-or-suggest-steps" };
}

function personaEmpathic(candidate, context) {
  const seed = firstSentence(candidate.reply) || "واضح إن الوضع صعب.";
  const seg = `${seed} أنا معاك — مشاعرك مفهومة ومن الطبيعية تتردد في مواقف زي دي.`;
  return { persona: "empathic", segment: seg, score: 0.98, rationale: "validation-first" };
}

function personaPragmatic(candidate, context) {
  const small = [
    "اقتراح عملي: جرّب تنفيذ أصغر نسخة من القرار لمدة 24 ساعة.",
    "قائمة سريعة: 1) اكتب 3 خيارات 2) قيّم كل واحد 3) اختر واحد للتجربة."
  ];
  return { persona: "pragmatic", segment: sample(small), score: 0.97, rationale: "micro-action" };
}

function personaVisionary(candidate, context) {
  const segs = [
    "تخيل النتيجة بعد أسبوع: هل ستشعر بالارتياح أم الندم؟",
    "لو اخترت هذا المسار الآن، بعد شهر ماذا ستجد مختلفًا؟"
  ];
  return { persona: "visionary", segment: sample(segs), score: 0.85, rationale: "future-scenarios" };
}

function personaPlayful(candidate, context) {
  const segs = [
    "فكّر في القرار كطبق جديد — جرّب لقمة صغيرة.",
    "نَفَس عميق، خلّينا نجرب حاجة صغيرة ونضحك بعد كده."
  ];
  return { persona: "playful", segment: sample(segs), score: 0.6, rationale: "tension-release" };
}

const PERSONA_FUNCS = {
  logical: personaLogical,
  empathic: personaEmpathic,
  pragmatic: personaPragmatic,
  visionary: personaVisionary,
  playful: personaPlayful
};

/* =========================
   Inner Critics / Validators
   ========================= */
function safetyCheck(fingerprint, candidates) {
  const flags = [];
  const text = safeStr(fingerprint?.originalMessage).toLowerCase();
  for (const e of ["انتحار", "بموت", "أقتل", "أذبح"]) if (text.includes(e)) flags.push("emergency_critical");
  return { ok: flags.length === 0, flags };
}

function hallucinationCheck(candidate, context) {
    if (!candidate || !candidate.reply) return { likely: false, reasons: [] };
    const reply = candidate.reply;
    const reasons = [];
    const normalizedMessage = safeStr(context?.fingerprint?.normalizedMessage);
    if (/\b\d{4}\b/.test(reply) && !normalizedMessage.includes(RegExp.$1)) {
        reasons.push("year_unsupported");
    }
    const tokens = tokenizeWords(reply);
    for (const t of tokens) {
        if (t.length > 8 && !normalizedMessage.includes(t)) {
            reasons.push(`unknown_token:${t}`);
            if (reasons.length > 2) break;
        }
    }
    return { likely: reasons.length > 0, reasons, score: clamp(reasons.length * 0.25, 0, 1) };
}

function contradictionDetector(segments) {
    const lowConflict = [], highConflict = [];
    const opposites = [["افعل", "لا تفعل"], ["ابدأ", "انتظر"], ["تسرع", "تمهل"], ["خطر", "آمن"]];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const a = segments[i], b = segments[j];
            for (const [p, q] of opposites) {
                if ((a.includes(p) && b.includes(q)) || (a.includes(q) && b.includes(p))) {
                    highConflict.push({ pair: [i, j], words: [p, q], segments: [a, b] });
                }
            }
            const sim = jaccardSim(a, b);
            if (sim < 0.05 && /[\p{L}]/u.test(a) && /[\p{L}]/u.test(b)) {
                lowConflict.push({ pair: [i, j], sim, segments: [a, b] });
            }
        }
    }
    return { highConflict, lowConflict, conflict: highConflict.length > 0 || lowConflict.length > 0 };
}


/* =========================
   Fusion Core
   ========================= */
function analyzeCandidates(candidates = [], tracker = null, fingerprint = {}) {
  const history = tracker?.getHistory ? tracker.getHistory() : [];
  const recent = history.slice(-NOVELTY_DECAY_WINDOW).map(t => safeStr(t.ai_response?.reply || ""));
  return candidates.map(c => {
    const baseConf = clamp(Number(c.confidence ?? c.eval ?? 0.6), 0, 1);
    const personaResults = {};
    let personaAggregateScore = 0;
    Object.keys(PERSONA_FUNCS).forEach(pid => {
        try {
            const res = PERSONA_FUNCS[pid](c, { tracker, fingerprint });
            const align = jaccardSim(c.reply || "", res.segment || "");
            const personaScore = clamp(res.score * 0.6 + align * 0.4, 0, 1);
            personaResults[pid] = { ...res, align, personaScore };
            personaAggregateScore += personaScore;
        } catch (e) {
            personaResults[pid] = { persona: pid, segment: "", score: 0.2, rationale: "error" };
        }
    });
    const personaAvg = personaAggregateScore / Math.max(1, Object.keys(PERSONA_FUNCS).length);
    const maxSim = recent.reduce((m, r) => Math.max(m, jaccardSim(c.reply || "", r || "")), 0);
    const novelty = 1 - maxSim;
    const calibrated = clamp(baseConf * 0.6 + personaAvg * 0.3 + novelty * 0.1, 0, 1);
    return { candidate: c, baseConf, personaResults, personaAvg, novelty, calibratedScore: calibrated };
  }).sort((a, b) => b.calibratedScore - a.calibratedScore);
}

function composeFragmentsFromAnalysis(analyzed, context = {}) {
  const topN = Math.min(analyzed.length, MAX_FRAGMENTS + 1);
  const engines = analyzed.slice(0, topN);
  const personaContribs = {};
  for (const pid of Object.keys(PERSONA_FUNCS)) {
    let best = null, bestScore = -Infinity;
    for (const eng of engines) {
      const res = eng.personaResults[pid] || PERSONA_FUNCS[pid](eng.candidate, context);
      const utility = (res.personaScore ?? res.score ?? 0.5) * eng.calibratedScore * (1 + eng.novelty * 0.4);
      if (utility > bestScore) {
        bestScore = utility;
        best = { engine: eng.candidate, res, utility };
      }
    }
    personaContribs[pid] = {
      persona: pid,
      chosenEngine: best?.engine.source || null,
      segment: best?.res.segment || "",
      weight: clamp((best?.utility || 0) * (DEFAULT_PERSONAS.find(p => p.id === pid)?.weight || 1), 0, 2),
      rationale: best?.res.rationale || "fallback"
    };
  }
  const ordered = Object.values(personaContribs).sort((a, b) => b.weight - a.weight);
  const fragments = ordered.slice(0, MAX_FRAGMENTS).map(o => ({ persona: o.persona, segment: o.segment, weight: o.weight, rationale: o.rationale }));
  const provenance = {
    chosen_engines: [...new Set(ordered.map(o => o.chosenEngine).filter(Boolean))],
    personaContribs: ordered.reduce((acc, o) => { acc[o.persona] = { engine: o.chosenEngine, weight: o.weight, rationale: o.rationale }; return acc; }, {})
  };
  return { fragments, provenance, personaContribs: ordered };
}

/* =========================
   Conflict resolution & surface realization
   ========================= */
function resolveContradictions(fragments) {
  const segs = fragments.map(f => f.segment);
  const cd = contradictionDetector(segs);
  if (!cd.conflict) return { fragments, conflictResolved: false, resolutionNotes: null };
  if (cd.highConflict.length > 0) {
    const pair = cd.highConflict[0];
    const resolution = `قد يظهر لك خيارين متعاكسين: ${pair.segments[0]} و${pair.segments[1]}. كل خيار له مزاياه وعيوبه — ممكن نجرب طريقة وسيطة.`;
    const newFragments = [{ persona: "mediator", segment: resolution, weight: 1.0, rationale: "contradiction_mediator" }, ...fragments.slice(2)];
    return { fragments: newFragments, conflictResolved: true, resolutionNotes: resolution };
  }
  if (cd.lowConflict.length > 0) {
    const resolution = "لاحظت اختلافات بسيطة في الاقتراحات — هنا مزيج متوازن منها.";
    const newFragments = [{ persona: "harmonizer", segment: resolution, weight: 0.6, rationale: "low_conflict_harmonize" }, ...fragments];
    return { fragments: newFragments, conflictResolved: true, resolutionNotes: resolution };
  }
  return { fragments, conflictResolved: false, resolutionNotes: null };
}

function surfaceRealizer(fragments) {
  const transitions = ["من زاوية أخرى،", "وبالجانب العملي،", "إذا نظرنا للمستقبل،", "وبالمجمل،"];
  const normalized = fragments.map((f, i) => {
    let s = safeStr(f.segment).trim();
    if (!/[.؟!?]$/.test(s)) s += ".";
    return { ...f, text: s, transition: transitions[i % transitions.length] };
  }).sort((a, b) => {
    if (a.persona === "empathic" && b.persona !== "empathic") return -1;
    if (b.persona === "empathic" && a.persona !== "empathic") return 1;
    return b.weight - a.weight;
  });

  if (normalized.length === 0) return "يمكننا استكشاف هذا الأمر معًا خطوة بخطوة.";

  const paragraphs = normalized.map((f, i) => `${f.transition} ${f.text}`);
  let finalText = (normalized.length >= 3)
    ? `في البداية: ${normalized[0].text}\n\nثم: ${normalized[1].text}\n\nوأخيرًا: ${normalized[2].text}\n\n${paragraphs.slice(3).join("\n\n")}`
    : paragraphs.join("\n\n");

  if (new Set(normalized.map(n => n.persona)).size > 2) {
    finalText += `\n\nخلّينا نوازن بين الجانب العملي والعاطفي علشان يكون القرار مناسب لك.`;
  }
  return finalText.trim();
}

/* =========================
   Variant generator
   ========================= */
function generateVariants(fusedText, fragments) {
  // --- MODIFICATION: Added defensive fallbacks to prevent crashes ---
  const empathicSeg = fragments.find(f => f.persona === "empathic")?.segment || fragments[0]?.segment || "أنا هنا لدعمك.";
  const pragmaticSeg = fragments.find(f => f.persona === "pragmatic")?.segment || fragments[1]?.segment || "لنبدأ بخطوة صغيرة.";
  
  const compact = `${firstSentence(empathicSeg)}\n\nاقتراح سريع: ${firstSentence(pragmaticSeg)}`;
  const expanded = fusedText;

  const steps = fragments
    .filter(f => f.persona === "pragmatic" || f.persona === "logical")
    .map(f => `• ${firstSentence(f.segment)}`);
  const step_by_step = `خطوات عملية:\n${steps.length > 0 ? steps.join("\n") : "• اكتب الخيارات المتاحة.\n• قيّم كل خيار."}`;
  
  const story_mode = `قصة قصيرة:\n${firstSentence(fragments[0]?.segment || "أنت تواجه خيارًا.")} ثم ${firstSentence(fragments[1]?.segment || "نحتاج لفهم ما يخيفك.")} وأخيرًا ${firstSentence(fragments[2]?.segment || "تجربة صغيرة توضح الطريق.")}.`;

  return [
    { id: "compact", text: compact, confidence: 0.9 },
    { id: "expanded", text: expanded, confidence: 0.85 },
    { id: "steps", text: step_by_step, confidence: 0.88 },
    { id: "story", text: story_mode, confidence: 0.8 }
  ].slice(0, MAX_VARIANTS);
}

/* =========================
   Follow-up & Meta
   ========================= */
function generateFollowUpSeeds(fragments, fingerprint) {
  const seeds = fragments.slice(0, 3).map(f => ({
    id: `follow_${f.persona}`,
    text: `احكيلي أكثر عن: ${firstSentence(f.segment).split(" ").slice(0, 5).join(" ")}`
  }));
  if (fingerprint.inferredNeed) {
    seeds.push({ id: "need_probe", text: `هل تريد دعم بخصوص ${fingerprint.inferredNeed}؟` });
  }
  seeds.push({ id: "clarify", text: "هل تقدر توضّح أكتر السبب الرئيسي للتردد؟" });
  return [...new Map(seeds.map(item => [item["text"], item])).values()].slice(0, 6);
}

function buildProvenance(prov, analyzed, fragments, variants, fingerprint) {
  return {
    timestamp: nowISO(),
    provenance_summary: prov,
    top_candidates: analyzed.slice(0, 4).map(a => ({ source: a.candidate.source, calibratedScore: a.calibratedScore.toFixed(3) })),
    fragments: fragments.map(f => ({ persona: f.persona, weight: f.weight, segment: f.segment.slice(0,100) })),
    variants: variants.map(v => ({ id: v.id, confidence: v.confidence })),
    fingerprint_summary: {
      intensity: fingerprint.intensity || 0,
      inferredNeed: fingerprint.inferredNeed || null,
      communicationStyle: fingerprint.communicationStyle || null
    }
  };
}

/* =========================
   API: synthesizeHybridResponse
   ========================= */
function synthesizeHybridResponse(candidates = [], context = {}) {
  const { tracker = null, fingerprint = {} } = context;

  const fallbackResponse = {
    reply: "أنا معاك، ممكن توضّح أكتر؟",
    source: "hybrid_composer_fallback",
    variants: [],
    metadata: { reason: "no_candidates" }
  };

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return fallbackResponse;
  }
  
  const safety = safetyCheck(fingerprint, candidates);
  if (!safety.ok) {
    return {
      reply: "لاحظت إشارات للخطر. إذا كنت في خطر الآن، اتصل بخط الطوارئ المحلي فورًا.",
      source: "hybrid_safety",
      variants: [],
      metadata: { safetyFlags: safety.flags }
    };
  }

  const analyzed = analyzeCandidates(candidates, tracker, fingerprint);
  // --- MODIFICATION: Added defensive check for empty analyzed array ---
  if (!analyzed || analyzed.length === 0) {
      return fallbackResponse;
  }
  
  const { fragments: rawFragments, provenance } = composeFragmentsFromAnalysis(analyzed, context);
  const { fragments } = resolveContradictions(rawFragments);
  
  const hallucinations = [];
  analyzed.slice(0, 3).forEach(a => {
    const h = hallucinationCheck(a.candidate, context);
    if (h.likely) hallucinations.push({ source: a.candidate.source, reasons: h.reasons });
  });

  const fusedText = surfaceRealizer(fragments);
  const variants = generateVariants(fusedText, fragments);
  const followUpSeeds = generateFollowUpSeeds(fragments, fingerprint);
  const prov = buildProvenance(provenance, analyzed, fragments, variants, fingerprint);
  
  const intensity = clamp(fingerprint.intensity ?? 0, 0, 2);
  let primaryVariant = variants.find(v => v.id === "expanded") || variants[0];
  if (intensity > 1.0) {
    primaryVariant = variants.find(v => v.id === "compact") || primaryVariant;
  }

  if (!primaryVariant) {
      return fallbackResponse; // Final safety net
  }

  const metadata = {
    source: "hybrid_composer_v1.0-omega",
    provenance: prov,
    followUpSeeds,
  };

  return {
    reply: `${primaryVariant.text}\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات.]`,
    variants,
    metadata
  };
}

// --- MODIFICATION: Standardized the default export ---
export default { synthesizeHybridResponse };
