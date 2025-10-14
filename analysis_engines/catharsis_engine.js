// /analysis_engines/catharsis_engine.js
// CatharsisEngine v1.6 - Flexible Memory Injection Update
// This version adjusts the constructor to allow for late injection of the memory system,
// aligning with the singleton pattern used in the API layer.

import { sample, getTopN } from '../core/utils.js';

export class CatharsisEngine {
  constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
    if (!dictionaries.GENERATIVE_ENGINE || !dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator) {
      throw new Error("CatharsisEngine v1.6 requires dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator.");
    }

    // --- [تصحيح] ---
    // We remove the strict `!memorySystem` check to allow the LinguisticBrain
    // to initialize this engine with a null memory, which will be injected later
    // at the request level. The `!protocols` check is also relaxed for the same reason.
    
    const GenerativeOrchestratorClass = dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator;
    this.generativeOrchestrator = new GenerativeOrchestratorClass({
      dnaLibrary: dictionaries.GENERATIVE_ENGINE.EMOTIONAL_DNA || {},
      lexicalPools: dictionaries.GENERATIVE_ENGINE.LEXICAL_POOLS || {},
      memory: memorySystem // It's okay if memorySystem is initially null
    });

    this.protocols = protocols;
    this.memory = memorySystem;

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

    // Opening: connection always, adapt style
    if (emotion.score >= 0.6) {
      arc.push({ intent: 'grounding', source: 'emotion' });
      arc.push({ intent: 'empathy', target: emotion.name, source: 'emotion' });
    } else if (emotion.score >= 0.35) {
      arc.push({ intent: 'validation', target: pivotalConcept, source: 'concept' });
      arc.push({ intent: 'empathy', target: emotion.name, source: 'emotion' });
    } else {
      arc.push({ intent: 'validation', target: pivotalConcept, source: 'concept' });
    }

    // Middle: insight / probe / conflict
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

    // Optionally inject hope or grounding based on emotion type
    if (emotion.name === 'sadness' && emotion.score > 0.55) {
      arc.push({ intent: 'hope_injection', source: 'emotion' });
    } else if (emotion.name === 'anxiety' && emotion.score > 0.55) {
      arc.push({ intent: 'grounding', source: 'emotion' });
    } else if (emotion.name === 'anger' && emotion.score > 0.55) {
      arc.unshift({ intent: 'safety_check', source: 'emotion' });
    }

    // Closing: actionable micro-step if present
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

  /**
   * Calculate conceptual overlap score between semantic concepts and protocol keywords.
   */
  _calculateConceptualOverlap(conceptList = [], protocolKeywords = []) {
    if (!conceptList || !protocolKeywords || !protocolKeywords.length) return 0;
    const conceptSet = new Set(conceptList);
    const normalizedKeywords = protocolKeywords.map(k => (typeof k === 'string' ? k : k.word));
    let score = 0;
    for (const kw of normalizedKeywords) {
      if (conceptSet.has(kw)) score += 1;
    }
    return Math.min(1, score / Math.max(1, normalizedKeywords.length));
  }

  /**
   * Improved protocol matching: uses keyword match + conceptual overlap + weights.
   */
  _matchProtocols(insight) {
    const scores = new Map();
    const concepts = Object.keys((insight.semanticMap && insight.semanticMap.conceptInsights) || {});

    for (const [tag, protocol] of Object.entries(this.protocols || {})) {
      const keywords = (protocol.nlu && protocol.nlu.keywords) ? protocol.nlu.keywords : [];
      const keywordWords = keywords.map(k => (typeof k === 'string' ? k : k.word));
      const intersection = concepts.filter(c => keywordWords.includes(c));
      let score = 0;
      if (intersection.length > 0) {
        score += intersection.reduce((acc, w) => {
          const kd = keywords.find(k => (typeof k === 'string' ? k : k.word) === w);
          return acc + (kd && kd.weight ? kd.weight : 0.5);
        }, 0);
      }
      const conceptualOverlap = this._calculateConceptualOverlap(concepts, keywords);
      score += conceptualOverlap * 1.2;
      if (protocol.targetEmotions && insight.emotionProfile && insight.emotionProfile.primaryEmotion) {
        const primaryName = insight.emotionProfile.primaryEmotion.name;
        if (protocol.targetEmotions.includes(primaryName)) score += 0.6;
      }
      if (score > 0) scores.set(tag, score);
    }

    return getTopN(Object.fromEntries(scores), 2).map(it => it.key);
  }

