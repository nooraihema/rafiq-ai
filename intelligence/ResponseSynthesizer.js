
// intelligence/ResponseSynthesizer.js v1.2
// SUPREME FUSION (all-in-one, no external libs)
// New in v1.2: generate alternative variants (concise, formal, bullet, empathic, action-first)
// Exports: synthesizeResponse(candidates, selfState, anticipations, tracker)
// Author: Assistant for Rafiq system

import { DEBUG } from '../shared/config.js';

/* =========================
   Tunables & Constants
   ========================= */
const PERSONALITIES = [
  { id: 'logical', weight: 1.0, desc: 'تحليل عقلاني، أسباب وخطوات' },
  { id: 'empathic', weight: 1.0, desc: 'تعاطف، تطبيع، تأييد' },
  { id: 'visionary', weight: 0.9, desc: 'توقعات مستقبلية وسيناريوهات' },
  { id: 'pragmatic', weight: 1.0, desc: 'خطوات عملية قابلة للتنفيذ' },
  { id: 'playful', weight: 0.5, desc: 'تخفيف توتر، استعارات بسيطة' }
];

const FUSION_WEIGHTS = {
  engineConfidence: 0.45,
  personaVote: 0.35,
  noveltyBoost: 0.20
};

const MAX_FRAGMENTS = 3; // micro-segments in final reply
const MAX_VARIANTS = 5;

/* =========================
   Utilities
   ========================= */
function safeStr(s) { return (s || '').toString(); }
function sample(arr) { if (!arr || arr.length === 0) return null; return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }

function jaccardSim(a = '', b = '') {
  const s1 = new Set(a.split(/\s+/).filter(Boolean));
  const s2 = new Set(b.split(/\s+/).filter(Boolean));
  const inter = [...s1].filter(x => s2.has(x)).length;
  const union = new Set([...s1, ...s2]).size || 1;
  return inter / union;
}

function sentenceFirstFragment(text) {
  if (!text) return '';
  const parts = text.split(/[.؟!\n]/).map(p => p.trim()).filter(Boolean);
  return parts[0] || text.slice(0, 120);
}

/* =========================
   Persona modules (each returns { voice, score, segment })
   These heuristics are lightweight and deterministic.
   ========================= */

function personaLogical(candidate, context) {
  const r = safeStr(candidate.reply);
  const reasonSeed = r.match(/لأن|بسبب|السبب|because|due to/gi) ? sentenceFirstFragment(r) : 'لأن هناك عوامل متعددة تؤثر هنا.';
  const steps = 'اقتراح عملي: اكتب الخيارات، قَيم كل خيار حسب الأثر والجهد، جرّب خيارًا صغيرًا.';
  return { voice: 'logical', score: 0.9, segment: `${reasonSeed}\n${steps}` };
}

function personaEmpathic(candidate, context) {
  const seed = sentenceFirstFragment(candidate.reply);
  const seg = `${seed}\nأنا معاك — مشاعرك مفهومة وطبيعية. مش ضروري تكون قوي في كل لحظة.`.trim();
  return { voice: 'empathic', score: 0.98, segment: seg };
}

function personaVisionary(candidate, context) {
  const scenarios = [
    "تخيل لو اخترت هذا الخيار: بعد أسبوع قد تلاحظ فرقًا بسيطًا في شعورك.",
    "تخيل لو قررت الانتظار: قد تنال راحة مؤقتة لكن القرار يبقى معلقًا."
  ];
  return { voice: 'visionary', score: 0.75, segment: sample(scenarios) };
}

function personaPragmatic(candidate, context) {
  const checklist = [
    "اكتب الخيارات الآن في ورقة.",
    "قيّم كل خيار: النتيجة المحتملة، الوقت المطلوب، التكلفة.",
    "ابدأ بخطوة صغيرة لمدة 24 ساعة."
  ];
  return { voice: 'pragmatic', score: 0.98, segment: `عملي: ${sample(checklist)}` };
}

function personaPlayful(candidate, context) {
  const metaphors = [
    "فكر في قرارك كاختبار طعم — جرّب جزء صغير قبل الالتزام.",
    "خذ نفسين وقل لنفسك: 'هيا نجرب' 😂"
  ];
  return { voice: 'playful', score: 0.55, segment: sample(metaphors) };
}

