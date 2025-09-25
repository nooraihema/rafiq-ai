
// intelligence/HybridComposerFinal.js
// Final Fusion: HybridComposer + NarrativeWeaver post-process
// Exports: synthesizeHybridResponse(candidates, briefing, context, options)

import { weaveNarrativeResponse } from './InsightGenerator.js';

const DEBUG = false;

function safeStr(s){ return (s===null||s===undefined)?"":String(s); }
function nowISO(){ return (new Date()).toISOString(); }
function clamp(v,a=0,b=1){ return Math.max(a, Math.min(b, v)); }
function sample(arr){ if(!arr||arr.length===0) return null; return arr[Math.floor(Math.random()*arr.length)]; }

function tokenizeWords(text){
  if(!text) return [];
  return safeStr(text).toLowerCase().split(/\s+/).map(t=>t.replace(/[^\p{L}\p{N}_]+/gu,'')).filter(Boolean);
}

function jaccardSim(a="", b=""){
  const s1 = new Set(tokenizeWords(a));
  const s2 = new Set(tokenizeWords(b));
  if(s1.size===0 && s2.size===0) return 1;
  const inter = [...s1].filter(x=>s2.has(x)).length;
  const union = new Set([...s1,...s2]).size || 1;
  return inter/union;
}

function firstSentence(text){
  if(!text) return "";
  const m = safeStr(text).split(/(?<=[.؟!?])\s+/);
  return m[0] || text;
}

function dedupeSentences(text){
  if(!text) return text;
  const parts = safeStr(text).split(/(?<=[.؟!?])\s+/).map(s=>s.trim()).filter(Boolean);
  const seen = new Set(), out = [];
  for(const p of parts){
    const key = p.replace(/\s+/g,' ').toLowerCase();
    if(!seen.has(key)){ seen.add(key); out.push(p); }
  }
  return out.join(' ');
}

function safeTruncateText(text, maxChars = 2400){
  if(!text) return text;
  if(text.length <= maxChars) return text;
  return text.slice(0, maxChars-3) + '...';
}

function polishInsight(text){
  if(!text) return text;
  let out = dedupeSentences(text);
  out = out.replace(/\s+/g,' ').trim();
  out = out.replace(/\s+([؟.!])/g,'$1');
  return out;
}

