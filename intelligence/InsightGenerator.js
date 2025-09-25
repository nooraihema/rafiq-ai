
// intelligence/InsightGenerator.js (v5.1 - Robust Narrative Weaver + Triable Logic)
// Purpose: Take ALL candidate replies (including hybrid/final) + context + local lexicons
// and produce a single cohesive, high-quality insight reply.
// Minimal comments and strong validation / graceful fallback.

import fs from 'fs';
import path from 'path';

const DEFAULT_STOPWORDS = ["في","من","على","مع","أنا","إني","هو","هي","ما","لم","لا","إن","أن","أو","لكن","و","ال","يا"];
const MIN_SUPPORTERS_FOR_INSIGHT = 1; // require at least 1 supporting candidate sentence
const MIN_NARRATIVE_STRENGTH = 1.2; // threshold to allow narrative weaving

// KB containers
const KNOWLEDGE_BASE = {};
const CONCEPT_MAP = {};
const INSIGHT_RULES = {};

function safeStr(s){ return (s===null||s===undefined)?"":String(s); }
function nowISO(){ return (new Date()).toISOString(); }
function clamp(v,a=0,b=1){ return Math.max(a, Math.min(b, v)); }
function tokenizeWords(text){
  if(!text) return [];
  return safeStr(text).toLowerCase().split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}_]+/gu,'')).filter(Boolean);
}
function uniq(arr){ return [...new Set(arr)]; }
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
  const m = text.split(/(?<=[.؟!?])\s+/);
  return m[0] || text;
}
function dedupeSentences(text){
  if(!text) return text;
  const parts = text.split(/(?<=[.؟!?])\s+/).map(s=>s.trim()).filter(Boolean);
  const seen = new Set(); const out = [];
  for(const p of parts){
    const key = p.replace(/\s+/g,' ').toLowerCase();
    if(!seen.has(key)){ seen.add(key); out.push(p); }
  }
  return out.join(' ');
}
function polishInsight(text){
  if(!text) return text;
  let out = dedupeSentences(safeStr(text));
  out = out.replace(/\s+/g,' ').trim();
  out = out.replace(/\s+([؟.!])/g, '$1');
  return out;
}
function triableReply(baseReply, variations = []){
  const all = [baseReply, ...variations].filter(Boolean);
  const scored = all.map(r=>{
    const len = safeStr(r).split(/\s+/).filter(Boolean).length;
    let score = 1.0;
    if(len < 5) score -= 0.35;
    if(len > 60) score -= 0.25;
    if(/[؟?!]\s*$/.test(r)) score += 0.15;
    if(/\b(تحب|هل|ممكن|نبدأ)\b/.test(r)) score += 0.12;
    if(/(أرى علاقة بين|قد يكون هناك ارتباط)/.test(r)) score -= 0.08;
    return { r, score };
  });
  scored.sort((a,b)=> b.score - a.score);
  return scored[0]?.r || baseReply;
}
function applyContextBuffer(reply, context, bufferSize = 3){
  if(!context || !context.previousReplies || !Array.isArray(context.previousReplies) || context.previousReplies.length===0) return reply;
  const slice = context.previousReplies.slice(-bufferSize).map(r=> typeof r === 'string' ? r : safeStr(r)).join(" / ");
  return `من اللي قلته قبل كده (${slice}) — ${reply}`;
}

// ------------------ Knowledge loader (graceful) ------------------
(function loadLexicons() {
  try {
    const lexiconDir = path.join(process.cwd(), 'lexicons');
    if(!fs.existsSync(lexiconDir)) return;
    const files = fs.readdirSync(lexiconDir).filter(f=>f.endsWith('.json'));
    for(const file of files){
      try{
        const raw = fs.readFileSync(path.join(lexiconDir,file),'utf8');
        const data = JSON.parse(raw);
        if(data && data.emotion){
          const main = data.emotion;
          KNOWLEDGE_BASE[main] = data;
          CONCEPT_MAP[main.toLowerCase()] = main;
          if(Array.isArray(data.aliases)){
            for(const a of data.aliases) CONCEPT_MAP[safeStr(a).toLowerCase()] = main;
          }
          if(data.related_concepts && typeof data.related_concepts === 'object'){
            for(const related in data.related_concepts){
              const ruleText = data.related_concepts[related].short_description
                || (`غالبًا ما يكون هناك ارتباط بين الشعور بـ "${main}" والشعور بـ "${related}".`);
              INSIGHT_RULES[`${main}_${related}`] = ruleText;
            }
          }
        }
      }catch(e){ continue; }
    }
  }catch(e){}
})();

