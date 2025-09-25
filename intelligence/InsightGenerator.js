// intelligence/InsightGenerator.js (v5.1 - The Narrative Weaver, integrated & resilient)
// Exports: weaveNarrativeResponse(allScoredCandidates, context, options)
// Purpose: take the full bundle from HybridComposer (all candidates + hybrid final + context + fingerprint + metadata)
// and produce a single, deeply coherent response that links empathy, insight, and action using the lexicons/knowledge base.

import fs from 'fs';
import path from 'path';

// -------------------- Config / KB loaders --------------------
const KNOWLEDGE_BASE = {};
const CONCEPT_MAP = {};
const INSIGHT_RULES = {};
const DEFAULT_STOPWORDS = ["في","من","على","مع","أنا","إني","هو","هي","ما","لم","لا","إن","أن","أو","لكن","و","ال","يا"];

(function loadKnowledgeBase() {
  try {
    const lexiconDir = path.join(process.cwd(), 'lexicons');
    if (!fs.existsSync(lexiconDir)) {
      console.warn('[NarrativeWeaver] lexicons directory not found:', lexiconDir);
      return;
    }
    const files = fs.readdirSync(lexiconDir);
    for (const file of files) {
      if (path.extname(file) !== '.json') continue;
      try {
        const content = fs.readFileSync(path.join(lexiconDir, file), 'utf-8');
        const data = JSON.parse(content);
        if (!data || !data.emotion) continue;
        const mainConcept = data.emotion;
        KNOWLEDGE_BASE[mainConcept] = data;
        CONCEPT_MAP[mainConcept.toLowerCase()] = mainConcept;
        if (Array.isArray(data.aliases)) {
          for (const alias of data.aliases) CONCEPT_MAP[String(alias).toLowerCase()] = mainConcept;
        }
        if (data.related_concepts && typeof data.related_concepts === 'object') {
          for (const related in data.related_concepts) {
            const rule = data.related_concepts[related].short_description
              ? `أرى علاقة بين "${mainConcept}" و "${related}". ${firstSentence(data.related_concepts[related].short_description)}`
              : `قد يكون هناك ارتباط بين "${mainConcept}" و "${related}".`;
            INSIGHT_RULES[`${mainConcept}_${related}`] = rule;
          }
        }
        // also include simple mapping for words inside the file (if provided)
        if (Array.isArray(data.keywords)) {
          for (const kw of data.keywords) CONCEPT_MAP[String(kw).toLowerCase()] = mainConcept;
        }
      } catch (e) {
        console.warn('[NarrativeWeaver] Failed to parse lexicon file', file, e.message);
      }
    }
    console.log(`✅ [NarrativeWeaver] Knowledge Base loaded with ${Object.keys(KNOWLEDGE_BASE).length} concepts.`);
  } catch (error) {
    console.error("🚨 [NarrativeWeaver] Could not load Knowledge Base.", error);
  }
})();

// -------------------- Utilities --------------------
function safeStr(s){ return (s===null||s===undefined)?"":String(s); }
function nowISO(){ return (new Date()).toISOString(); }
function clamp(v,a=0,b=1){ return Math.max(a, Math.min(b, v)); }
function firstSentence(text){ if(!text) return ""; const m = String(text).split(/(?<=[.؟!?])\s+/); return m[0] || String(text); }
function tokenizeWords(text){ if(!text) return []; return safeStr(text).toLowerCase().split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}_]+/gu,'')).filter(Boolean); }
function uniq(arr){ return [...new Set(arr)]; }
function dedupeSentences(text){ if(!text) return text; const parts = String(text).split(/(?<=[.؟!?])\s+/).map(s=>s.trim()).filter(Boolean); const seen=new Set(); const out=[]; for(const p of parts){ const k=p.replace(/\s+/g,' ').toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(p); } } return out.join(' '); }

