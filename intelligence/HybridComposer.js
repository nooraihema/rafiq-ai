
// intelligence/HybridComposer.js v1.0-omega
// THE HYBRID COMPOSER — "SUPREME SYNTHETIC MIND"
// Purpose: Produce a single, deeply fused, multi-variant response from many engine candidates.
// Features:
// - Multi-voice persona fusion (logical / empathic / pragmatic / visionary / playful + custom)
// - Inner critics ensemble (safety, coherence, contradiction, hallucination detector)
// - Meta-reasoning trace (why each fragment chosen)
// - Multi-variant generation (compact / expanded / step-by-step / story mode)
// - Conflict resolution & softening (contradiction resolver)
// - Tone harmonizer & register normalizer
// - Surface realizer (unified voice + transitions)
// - Follow-up seed generation (fractal seeds from reply content)
// - Provenance & confidence calibration
// - Learning hooks: feedback signature, incremental weight hints (no external storage used here)
// - No external libs (pure JS)

const DEBUG = false;

/* =========================
   Tunables & Config
   ========================= */
const DEFAULT_PERSONAS = [
  { id: "logical", weight: 1.0, desc: "منطق، أسباب، خطوات" },
  { id: "empathic", weight: 1.0, desc: "تعاطف، تطبيع، تأييد" },
  { id: "pragmatic", weight: 1.0, desc: "خطوات عملية قابلة للتنفيذ" },
  { id: "visionary", weight: 0.9, desc: "سناريوهات مستقبلية"، },
  { id: "playful", weight: 0.4, desc: "خفيف، تقليل توتر" }
];

const MAX_VARIANTS = 4;
const MAX_FRAGMENTS = 4;
const NOVELTY_DECAY_WINDOW = 6; // turns to consider for novelty
const CONTRADICTION_THRESHOLD = 0.55;
const HALLUCINATION_SIM_THRESHOLD = 0.2; // heuristic

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

/** Jaccard similarity */
function jaccardSim(a = "", b = "") {
  const s1 = new Set(tokenizeWords(a));
  const s2 = new Set(tokenizeWords(b));
  if (s1.size === 0 && s2.size === 0) return 1;
  const inter = [...s1].filter(x => s2.has(x)).length;
  const union = new Set([...s1, ...s2]).size || 1;
  return inter / union;
}

/** Lightweight sentence splitter */
function firstSentence(text) {
  if (!text) return "";
  const m = text.split(/(?<=[.؟!?])\s+/);
  return m[0] || text;
}

/* =========================
   Persona modules (extendable)
   Each persona returns { segment, score, rationale }
   segment = short text fragment produced by persona for a given candidate
   ========================= */

function personaLogical(candidate, context) {
  const reply = safeStr(candidate.reply);
  // heuristics: if candidate contains "because" or "لأن" use it; else provide structured steps
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
   - safetyCheck: critical keywords (suicide etc. — user handled elsewhere but keep simple)
   - hallucinationCheck: compares candidate factual claims against available fingerprint context (simple heuristics)
   - contradictionDetector: tries to detect contradictory short commands in fragments
   ========================= */

function safetyCheck(fingerprint, candidates) {
  // placeholder: if certain emergency tokens exist => mark emergency. (Assume external safety handled earlier).
  const flags = [];
  const text = safeStr(fingerprint.originalMessage).toLowerCase();
  const emergencies = ["انتحار", "بموت", "أقتل", "أذبح"]; // minimal
  for (const e of emergencies) if (text.includes(e)) flags.push("emergency_critical");
  return { ok: flags.length === 0, flags };
}

function hallucinationCheck(candidate, context) {
  // Heuristic: if candidate asserts facts (dates, counts, proper nouns) not present in fingerprint or memory, lower score.
  // We'll detect tokens that look like dates/numbers/proper nouns and check presence in fingerprint.normalizedMessage
  if (!candidate || !candidate.reply) return { likely: false, reasons: [] };
  const reply = candidate.reply;
  const reasons = [];
  // detect numbers/dates
  if (/\b\d{4}\b/.test(reply) && !safeStr(context.fingerprint.normalizedMessage).includes(RegExp.$1)) {
    reasons.push("year_unsupported");
  }
  // proper names heuristic: Capitalized words? In Arabic this is not reliable. Use presence of uncommon tokens.
  const tokens = tokenizeWords(reply);
  for (const t of tokens) {
    if (t.length > 8 && !safeStr(context.fingerprint.normalizedMessage).includes(t)) {
      // long token not in input may be hallucinated
      reasons.push(`unknown_token:${t}`);
      if (reasons.length > 2) break;
    }
  }
  return { likely: reasons.length > 0, reasons, score: clamp(reasons.length * 0.25, 0, 1) };
}

function contradictionDetector(segments) {
  // segments: array of short fragments
  // simple heuristic: detect direct-opposites pairs present
  const lowConflict = [];
  const highConflict = [];
  // opposites list (expandable)
  const opposites = [
    ["افعل", "لا تفعل"], ["ابدأ", "انتظر"], ["تسرع", "تمهل"], ["خطر", "آمن"]
  ];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j];
      for (const [p, q] of opposites) {
        if ((a.includes(p) && b.includes(q)) || (a.includes(q) && b.includes(p))) {
          highConflict.push({ pair: [i, j], words: [p, q], segments: [a, b] });
        }
      }
      // lexical contradiction if similarity is very low but both give directive
      const sim = jaccardSim(a, b);
      if (sim < 0.05 && /[\p{L}]/u.test(a) && /[\p{L}]/u.test(b)) {
        lowConflict.push({ pair: [i, j], sim, segments: [a, b] });
      }
    }
  }
  return { highConflict, lowConflict, conflict: highConflict.length > 0 || lowConflict.length > 0 };
}

