// /analysis_engines/catharsis_engine.js
// CatharsisEngine v1.8 - Bilingual Protocol Matching Update
// This version introduces a smarter protocol matching strategy that uses the
// original source tokens from the SemanticMap to match against protocol keywords.

import { sample, getTopN } from '../core/utils.js';

export class CatharsisEngine {
  constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
    if (!dictionaries.GENERATIVE_ENGINE || !dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator) {
      throw new Error("CatharsisEngine v1.8 requires dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator.");
    }

    const GenerativeOrchestratorClass = dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator;
    this.generativeOrchestrator = new GenerativeOrchestratorClass({
      dnaLibrary: dictionaries.GENERATIVE_ENGINE.EMOTIONAL_DNA || {},
      lexicalPools: dictionaries.GENERATIVE_ENGINE.LEXICAL_POOLS || {},
      memory: memorySystem
    });

    this.protocols = protocols;
    this.memory = memorySystem;
    this.debug = true;

    // Tunables
    this.SHORT_TEXT_TOKEN_LIMIT = 6;
    this.MIN_EMOTIONAL_INTEGRITY = 0.62;
    this.DNA_BLEND_DEFAULT = 'dynamic';
    this.INTENT_EMOTION_SIGNATURES = {
      empathy: { sadness: 0.6, calming: 0.3, supportive: 0.4 },
      validation: { supportive: 0.7 },
      insight_delivery: { empowering: 0.5, hope: 0.3 },
      probe_dissonance: { curious: 0.6, calming: 0.2 },
      probe_conflict: { curious: 0.6 },
      action_proposal_immediate: { empowering: 0.7 },
      action_proposal_micro: { empowering: 0.5 },
      open_question: { curious: 0.6 },
      grounding: { calming: 0.9 },
      hope_injection: { hope: 0.9 }
    };
  }

  /**
   * Adaptive arc design - shapes arc based on emotionProfile & synthesisProfile
   */
  _designResponseArc(insight) {
    const arc = [];
    const emotion = (insight && insight.emotionProfile && insight.emotionProfile.primaryEmotion) || { name: 'neutral', score: 0 };
    const synthesis = insight.synthesisProfile || {};
    const pivotalConcept = (insight.semanticMap && (insight.semanticMap.pivotalConcept || null)) || null;

    if (emotion.score >= 0.6) {
      arc.push({ intent: 'grounding', source: 'emotion' });
      arc.push({ intent: 'empathy', target: emotion.name, source: 'emotion' });
    } else if (emotion.score >= 0.35) {
      arc.push({ intent: 'validation', target: pivotalConcept, source: 'concept' });
      arc.push({ intent: 'empathy', target: emotion.name, source: 'emotion' });
    } else {
      arc.push({ intent: 'validation', target: pivotalConcept, source: 'concept' });
    }

    const topHypothesis = (synthesis.cognitiveHypotheses && synthesis.cognitiveHypotheses[0]) || null;
    if (topHypothesis && topHypothesis.confidence > 0.75) {
      arc.push({ intent: 'insight_delivery', data: topHypothesis, source: 'synthesis' });
    } else if (insight.emotionProfile && insight.emotionProfile.dissonance && insight.emotionProfile.dissonance.dissonanceScore > 0.5) {
      arc.push({ intent: 'probe_dissonance', data: insight.emotionProfile.dissonance.flags, source: 'emotion' });
    } else if (synthesis.coreConflict) {
      arc.push({ intent: 'probe_conflict', data: synthesis.coreConflict, source: 'synthesis' });
    } else {
      arc.push({ intent: 'open_question', source: 'default' });
    }

    if (emotion.name === 'sadness' && emotion.score > 0.55) {
      arc.push({ intent: 'hope_injection', source: 'emotion' });
    } else if (emotion.name === 'anxiety' && emotion.score > 0.55) {
      arc.push({ intent: 'grounding', source: 'emotion' });
    } else if (emotion.name === 'anger' && emotion.score > 0.55) {
      arc.unshift({ intent: 'safety_check', source: 'emotion' });
    }

    const therapeuticPlan = (synthesis && synthesis.therapeuticPlan) || null;
    if (therapeuticPlan && Array.isArray(therapeuticPlan.immediate) && therapeuticPlan.immediate.length > 0) {
      arc.push({ intent: 'action_proposal_immediate', data: therapeuticPlan.immediate[0], source: 'synthesis' });
    } else if (therapeuticPlan && Array.isArray(therapeuticPlan.microInterventions) && therapeuticPlan.microInterventions.length > 0) {
      arc.push({ intent: 'action_proposal_micro', data: therapeuticPlan.microInterventions[0], source: 'synthesis' });
    } else {
      arc.push({ intent: 'open_question', source: 'default' });
    }

    return arc;
  }

  _calculateConceptualOverlap(conceptList = [], protocolKeywords = []) { /* ... (لا تغيير) ... */ }

  /**
   * [BILINGUAL MATCHING v1.8]
   * Matches protocols by comparing their Arabic keywords against the original
   * Arabic source tokens that triggered the English concepts.
   */
  _matchProtocols(insight) {
    const scores = new Map();
    
    // --- [الإصلاح] ---
    // 1. استخلاص المفاهيم الإنجليزية كدليل.
    const concepts = Object.keys(insight?.semanticMap?.conceptInsights || {});
    // 2. استخلاص الكلمات العربية الأصلية التي أدت لهذه المفاهيم.
    const sourceTokens = new Set(Object.values(insight?.semanticMap?.conceptInsights || {}).flatMap(i => i.sourceTokens));

    if (this.debug) console.log(`[Catharsis] Matching with evidence: Concepts:[${concepts.join(', ')}] and SourceTokens:[${[...sourceTokens].join(', ')}]`);

    for (const [tag, protocol] of Object.entries(this.protocols || {})) {
        let score = 0;
        const keywords = protocol.nlu?.keywords?.map(k => k.word) || [];

        // 3. مقارنة الكلمات العربية في البروتوكول مع الكلمات العربية المصدر.
        const intersection = keywords.filter(kw => sourceTokens.has(kw));
        
        if (intersection.length > 0) {
            score = intersection.length * 2.0; // نعطي أعلى وزن للتطابق المباشر
            if (this.debug) console.log(`  - Protocol '${tag}' got +${score} score for direct keyword match: [${intersection.join(', ')}]`);
        }
        
        // 4. (اختياري) يمكن إضافة منطق إضافي هنا للمطابقة مع المفاهيم الإنجليزية كشبكة أمان
        
        if (score > 0) {
            scores.set(tag, score);
        }
    }
    
    if (this.debug && scores.size > 0) {
        console.log('[Catharsis] Protocol Match Scores:', Object.fromEntries(scores));
    }

    return getTopN(Object.fromEntries(scores), 2).map(it => it.key);
  }

  _selectGem(intent, matchedProtocols) { /* ... (لا تغيير) ... */ }
  _blendDNA(affectVector = {}) { /* ... (لا تغيير) ... */ }
  _evaluateEmotionalCoherence(generatedText = '', affectVector = {}, arc = []) { /* ... (لا تغيير) ... */ }
  _applyEchoClosure(text, dnaMeta = {}) { /* ... (لا تغيير) ... */ }

  async generateResponse(comprehensiveInsight = {}) {
    const insight = comprehensiveInsight || {};
    if (this.debug) {
      console.log("\n--- [CatharsisEngine] Received Comprehensive Insight ---");
      console.log("Primary Emotion:", insight.emotionProfile?.primaryEmotion);
      console.log("Pivotal Concept:", insight.semanticMap?.pivotalConcept);
      console.log("All Concepts:", insight.semanticMap?.allConcepts); //  لمعرفة كل المفاهيم
      console.log("Dominant Pattern:", insight.synthesisProfile?.dominantPattern?.pattern_id);
      console.log("Core Conflict:", insight.synthesisProfile?.coreConflict?.tension_id);
    }
    
    const responseArc = this._designResponseArc(insight);
    if (this.debug) console.log("\n[Catharsis] Step 1: Designed Response Arc:", responseArc.map(a => a.intent));

    const matchedProtocols = this._matchProtocols(insight);
    if (this.debug) console.log("[Catharsis] Step 2: Matched Protocols:", matchedProtocols);

    const assembledGems = responseArc.map(step => this._selectGem(step, matchedProtocols));
    if (this.debug) console.log("[Catharsis] Step 3: Assembled Raw Gems:", assembledGems.map(g => `(${g.source}) -> "${g.gem}"`));

    const rawGems = assembledGems.map(g => g.gem);
    const affectVector = insight.emotionProfile?.affectVector || {};
    const dnaBlend = this._blendDNA(affectVector);
    if (this.debug) console.log("[Catharsis] Step 4: Determined DNA Blend:", dnaBlend);

    const context = {
      username: (this.memory && this.memory.getUserProfile && this.memory.getUserProfile()?.name) || null,
      primaryEmotion: (insight.emotionProfile && insight.emotionProfile.primaryEmotion && insight.emotionProfile.primaryEmotion.name) || null,
      primaryConcept: (insight.semanticMap && insight.semanticMap.pivotalConcept) || null,
      arc: responseArc
    };

    let finalResponse = { text: '', meta: {} };
    try {
      finalResponse = await this.generativeOrchestrator.render(rawGems, { dnaStyle: dnaBlend, context });
    } catch (e) {
      finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend, error: 'Render failed, used fallback join.' } };
    }
    if (this.debug) console.log(`[Catharsis] Step 5: Initial Rendered Text: "${finalResponse.text}"`);

    const qualityScore = this._evaluateEmotionalCoherence(finalResponse.text, affectVector, responseArc);
    if (this.debug) console.log(`[Catharsis] Step 6: Emotional Quality Score: ${qualityScore}`);

    if (qualityScore < this.MIN_EMOTIONAL_INTEGRITY) {
      if (this.debug) console.log(`  - Quality score is low. Attempting regeneration with a more neutral DNA.`);
      const fallbackBlend = (typeof dnaBlend === 'object' && dnaBlend.style) ? { style: 'dynamic' } : 'dynamic';
      try {
        const regen = await this.generativeOrchestrator.render(rawGems, { dnaStyle: fallbackBlend, context });
        const regenQuality = this._evaluateEmotionalCoherence(regen.text, affectVector, responseArc);
        if (regenQuality >= qualityScore) {
          finalResponse = regen;
          if (this.debug) console.log(`  - Regeneration successful. New text: "${regen.text}"`);
        }
      } catch (e) { /* ignore regen failure */ }
    }

    const finalTextWithEcho = this._applyEchoClosure(finalResponse.text, finalResponse.meta && (finalResponse.meta.dna || finalResponse.meta));
    const out = {
      responseText: finalTextWithEcho,
      _meta: {
        arc: responseArc,
        matchedProtocols,
        assembledGems,
        dnaUsed: finalResponse.meta && finalResponse.meta.dna ? finalResponse.meta.dna : dnaBlend,
        qualityScore: Number(qualityScore.toFixed(3))
      }
    };
    
    if (this.debug) console.log(`\n[Catharsis] Step 7: Final Response Payload Ready:`, out);

    try {
        if (this.memory && typeof this.memory.recordInteraction === 'function') {
            this.memory.recordInteraction({
                user: (insight.rawText || (insight.semanticMap && insight.semanticMap.rawText)) || '',
                ai: finalTextWithEcho,
                insightSummary: {
                  primaryEmotion: insight.emotionProfile && insight.emotionProfile.primaryEmotion,
                  primaryConcept: insight.semanticMap && insight.semanticMap.pivotalConcept,
                  topHypothesis: (insight.synthesisProfile && insight.synthesisProfile.cognitiveHypotheses && insight.synthesisProfile.cognitiveHypotheses[0]) || null
                },
                timestamp: Date.now()
            });
        }
    } catch (e) { /* memory record failure is non-fatal */ }

    return out;
  }
}

export default CatharsisEngine;
