// intelligence/InsightGenerator.js (v3.0 - The Knowledge-Based Enhancement Engine)
// This version loads its knowledge from external /lexicons JSON files.
// Its main function is enhanceDecision, which takes a decision from HybridComposer
// and attempts to deepen it, falling back to the original if no significant
// value can be added.

import fs from 'fs';
import path from 'path';

// =================================================================
// SECTION 1: KNOWLEDGE BASE LOADER & INITIALIZATION
// =================================================================

const KNOWLEDGE_BASE = {}; // Stores the full JSON data for each concept, e.g., KNOWLEDGE_BASE['حزن']
const CONCEPT_MAP = {};    // Maps all aliases to their main concept, e.g., CONCEPT_MAP['sadness'] = 'حزن'
const INSIGHT_RULES = {};  // Stores pre-defined rules based on related concepts

const DEFAULT_STOPWORDS = ["في","من","على","مع","أنا","إني","هو","هي","ما","لم","لا","إن","أن","أو","لكن","و","ال","يا"];

// Self-invoking function to load the knowledge base on startup
(function loadKnowledgeBase() {
  try {
    // We assume the script is run from the project root, so we construct the path
    const lexiconDir = path.join(process.cwd(), 'lexicons');
    const files = fs.readdirSync(lexiconDir);

    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(lexiconDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.emotion) {
          const mainConcept = data.emotion;
          KNOWLEDGE_BASE[mainConcept] = data;

          // Populate the CONCEPT_MAP
          CONCEPT_MAP[mainConcept.toLowerCase()] = mainConcept;
          if (data.aliases) {
            for (const alias of data.aliases) {
              CONCEPT_MAP[alias.toLowerCase()] = mainConcept;
            }
          }
        }
      }
    }

    // Populate INSIGHT_RULES from related_concepts
    for (const conceptName in KNOWLEDGE_BASE) {
      const conceptData = KNOWLEDGE_BASE[conceptName];
      if (conceptData.related_concepts) {
        for (const related in conceptData.related_concepts) {
          const key1 = `${conceptName}_${related}`;
          const key2 = `${related}_${conceptName}`;
          // A generic but meaningful rule
          INSIGHT_RULES[key1] = `غالبًا ما يكون هناك ارتباط وثيق بين الشعور بـ "${conceptName}" والإحساس بـ "${related}".`;
          INSIGHT_RULES[key2] = `غالبًا ما يكون هناك ارتباط وثيق بين الشعور بـ "${related}" والإحساس بـ "${conceptName}".`;
        }
      }
    }

    console.log(`✅ Knowledge Base loaded successfully. ${Object.keys(KNOWLEDGE_BASE).length} concepts found.`);

  } catch (error) {
    console.error("🚨 CRITICAL ERROR: Could not load the Knowledge Base from /lexicons.", error);
    // In a real app, you might want to exit or disable this engine if loading fails.
  }
})();

// =================================================================
// SECTION 2: UTILITIES (Largely preserved)
// =================================================================

function safeStr(s){ return (s===null||s===undefined)?"":String(s); }
function nowISO(){ return (new Date()).toISOString(); }
function clamp(v,a=0,b=1){ return Math.max(a, Math.min(b, v)); }
function tokenizeWords(text){ if(!text) return []; return safeStr(text).toLowerCase().split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}_]+/gu,'')).filter(Boolean); }
function uniq(arr){ return [...new Set(arr)]; }
function jaccardSim(a="", b=""){ const s1 = new Set(tokenizeWords(a)); const s2 = new Set(tokenizeWords(b)); if(s1.size===0 && s2.size===0) return 1; const inter = [...s1].filter(x=>s2.has(x)).length; const union = new Set([...s1,...s2]).size || 1; return inter/union; }
function firstSentence(text){ if(!text) return ""; const m = text.split(/(?<=[.؟!?])\s+/); return m[0] || text; }


// =================================================================
// SECTION 3: CORE LOGIC (Upgraded to use Knowledge Base)
// =================================================================