/* =========================
   Fusion Core (the "self-dialogue"): personas inspect candidates and propose fragments.
   Then fusion composes final reply using rules below.
   ========================= */

function analyzeCandidates(candidates = [], tracker = null, fingerprint = {}) {
  // Produce per-candidate persona evaluations
  const history = tracker?.getHistory ? tracker.getHistory() : [];
  const recent = history.slice(-NOVELTY_DECAY_WINDOW).map(t => safeStr(t.ai_response?.reply || ""));
  const analyzed = candidates.map(c => {
    const baseConf = clamp(Number(c.confidence ?? c.eval ?? 0.6), 0, 1);
    // for each persona, compute a persona fragment & alignment
    const personaResults = {};
    let personaAggregateScore = 0;
    for (const pid of Object.keys(PERSONA_FUNCS)) {
      try {
        const res = PERSONA_FUNCS[pid](c, { tracker, fingerprint });
        // alignment: how much res.segment overlaps with candidate.reply (if candidate already embodies persona)
        const align = jaccardSim(c.reply || "", res.segment || "");
        const personaScore = clamp(res.score * 0.6 + align * 0.4, 0, 1);
        personaResults[pid] = { ...res, align, personaScore };
        personaAggregateScore += personaScore;
      } catch (e) {
        personaResults[pid] = { persona: pid, segment: "", score: 0.2, rationale: "error" };
      }
    }
    const personaAvg = personaAggregateScore / Math.max(1, Object.keys(PERSONA_FUNCS).length);
    // novelty: how different candidate reply is from recent replies
    const maxSim = recent.reduce((m, r) => Math.max(m, jaccardSim(c.reply || "", r || "")), 0);
    const novelty = 1 - maxSim;
    const calibrated = clamp(baseConf * 0.6 + personaAvg * 0.3 + novelty * 0.1, 0, 1);
    return {
      candidate: c,
      baseConf,
      personaResults,
      personaAvg,
      novelty,
      calibratedScore: calibrated
    };
  });
  // sort descending by calibratedScore
  analyzed.sort((a, b) => b.calibratedScore - a.calibratedScore);
  if (DEBUG) console.log("analyzed:", analyzed.map(a => ({ src: a.candidate.source, score: a.calibratedScore.toFixed(2), novelty: a.novelty.toFixed(2) })));
  return analyzed;
}

