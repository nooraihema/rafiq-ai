// intelligence/HybridComposer.js v8.0 - The Decisive Maestro, Guided by the Narrative Weaver
// This version integrates the final, most intelligent layer: The Narrative Weaver.
// The primary logic flow is now:
// 1. Attempt to generate a superior, synthesized response from the Narrative Weaver.
// 2. If the weaver succeeds, its response is used.
// 3. If the weaver defers (e.g., for simple contexts), the robust v6.1 rule-based
//    logic of the HybridComposer is executed as a reliable fallback.
// This combines deep, creative intelligence with robust, predictable decision-making.
// Author: iterative upgrade for Rafiq system

// <<< STEP 1: استيراد العقل المدبر الجديد >>>
import { weaveNarrativeResponse } from './InsightGenerator.js';


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
   Helpers (Preserved + new)
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

/* dedupe sentences, preserve order */
function dedupeSentences(text) {
  if (!text) return text;
  const parts = text.split(/(?<=[.؟!?])\s+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.replace(/\s+/g, ' ').toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out.join(' ');
}

/* truncate very long reply safely */
function safeTruncateText(text, maxChars = 2000) {
  if (!text) return text;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + '...';
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
   Fusion Core (Preserved + improvement)
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
    return { candidate: c, calibratedScore: calibrated, personaAvg, novelty, baseConf };
  }).sort((a, b) => b.calibratedScore - a.calibratedScore);
}

/* helper: pick best candidate matching a protocol tag (by calibrated score) */
function pickBestForProtocol(scoredCandidates, protocolTag) {
  if (!protocolTag) return null;
  const matches = scoredCandidates.filter(s => safeStr(s.candidate.source).includes(protocolTag) || safeStr(s.candidate.metadata?.intentTag || '').includes(protocolTag));
  if (matches.length === 0) return null;
  matches.sort((a,b) => b.calibratedScore - a.calibratedScore);
  return matches[0].candidate;
}

/* =================================================
   THE MAESTRO'S WEAVING ROOM (Preserved & enhanced)
   ================================================= */
function createEmpathyBridge() {
    const bridges = [
        "أتفهم أنك تتعامل مع أكثر من شيء في نفس الوقت. دعنا نبدأ بالالذي يبدو الأكثر إلحاحًا، ثم ننظر في الباقي.",
        "شكرًا لمشاركة كل هذا. يبدو أن هناك جانبًا عاطفيًا وجانبًا عمليًا للموقف. ما رأيك أن نبدأ بالجانب العاطفي لتهدأ الأمور قليلاً؟"
    ];
    return sample(bridges);
}

