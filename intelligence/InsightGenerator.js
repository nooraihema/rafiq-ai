// intelligence/InsightGenerator.js (v5.0 - The Narrative Weaver)
// This is the definitive version, designed to be the ultimate intelligence layer.
// It analyzes the underlying narrative of all candidates, extracts the most powerful
// "gems" (empathy, insight, action), and artistically reconstructs a superior,
// cohesive, and deeply resonant response.

import fs from 'fs';
import path from 'path';

// =================================================================
// SECTION 1: KNOWLEDGE BASE LOADER (Stable & Preserved)
// =================================================================

const KNOWLEDGE_BASE = {};
const CONCEPT_MAP = {};
const INSIGHT_RULES = {};
const DEFAULT_STOPWORDS = ["في","من","على","مع","أنا","إني","هو","هي","ما","لم","لا","إن","أن","أو","لكن","و","ال","يا"];

(function loadKnowledgeBase() {
  try {
    const lexiconDir = path.join(process.cwd(), 'lexicons');
    const files = fs.readdirSync(lexiconDir);
    for (const file of files) {
      if (path.extname(file) === '.json') {
        const content = fs.readFileSync(path.join(lexiconDir, file), 'utf-8');
        const data = JSON.parse(content);
        if (data.emotion) {
          const mainConcept = data.emotion;
          KNOWLEDGE_BASE[mainConcept] = data;
          CONCEPT_MAP[mainConcept.toLowerCase()] = mainConcept;
          if (data.aliases) {
            for (const alias of data.aliases) {
              CONCEPT_MAP[alias.toLowerCase()] = mainConcept;
            }
          }
          if (data.related_concepts) {
            for (const related in data.related_concepts) {
              const rule = KNOWLEDGE_BASE[mainConcept]?.description ?
                `أرى علاقة بين "${mainConcept}" و "${related}". ${firstSentence(KNOWLEDGE_BASE[mainConcept].description)}` :
                `غالبًا ما يكون هناك ارتباط وثيق بين الشعور بـ "${mainConcept}" والإحساس بـ "${related}".`;
              INSIGHT_RULES[`${mainConcept}_${related}`] = rule;
            }
          }
        }
      }
    }
    console.log(`✅ [NarrativeWeaver] Knowledge Base loaded with ${Object.keys(KNOWLEDGE_BASE).length} concepts.`);
  } catch (error) {
    console.error("🚨 [NarrativeWeaver] CRITICAL ERROR: Could not load the Knowledge Base.", error);
  }
})();


// =================================================================
// SECTION 2: UTILITIES & HELPERS (Stable & Preserved)
// =================================================================
function safeStr(s){ return (s===null||s===undefined)?"":String(s); }
function firstSentence(text){ if(!text) return ""; const m = text.split(/(?<=[.؟!?])\s+/); return m[0] || text; }
function tokenizeWords(text){ if(!text) return []; return safeStr(text).toLowerCase().split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}_]+/gu,'')).filter(Boolean); }


// =================================================================
// SECTION 3: NARRATIVE & GEM EXTRACTION ENGINE
// =================================================================

function mapToConcept(token) {
  const norm = safeStr(token).toLowerCase();
  return CONCEPT_MAP[norm] || null;
}

function extractConceptsFromText(text, topN = 3) {
  const keywords = tokenizeWords(text).filter(t => !DEFAULT_STOPWORDS.includes(t));
  const concepts = new Set();
  for (const kw of keywords) {
    const c = mapToConcept(kw);
    if (c) concepts.add(c);
    if (concepts.size >= topN) break;
  }
  return [...concepts];
}

/**
 * Finds the dominant narrative (thematic link) across all candidates.
 * e.g., "Fear leads to Loneliness"
 */