const PERSONA_FUNCS = {
  logical: personaLogical,
  empathic: personaEmpathic,
  visionary: personaVisionary,
  pragmatic: personaPragmatic,
  playful: personaPlayful
};

/* =========================
   Scoring & novelty detection
   ========================= */

function scoreCandidates(candidates, tracker) {
  const history = (tracker && typeof tracker.getHistory === 'function') ? tracker.getHistory() : [];
  const recentReplies = history.slice(-8).map(t => (t.ai_response && t.ai_response.reply) || '');
  return candidates.map(c => {
    const baseConf = clamp(c.confidence ?? 0.6, 0, 1);
    const personaVotes = PERSONALITIES.map(p => {
      const pRes = PERSONA_FUNCS[p.id](c, { tracker });
      const overlap = jaccardSim(c.reply || '', pRes.segment || '');
      // persona likes candidate if segment complements it (some overlap) but not identical (diversity)
      const personaScore = pRes.score * (1 - 0.4 * overlap) + 0.4 * overlap;
      return { persona: p.id, personaScore, segment: pRes.segment };
    });
    const maxSim = recentReplies.reduce((m, r) => Math.max(m, jaccardSim(c.reply || '', r || '')), 0);
    const novelty = 1 - maxSim;
    const personaAggregate = personaVotes.reduce((s, pv) => s + pv.personaScore, 0) / Math.max(1, personaVotes.length);
    const raw = baseConf * FUSION_WEIGHTS.engineConfidence
      + personaAggregate * FUSION_WEIGHTS.personaVote
      + novelty * FUSION_WEIGHTS.noveltyBoost;
    return {
      candidate: c,
      baseConf,
      personaVotes,
      novelty: parseFloat(novelty.toFixed(3)),
      rawScore: clamp(raw, 0, 1)
    };
  }).sort((a, b) => b.rawScore - a.rawScore);
}

/* =========================
   Self-dialogue fusion (multi-persona debate)
   ========================= */

function selfDialogueFusion(topScored, context) {
  const engines = topScored.slice(0, 3).map(e => e.candidate);
  const personaContributions = {};

  for (const p of PERSONALITIES) {
    const fn = PERSONA_FUNCS[p.id];
    if (!fn) continue;
    let best = null, bestScore = -1;
    for (const eng of engines) {
      const res = fn(eng, context);
      const align = jaccardSim(eng.reply || '', res.segment || '');
      const score = (res.score || 0.5) * 0.6 + align * 0.4;
      if (score > bestScore) { bestScore = score; best = { eng, res }; }
    }
    personaContributions[p.id] = {
      persona: p.id,
      chosenEngine: best?.eng?.source || null,
      segment: best?.res?.segment || '',
      personaWeight: p.weight * (bestScore || 0.1)
    };
  }

  const ordered = Object.values(personaContributions).sort((a, b) => b.personaWeight - a.personaWeight);
  const fragments = ordered.slice(0, MAX_FRAGMENTS).map((o, idx) => {
    const realityLabels = ['(قلبك)', '(دماغك)', '(الصورة المستقبلية)'];
    const prefix = realityLabels[idx] || `(طبقة ${idx + 1})`;
    // ensure short fragments
    const frag = o.segment.length > 220 ? o.segment.split(/[.،]/)[0] + '...' : o.segment;
    return `${prefix} ${frag}`.trim();
  });

  const seeds = ordered.slice(0, 3).map((o, i) => {
    const seedTemplates = [
      "احكيلي أكتر عن السبب الرئيسي.",
      "تريد خطوات عملية دلوقتي؟",
      "هل جربت حل مشابه قبل كده؟"
    ];
    return seedTemplates[i] || `اكشف المزيد عن: ${o.segment.split(' ').slice(0, 6).join(' ')}`;
  });

  const meta = `هذا الرد مُركّب من زوايا عاطفية، تحليلية، وتطبيقية لتغطية مشاعرك وبدائلك.`;
  const topPersona = ordered[0]?.persona || 'empathic';
  const toneDecor = (topPersona === 'playful') ? ' 😉' : (topPersona === 'pragmatic') ? ' ✔️' : '';

  const fused = `${fragments.join('\n\n')}\n\n${meta}${toneDecor}`;

  return { fusedReply: fused, fragments, seeds, meta, personaContributions };
}