// --- [ENHANCED] A smarter, persona-aware weave function ---
function smartWeave(activeCandidate, newCandidate, fingerprint, scoredCandidates) {
    if (DEBUG) console.log("MAESTRO: Engaging SMART WEAVING.");
    activeCandidate = activeCandidate || {};
    newCandidate = newCandidate || {};
    function dominantPersona(candidate) {
      let best = { pid: null, score: -1 };
      for (const pid of Object.keys(PERSONA_FUNCS)) {
        const res = PERSONA_FUNCS[pid](candidate);
        const align = jaccardSim(candidate.reply || "", res.segment || "");
        const score = (res.score || 0) * 0.7 + align * 0.3;
        if (score > best.score) { best = { pid, score }; }
      }
      return best.pid || 'logical';
    }
    const activePersona = dominantPersona(activeCandidate);
    const newPersona = dominantPersona(newCandidate);
    if (activePersona === 'empathic' && newPersona === 'empathic') {
        const chosen = scoredCandidates && scoredCandidates.length ? scoredCandidates[0].candidate : (activeCandidate || newCandidate);
        const bridge = createEmpathyBridge();
        const reply = `${firstSentence(chosen.reply)}\n\n${bridge}`;
        return { reply: dedupeSentences(reply), source: 'maestro_weaver:empathic_choice', confidence: 0.98, metadata: { strategy: 'choose_strong_empathic', components: [activeCandidate.source, newCandidate.source] } };
    }
    if ((activePersona === 'empathic' && newPersona === 'pragmatic') || (activePersona === 'pragmatic' && newPersona === 'empathic')) {
        const empathic = (activePersona === 'empathic') ? activeCandidate : newCandidate;
        const pragmatic = (activePersona === 'pragmatic') ? activeCandidate : newCandidate;
        const intro = firstSentence(empathic.reply) || "أرى أن هذا الوضع صعب.";
        const practical = firstSentence(pragmatic.reply).length > 20 ? firstSentence(pragmatic.reply) : PERSONA_FUNCS.pragmatic(pragmatic).segment;
        const reply = `${intro}\n\n${practical}\n\n${createEmpathyBridge()}`;
        return { reply: dedupeSentences(reply), source: 'maestro_weaver:empathic_pragmatic_merge', confidence: 0.995, metadata: { strategy: 'empathic_then_practical', components: [empathic.source, pragmatic.source] } };
    }
    if (activePersona === 'pragmatic' && newPersona === 'pragmatic') {
        let ordered = [activeCandidate, newCandidate];
        if (Array.isArray(scoredCandidates) && scoredCandidates.length) {
          const mapScore = (c) => (scoredCandidates.find(s => s.candidate === c)?.calibratedScore ?? 0);
          ordered = [activeCandidate, newCandidate].sort((x,y) => mapScore(y) - mapScore(x));
        }
        const reply = `قِم بتجربة صغيرة:\n- ${firstSentence(ordered[0].reply)}\n- ${firstSentence(ordered[1].reply)}\n\nبعد 24 ساعة قِس النتيجة.`;
        return { reply: dedupeSentences(reply), source: 'maestro_weaver:pragmatic_merge', confidence: 0.97, metadata: { strategy: 'pragmatic_merge', components: [activeCandidate.source, newCandidate.source] } };
    }
    if (activePersona === 'logical' || newPersona === 'logical') {
        const logical = (activePersona === 'logical') ? activeCandidate : newCandidate;
        const other = (activePersona === 'logical') ? newCandidate : activeCandidate;
        const logicSeed = firstSentence(logical.reply) || PERSONA_FUNCS.logical(logical).segment;
        const otherSeed = firstSentence(other.reply) || '';
        const reply = `${logicSeed}\n\n${otherSeed}`;
        return { reply: dedupeSentences(reply), source: 'maestro_weaver:logical_bridge', confidence: 0.94, metadata: { strategy: 'logical_bridge', components: [logical.source, other.source] } };
    }
    const acknowledgement = `أرى أن هناك تغييرًا مهمًا في الموضوع؛ سأتناول النقطة الجديدة بسرعة.`;
    const reply = `${acknowledgement}\n\n${firstSentence(newCandidate.reply)}`;
    return { reply: dedupeSentences(reply), source: 'maestro_weaver:fallback_bridge', confidence: 0.9, metadata: { strategy: 'fallback_bridge', components: [activeCandidate.source, newCandidate.source] } };
}

/* =========================
   API: synthesizeHybridResponse (The Final, Decisive Logic)
   v8.0 with Narrative Weaver Integration
   ========================= */
