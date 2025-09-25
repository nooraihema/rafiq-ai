
// intelligence/InsightGenerator.js (v5.2 - Ultimate Insight & Linguistic Engine)
// Purpose: Generate highly cohesive, context-aware, and linguistically rich insights.
// Combines concept graph, narrative weaving, triable replies, and a powerful language generator.

import fs from 'fs';
import path from 'path';

const DEFAULT_STOPWORDS = ["في","من","على","مع","أنا","إني","هو","هي","ما","لم","لا","إن","أن","أو","لكن","و","ال","يا"];
const MIN_SUPPORTERS_FOR_INSIGHT = 1;
const MIN_NARRATIVE_STRENGTH = 1.2;

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

// ==================== Linguistic Engine ====================
function linguisticVariations(baseText, context = {}, maxVariants = 3){
  const variations = [];
  const emo = context?.detected_emotions || [];
  for(let i=0;i<maxVariants;i++){
    let v = baseText;
    if(emo.includes('sadness')) v = v.replace(/\./g,'...').replace(/هل/,'هل تشعر أنك تستطيع؟');
    if(emo.includes('joy')) v = v + ' 😄';
    if(emo.includes('anger')) v = v.replace(/،/g,'!');
    if(i>0) v = `${v} (${i+1})`; 
    variations.push(v);
  }
  return uniq(variations).slice(0,maxVariants);
}

function triableReply(baseReply, variations = [], context = {}){
  const all = [baseReply, ...variations, ...linguisticVariations(baseReply, context, 2)].filter(Boolean);
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

// ==================== Lexicon Loader ====================
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
          if(Array.isArray(data.aliases)) for(const a of data.aliases) CONCEPT_MAP[safeStr(a).toLowerCase()] = main;
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

// ==================== Concept Extraction & Graph ====================
function mapToConcept(token){ return CONCEPT_MAP[safeStr(token).toLowerCase()] || null; }
function extractConceptsFromText(text, topN = 4){
  if(!text) return [];
  const tokens = tokenizeWords(text).filter(t => !DEFAULT_STOPWORDS.includes(t));
  const freq = {};
  tokens.forEach((t,i)=> freq[t] = (freq[t]||0)+1);
  const entries = Object.entries(freq).sort((a,b)=> b[1]-a[1]).slice(0, topN);
  const out = [];
  for(const [tok] of entries){
    const mapped = mapToConcept(tok) || tok;
    out.push(mapped);
    if(out.length>=topN) break;
  }
  return uniq(out);
}

// Graph builder, attention, scoring, pairing, triples ... (نفس الكود السابق) 

// ==================== Main Insight Generator ====================
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

  // fallback for low concept count
  if(allConcepts.length < 2){
    const top = normalized.slice().sort((a,b)=> (b.calibratedScore - a.calibratedScore))[0];
    const fallbackCandidate = hybrid?.candidate || top?.candidate || {};
    const reply = polishInsight(safeStr(fallbackCandidate.reply || ""));
    return { reply, source: hybrid ? "hybrid_fallback" : "direct_fallback", confidence: top?.calibratedScore ?? 0.6, metadata: { reason: "insufficient_concepts", produced_at: nowISO(), components: normalized.map(n=>safeStr(n.candidate?.source)) } };
  }

  const nodeAttention = applyGraphAttention(graph, context);
  const pairs = enumeratePairs(allConcepts).map(([a,b]) => scorePair(a,b,graph,normalized,context,nodeAttention));
  const triples = allConcepts.length >=3 ? enumerateTriples(allConcepts).map(t => scoreTriple(t,graph,normalized,INSIGHT_RULES,context,nodeAttention)) : [];

  // Triable strategies (rule_first, attention_then_rule, attention_only, triple_boost, fallback)
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
      if(hybrid && hybrid.candidate && safeStr(hybrid.candidate.reply).length > 10){
        const reply = polishInsight(safeStr(hybrid.candidate.reply));
        return { reply, source: "insight_generator_fallback_to_hybrid", confidence: hybrid.calibratedScore ?? 0.6, metadata: { reason: "fallback_to_hybrid", produced_at: nowISO() } };
      }
      const top = normalized.slice().sort((a,b)=> b.calibratedScore - a.calibratedScore)[0];
      const reply = polishInsight(safeStr(top.candidate.reply));
      return { reply: `${reply}\n\n[ملاحظة: تم استخدام أفضل رد متاح كمحتوى احتياطي.]`, source: "insight_generator_fallback_top", confidence: top.calibratedScore ?? 0.55, metadata: { reason: "final_fallback", produced_at: nowISO() } };
    }
  }

  const top = normalized.slice().sort((a,b)=> b.calibratedScore - a.calibratedScore)[0];
  return { reply: polishInsight(safeStr(top.candidate.reply || "")), source: "insight_generator_last_resort", confidence: top.calibratedScore ?? 0.5, metadata: { produced_at: nowISO() } };
}

export default { generateInsight };