/* =========================
   Surface realizer - unify style with connectors & transitions
   ========================= */

function surfaceRealizer(fragments) {
  if (!fragments || fragments.length === 0) return '';
  const connectors = ["من زاوية أخرى،", "وبالجانب العملي،", "أما على المدى البعيد،"];
  return fragments.map((f, i) => `${connectors[i % connectors.length]} ${f}`).join(' ');
}

/* =========================
   Contradiction detector & resolver
   ========================= */

function detectContradictionText(a = '', b = '') {
  // simple heuristics: opposing verbs/keywords pairs
  const opposites = [
    ['ابدأ', 'انتظر'], ['ابدأ', 'لا تبدأ'], ['افعل', 'لا تفعل'],
    ['تسارع', 'تريث'], ['فوراً', 'لاحقاً'], ['لا تفعل', 'جرب']
  ];
  const Al = a || '', Bl = b || '';
  return opposites.some(([x, y]) => Al.includes(x) && Bl.includes(y));
}

function contradictionResolver(a = '', b = '') {
  // produce reconciled phrasing
  const resolved = `يظهر هنا خياران مختلفان:\n- ${a}\n- ${b}\nكل خيار له مزاياه وعيوبه؛ يمكننا تجربة أحدهما بطريقة مصغرة كاختبار.`;
  return resolved;
}

/* =========================
   Tone harmonizer
   ========================= */

function toneHarmonizer(reply, personaContributions) {
  const personaCount = Object.keys(personaContributions || {}).length;
  if (personaCount > 2) {
    return `${reply}\n\n(ملاحظة: تم الموازنة بين أكثر من أسلوب — عملي وعاطفي وتحليلي)`;
  }
  return reply;
}

/* =========================
   Micro-story constructor (builds ascent: empathize->analyze->act)
   ========================= */

function microStory(fragments) {
  if (!fragments || fragments.length === 0) return '';
  if (fragments.length === 1) return fragments[0];
  const first = fragments[0];
  const middle = fragments[1] || '';
  const last = fragments[2] || '';
  return `في البداية: ${first}\nثم: ${middle}\nوأخيرًا: ${last}`;
}

/* =========================
   Fractal seeds (dynamic quick-replies based on keywords)
   ========================= */

function dynamicSeeds(reply) {
  const kws = ['خوف', 'قرار', 'راحة', 'خطوة', 'قلق', 'تردد'];
  const seeds = [];
  for (const k of kws) {
    if (reply.includes(k) && seeds.length < 6) seeds.push(`تحب تحكيلي أكتر عن "${k}"؟`);
  }
  if (seeds.length === 0) seeds.push("إيه أهم حاجة حابب تركز عليها دلوقتي؟");
  return seeds;
}

/* =========================
   Alternative variants generator
   ========================= */

function variant_concise(reply) {
  // keep essential idea only: first sentence + one practical hint if present
  const first = sentenceFirstFragment(reply);
  const hint = reply.match(/(?:خطوة|اقتراح|معلومة)/i) ? 'اقتراح عملي: ابدأ بخطوة صغيرة.' : '';
  return `${first}${hint ? '\n' + hint : ''}`;
}

function variant_formal(reply) {
  return `بشكل موجز ورسمي:\n${reply.split(/\n/).map(s => s.trim()).filter(Boolean).join(' ')}\n\nإن احتجت توضيحات إضافية سأقدّمها.`;
}

function variant_bulleted(reply) {
  // extract short actionable fragments and return as bullets
  const parts = reply.split(/[.،\n]/).map(p => p.trim()).filter(Boolean);
  const bullets = parts.slice(0, 5).map(p => `• ${p}`);
  return bullets.join('\n');
}

function variant_empathic(reply) {
  return `أنا شايفك وفاهمك: ${sentenceFirstFragment(reply)}\nخليك فاكر إن التردد طبيعي، ومهم أخد خطوة صغيرة دلوقتي.`;
}

function variant_action_first(reply) {
  // find any 'خطوة' or generate a direct action
  const match = reply.match(/(خطوة [^\n.؟!]*)/i);
  const action = match ? match[0] : 'ابدأ بخطوة صغيرة: جرّب شيء صغير لمدة يوم واحد.';
  return `${action}\nبعد كده نراجع تأثيرها مع بعض.`;
}

