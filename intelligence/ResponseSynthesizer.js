// intelligence/ResponseSynthesizer.js v1.3 (Production Ready)
// SUPREME FUSION (all-in-one, no external libs)
// New in v1.2: generate alternative variants (concise, formal, bullet, empathic, action-first)
// New in v1.3: Bulletproofed against empty/invalid inputs to prevent silent crashes.
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

const MAX_FRAGMENTS = 3;
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
  if (s1.size === 0 && s2.size === 0) return 1;
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
   Persona modules
   ========================= */
function personaLogical(candidate, context) {
  const r = safeStr(candidate.reply);
  const reasonSeed = r.match(/لأن|بسبب|السبب|because|due to/gi) ? sentenceFirstFragment(r) : 'لأن هناك عوامل متعددة تؤثر هنا.';
  const steps = 'اقتراح عملي: اكتب الخيارات، قَيم كل خيار حسب الأثر والجهد، جرّب خيارًا صغيرًا.';
  return { voice: 'logical', score: 0.9, segment: `${reasonSeed}\n${steps}` };
}

function personaEmpathic(candidate, context) {
  const seed = sentenceFirstFragment(candidate.reply) || "يبدو أن هذا الموقف صعب.";
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
   Self-dialogue fusion
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
    if (best) {
        personaContributions[p.id] = {
          persona: p.id,
          chosenEngine: best.eng?.source || null,
          segment: best.res?.segment || '',
          personaWeight: p.weight * bestScore
        };
    }
  }

  const ordered = Object.values(personaContributions).sort((a, b) => b.personaWeight - a.personaWeight);
  const fragments = ordered.slice(0, MAX_FRAGMENTS).map(o => o.segment);
  return { fragments, personaContributions };
}

/* =========================
   Surface realizer & other helpers
   ========================= */
function surfaceRealizer(fragments) {
  if (!fragments || fragments.length === 0) return '';
  if (fragments.length === 1) return fragments[0];
  const connectors = ["من زاوية أخرى،", "وبالجانب العملي،", "أما على المدى البعيد،"];
  return fragments.map((f, i) => i === 0 ? f : `${connectors[(i - 1) % connectors.length]} ${f}`).join('\n\n');
}

function detectContradictionText(a = '', b = '') {
  const opposites = [['ابدأ', 'انتظر'], ['افعل', 'لا تفعل'], ['فوراً', 'لاحقاً']];
  return opposites.some(([x, y]) => (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x)));
}

function contradictionResolver(a = '', b = '') {
  return `يظهر هنا خياران مختلفان:\n- ${a}\n- ${b}\nكل خيار له مزاياه وعيوبه؛ يمكننا تجربة أحدهما بطريقة مصغرة كاختبار.`;
}

function dynamicSeeds(reply) {
  const kws = ['خوف', 'قرار', 'راحة', 'خطوة', 'قلق', 'تردد'];
  const seeds = [];
  for (const k of kws) {
    if (reply.includes(k) && seeds.length < 3) seeds.push(`هل تود التحدث أكثر عن "${k}"؟`);
  }
  if (seeds.length === 0) seeds.push("ما هي أهم نقطة تود التركيز عليها الآن؟");
  return seeds;
}

/* =========================
   [FIXED] Smart merge fallback
   ========================= */
function mergeCandidatesSmart(bestA, bestB) {
  if (!bestA?.candidate?.reply) return safeStr(bestB?.candidate?.reply);
  if (!bestB?.candidate?.reply) return safeStr(bestA?.candidate?.reply);
  
  const main = bestA.candidate.reply;
  const addonText = bestB.candidate.reply;
  const addon = (addonText.split(/[.؟!]\s*/).find(s => s.length > 25 && !main.includes(s)) || addonText);

  if (main.includes(addon)) return main;
  return `${main}\n\nإضافةً إلى ذلك: ${addon}`.trim();
}

/* =========================
   Public API: synthesizeResponse
   ========================= */
function synthesizeResponse(candidates = [], selfState = {}, anticipations = {}, tracker = null) {
  const cleanCandidates = (candidates || []).filter(c => c && c.reply).map(c => ({
    reply: safeStr(c.reply),
    source: c.source || 'unknown',
    confidence: clamp(Number(c.confidence ?? 0.6), 0, 1),
    metadata: c.metadata || {}
  }));

  // [FIXED] If only one or zero candidates, return it/them directly without synthesis.
  if (cleanCandidates.length <= 1) {
    return cleanCandidates[0] || null;
  }

  // 1) Score candidates
  const scored = scoreCandidates(cleanCandidates, tracker);
  
  // [FIXED] Another safety check after scoring
  if (!scored || scored.length === 0) {
    return null;
  }

  // 2) Self-dialogue fusion across top candidates
  const fusion = selfDialogueFusion(scored, { selfState, anticipations, tracker });

  // 3) Contradiction check between top two candidates
  let finalReply;
  const topOneReply = scored[0].candidate.reply;
  const topTwoReply = scored[1] ? scored[1].candidate.reply : '';

  if (detectContradictionText(topOneReply, topTwoReply)) {
    finalReply = contradictionResolver(sentenceFirstFragment(topOneReply), sentenceFirstFragment(topTwoReply));
  } else {
    finalReply = surfaceRealizer(fusion.fragments);
  }
  
  // 4) Ensure finalReply is not empty
  if (!finalReply) {
      finalReply = mergeCandidatesSmart(scored[0], scored[1]);
  }

  // 5) Seeds & Provenance
  const seeds = dynamicSeeds(finalReply);
  const provenance = {
    chosen_engines: scored.slice(0, 3).map(s => ({ source: s.candidate.source, score: s.rawScore.toFixed(3) })),
    persona_contributions: fusion.personaContributions,
  };

  // 6) Package final output
  return {
    reply: finalReply,
    source: 'response_synthesizer_v1.3_fused',
    metadata: {
      fragments: fusion.fragments,
      followUpSeeds: seeds,
      provenance,
    }
  };
}

export default { synthesizeResponse };