function synthesizeHybridResponse(candidates = [], briefing = {}, context = {}) {
  const { tracker = null, fingerprint = {} } = context;
  const { activeProtocol, potentialNewProtocols } = briefing || {};

  const fallbackResponse = {
    reply: "أنا معاك، ممكن توضّح أكتر؟",
    source: "hybrid_composer_fallback",
    variants: [],
    metadata: { reason: "no_candidates_or_analysis_failed", ts: nowISO() }
  };

  try {
    if (!Array.isArray(candidates) || candidates.length === 0) return fallbackResponse;

    const safety = safetyCheck(fingerprint, candidates);
    if (!safety.ok) {
      return { reply: "لقد لاحظت إشارات للخطر في كلامك. لو أنت في خطر فورًا اتصل بخط الطوارئ المحلي أو اطلب مساعدة عاجلة.", source: "hybrid_safety", variants: [], metadata: { safetyFlags: safety.flags, ts: nowISO() } };
    }

    const scored = analyzeCandidates(candidates, tracker, fingerprint);
    if (DEBUG) console.log("[HybridComposer] scored:", scored.map(s => ({ src: s.candidate.source, score: s.calibratedScore.toFixed(3) })));

    let activeCandidate = activeProtocol?.intent?.tag ? pickBestForProtocol(scored, activeProtocol.intent.tag) : null;
    let newCandidate = potentialNewProtocols?.[0]?.tag ? pickBestForProtocol(scored, potentialNewProtocols[0].tag) : null;

    // <<< STEP 2 (v5.0): Attempt to weave a masterpiece response with the Narrative Weaver FIRST >>>
    // ==============================================================================================
    console.log("MAESTRO: Consulting the Narrative Weaver...");
    const narrativeResponse = weaveNarrativeResponse(scored, { user_message: fingerprint.originalMessage });
    
    if (narrativeResponse) {
        console.log("MAESTRO: Narrative Weaver SUCCEEDED. Using its crafted response.");
        narrativeResponse.reply = dedupeSentences(narrativeResponse.reply);
        narrativeResponse.reply = safeTruncateText(narrativeResponse.reply, 2500);
        
        const primaryProtocolForMemory = newCandidate || activeCandidate;
        if (primaryProtocolForMemory && primaryProtocolForMemory.metadata?.nextSessionContext) {
            narrativeResponse.metadata.nextSessionContext = primaryProtocolForMemory.metadata.nextSessionContext;
        }

        narrativeResponse.metadata.produced_by = 'hybridcomposer_v8.0_narrative_weaver';
        return narrativeResponse;
    }
    
    console.log("MAESTRO: Narrative Weaver deferred. Proceeding with standard HybridComposer logic.");
    // ==============================================================================================


    // <<< STEP 3: If Weaver defers, execute the original robust v6.1 logic >>>
    const topScored = (scored && scored.length) ? scored[0].candidate : candidates[0];
    const empathicCandidate = candidates.find(c => c.source === 'empathic_safety_net') || candidates.find(c => safeStr(c.source).includes('empathic'));

    let finalDecision = null;

    if (activeCandidate && newCandidate && (safeStr(activeCandidate.source) !== safeStr(newCandidate.source))) {
      if (DEBUG) console.log("MAESTRO: Rule 1 - Interruption detected. Performing smart weave.");
      finalDecision = smartWeave(activeCandidate, newCandidate, fingerprint, scored);
    }
    else if (activeCandidate) {
      if (DEBUG) console.log("MAESTRO: Rule 2 - Trust active protocol (selected by score).");
      const rep = scored.find(s => s.candidate === activeCandidate) || scored.find(s => safeStr(s.candidate.source).includes(activeProtocol.intent.tag));
      finalDecision = rep ? rep.candidate : activeCandidate;
      finalDecision = { ...finalDecision, metadata: { ...(finalDecision.metadata || {}), selected_by: 'active_protocol', ts: nowISO() } };
    }
    else if (newCandidate) {
      if (DEBUG) console.log("MAESTRO: Rule 3 - Trust new protocol (selected by score).");
      const rep = scored.find(s => s.candidate === newCandidate) || scored[0];
      finalDecision = rep ? rep.candidate : newCandidate;
      finalDecision = { ...finalDecision, metadata: { ...(finalDecision.metadata || {}), selected_by: 'new_protocol', ts: nowISO() } };
    }
    else {
      if (DEBUG) console.log("MAESTRO: Rule 4 - No protocol found, fallback.");
      finalDecision = empathicCandidate || topScored;
      finalDecision = { ...finalDecision, metadata: { ...(finalDecision.metadata || {}), selected_by: 'fallback', ts: nowISO() } };
    }

    if (!finalDecision || typeof finalDecision !== 'object' || !finalDecision.reply) {
      return { reply: "أنا هنا معاك — ممكن توضّح أكتر؟", source: "hybrid_composer_safe_fallback", metadata: { ts: nowISO() } };
    }

    const primaryProtocolForMemory = newCandidate || activeCandidate;
    if (primaryProtocolForMemory && primaryProtocolForMemory.metadata?.nextSessionContext) {
      finalDecision.metadata = finalDecision.metadata || {};
      finalDecision.metadata.nextSessionContext = primaryProtocolForMemory.metadata.nextSessionContext;
      if (DEBUG) console.log("MAESTRO: attached memory passport.");
    }

    const src = safeStr(finalDecision.source || '');
    if (!src.includes('weaver') && !src.includes('maestro_weaver') && !src.includes('insight')) {
      finalDecision.reply = `${finalDecision.reply}\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات.]`;
    }

    finalDecision.reply = dedupeSentences(finalDecision.reply);
    finalDecision.reply = safeTruncateText(finalDecision.reply, 2500);

    finalDecision.metadata = finalDecision.metadata || {};
    finalDecision.metadata.produced_at = finalDecision.metadata.produced_at || nowISO();
    finalDecision.metadata.produced_by = finalDecision.metadata.produced_by || 'hybridcomposer_v8.0_fallback';

    return finalDecision;

  } catch (err) {
    if (DEBUG) console.error("HybridComposer synth error:", err);
    return {
      reply: "أنا هنا — ممكن توضّح أكتر؟",
      source: "hybrid_composer_error_fallback",
      metadata: { error: String(err), ts: nowISO() }
    };
  }
}

/* =========================
   Default export
   ========================= */
export default { synthesizeHybridResponse };