/* =========================
   Smart merge fallback (naive)
   ========================= */

function mergeCandidatesSmart(bestA, bestB) {
  if (!bestA && !bestB) return '';
  if (!bestB) return bestA.reply;
  const a = bestA.candidate || bestA;
  const b = bestB.candidate || bestB;
  const main = a.reply;
  const addon = (b.reply.split(/[.؟!]\s*/).find(s => s.length > 25) || b.reply) || '';
  return `${main}\n\nمعلومة إضافية: ${addon}`.trim();
}

/* =========================
   Public API: synthesizeResponse
   ========================= */

export function synthesizeResponse(candidates = [], selfState = {}, anticipations = {}, tracker = null) {
  const cleanCandidates = (candidates || []).map(c => ({
    reply: safeStr(c.reply),
    source: c.source || 'unknown',
    confidence: clamp(Number(c.confidence ?? c.eval ?? 0.6), 0, 1),
    metadata: c.metadata || {}
  }));

  if (cleanCandidates.length === 0) {
    return {
      reply: "أنا هنا — ممكن توضّح أكثر؟",
      source: 'response_synthesizer_v1.2',
      metadata: { reason: 'no_candidates' }
    };
  }

  // 1) Score candidates
  const scored = scoreCandidates(cleanCandidates, tracker);
  if (DEBUG) console.log('[_synth] scored candidates:', scored.map(s => ({ src: s.candidate.source, raw: s.rawScore.toFixed(2) })));

  // 2) Self-dialogue fusion across top candidates
  const fusion = selfDialogueFusion(scored, { selfState, anticipations, tracker });

  // 3) Contradiction check between top two fragments (raw engine outputs)
  const topTwoEngines = scored.slice(0, 2).map(s => s.candidate.reply);
  let fusedReply = fusion.fusedReply;
  if (topTwoEngines.length >= 2 && detectContradictionText(topTwoEngines[0], topTwoEngines[1])) {
    fusedReply = contradictionResolver(sentenceFirstFragment(topTwoEngines[0]), sentenceFirstFragment(topTwoEngines[1]));
  } else {
    // refine surface style
    fusedReply = surfaceRealizer(fusion.fragments);
  }

  // 4) Micro-story overlay to give emotional arc
  const story = microStory(fusion.fragments);
  // combine story + fusedReply but prefer story as lead for ascent
  let combined = story ? `${story}\n\n${fusedReply}` : fusedReply;

  // 5) Tone harmonizer
  combined = toneHarmonizer(combined, fusion.personaContributions);

  // 6) Seeds & meta
  const seeds = dynamicSeeds(combined);
  const metaTwist = "في داخلي كان ممكن يكون في رد آخر؛ اخترت هذا المزيج لأنه يوازن بين مشاعرك والحلول العملية.";
  const provenance = {
    chosen_engines: scored.slice(0, 3).map(s => ({ source: s.candidate.source, score: s.rawScore.toFixed(3) })),
    persona_contributions: fusion.personaContributions,
    novelty_scores: scored.map(s => ({ src: s.candidate.source, novelty: s.novelty })),
    mergedAlternativeSnippet: mergeCandidatesSmart(scored[0], scored[1] || null).slice(0, 400)
  };

  // 7) Generate variants
  const baseText = `${combined}\n\n${metaTwist}`;
  const variants = {
    concise: variant_concise(baseText),
    formal: variant_formal(baseText),
    bulleted: variant_bulleted(baseText),
    empathic: variant_empathic(baseText),
    action_first: variant_action_first(baseText)
  };

  // 8) Package final output
  const final = {
    reply: baseText,
    source: 'response_synthesizer_v1.2',
    metadata: {
      fragments: fusion.fragments,
      followUpSeeds: seeds,
      metaReflection: fusion.meta,
      provenance,
      variants,
      personaContributions: fusion.personaContributions,
      metaTwist
    }
  };

  if (DEBUG) console.log('[synthesizer] Final reply prepared, top persona:', Object.keys(fusion.personaContributions || {})[0] || 'n/a');

  return final;
}