  /**
   * Select gem from matched protocols, but prefer dynamic logic and adaptive fallbacks.
   */
  _selectGem(intent, matchedProtocols) {
    for (const protocolTag of matchedProtocols) {
      const protocol = this.protocols[protocolTag];
      if (!protocol) continue;

      for (const room of Object.values(protocol.conversation_rooms || {})) {
        if (room.dynamic_gems_logic && room.dynamic_gems_logic.gems_bank) {
          const bank = room.dynamic_gems_logic.gems_bank;
          const key = intent.intent || intent;
          if (bank[key] && bank[key].length) {
            return { gem: sample(bank[key]), source: `${protocolTag}/${room.purpose}` };
          }
        }
        const bank = room.gems_bank || {};
        const key = intent.intent || intent;
        if (bank[key] && bank[key].length) {
          return { gem: sample(bank[key]), source: `${protocolTag}/${room.purpose}` };
        }
      }
    }
    const fallbackGems = [ "أنا سامعك وبقلب معك.", "ده شيء صعب، وشجاعتك في قول ده واضحة.", "خليني معاك خطوة خطوة."];
    return { gem: sample(fallbackGems), source: 'fallback' };
  }

  /**
   * Blend DNA dynamically.
   */
  _blendDNA(affectVector = {}) {
    if (this.generativeOrchestrator && typeof this.generativeOrchestrator.mixDNA === 'function') {
      try {
        return this.generativeOrchestrator.mixDNA(affectVector);
      } catch (e) { /* fall through */ }
    }
    const styles = [];
    if ((affectVector.sadness || 0) > 0.5) styles.push('poetic');
    if ((affectVector.anxiety || 0) > 0.5) styles.push('grounded');
    if ((affectVector.joy || 0) > 0.5) styles.push('tender');
    if (styles.length === 0) styles.push(this.DNA_BLEND_DEFAULT);
    return { style: styles.join('+'), meta: { blendedFrom: styles } };
  }

  /**
   * Emotional quality check.
   */
  _evaluateEmotionalCoherence(generatedText = '', affectVector = {}, arc = []) {
    if (this.generativeOrchestrator && typeof this.generativeOrchestrator.evaluateEmotionCoherence === 'function') {
      try {
        return this.generativeOrchestrator.evaluateEmotionCoherence(generatedText, affectVector);
      } catch (e) { /* fallback */ }
    }

    const aggregateIntentSignature = {};
    for (const step of arc) {
      const sig = this.INTENT_EMOTION_SIGNATURES[step.intent] || {};
      for (const [k, v] of Object.entries(sig)) {
        aggregateIntentSignature[k] = (aggregateIntentSignature[k] || 0) + v;
      }
    }
    const keys = Array.from(new Set([...Object.keys(aggregateIntentSignature), ...Object.keys(affectVector)]));
    let dot = 0, magA = 0, magB = 0;
    for (const k of keys) {
      const a = aggregateIntentSignature[k] || 0;
      const b = affectVector[k] || 0;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    }
    if (magA === 0 || magB === 0) return 0.5;
    const sim = dot / (Math.sqrt(magA) * Math.sqrt(magB));
    const score = Math.min(0.95, Math.max(0.2, sim));
    return Number(score.toFixed(3));
  }

  /**
   * Append an "echo" closure line.
   */
  _applyEchoClosure(text, dnaMeta = {}) {
    const style = (dnaMeta && (dnaMeta.style || dnaMeta)) || this.DNA_BLEND_DEFAULT;
    const echoes = {
      poetic: "\nأحيانًا يكفي أن نستمع لنبض داخلك بصمت.",
      grounded: "\nخذ نفسًا عميقًا الآن — أنت على الطريق الصحيح خطوة بخطوة.",
      tender: "\nأنت لست وحدكِ/وحيدًا؛ هذا الشعور يُرى ويُقدّر.",
      'dynamic': "\nلو حابب، أحب أسمع منك المزيد."
    };
    for (const key of Object.keys(echoes)) {
      if (style.includes(key)) {
        return text + echoes[key];
      }
    }
    return text + "\nأنا هنا إذا أحببت أن تكمل الحديث.";
  }

  /**
   * Main function to generate a response.
   */
  async generateResponse(comprehensiveInsight = {}) {
    const insight = comprehensiveInsight || {};
    const responseArc = this._designResponseArc(insight);
    const matchedProtocols = this._matchProtocols(insight);
    const assembledGems = responseArc.map(step => {
      const selection = this._selectGem(step, matchedProtocols);
      return { gem: selection.gem, meta: { source: selection.source, intent: step.intent } };
    });
    const rawGems = assembledGems.map(g => g.gem);
    const affectVector = (insight.emotionProfile && insight.emotionProfile.affectVector) || {};
    const dnaBlend = this._blendDNA(affectVector);

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
      finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend } };
    }

    const qualityScore = this._evaluateEmotionalCoherence(finalResponse.text, affectVector, responseArc);

    if (qualityScore < this.MIN_EMOTIONAL_INTEGRITY) {
      const fallbackBlend = (typeof dnaBlend === 'object' && dnaBlend.style) ? { style: 'dynamic' } : 'dynamic';
      try {
        const regen = await this.generativeOrchestrator.render(rawGems, { dnaStyle: fallbackBlend, context });
        const regenQuality = this._evaluateEmotionalCoherence(regen.text, affectVector, responseArc);
        if (regenQuality >= qualityScore) {
          finalResponse = regen;
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