function mapToConcept(token){
  const norm = safeStr(token).toLowerCase();
  return CONCEPT_MAP[norm] || null;
}
function extractConceptsFromText(text, topN = 4){
  if(!text) return [];
  const tokens = tokenizeWords(text).filter(t => !DEFAULT_STOPWORDS.includes(t));
  if(tokens.length===0) return [];
  const freq = {};
  tokens.forEach((t,i) => freq[t] = (freq[t]||0)+1);
  const entries = Object.entries(freq).sort((a,b)=> b[1]-a[1]).slice(0, topN);
  const out = [];
  for(const [tok] of entries){
    const mapped = mapToConcept(tok) || tok;
    out.push(mapped);
    if(out.length>=topN) break;
  }
  return uniq(out);
}
function buildConceptGraph(user_message, allCandidates){
  const graph = { nodes:{}, edges:{} };
  const userConcepts = extractConceptsFromText(user_message||"",6);
  userConcepts.forEach((c,i)=> graph.nodes[c] = (graph.nodes[c]||0) + (1.2/(1+i)));
  for(const sc of allCandidates){
    const reply = safeStr(sc.candidate?.reply || sc.reply || "");
    const ccs = extractConceptsFromText(reply,6);
    const weight = clamp(Number(sc.calibratedScore ?? sc.score ?? sc.baseConf ?? 0.5), 0.01, 1.0);
    ccs.forEach((c,idx)=> graph.nodes[c] = (graph.nodes[c]||0) + weight * (1/(1+idx)));
    for(let i=0;i<ccs.length;i++){
      for(let j=i+1;j<ccs.length;j++){
        const a=ccs[i], b=ccs[j];
        const key = a < b ? `${a}::${b}` : `${b}::${a}`;
        graph.edges[key] = graph.edges[key] || { weight:0, supporters:[] };
        graph.edges[key].weight += weight * (1/(1+Math.abs(i-j)));
        graph.edges[key].supporters.push({ source: safeStr(sc.candidate?.source || sc.source || "unknown"), score: weight, text: reply });
      }
    }
    for(const uc of userConcepts){
      for(const cc of ccs){
        const key = uc < cc ? `${uc}::${cc}` : `${cc}::${uc}`;
        graph.edges[key] = graph.edges[key] || { weight:0, supporters:[] };
        graph.edges[key].weight += 0.5 * weight;
        graph.edges[key].supporters.push({ source: safeStr(sc.candidate?.source || sc.source || "unknown"), score: weight, text: reply });
      }
    }
  }
  return graph;
}
function applyGraphAttention(graph, context){
  const userMsg = safeStr(context?.user_message || "");
  const nodeAttention = {};
  const keys = Object.keys(graph.nodes);
  for(const n of keys){
    const base = graph.nodes[n] || 0;
    const cov = jaccardSim(n, userMsg);
    let supCount = 0;
    let supStrength = 0;
    for(const eKey in graph.edges){
      if(eKey.includes(n)){
        supStrength += (graph.edges[eKey].weight || 0);
        supCount += (graph.edges[eKey].supporters ? graph.edges[eKey].supporters.length : 0);
      }
    }
    let userBoost = 1.0;
    if(context?.userProfile?.focus && Array.isArray(context.userProfile.focus) && context.userProfile.focus.includes(n)) userBoost = 1.2;
    const att = base * (1 + cov*1.2) * (1 + Math.log(1+supCount)) * userBoost;
    nodeAttention[n] = att || 0.001;
  }
  const mx = Math.max(...Object.values(nodeAttention), 1e-6);
  for(const k in nodeAttention) nodeAttention[k] = nodeAttention[k] / mx;
  return nodeAttention;
}
function scorePair(a,b,graph,allCandidates,context,nodeAttention){
  const edgeKey = a < b ? `${a}::${b}` : `${b}::${a}`;
  const edgeObj = graph.edges[edgeKey] || { weight:0, supporters:[] };
  const edgeW = edgeObj.weight || 0;
  const nodeW = (graph.nodes[a]||0) + (graph.nodes[b]||0);
  const rule = INSIGHT_RULES[`${a}_${b}`] || INSIGHT_RULES[`${b}_${a}`] || null;
  const ruleBoost = rule ? 1.6 : 1.0;
  const supporters = (edgeObj.supporters || []).map(s=>({source:s.source,score:s.score,text:s.text}));
  const supportStrength = supporters.reduce((acc,s)=> acc + (Number(s.score||0.01)),0) || 0.01;
  const userMsg = safeStr(context?.user_message || "");
  const cov = jaccardSim(`${a} ${b}`, userMsg);
  const detected = context?.detected_emotions || [];
  let emoAlign = 0;
  if(detected.length && supporters.length){
    supporters.forEach(s => detected.forEach(d => { if((s.text||'').includes(d)) emoAlign += 0.5; }));
    emoAlign = clamp(emoAlign / Math.max(1,supporters.length), 0, 1);
  }
  const attA = nodeAttention[a] || 0.01;
  const attB = nodeAttention[b] || 0.01;
  const attBoost = 0.35 * (attA + attB);
  const raw = (edgeW * 1.2 + nodeW * 0.55) * ruleBoost * (0.6 + cov*0.4) * (0.8 + emoAlign*0.4) + supportStrength * 0.3 + attBoost;
  let conflict = false;
  if(supporters.length >= 2){
    const tones = supporters.map(s => {
      if((s.text||'').includes('خطر') || (s.text||'').includes('ضروري')) return 'urgent';
      if((s.text||'').includes('تهدأ') || (s.text||'').includes('معاك')) return 'soothing';
      return 'neutral';
    });
    if(tones.includes('urgent') && tones.includes('soothing')) conflict = true;
  }
  return { a, b, rule, rawScore: raw, edgeW, nodeW, supportCount: supporters.length, avgNovelty: 0, cov, emoAlign, supporters, conflict };
}