// -------------------- Concept mapping & extraction --------------------
function mapToConcept(token) {
  const norm = String(token).toLowerCase();
  return CONCEPT_MAP[norm] || null;
}
function extractConceptsFromText(text, topN = 5) {
  const tokens = tokenizeWords(text).filter(t => !DEFAULT_STOPWORDS.includes(t));
  if (!tokens.length) return [];
  const freq = {};
  tokens.forEach((t,i) => freq[t] = (freq[t]||0)+1);
  const keys = Object.entries(freq).sort((a,b)=> b[1]-a[1]).map(e=>e[0]);
  const concepts = [];
  for (const k of keys) {
    const c = mapToConcept(k);
    concepts.push(c || k);
    if (concepts.length >= topN) break;
  }
  return uniq(concepts);
}

// -------------------- Narrative discovery & scoring --------------------
function scoreConceptBundle(allScoredCandidates, context) {
  const userMsg = safeStr(context?.user_message || "");
  const scores = {};
  // user concepts weighted
  const userConcepts = extractConceptsFromText(userMsg, 6);
  userConcepts.forEach((c,i) => { scores[c] = (scores[c] || 0) + (2/(1+i)); });
  // candidate contributions
  for (const sc of allScoredCandidates.slice(0,8)) {
    const cs = Number(sc.calibratedScore ?? sc.calibrated ?? sc.score ?? sc.baseConf ?? 0.5);
    const ccs = extractConceptsFromText(safeStr(sc.candidate?.reply || sc.candidate?.text || ""), 4);
    ccs.forEach((c, idx) => {
      scores[c] = (scores[c] || 0) + cs * (1/(1+idx));
    });
  }
  return scores;
}

function findDominantNarrative(allScoredCandidates, context) {
  const scores = scoreConceptBundle(allScoredCandidates, context);
  const concepts = Object.keys(scores).sort((a,b)=> scores[b]-scores[a]);
  if (concepts.length < 2) return null;

  // candidate narrative rules & heuristics
  // try to find explicit INSIGHT_RULES between top concepts
  for (let i=0;i<Math.min(6,concepts.length);i++){
    for (let j=i+1;j<Math.min(6,concepts.length);j++){
      const a = concepts[i], b = concepts[j];
      const rule = INSIGHT_RULES[`${a}_${b}`] || INSIGHT_RULES[`${b}_${a}`];
      if (rule) {
        const strength = (scores[a] || 0) + (scores[b] || 0);
        return { insight: rule, primaryConcept: a, secondaryConcept: b, strength };
      }
    }
  }

  // fallback: try to infer a direction by checking candidate phrases
  // if many candidates mention concept A then B in same reply, boost that pair
  const pairCounts = {};
  for (const sc of allScoredCandidates) {
    const txt = safeStr(sc.candidate?.reply || sc.candidate?.text || "");
    const cs = extractConceptsFromText(txt, 6);
    for (let i=0;i<cs.length;i++){
      for (let j=i+1;j<cs.length;j++){
        const key = `${cs[i]}::${cs[j]}`;
        pairCounts[key] = (pairCounts[key]||0)+1;
      }
    }
  }
  const pairEntries = Object.entries(pairCounts).sort((a,b)=> b[1]-a[1]);
  if (pairEntries.length) {
    const [pair, cnt] = pairEntries[0];
    const [a,b] = pair.split('::');
    const strength = (scores[a]||0)+(scores[b]||0) + cnt*0.5;
    // craft a gentle insight sentence if no KB rule present
    const insight = `قد يكون هناك ارتباط بين "${a}" و "${b}" بناءً على ما ورد في ردود متعددة.`;
    return { insight, primaryConcept: a, secondaryConcept: b, strength };
  }

  return null;
}