function composeFragmentsFromAnalysis(analyzed, selfState = {}, anticipations = {}, tracker = null, fingerprint = {}) {
  // For top N candidates, ask personas to select fragments; then rank persona contributions
  const topN = Math.min(analyzed.length, MAX_FRAGMENTS + 1);
  const engines = analyzed.slice(0, topN);
  const personaContribs = {}; // persona -> { chosenEngine, segment, weight, rationale }

  for (const pid of Object.keys(PERSONA_FUNCS)) {
    let best = null;
    let bestScore = -Infinity;
    for (const eng of engines) {
      const res = eng.personaResults[pid] || PERSONA_FUNCS[pid](eng.candidate, { tracker, fingerprint });
      // persona's utility: personaScore * eng.calibratedScore * novelty factor
      const utility = (res.personaScore ?? res.score ?? 0.5) * eng.calibratedScore * (1 + eng.novelty * 0.4);
      if (utility > bestScore) {
        bestScore = utility;
        best = { engine: eng.candidate, res, utility };
      }
    }
    personaContribs[pid] = {
      persona: pid,
      chosenEngine: best ? best.engine.source : null,
      segment: best ? best.res.segment : "",
      weight: clamp((best ? best.utility : 0) * (DEFAULT_PERSONAS.find(p => p.id === pid)?.weight || 1), 0, 2),
      rationale: best ? best.res.rationale || "selected" : "fallback"
    };
  }

  // Now build ordered contributions by weight
  const ordered = Object.values(personaContribs).sort((a, b) => b.weight - a.weight);
  // Convert to fragments (cap at MAX_FRAGMENTS)
  const fragments = ordered.slice(0, MAX_FRAGMENTS).map(o => ({ persona: o.persona, segment: o.segment, weight: o.weight, rationale: o.rationale }));

  // Also create meta data linking which engines contributed
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
  // fragments: [{persona, segment, weight}, ...]
  const segs = fragments.map(f => f.segment);
  const cd = contradictionDetector(segs);
  if (!cd.conflict) return { fragments, conflictResolved: false, resolutionNotes: null };

  // If highConflict, we generate a softening paragraph that acknowledges both views
  if (cd.highConflict && cd.highConflict.length > 0) {
    const pair = cd.highConflict[0];
    const a = pair.segments[0], b = pair.segments[1];
    const resolution = `قد يظهر لك خيارين متعاكسين: ${a} و${b}. كل خيار له مزاياه وعيوبه — ممكن نجرب طريقة وسيطة: نبدأ بخطوة صغيرة لتجربة أحدهما ثم نقيّم.`;
    // replace first two fragments with this soft resolution, keep remaining fragments after
    const newFragments = [{ persona: "mediator", segment: resolution, weight: 1.0, rationale: "contradiction_mediator" }].concat(fragments.slice(2));
    return { fragments: newFragments, conflictResolved: true, resolutionNotes: resolution };
  }

  // If only lowConflict, we simply add an acknowledgement sentence
  if (cd.lowConflict && cd.lowConflict.length > 0) {
    const resolution = "لاحظت اختلافات بسيطة في الاقتراحات — هنا مزيج متوازن منها.";
    const newFragments = [{ persona: "harmonizer", segment: resolution, weight: 0.6, rationale: "low_conflict_harmonize" }].concat(fragments);
    return { fragments: newFragments, conflictResolved: true, resolutionNotes: resolution };
  }
  return { fragments, conflictResolved: false, resolutionNotes: null };
}

/* Surface realizer: connect fragments into a smooth text with transitions and consistent voice */
function surfaceRealizer(fragments, options = {}) {
  const transitions = [
    "من زاوية أخرى،",
    "وبالجانب العملي،",
    "إذا نظرنا للمستقبل،",
    "وبالمجمل،"
  ];
  // Normalize fragments: ensure they are full sentences
  const normalized = fragments.map((f, i) => {
    let s = safeStr(f.segment).trim();
    if (!/[.؟!?]$/.test(s)) s = s + ".";
    return { ...f, text: s, transition: transitions[i % transitions.length] };
  });

  // Decide ordering: by weight desc, but prefer empathic on top for safety
  normalized.sort((a, b) => {
    if (a.persona === "empathic" && b.persona !== "empathic") return -1;
    if (b.persona === "empathic" && a.persona !== "empathic") return 1;
    return b.weight - a.weight;
  });

  // Build final paragraphs with micro transitions
  const paragraphs = normalized.map((f, i) => `${f.transition} ${f.text}`);
  // Optionally produce Micro-Story wrapper: beginning/middle/end if enough fragments
  let finalText = "";
  if (normalized.length >= 3) {
    finalText = `في البداية: ${normalized[0].text}\n\nثم: ${normalized[1].text}\n\nوأخيرًا: ${normalized[2].text}\n\n${paragraphs.slice(3).join("\n\n")}`;
  } else {
    finalText = paragraphs.join("\n\n");
  }

  // Tone harmonization: if personas are diverse, add balancing sentence
  const personaSet = new Set(normalized.map(n => n.persona));
  if (personaSet.size > 2) {
    finalText += `\n\nخلّينا نوازن بين الجانب العملي والعاطفي علشان يكون القرار مناسب لك.`;
  }

  return finalText.trim();
}

/* =========================
   Variant generator: produce multiple variants of reply
   - compact: short empathetic + one step
   - expanded: full fusion
   - step_by_step: numbered actions
   - story_mode: narrative
   ========================= */