// ------------------ مولد لغوي جبّار ------------------
function generateFromCandidates(allCandidates, context){
  const userMsg = safeStr(context?.user_message || "");
  const sentences = allCandidates.map(c => safeStr(c.candidate?.reply || c.reply || ""));
  const tokens = sentences.flatMap(s => tokenizeWords(s)).filter(Boolean);
  const important = uniq(tokens).filter(t=> !DEFAULT_STOPWORDS.includes(t)).slice(0,12);
  if(important.length===0) return null;
  let generated = `أرى أن ${important.join('، ')} قد يكون مهم بالنسبة لك`;
  if(Math.random()>0.5) generated += ", هل تحب نناقشه خطوة خطوة؟";
  return polishInsight(generated);
}

// ------------------ Main export (مع تعديل fallback جبّار) ------------------
export function generateInsight(allRawCandidates = [], context = {}, options = {}){
  const {
    topK = 6,
    triableStrategies = ["rule_first","attention_then_rule","attention_only","triple_boost","fallback"],
    personaTonePreference = null,
    maxEvidence = 2
  } = options || {};

  const normalized = (Array.isArray(allRawCandidates) ? allRawCandidates : []).map(c => {
    if(!c) return null;
    if(c.candidate && c.calibratedScore !== undefined) return c;
    return { candidate: c, calibratedScore: Number(c.calibratedScore ?? c.score ?? c.baseConf ?? 0.6), personaAvg: 0, novelty: 0, baseConf: Number(c.baseConf ?? c.score ?? 0.6) };
  }).filter(Boolean);

  if(normalized.length === 0) return null;

  const hybrid = normalized.find(s => safeStr(s.candidate?.source || '').toLowerCase().includes('hybrid')) || null;

  const graph = buildConceptGraph(context?.user_message || "", normalized);
  const allConcepts = uniq(Object.keys(graph.nodes));
  const narrativeCandidate = weaveNarrativeResponse(normalized, context);
  if(narrativeCandidate){
    const hasEvidence = true; 
    if(narrativeCandidate.confidence > 0.7 && hasEvidence) return narrativeCandidate;
  }

  if(allConcepts.length < 2){
    const top = normalized.slice().sort((a,b)=> (b.calibratedScore - a.calibratedScore))[0];
    const fallbackCandidate = hybrid?.candidate || top?.candidate || {};
    const reply = polishInsight(safeStr(fallbackCandidate.reply || ""));
    return { reply, source: hybrid ? "hybrid_fallback" : "direct_fallback", confidence: top?.calibratedScore ?? 0.6, metadata: { reason: "insufficient_concepts", produced_at: nowISO(), components: normalized.map(n=>safeStr(n.candidate?.source)) } };
  }

  const nodeAttention = applyGraphAttention(graph, context);
  const pairs = enumeratePairs(allConcepts).map(([a,b]) => scorePair(a,b,graph,normalized,context,nodeAttention));
  const triples = allConcepts.length >=3 ? enumerateTriples(allConcepts).map(t => scoreTriple(t,graph,normalized,INSIGHT_RULES,context,nodeAttention)) : [];

  // --- [التصحيح] --- تم إضافة هذا السطر لإصلاح خطأ ReferenceError
  const strategies = triableStrategies; 
  for(const strat of strategies){
    if(strat === "rule_first"){
      const withRule = pairs.filter(p=> !!p.rule).sort((x,y)=> y.rawScore - x.rawScore);
      if(withRule.length){
        const candidate = buildFromPair(withRule[0]);
        if(candidate && candidate.confidence > 0.5) return candidate;
      }
    }
    if(strat === "attention_then_rule"){
      const ordered = pairs.slice().sort((x,y)=> (y.rawScore + (y.rule?0.25:0)) - (x.rawScore + (x.rule?0.25:0)));
      if(ordered.length){
        const candidate = buildFromPair(ordered[0]);
        if(candidate && candidate.confidence > 0.5) return candidate;
      }
    }
    if(strat === "attention_only"){
      const ordered = pairs.slice().sort((x,y)=> y.rawScore - x.rawScore);
      if(ordered.length){
        const candidate = buildFromPair(ordered[0]);
        if(candidate && candidate.confidence > 0.48) return candidate;
      }
    }
    if(strat === "triple_boost"){
      if(triples.length){
        const bestTriple = triples.slice().sort((x,y)=> y.rawScore - x.rawScore)[0];
        if(bestTriple && bestTriple.rawScore > (pairs[0]?.rawScore || 0) + 0.12){
          const candidate = buildFromTriple(bestTriple);
          if(candidate && candidate.confidence > 0.5) return candidate;
        }
      }
    }
    if(strat === "fallback"){
      // محاولة توليد رد جبّار
      const generated = generateFromCandidates(normalized, context);
      if(generated && generated.length>5){
        return { reply: generated, source: "insight_generator_forced_generation", confidence: 0.5, metadata:{ reason:"forced_generated_from_candidates", produced_at: nowISO() } };
      }
      if(hybrid && hybrid.candidate && safeStr(hybrid.candidate.reply).length > 10){
        const reply = polishInsight(safeStr(hybrid.candidate.reply));
        return { reply, source: "insight_generator_fallback_to_hybrid", confidence: hybrid.calibratedScore ?? 0.6, metadata: { reason: "fallback_to_hybrid", produced_at: nowISO() } };
      }
      const top = normalized.slice().sort((a,b)=> b.calibratedScore - a.calibratedScore)[0];
      const reply = polishInsight(safeStr(top.candidate.reply));
      return { reply: `${reply}\n\n[ملاحظة: تم استخدام أفضل رد متاح كمحتوى احتياطي.]`, source: "insight_generator_last_resort", confidence: top?.calibratedScore ?? 0.55, metadata: { reason: "final_top_candidate_fallback", produced_at: nowISO() } };
    }
  }

  // لو وصلنا هنا يبقى لازم نرجع حاجة
  const generatedFinal = generateFromCandidates(normalized, context);
  if(generatedFinal){
    return { reply: generatedFinal, source: "insight_generator_forced_final", confidence: 0.45, metadata:{ reason:"forced_generation_as_last_option", produced_at: nowISO() } };
  }

  // fallback النهائي جداً
  const top = normalized.slice().sort((a,b)=> b.calibratedScore - a.calibratedScore)[0];
  const reply = polishInsight(safeStr(top.candidate.reply || ""));
  return { reply, source: "insight_generator_absolute_fallback", confidence: top?.calibratedScore ?? 0.4, metadata:{ reason:"absolute_last_resort", produced_at: nowISO() } };
}