// -------------------- Gems extraction --------------------
function extractGems(allScoredCandidates, options = {}) {
  const gems = { empathy: null, action: null, rationale: null };
  let bestEmpathyScore = -1;
  let bestActionScore = -1;
  let bestRationaleScore = -1;

  for (const sc of allScoredCandidates) {
    const reply = safeStr(sc.candidate?.reply || sc.candidate?.text || "");
    const src = safeStr(sc.candidate?.source || '').toLowerCase();
    const score = Number(sc.calibratedScore ?? sc.calibrated ?? sc.score ?? sc.baseConf ?? 0.5);

    // empathy gem detection
    if (src.includes('empath') || src.includes('gateway') || reply.match(/\b(أفهم|مشاعرك|حاسس)\b/)) {
      if (score > bestEmpathyScore) { bestEmpathyScore = score; gems.empathy = firstSentence(reply); }
    }

    // action gem detection — explicit suggestions, steps, or direct questions
    if (reply.includes('?') || reply.match(/\b(جرب|ابدأ|خطوة|ممكن تعمل)\b/) || src.includes('skill') || src.includes('pragmatic')) {
      if (score > bestActionScore) { bestActionScore = score; gems.action = firstSentence(reply).length > 8 ? firstSentence(reply) : reply; }
    }

    // rationale / explanation gem — where logical reasons are given
    if (reply.match(/\b(لأن|بسبب|يمكن أن|لذلك|لذلك)\b/) || src.includes('logical') || src.includes('analysis')) {
      if (score > bestRationaleScore) { bestRationaleScore = score; gems.rationale = firstSentence(reply); }
    }
  }

  // fallbacks
  if (!gems.empathy && allScoredCandidates[0]) gems.empathy = firstSentence(safeStr(allScoredCandidates[0].candidate.reply || ""));
  if (!gems.action && allScoredCandidates[0]) gems.action = firstSentence(safeStr(allScoredCandidates[0].candidate.reply || ""));
  if (!gems.rationale && allScoredCandidates[0]) gems.rationale = firstSentence(safeStr(allScoredCandidates[0].candidate.reply || ""));

  return gems;
}

// -------------------- Merge helpers --------------------
function mergeHybridAndGems(hybridCandidate, gems, narrativeInsight, context) {
  const empath = gems.empathy ? `${gems.empathy}` : '';
  const rationale = narrativeInsight?.insight ? narrativeInsight.insight : (gems.rationale ? gems.rationale : '');
  const action = gems.action ? `${gems.action}` : '';
  // prefer targeted coping mechanisms from KB when available
  let targetedAction = action;
  const primary = narrativeInsight?.primaryConcept;
  if (primary && KNOWLEDGE_BASE[primary] && Array.isArray(KNOWLEDGE_BASE[primary].coping_mechanisms?.short_term) && KNOWLEDGE_BASE[primary].coping_mechanisms.short_term.length) {
    const s = KNOWLEDGE_BASE[primary].coping_mechanisms.short_term[0];
    targetedAction = `كخطوة أولية بسيطة، ممكن تجرب: "${s}".`;
  }

  // craft weave
  const parts = [];
  if (empath) parts.push(empath);
  if (rationale) parts.push(rationale);
  if (targetedAction) parts.push(targetedAction);
  // if hybridCandidate exists, add a concise citation/bridge
  if (hybridCandidate && safeStr(hybridCandidate.reply)) {
    const bridge = firstSentence(safeStr(hybridCandidate.reply || ''));
    if (bridge && !parts.includes(bridge)) parts.push(bridge);
  }

  const reply = dedupeSentences(parts.join(' '));
  return reply;
}