// --- [UPGRADED] mapToConcept now uses the dynamically built CONCEPT_MAP ---
function mapToConcept(token) {
  const norm = safeStr(token).toLowerCase();
  return CONCEPT_MAP[norm] || null; // More precise matching
}

function extractConceptsFromText(text, stopwords = DEFAULT_STOPWORDS, topN = 5){
  const keywords = tokenizeWords(text).filter(t => !stopwords.includes(t)).slice(0, topN * 2);
  const concepts = new Set();
  for(const kw of keywords){
    const c = mapToConcept(kw);
    if (c) concepts.add(c);
    if (concepts.size >= topN) break;
  }
  return [...concepts];
}

// --- [UPGRADED] buildConceptGraph now injects pre-existing knowledge ---
function buildConceptGraph(user_message, topCandidates, stopwords){
  const graph = { nodes: {}, edges: {} };

  // Step 1: Build graph from user message and candidates (as before)
  const userConcepts = extractConceptsFromText(user_message || "", stopwords, 6);
  userConcepts.forEach((c, i) => { graph.nodes[c] = (graph.nodes[c] || 0) + (1.2 / (1 + i)); });

  for (const sc of topCandidates) {
    const candidateConcepts = extractConceptsFromText(sc.candidate.reply || "", stopwords, 4);
    const weight = clamp(Number(sc.calibratedScore ?? 0.5));
    candidateConcepts.forEach((c, idx) => { graph.nodes[c] = (graph.nodes[c] || 0) + weight * (1 / (1 + idx)); });
    for (let i = 0; i < candidateConcepts.length; i++) {
      for (let j = i + 1; j < candidateConcepts.length; j++) {
        const a = candidateConcepts[i], b = candidateConcepts[j];
        const key = a < b ? `${a}::${b}` : `${b}::${a}`;
        graph.edges[key] = graph.edges[key] || { weight: 0, supporters: [] };
        graph.edges[key].weight += weight;
        graph.edges[key].supporters.push({ source: sc.candidate.source });
      }
    }
  }

  // Step 2: [NEW] Inject knowledge from the KNOWLEDGE_BASE
  for (const conceptName in graph.nodes) {
    const conceptData = KNOWLEDGE_BASE[conceptName];
    if (conceptData && conceptData.related_concepts) {
      for (const relatedConcept in conceptData.related_concepts) {
        // If the related concept is also present in the conversation, strengthen the link
        if (graph.nodes[relatedConcept]) {
          const key = conceptName < relatedConcept ? `${conceptName}::${relatedConcept}` : `${relatedConcept}::${conceptName}`;
          graph.edges[key] = graph.edges[key] || { weight: 0, supporters: [] };
          // Add a significant weight boost for known relationships
          graph.edges[key].weight += 1.5;
          graph.edges[key].supporters.push({ source: 'knowledge_base' });
        }
      }
    }
  }

  return graph;
}

// (scorePair, enumeratePairs, etc. are largely the same but will benefit from the better graph)
// We will focus the main changes in the final reply builder.
function scorePair(a, b, graph) { /* This function can be kept as is for now */
    const edgeKey = a < b ? `${a}::${b}` : `${b}::${a}`;
    const edge = graph.edges[edgeKey] || { weight: 0 };
    const nodeScore = (graph.nodes[a] || 0) + (graph.nodes[b] || 0);
    const ruleBoost = INSIGHT_RULES[`${a}_${b}`] ? 1.5 : 1.0;
    const score = (edge.weight * 1.2 + nodeScore * 0.5) * ruleBoost;
    return { a, b, score, hasRule: !!(ruleBoost > 1) };
}