/* ===== Persona helpers (kept from prior versions) ===== */
const PERSONA_FUNCS = {
  logical: (candidate) => {
    const reply = safeStr(candidate.reply);
    const segment = /لأن|بسبب|because|due to/i.test(reply) ? (firstSentence(reply) + " دعنا نلخّص الأسباب خطوة بخطوة.") : "اقتراح منطقي: حاول كتابة الخيارات ثم قيّم كل خيار.";
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

/* ===== Analysis / scoring ===== */
function analyzeCandidates(candidates = [], tracker = null, fingerprint = {}, opts = {}){
  const NOVELTY_DECAY_WINDOW = opts.noveltyWindow || 6;
  const history = tracker?.getHistory ? tracker.getHistory() : [];
  const recent = history.slice(-NOVELTY_DECAY_WINDOW).map(t => safeStr(t.ai_response?.reply || ""));
  return candidates.map(c => {
    const baseConf = clamp(Number(c.confidence ?? c.baseConf ?? 0.6), 0, 1);
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
  }).sort((a,b)=> b.calibratedScore - a.calibratedScore);
}

function pickBestForProtocol(scoredCandidates, protocolTag){
  if(!protocolTag) return null;
  const matches = scoredCandidates.filter(s => safeStr(s.candidate.source).includes(protocolTag) || safeStr(s.candidate.metadata?.intentTag || '').includes(protocolTag));
  if(matches.length===0) return null;
  matches.sort((a,b)=> b.calibratedScore - a.calibratedScore);
  return matches[0].candidate;
}

/* ===== Safety ===== */
function safetyCheck(fingerprint, candidates){
  const flags = [];
  const text = safeStr(fingerprint?.originalMessage).toLowerCase();
  for (const e of ["انتحار","بموت","أقتل","أذبح"]) if(text.includes(e)) flags.push("emergency_critical");
  return { ok: flags.length===0, flags };
}

/* ===== Weaving utilities (from best-of) ===== */
function createEmpathyBridge(){
  const bridges = [
    "أتفهم أنك تتعامل مع أكثر من شيء في نفس الوقت. دعنا نبدأ بالذي يبدو الأكثر إلحاحًا، ثم ننظر في الباقي.",
    "شكرًا لمشاركة كل هذا. يبدو أن هناك جانبًا عاطفيًا وجانبًا عمليًا للموقف. ما رأيك أن نبدأ بالجانب العاطفي لتهدأ الأمور قليلاً؟"
  ];
  return sample(bridges);
}

function smartWeave(activeCandidate, newCandidate, fingerprint, scoredCandidates){
  function dominantPersona(candidate){
    let best = { pid: null, score: -1 };
    for(const pid of Object.keys(PERSONA_FUNCS)){
      const res = PERSONA_FUNCS[pid](candidate);
      const align = jaccardSim(candidate.reply || "", res.segment || "");
      const score = (res.score||0)*0.7 + align*0.3;
      if(score > best.score) best = { pid, score };
    }
    return best.pid || 'logical';
  }

  const aPersona = dominantPersona(activeCandidate);
  const nPersona = dominantPersona(newCandidate);

  if(aPersona === 'empathic' && nPersona === 'empathic'){
    const chosen = (scoredCandidates && scoredCandidates.length) ? scoredCandidates[0].candidate : (activeCandidate || newCandidate);
    const bridge = createEmpathyBridge();
    const reply = `${firstSentence(chosen.reply)}\n\n${bridge}`;
    return { reply: dedupeSentences(reply), source: 'maestro_weaver:empathic_choice', confidence: 0.98, metadata:{ strategy:'choose_strong_empathic', components:[activeCandidate.source, newCandidate.source] } };
  }

  if((aPersona==='empathic' && nPersona==='pragmatic') || (aPersona==='pragmatic' && nPersona==='empathic')){
    const empathic = (aPersona==='empathic') ? activeCandidate : newCandidate;
    const pragmatic = (aPersona==='pragmatic') ? activeCandidate : newCandidate;
    const intro = firstSentence(empathic.reply) || "أرى أن هذا الوضع صعب.";
    const practical = firstSentence(pragmatic.reply).length > 20 ? firstSentence(pragmatic.reply) : PERSONA_FUNCS.pragmatic(pragmatic).segment;
    const reply = `${intro}\n\n${practical}\n\n${createEmpathyBridge()}`;
    return { reply: dedupeSentences(reply), source:'maestro_weaver:empathic_pragmatic_merge', confidence: 0.995, metadata:{ strategy:'empathic_then_practical', components:[empathic.source, pragmatic.source] } };
  }

  if(aPersona==='pragmatic' && nPersona==='pragmatic'){
    let ordered = [activeCandidate, newCandidate];
    if(Array.isArray(scoredCandidates) && scoredCandidates.length){
      const mapScore = (c) => (scoredCandidates.find(s=>s.candidate===c)?.calibratedScore ?? 0);
      ordered = [activeCandidate, newCandidate].sort((x,y)=> mapScore(y) - mapScore(x));
    }
    const reply = `قِم بتجربة صغيرة:\n- ${firstSentence(ordered[0].reply)}\n- ${firstSentence(ordered[1].reply)}\n\nبعد 24 ساعة قِس النتيجة.`;
    return { reply: dedupeSentences(reply), source:'maestro_weaver:pragmatic_merge', confidence: 0.97, metadata:{ strategy:'pragmatic_merge', components:[activeCandidate.source, newCandidate.source] } };
  }

  if(aPersona==='logical' || nPersona==='logical'){
    const logical = (aPersona==='logical') ? activeCandidate : newCandidate;
    const other = (aPersona==='logical') ? newCandidate : activeCandidate;
    const logicSeed = firstSentence(logical.reply) || PERSONA_FUNCS.logical(logical).segment;
    const otherSeed = firstSentence(other.reply) || '';
    const reply = `${logicSeed}\n\n${otherSeed}`;
    return { reply: dedupeSentences(reply), source:'maestro_weaver:logical_bridge', confidence:0.94, metadata:{ strategy:'logical_bridge', components:[logical.source, other.source] } };
  }

  const acknowledgement = `أرى أن هناك تغييرًا مهمًا في الموضوع؛ سأتناول النقطة الجديدة بسرعة.`;
  const reply = `${acknowledgement}\n\n${firstSentence(newCandidate.reply)}`;
  return { reply: dedupeSentences(reply), source:'maestro_weaver:fallback_bridge', confidence:0.9, metadata:{ strategy:'fallback_bridge', components:[activeCandidate.source, newCandidate.source] } };
}

/* ===== Advanced weave (multi-protocol from second version) ===== */
function advancedWeave(activeProtocolCandidate, newProtocolCandidate, fingerprint){
  const reply1 = `بخصوص ما كنا نتحدث عنه، ${firstSentence(activeProtocolCandidate.reply)}`;
  const bridge = "ولاحظت أنك ذكرت أيضًا شيئًا جديدًا ومهمًا...";
  const reply2 = firstSentence(newProtocolCandidate.reply);
  return { reply: `${reply1}\n\n${bridge}\n\n${reply2}`, source: 'maestro_weaver:advanced_multi_protocol', confidence: 0.99, metadata:{ strategy:'advanced_weave', components:[activeProtocolCandidate.source, newProtocolCandidate.source] } };
}

function weaveEmpathyAndAction(empathicCandidate, practicalCandidate, fingerprint){
  const validation = firstSentence(empathicCandidate.reply);
  const bridge = createEmpathyBridge();
  const practicalText = `وبخصوص ${practicalCandidate.metadata?.concept || 'الجزء العملي'}، ${firstSentence(practicalCandidate.reply).replace(/اقتراح عملي:|قائمة سريعة:/gi, "").trim()}`;
  const finalReplyText = `${validation}\n\n${bridge}\n\n${practicalText}`;
  return { reply: finalReplyText, source: 'maestro_weaver:empathy_to_action', confidence: 0.98, metadata:{ strategy:'weave', components:[empathicCandidate.source, practicalCandidate.source] } };
}

/* ===== The final fused API ===== */
export function synthesizeHybridResponse(candidates = [], briefing = {}, context = {}, options = {}){
  const {
    attemptNarrativeAfter = true, // run Narrative Weaver AFTER hybrid decision
    narrativeMinStrength = 0.5,   // minimal guideline (Narrative's own logic still applies)
    debug = false
  } = options || {};

  try {
    if(!Array.isArray(candidates) || candidates.length === 0) {
      return { reply: "أنا معاك، ممكن توضّح أكتر؟", source: "hybridcomposer_final_fallback", metadata:{ produced_at: nowISO() } };
    }

    const fingerprint = context?.fingerprint || {};
    const safety = safetyCheck(fingerprint, candidates);
    if(!safety.ok){
      return { reply: "لاحظت إشارات للخطر في كلامك. إن كنت في خطر اتصل بخط الطوارئ المحلي أو اطلب مساعدة عاجلة.", source: "hybrid_safety", metadata:{ safetyFlags: safety.flags, produced_at: nowISO() } };
    }

    const analyzed = analyzeCandidates(candidates, context?.tracker || null, fingerprint, options);
    if(debug || DEBUG) console.log('[HybridFinal] scored:', analyzed.map(s=>({src:s.candidate.source,score:s.calibratedScore.toFixed(3)})));

    // Identify protocol candidates
    const activeProtocol = briefing?.activeProtocol || null;
    const potentialNewProtocols = briefing?.potentialNewProtocols || [];
    const activeProtocolTag = activeProtocol?.intent?.tag || null;
    const newProtocolTag = potentialNewProtocols[0]?.tag || null;

    const activeProtocolCandidate = pickBestForProtocol(analyzed, activeProtocolTag) || null;
    const newProtocolCandidate = pickBestForProtocol(analyzed, newProtocolTag) || null;

    // empathy fallback candidate
    const empathicCandidate = candidates.find(c => c.source === 'empathic_safety_net') || candidates.find(c => safeStr(c.source).includes('empathic')) || null;

    // Decide finalDecision using robust Maestro rules (preserve original logic)
    let finalDecision = null;

    if(activeProtocolCandidate && newProtocolCandidate && safeStr(activeProtocolCandidate.source) !== safeStr(newProtocolCandidate.source)){
      // multi-protocol: advanced weave
      if(DEBUG || debug) console.log('HybridFinal: advanced weave between active & new protocols');
      finalDecision = advancedWeave(activeProtocolCandidate, newProtocolCandidate, fingerprint);
    } else if(fingerprint?.primaryEmotion?.type && fingerprint.primaryEmotion.type !== 'neutral' && (activeProtocolCandidate || newProtocolCandidate) && empathicCandidate){
      // weave empathy + practical action
      if(DEBUG || debug) console.log('HybridFinal: weave empathy + action');
      const practical = activeProtocolCandidate || newProtocolCandidate;
      finalDecision = weaveEmpathyAndAction(empathicCandidate, practical, fingerprint);
    } else if(activeProtocolCandidate && newProtocolCandidate && safeStr(activeProtocolCandidate.source) === safeStr(newProtocolCandidate.source)){
      // same protocol, just use it
      finalDecision = activeProtocolCandidate;
      finalDecision = { ...finalDecision, metadata: { ...(finalDecision.metadata||{}), selected_by: 'active_protocol', produced_at: nowISO() } };
    } else if(activeProtocolCandidate){
      finalDecision = activeProtocolCandidate;
      finalDecision = { ...finalDecision, metadata: { ...(finalDecision.metadata||{}), selected_by: 'active_protocol', produced_at: nowISO() } };
    } else if(newProtocolCandidate){
      finalDecision = newProtocolCandidate;
      finalDecision = { ...finalDecision, metadata: { ...(finalDecision.metadata||{}), selected_by: 'new_protocol', produced_at: nowISO() } };
    } else {
      // fallback to best scored candidate (analyzed[0])
      const top = analyzed[0].candidate;
      finalDecision = { reply: `${top.reply}\n\n[ملاحظة: تم توليد الرد من مزيج متعدد الأصوات.]`, source: top.source, metadata: { produced_by: 'maestro_fallback', produced_at: nowISO() } };
    }

    // ensure finalDecision is normalized object with reply
    if(!finalDecision || !finalDecision.reply){
      return { reply: "أنا هنا معاك — ممكن توضّح أكتر؟", source: "hybridcomposer_final_safe_fallback", metadata:{ produced_at: nowISO() } };
    }

    // Attach memory passport from primary protocol if present
    const primaryProtocolForMemory = activeProtocolCandidate || newProtocolCandidate;
    if(primaryProtocolForMemory && primaryProtocolForMemory.metadata?.nextSessionContext){
      finalDecision.metadata = finalDecision.metadata || {};
      finalDecision.metadata.nextSessionContext = primaryProtocolForMemory.metadata.nextSessionContext;
    }

    // Now — crucial change: give Narrative Weaver FULL VIEW including the finalDecision
    if(attemptNarrativeAfter){
      // build a scored list that includes analyzed candidates + finalDecision as a high-score pseudo-candidate
      const allScored = analyzed.slice(); // shallow copy
      // insert finalDecision as top pseudo-candidate (score: max existing or 0.95)
      const maxScore = allScored.length ? Math.max(...allScored.map(s=>s.calibratedScore)) : 0.8;
      const pseudoScore = clamp(maxScore * 0.98 + 0.02, 0, 0.99); // slightly below perfect but high
      allScored.unshift({ candidate: { reply: finalDecision.reply, source: finalDecision.source || 'finalDecision', metadata: finalDecision.metadata || {} }, calibratedScore: pseudoScore, personaAvg: 0.99, novelty: 0 });

      if(DEBUG || debug) console.log('[HybridFinal] invoking Narrative Weaver with', allScored.map(s=>({src:s.candidate.source,score:s.calibratedScore.toFixed(3)})));

      // call the Narrative Weaver (should be robust to varied input)
      let narrativeResponse = null;
      try {
        narrativeResponse = weaveNarrativeResponse(allScored, { user_message: fingerprint.originalMessage || context?.user_message, fingerprint, context });
      } catch(err){
        if(DEBUG || debug) console.error('HybridFinal: narrative weave error', err);
        narrativeResponse = null;
      }

      // Validate narrativeResponse minimally and prefer it if present
      if(narrativeResponse && narrativeResponse.reply){
        // simple guard against garbage: must be longer than a short phrase and contain arabic letters
        const clean = polishInsight(safeStr(narrativeResponse.reply));
        const wordsCount = clean.split(/\s+/).filter(Boolean).length;
        const containsArabic = /[\u0600-\u06FF]/.test(clean);
        if(wordsCount >= 4 && containsArabic){
          // merge metadata & attach produced_by label
          narrativeResponse.reply = dedupeSentences(safeTruncateText(clean, 2400));
          narrativeResponse.metadata = narrativeResponse.metadata || {};
          narrativeResponse.metadata.produced_by = 'hybridcomposer_final_narrative_weaver';
          // preserve memory passport if present
          if(primaryProtocolForMemory && primaryProtocolForMemory.metadata?.nextSessionContext){
            narrativeResponse.metadata.nextSessionContext = primaryProtocolForMemory.metadata.nextSessionContext;
          }
          if(DEBUG || debug) console.log('HybridFinal: Narrative Weaver produced final reply. Returning it.');
          return narrativeResponse;
        } else {
          if(DEBUG || debug) console.log('HybridFinal: Narrative response failed minimal validation — ignoring.');
        }
      } else {
        if(DEBUG || debug) console.log('HybridFinal: Narrative Weaver returned null/empty — using finalDecision.');
      }
    }

    // If Narrative not used, polish finalDecision and return
    let out = { ...finalDecision };
    out.reply = polishInsight(out.reply);
    out.reply = safeTruncateText(out.reply, 2400);
    out.metadata = out.metadata || {};
    out.metadata.produced_by = out.metadata.produced_by || 'hybridcomposer_final_core';
    out.metadata.produced_at = out.metadata.produced_at || nowISO();

    return out;

  } catch(err){
    if(DEBUG) console.error('HybridFinal synth error', err);
    return { reply: "أنا هنا — ممكن توضّح أكتر؟", source: "hybridcomposer_final_error_fallback", metadata:{ error: String(err), produced_at: nowISO() } };
  }
}

export default { synthesizeHybridResponse };