function findDominantNarrative(allScoredCandidates, context) {
    const userMessage = context?.user_message || "";
    const conceptScores = {};

    // Score concepts based on user message and high-confidence candidates
    const userConcepts = extractConceptsFromText(userMessage, 4);
    userConcepts.forEach((c, i) => { conceptScores[c] = (conceptScores[c] || 0) + (2 / (i + 1)); });
    
    allScoredCandidates.slice(0, 3).forEach(sc => {
        extractConceptsFromText(sc.candidate.reply, 2).forEach(c => {
            conceptScores[c] = (conceptScores[c] || 0) + sc.calibratedScore;
        });
    });

    const concepts = Object.keys(conceptScores).sort((a, b) => conceptScores[b] - conceptScores[a]);
    if (concepts.length < 2) return null;

    // Find the most potent rule connecting the top concepts
    for (let i = 0; i < Math.min(concepts.length, 4); i++) {
        for (let j = i + 1; j < Math.min(concepts.length, 4); j++) {
            const a = concepts[i], b = concepts[j];
            const rule = INSIGHT_RULES[`${a}_${b}`] || INSIGHT_RULES[`${b}_${a}`];
            if (rule) {
                return {
                    insight: rule,
                    primaryConcept: a,
                    secondaryConcept: b,
                    strength: conceptScores[a] + conceptScores[b]
                };
            }
        }
    }
    return null;
}

/**
 * Extracts the best "gems" (empathy, action) from the candidates.
 */
function extractGems(allScoredCandidates) {
    const gems = {
        empathy: null,
        action: null
    };
    let bestEmpathyScore = -1;
    let bestActionScore = -1;

    for (const sc of allScoredCandidates) {
        const reply = sc.candidate.reply;
        const source = sc.candidate.source.toLowerCase();

        // Find the best empathy gem
        if (source.includes('gateway') || source.includes('empathic') || source.includes('compassion')) {
            if (sc.calibratedScore > bestEmpathyScore) {
                gems.empathy = firstSentence(reply);
                bestEmpathyScore = sc.calibratedScore;
            }
        }

        // Find the best action gem (a question or a clear suggestion)
        if (source.includes('skill') || source.includes('tool') || reply.includes('?')) {
             if (sc.calibratedScore > bestActionScore) {
                gems.action = reply; // Keep the full sentence for context
                bestActionScore = sc.calibratedScore;
            }
        }
    }
    
    if (!gems.empathy) gems.empathy = firstSentence(allScoredCandidates[0].candidate.reply);
    if (!gems.action) gems.action = allScoredCandidates[0].candidate.reply;

    return gems;
}


// =================================================================
// SECTION 4: THE NARRATIVE WEAVER (MAIN FUNCTION)
// =================================================================

export function weaveNarrativeResponse(allScoredCandidates, context) {
    // Decision Point 1: Is there enough material to create a masterpiece?
    if (!allScoredCandidates || allScoredCandidates.length < 2 || !context?.user_message) {
        return null;
    }

    try {
        // Step 1: Understand the dominant narrative
        const narrative = findDominantNarrative(allScoredCandidates, context);

        // Decision Point 2: Is the narrative strong and clear enough?
        if (!narrative || narrative.strength < 1.5) {
            console.log(`[NarrativeWeaver] Narrative is not strong enough (Strength: ${narrative?.strength?.toFixed(2)}). Deferring.`);
            return null;
        }
        
        console.log(`[NarrativeWeaver] Found dominant narrative: "${narrative.primaryConcept}" -> "${narrative.secondaryConcept}". Weaving a new response.`);

        // Step 2: Extract the finest gems from the existing material
        const gems = extractGems(allScoredCandidates);

        // Step 3: Artistically reconstruct the response
        const primaryConceptData = KNOWLEDGE_BASE[narrative.primaryConcept];
        let finalCallToAction = firstSentence(gems.action); // Default action
        
        // If we have a coping mechanism, create a more targeted action
        if (primaryConceptData?.coping_mechanisms?.short_term) {
            const suggestion = primaryConceptData.coping_mechanisms.short_term[0];
            finalCallToAction = `لذلك، كخطوة أولى بسيطة، ما رأيك لو جربنا شيئًا مثل "${suggestion}" لنبدأ في تهدئة هذا الشعور؟`;
        }

        // The final artistic weaving of the narrative
        const finalReply = `${gems.empathy}. ${narrative.insight}. ${finalCallToAction}`;

        const metadata = {
            source: "narrative_weaver_v5",
            narrative: `${narrative.primaryConcept}_to_${narrative.secondaryConcept}`,
            components: {
                empathy_source: gems.empathy,
                action_source: gems.action,
                insight_source: "knowledge_base"
            }
        };

        return {
            reply: finalReply,
            source: "narrative_weaver_v5",
            confidence: 0.98, // Very high confidence due to the structured, multi-source synthesis
            metadata: metadata,
        };

    } catch (error) {
        console.error("🚨 [NarrativeWeaver] Error during narrative weaving:", error);
        return null; // Graceful failure
    }
}