function generateVariants(fusedText, fragments, personaContribs, provenance, fingerprint, tracker) {
  const compact = (() => {
    // try to pick empathic + pragmatic short lines
    const empathic = fragments.find(f => f.persona === "empathic") || fragments[0];
    const pragmatic = fragments.find(f => f.persona === "pragmatic") || fragments[1] || fragments[0];
    return `${firstSentence(empathic.segment)}\n\nاقتراح سريع: ${firstSentence(pragmatic.segment)}`;
  })();

  const expanded = fusedText;

  const step_by_step = (() => {
    // collect pragmatic or logical fragments and make bullets
    const steps = [];
    fragments.forEach((f, i) => {
      if (f.persona === "pragmatic" || f.persona === "logical") {
        steps.push(`• ${firstSentence(f.segment)}`);
      }
    });
    if (steps.length === 0) {
      steps.push("• اكتب الخيارات المتاحة أمامك.");
      steps.push("• قيّم كل خيار من حيث الأثر والجهد.");
    }
    return `خطوات عملية:\n${steps.join("\n")}`;
  })();

  const story_mode = (() => {
    // assemble a mini story using fragments
    const a = fragments[0] || { segment: "بداية: أنت تواجه خيارًا صعبًا." };
    const b = fragments[1] || { segment: "وسط: نحتاج لفهم ما يخيفك." };
    const c = fragments[2] || { segment: "نهاية: تجربة صغيرة توضح الطريق." };
    return `قصة قصيرة:\n${firstSentence(a.segment)} ثم ${firstSentence(b.segment)} وأخيرًا ${firstSentence(c.segment)}.`;
  })();

  const variants = [
    { id: "compact", text: compact, confidence: 0.9 },
    { id: "expanded", text: expanded, confidence: 0.85 },
    { id: "steps", text: step_by_step, confidence: 0.88 },
    { id: "story", text: story_mode, confidence: 0.8 }
  ];

  // calibrate variant confidences by provenance novelty and fingerprint intensity
  const intensity = clamp(fingerprint.intensity ?? 0, 0, 2);
  variants.forEach(v => {
    // small heuristic: if user intensity high, favor empathic compact and steps
    if (intensity > 1.0 && v.id === "compact") v.confidence += 0.03;
    v.confidence = clamp(v.confidence, 0, 1);
  });

  // trim to MAX_VARIANTS
  return variants.slice(0, MAX_VARIANTS);
}

/* =========================
   Follow-up seed generator (fractal & contextual)
   ========================= */

function generateFollowUpSeeds(fusedText, fragments, fingerprint) {
  const keywords = new Set(tokenizeWords(fusedText).slice(0, 80));
  const seeds = [];
  // Semantic seeds from fragments
  for (const f of fragments.slice(0, 3)) {
    const k = firstSentence(f.segment).split(" ").slice(0, 5).join(" ");
    seeds.push({ id: `follow_${f.persona}`, text: `احكيلي أكثر عن: ${k}` });
  }
  // Contextual seeds based on fingerprint inferredNeed
  if (fingerprint.inferredNeed) {
    seeds.push({ id: "need_probe", text: `هل تريد دعم بخصوص ${fingerprint.inferredNeed}؟` });
  }
  // Safety/clarity seed
  seeds.push({ id: "clarify", text: "هل تقدر توضّح أكتر السبب الرئيسي للتردد؟" });
  // Ensure uniqueness & reasonable count
  const uniq = [];
  for (const s of seeds) if (!uniq.find(u => u.text === s.text)) uniq.push(s);
  return uniq.slice(0, 6);
}

/* =========================
   Meta-Reasoning: explainability & provenance packaging
   ========================= */

function buildProvenance(prov, analyzed, fragments, variants, fingerprint) {
  return {
    timestamp: nowISO(),
    provenance_summary: prov,
    top_candidates: analyzed.slice(0, 4).map(a => ({ source: a.candidate.source, calibratedScore: a.calibratedScore.toFixed(3), novelty: a.novelty.toFixed(3) })),
    fragments: fragments.map(f => ({ persona: f.persona, weight: f.weight, segment: f.segment })),
    variants: variants.map(v => ({ id: v.id, confidence: v.confidence })),
    fingerprint_summary: {
      intensity: fingerprint.intensity || 0,
      inferredNeed: fingerprint.inferredNeed || fingerprint.chosenPrimaryNeed || null,
      communicationStyle: fingerprint.communicationStyle || null
    }
  };
}

/* =========================
   Feedback hook: signature to attach to response for later learning
   ========================= */