// --- [UPGRADED] The main builder function, now much smarter ---
function buildInsightReply(chosenPair, context) {
    const { a, b } = chosenPair;
    const conceptAData = KNOWLEDGE_BASE[a];
    const conceptBData = KNOWLEDGE_BASE[b];

    // 1. Generate a richer insight core
    let insightCore = INSIGHT_RULES[`${a}_${b}`] || `أرى علاقة مهمة بين "${a}" و "${b}".`;
    // Use the description from the most prominent concept
    const primaryConceptData = (conceptAData?.description && (graph.nodes[a] > graph.nodes[b])) ? conceptAData : conceptBData;
    if (primaryConceptData?.description) {
        insightCore += ` ${firstSentence(primaryConceptData.description)}`;
    }

    // 2. Generate a highly relevant Call To Action
    let callToAction = "تحب نستكشف ده مع بعض أكتر؟";
    if (primaryConceptData?.coping_mechanisms?.short_term) {
        const suggestions = primaryConceptData.coping_mechanisms.short_term;
        const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        callToAction = `كخطوة أولى بسيطة، هل ترغب في تجربة شيء مثل "${suggestion}"؟`;
    }

    // 3. Assemble the reply using a simple template
    const finalReply = `${insightCore}\n\n${callToAction}`;
    
    // 4. Create metadata
    const metadata = {
        source: "insight_enhancer_v3",
        chosen_pair: [a, b],
        reasoning: `Generated insight based on the relationship between ${a} and ${b}.`
    };

    const confidence = clamp(0.5 + (chosenPair.score / 10), 0.5, 0.98);

    return {
        reply: finalReply,
        source: "insight_enhancer_v3",
        confidence,
        metadata
    };
}


// =================================================================
// SECTION 4: MAIN EXPORTED FUNCTION
// =================================================================

/**
 * Takes a decision from HybridComposer and tries to enhance it with a deeper insight.
 * @param {Object} composerDecision - The full response object chosen by HybridComposer.
 * @param {Array<Object>} allScoredCandidates - The full list of scored candidates.
 * @param {Object} context - The conversation context (user_message, etc.).
 * @returns {Object} - Either a new, enhanced response object or the original composerDecision.
 */
export function enhanceDecision(composerDecision, allScoredCandidates, context) {
    // Safety check: if there are no candidates or knowledge, do nothing.
    if (!allScoredCandidates || allScoredCandidates.length < 2 || Object.keys(KNOWLEDGE_BASE).length === 0) {
        return composerDecision;
    }

    try {
        const graph = buildConceptGraph(context?.user_message || "", allScoredCandidates, DEFAULT_STOPWORDS);
        const allConcepts = uniq(Object.keys(graph.nodes));

        // If not enough distinct concepts were found, enhancement is not possible.
        if (allConcepts.length < 2) {
            return composerDecision;
        }

        // Find the best pair of concepts to build an insight around
        const pairs = [];
        for(let i=0; i<allConcepts.length; i++) {
            for(let j=i+1; j<allConcepts.length; j++) {
                pairs.push(scorePair(allConcepts[i], allConcepts[j], graph));
            }
        }
        pairs.sort((x, y) => y.score - x.score);
        const bestPair = pairs[0];

        // --- The Core Decision Logic ---
        // We will enhance only if the best insight has a rule and a high score.
        const ENHANCEMENT_THRESHOLD = 3.0; // This is a tunable value
        if (bestPair && bestPair.score > ENHANCEMENT_THRESHOLD && bestPair.hasRule) {
            console.log(`INSIGHT: Enhancement opportunity found for pair (${bestPair.a}, ${bestPair.b}) with score ${bestPair.score.toFixed(2)}.`);
            const enhancedReply = buildInsightReply(bestPair, context);
            
            // Make sure to carry over the memory passport if it exists
            if (composerDecision.metadata?.nextSessionContext) {
                enhancedReply.metadata.nextSessionContext = composerDecision.metadata.nextSessionContext;
            }
            
            return enhancedReply;
        }

        // If no valuable insight was found, return the original decision.
        return composerDecision;

    } catch (error) {
        console.error("🚨 Error during insight enhancement:", error);
        // Safety fallback: always return the original valid decision in case of error.
        return composerDecision;
    }
}

export default { enhanceDecision };