// -------------------- Triable strategies & decision harness --------------------
export function weaveNarrativeResponse(allScoredCandidates = [], context = {}, options = {}) {
  // options: { triableStrategies: [...], minNarrativeStrength: number, requireKBRule: bool }
  const {
    triableStrategies = ["rule_first","hybrid_merge","attention_only","fallback"],
    minNarrativeStrength = 1.2,
    requireKBRule = false
  } = options || {};

  // validation
  if (!Array.isArray(allScoredCandidates) || allScoredCandidates.length === 0) return null;
  if (!context || !context.user_message) {
    // if no user message, can't build narrative reliably
    return null;
  }

  // normalize candidate structure: accept either {candidate,calibratedScore,...} or plain candidate objects
  const normalized = allScoredCandidates.map((s, idx) => {
    if (s && s.candidate) return s;
    // assume s is a candidate object
    return { candidate: s, calibratedScore: Number(s.calibratedScore ?? s.score ?? s.baseConf ?? 0.5) };
  });

  // attempt to find hybrid final candidate inside the bundle (by conventional source tags)
  const hybridCandidate = normalized.find(n => safeStr(n.candidate.source || '').toLowerCase().includes('hybrid')) ||
                          normalized.find(n => safeStr(n.candidate.source || '').toLowerCase().includes('maestro')) ||
                          normalized.find(n => safeStr(n.candidate.source || '').toLowerCase().includes('final')) ||
                          null;

  // compute narrative
  const narrative = findDominantNarrative(normalized, context);

  // compute gems
  const gems = extractGems(normalized);

  // Triable logic
  for (const strat of triableStrategies) {
    try {
      if (strat === "rule_first") {
        if (narrative && (!requireKBRule || (requireKBRule && INSIGHT_RULES[`${narrative.primaryConcept}_${narrative.secondaryConcept}`]))) {
          if (narrative.strength >= minNarrativeStrength) {
            // build call to action using KB if available
            const primaryData = KNOWLEDGE_BASE[narrative.primaryConcept];
            const actionSentence = primaryData?.coping_mechanisms?.short_term && primaryData.coping_mechanisms.short_term.length
              ? `كخطوة بسيطة، جرب: "${primaryData.coping_mechanisms.short_term[0]}".`
              : gems.action;
            const reply = `${gems.empathy}. ${narrative.insight}. ${actionSentence}`;
            const metadata = { source: "narrative_weaver_v5_rule_first", narrative: `${narrative.primaryConcept}_to_${narrative.secondaryConcept}`, components: { gems, hybrid: hybridCandidate?.candidate?.source || null } };
            return { reply: dedupeSentences(reply), source: "narrative_weaver_v5", confidence: clamp(0.45 + narrative.strength/3, 0.5, 0.99), metadata };
          }
        }
      }

      if (strat === "hybrid_merge") {
        // Always beneficial: merge hybridCandidate reply with gems & narrative if hybrid exists
        if (hybridCandidate) {
          const merged = mergeHybridAndGems(hybridCandidate.candidate, gems, narrative, context);
          const polished = dedupeSentences(merged);
          const metadata = { source: "narrative_weaver_v5_hybrid_merge", components: { gems, hybrid: hybridCandidate.candidate.source, narrative: narrative ? `${narrative.primaryConcept}_${narrative.secondaryConcept}` : null } };
          // confidence higher if narrative exists
          const conf = narrative ? clamp(0.5 + (narrative.strength/4), 0.5, 0.98) : 0.6;
          return { reply: polished, source: "narrative_weaver_v5", confidence: conf, metadata };
        }
      }

      if (strat === "attention_only") {
        // pick best-scored pair/triple from the bundle and attempt to phrase insight even without KB rule
        const scores = scoreConceptBundle(normalized, context);
        const concepts = Object.keys(scores).sort((a,b)=> scores[b]-scores[a]);
        if (concepts.length >= 2) {
          const a = concepts[0], b = concepts[1];
          const insight = INSIGHT_RULES[`${a}_${b}`] || INSIGHT_RULES[`${b}_${a}`] || `قد يكون هناك رابط بين "${a}" و "${b}".`;
          const reply = `${gems.empathy}. ${insight}. ${gems.action}`;
          const metadata = { source: "narrative_weaver_v5_attention", chosen_pair: [a,b], components: { gems } };
          return { reply: dedupeSentences(reply), source: "narrative_weaver_v5", confidence: 0.58, metadata };
        }
      }

      if (strat === "fallback") {
        // safe fallback: return an enriched hybrid or best candidate with gems prefixed
        const best = normalized[0].candidate;
        const prefix = gems.empathy ? `${gems.empathy}. ` : '';
        const hybridText = safeStr(best.reply || best.text || '');
        const final = dedupeSentences(`${prefix}${hybridText}`);
        const metadata = { source: "narrative_weaver_v5_fallback", components: normalized.map(n=>n.candidate.source) };
        return { reply: final, source: "narrative_weaver_v5", confidence: Number(normalized[0].calibratedScore ?? 0.6), metadata };
      }
    } catch (err) {
      // do not crash whole flow; move to next strategy
      console.warn('[NarrativeWeaver] strategy error', strat, err.message);
      continue;
    }
  }

  // safety final fallback
  const fallback = normalized[0].candidate;
  return { reply: dedupeSentences(safeStr(fallback.reply || fallback.text || 'أنا معاك — ممكن تحكيلي أكثر؟')), source: "narrative_weaver_v5_final_fallback", confidence: normalized[0].calibratedScore ?? 0.5, metadata: { source: "final_fallback", produced_at: nowISO() } };
}

export default { weaveNarrativeResponse };