function learningSignature(response, analyzed, provenance) {
  // minimal signature that can be stored later to update weights
  return {
    responseId: `resp_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: nowISO(),
    chosenEngines: provenance.provenance_summary?.chosen_engines || provenance.chosen_engines || [],
    topScores: analyzed.slice(0, 4).map(a => ({ src: a.candidate.source, score: a.calibratedScore })),
    fragments: provenance.fragments || [],
    meta: { note: "store this with user feedback to update persona/engine weights" }
  };
}

/* =========================
   API: synthesizeHybridResponse
   Inputs:
     - candidates: array of { reply, source, confidence, metadata }
     - context: { selfState, anticipations, tracker, fingerprint }
   Output:
     - { reply, variants, metadata, provenance, signature }
   ========================= */

export function synthesizeHybridResponse(candidates = [], context = {}) {
  const { selfState = {}, anticipations = {}, tracker = null, fingerprint = {} } = context;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      reply: "أنا معاك، ممكن توضّح أكتر؟",
      source: "hybrid_composer",
      variants: [{ id: "fallback", text: "ممكن تقوللي بمثال لو سمحت؟", confidence: 0.5 }],
      metadata: { reason: "no_candidates" }
    };
  }

  // 1) Inner safety check
  const safety = safetyCheck(fingerprint, candidates);
  if (!safety.ok) {
    return {
      reply: "لاحظت إشارات للخطر. إذا كنت في خطر الآن، اتصل بخط الطوارئ المحلي فورًا أو اطلب مساعدة طبية.",
      source: "hybrid_safety",
      metadata: { safetyFlags: safety.flags }
    };
  }

  // 2) Analyze candidates (persona voting + novelty)
  const analyzed = analyzeCandidates(candidates, tracker, fingerprint);

  // 3) Compose persona fragments
  const { fragments: rawFragments, provenance, personaContribs } = composeFragmentsFromAnalysis(analyzed, selfState, anticipations, tracker, fingerprint);

  // 4) Conflict resolution
  const resolved = resolveContradictions(rawFragments);
  let fragments = resolved.fragments;

  // 5) Hallucination check for top candidates (mark for lowering weight/annotate)
  const hallucinations = [];
  for (const a of analyzed.slice(0, 3)) {
    const h = hallucinationCheck(a.candidate, { fingerprint, tracker });
    if (h.likely) {
      hallucinations.push({ source: a.candidate.source, reasons: h.reasons, score: h.score });
      // softly lower weight of fragment if hallucination suspected
      for (const f of fragments) {
        if (f.segment && jaccardSim(f.segment, a.candidate.reply) > 0.25) {
          f.weight = clamp(f.weight * (1 - h.score * 0.6), 0, 2);
        }
      }
    }
  }

  // 6) Surface realizer: produce fusedText
  const fusedText = surfaceRealizer(fragments, { selfState, anticipations });

  // 7) Variant generation
  const variants = generateVariants(fusedText, fragments, personaContribs, provenance, fingerprint, tracker);

  // 8) Follow-up seeds
  const followUpSeeds = generateFollowUpSeeds(fusedText, fragments, fingerprint);

  // 9) Provenance & meta
  const prov = buildProvenance(provenance, analyzed, fragments, variants, fingerprint);

  // 10) Learning signature
  const signature = learningSignature(fusedText, analyzed, prov);

  // 11) Final packaging: pick a "primary" variant to return as reply (prefer expanded if intensity low, compact if high)
  const intensity = clamp(fingerprint.intensity ?? 0, 0, 2);
  let primaryVariant = variants.find(v => v.id === "expanded") || variants[0];
  if (intensity > 1.0) {
    primaryVariant = variants.find(v => v.id === "compact") || primaryVariant;
  }

  // 12) Additional metadata for UI: fragments, persona contributions, provenance, hallucinations, conflict resolution
  const metadata = {
    source: "hybrid_composer_v1.0-omega",
    chosenVariant: primaryVariant.id,
    variantConfidence: primaryVariant.confidence,
    fragments,
    personaContribs,
    provenance: prov,
    hallucinations,
    conflictResolution: { resolved: resolved.conflictResolved, notes: resolved.resolutionNotes },
    followUpSeeds,
    signature
  };

  const finalReply = primaryVariant.text + `\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات لتغطية الجانب العاطفي والمنطقي والعملي]`;

  return {
    reply: finalReply,
    variants,
    metadata
  };
}

/* =========================
   Convenience default export
   ========================= */
export default { synthesizeHybridResponse };

