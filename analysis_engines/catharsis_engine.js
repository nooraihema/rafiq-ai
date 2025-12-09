
// /analysis_engines/catharsis_engine.js
// CatharsisEngine v1.9 - Protocol-tolerant & Verbose Logs (Modified)
// Final Fix for Protocol Matching & Gem Selection
// This version implements a robust, bilingual matching strategy and ensures the
// gem selection process is crash-proof. Added tolerant intent-key resolution
// and verbose logging for debugging protocol loading/matching issues.

import { sample, getTopN } from '../core/utils.js';

export class CatharsisEngine {
  constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
    if (!dictionaries.GENERATIVE_ENGINE || !dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator) {
      throw new Error("CatharsisEngine v1.9 requires dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator.");
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
   * Generate candidate keys for an intent so protocol keys with different
   * naming conventions can be matched.
   * Returns array of lowercase candidate strings.
   */
  _intentCandidates(intent) {
    if (!intent) return [];

    const base = (typeof intent === 'string') ? intent.toLowerCase() : (intent.intent ? String(intent.intent).toLowerCase() : '');
    const candidates = new Set();

    // always include raw
    if (base) candidates.add(base);

    // common synonyms and protocol-specific aliases
    const synonymMap = {
      grounding: ['grounding', 'normalization', 'ground', 'ground_bank', 'grounding_bank'],
      hope_injection: ['hope_injection', 'hope', 'hope_bank', 'hope_inject', 'injection'],
      empathy: ['empathy', 'empath', 'compassion', 'validation_empathy'],
      validation: ['validation', 'validate', 'acknowledgement', 'ack'],
      open_question: ['open_question', 'open_q', 'question', 'prompt', 'action_prompt'],
      action_proposal_immediate: ['action_proposal_immediate', 'action_proposal', 'action', 'action_prompt', 'immediate_action', 'action_proposal_micro'],
      action_proposal_micro: ['action_proposal_micro', 'micro_action', 'micro_intervention'],
      insight_delivery: ['insight_delivery', 'insight', 'insight_bank', 'reframe'],
      probe_dissonance: ['probe_dissonance', 'probe', 'probe_hidden', 'dissonance_probe'],
      probe_conflict: ['probe_conflict', 'conflict_probe'],
      grounding_ex: ['grounding_ex', 'grounding_exercise', 'breathing', 'deep_breathing'],
      safety_check: ['safety_check', 'safety'],
      encouragement: ['encouragement', 'encourage', 'support'],
      invitation: ['invitation', 'invite', 'inv'],
      validation_short: ['validation_short']
    };

    // add mapped synonyms
    for (const [k, arr] of Object.entries(synonymMap)) {
      if (k === base || arr.includes(base)) {
        arr.forEach(x => candidates.add(x));
        // also add base name itself (k) if not present
        candidates.add(k);
      }
    }

    // also add probable simple variations
    if (base.includes('action')) {
      ['action_prompt', 'action', 'action_proposal', 'action_proposal_immediate'].forEach(x => candidates.add(x));
    }
    if (base.includes('question') || base.includes('prompt')) {
      ['open_question', 'question', 'prompt', 'action_prompt'].forEach(x => candidates.add(x));
    }
    if (base.includes('hope')) {
      ['hope_injection', 'hope', 'injection'].forEach(x => candidates.add(x));
    }
    if (base.includes('normalize') || base.includes('ground')) {
      ['normalization', 'grounding', 'ground'].forEach(x => candidates.add(x));
    }

    // always include original token again, and common protocol keys
    ['empathy','normalization','action_prompt','invitation','validation','insight','encouragement','gratitude','reframe','validation','kindness','validation_short'].forEach(x => candidates.add(x));

    // return array normalized
    return Array.from(candidates).filter(Boolean).map(s => String(s).toLowerCase());
  }

  /**
   * Helper: try to find a gem inside a bank by flexible candidate matching.
   * - bank: object of arrays
   * - candidates: array of candidate keys (lowercase)
   * Returns found gem or null.
   */
  _findGemInBank(bank = {}, candidates = [], roomName = '', protocolTag = '') {
    if (!bank || typeof bank !== 'object') return null;

    // first try exact matches on candidate keys
    for (const cand of candidates) {
      if (Object.prototype.hasOwnProperty.call(bank, cand) && Array.isArray(bank[cand]) && bank[cand].length) {
        if (this.debug) console.log(`      [findGem] Exact match for '${cand}' in room '${roomName}' of protocol '${protocolTag}'`);
        return sample(bank[cand]);
      }
    }

    // next try case-insensitive property matching and substring matching
    const bankKeys = Object.keys(bank || {});
    for (const key of bankKeys) {
      const keyLower = String(key).toLowerCase();
      for (const cand of candidates) {
        // if bank key contains candidate or vice versa
        if (keyLower === cand || keyLower.includes(cand) || cand.includes(keyLower)) {
          const arr = bank[key];
          if (Array.isArray(arr) && arr.length) {
            if (this.debug) console.log(`      [findGem] Substring match: bankKey='${key}' matched candidate='${cand}' in room '${roomName}' protocol '${protocolTag}'`);
            return sample(arr);
          }
        }
      }
    }

    // no gem found
    return null;
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

    if (this.debug) console.log(`  [designArc] Built arc intents: ${arc.map(a => a.intent).join(' -> ')}`);
    return arc;
  }

  /**
   * [FINAL FIX] Matches protocols using all available evidence.
   */
  _matchProtocols(insight) {
    const scores = new Map();
    
    const concepts = Object.keys(insight?.semanticMap?.conceptInsights || {});
    const sourceTokens = [...new Set(Object.values(insight?.semanticMap?.conceptInsights || {}).flatMap(i => i.sourceTokens || []))];
    const allEvidence = [...new Set([...concepts.map(c => String(c)), ...sourceTokens.map(s => String(s))])];

    if (this.debug) console.log(`[Catharsis] Matching with All Evidence:`, allEvidence);

    for (const [tag, protocol] of Object.entries(this.protocols || {})) {
        let score = 0;
        const keywords = (protocol.nlu?.keywords?.map(k => k.word) || []).map(w => String(w));
        const lowerKeywords = keywords.map(k => k.toLowerCase());

        // direct intersection on normalized evidence (case-insensitive)
        const intersection = lowerKeywords.filter(kw => allEvidence.some(ev => String(ev).toLowerCase() === kw));
        
        if (intersection.length > 0) {
            score = intersection.length * 2.0;
            if (this.debug) console.log(`  - Protocol '${tag}' got +${score} score for direct match on: [${intersection.join(', ')}]`);
        } else {
          // fuzzy match: check if any keyword is substring of any evidence or vice versa
          for (const kw of lowerKeywords) {
            for (const ev of allEvidence) {
              const evL = String(ev).toLowerCase();
              if (evL.includes(kw) || kw.includes(evL)) {
                score += 1.0;
                if (this.debug) console.log(`  - Protocol '${tag}' fuzzy match +1 for keyword='${kw}' vs evidence='${evL}'`);
              }
            }
          }
        }
        
        if (score > 0) {
            scores.set(tag, score);
        }
    }
    
    if (this.debug && scores.size > 0) {
        console.log('[Catharsis] Protocol Match Scores:', Object.fromEntries(scores));
    } else if (this.debug) {
        console.log('[Catharsis] No protocol scored above 0 with current evidence.');
    }

    return getTopN(Object.fromEntries(scores), 2).map(it => it.key);
  }

  /**
   * [FINAL FIX] Selects a gem, ensuring it never crashes.
   * Now tolerant to multiple naming conventions inside protocol rooms.
   */
  _selectGem(intent, matchedProtocols) {
    const intentName = (intent && (intent.intent || intent)) || intent;
    if (this.debug) console.log(`[Catharsis] Selecting gem for intent: '${intentName}'`);
    
    const fallbackGems = ["أنا سامعك وبقلب معك.", "ده شيء صعب، وشجاعتك في قول ده واضحة.", "خليني معاك خطوة خطوة."];
    let selection = { gem: sample(fallbackGems), source: 'fallback' };

    const candidates = this._intentCandidates(intentName);
    if (this.debug) console.log(`  [selectGem] Intent candidates: ${JSON.stringify(candidates)}`);

    for (const protocolTag of matchedProtocols) {
      const protocol = this.protocols[protocolTag];
      if (!protocol) {
        if (this.debug) console.log(`  [selectGem] Protocol '${protocolTag}' not found (maybe unloaded).`);
        continue;
      }
      if (this.debug) console.log(`  - Searching in protocol: '${protocolTag}'`);

      for (const roomName in (protocol.conversation_rooms || {})) {
        const room = protocol.conversation_rooms[roomName];
        if (this.debug) console.log(`    > Inspecting room: '${roomName}' (purpose='${room && room.purpose ? room.purpose : 'n/a'}')`);

        // gather potential banks: dynamic_gems_logic.gems_bank, gems_bank, default_gems_bank
        const banksToCheck = [];
        if (room.dynamic_gems_logic && room.dynamic_gems_logic.gems_bank) banksToCheck.push(room.dynamic_gems_logic.gems_bank);
        if (room.gems_bank) banksToCheck.push(room.gems_bank);
        if (room.dynamic_gems_logic && room.dynamic_gems_logic.default_gems_bank) banksToCheck.push(room.dynamic_gems_logic.default_gems_bank);
        if (room.default_gems_bank) banksToCheck.push(room.default_gems_bank);

        // iterate banks and attempt to find a gem using flexible matching
        for (const bank of banksToCheck) {
          try {
            const found = this._findGemInBank(bank, candidates, roomName, protocolTag);
            if (found) {
              selection = { gem: found, source: `${protocolTag}/${room.purpose || roomName}` };
              if (this.debug) console.log(`    > Found gem in bank '${roomName}': "${found}" (source=${selection.source})`);
              return selection;
            } else {
              if (this.debug) console.log(`    > No match in this bank for candidates.`);
            }
          } catch (e) {
            if (this.debug) console.error(`    ! Error while searching bank in room '${roomName}' of protocol '${protocolTag}':`, e);
          }
        }
      }
    }

    if (this.debug) console.log(`  - No specific gem found. Using fallback: "${selection.gem}"`);
    return selection;
  }

  _blendDNA(affectVector = {}) {
    if (this.generativeOrchestrator && typeof this.generativeOrchestrator.mixDNA === 'function') {
      try {
        return this.generativeOrchestrator.mixDNA(affectVector);
      } catch (e) { 
        if (this.debug) console.warn('[blendDNA] mixDNA threw an error, falling back.', e);
      }
    }
    const styles = [];
    if ((affectVector.sadness || 0) > 0.5) styles.push('poetic');
    if ((affectVector.anxiety || 0) > 0.5) styles.push('grounded');
    if ((affectVector.joy || 0) > 0.5) styles.push('tender');
    if (styles.length === 0) styles.push(this.DNA_BLEND_DEFAULT);
    return { style: styles.join('+'), meta: { blendedFrom: styles } };
  }

  _evaluateEmotionalCoherence(generatedText = '', affectVector = {}, arc = []) {
    if (this.generativeOrchestrator && typeof this.generativeOrchestrator.evaluateEmotionCoherence === 'function') {
      try {
        return this.generativeOrchestrator.evaluateEmotionCoherence(generatedText, affectVector);
      } catch (e) { 
        if (this.debug) console.warn('[evaluateEmotionalCoherence] orchestrator threw, using heuristic.', e);
      }
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

  _applyEchoClosure(text, dnaMeta = {}) {
    const style = (dnaMeta && (dnaMeta.style || dnaMeta)) || this.DNA_BLEND_DEFAULT;
    const echoes = {
      poetic: "\nأحيانًا يكفي أن نستمع لنبض داخلك بصمت.",
      grounded: "\nخذ نفسًا عميقًا الآن — أنت على الطريق الصحيح خطوة بخطوة.",
      tender: "\nأنت لست وحدكِ/وحيدًا؛ هذا الشعور يُرى ويُقدّر.",
      'dynamic': "\nلو حابب، أحب أسمع منك المزيد."
    };
    for (const key of Object.keys(echoes)) {
      if (typeof style === 'string' && style.includes(key)) {
        return text + echoes[key];
      }
    }
    return text + "\nأنا هنا إذا أحببت أن تكمل الحديث.";
  }

  async generateResponse(comprehensiveInsight = {}) {
    const insight = comprehensiveInsight || {};
    if (this.debug) {
      console.log("\n--- [CatharsisEngine] Received Comprehensive Insight ---");
      console.log("Primary Emotion:", insight.emotionProfile?.primaryEmotion);
      console.log("Pivotal Concept:", insight.semanticMap?.pivotalConcept);
      console.log("All Concepts:", insight.semanticMap?.allConcepts);
      console.log("Dominant Pattern:", insight.synthesisProfile?.dominantPattern?.pattern_id);
      console.log("Core Conflict:", insight.synthesisProfile?.coreConflict?.tension_id);
    }
    
    const responseArc = this._designResponseArc(insight);
    if (this.debug) console.log("\n[Catharsis] Step 1: Designed Response Arc:", responseArc.map(a => a.intent));

    const matchedProtocols = this._matchProtocols(insight);
    if (this.debug) console.log("[Catharsis] Step 2: Matched Protocols:", matchedProtocols);

    const assembledGems = responseArc.map(step => {
      try {
        return this._selectGem(step, matchedProtocols);
      } catch (e) {
        if (this.debug) console.error('[Catharsis] _selectGem threw for step:', step, e);
        return { gem: sample(["أنا سامعك وبقلب معك."]), source: 'fallback_error' };
      }
    });
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
      if (this.debug) console.log("[Catharsis] Rendering via GenerativeOrchestrator with rawGems:", rawGems);
      finalResponse = await this.generativeOrchestrator.render(rawGems, { dnaStyle: dnaBlend, context });
    } catch (e) {
      if (this.debug) console.error("[Catharsis] Generative render failed, falling back to raw join.", e);
      finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend, error: 'Render failed, used fallback join.' } };
    }
    if (this.debug) console.log(`[Catharsis] Step 5: Initial Rendered Text: "${finalResponse.text}"`);

    const qualityScore = this._evaluateEmotionalCoherence(finalResponse.text, affectVector, responseArc);
    if (this.debug) console.log(`[Catharsis] Step 6: Emotional Quality Score: ${qualityScore}`);

    if (qualityScore < this.MIN_EMOTIONAL_INTEGRITY) {
      if (this.debug) console.log(`  - Quality score is low (${qualityScore}). Attempting regeneration with a more neutral DNA.`);
      const fallbackBlend = (typeof dnaBlend === 'object' && dnaBlend.style) ? { style: 'dynamic' } : 'dynamic';
      try {
        const regen = await this.generativeOrchestrator.render(rawGems, { dnaStyle: fallbackBlend, context });
        const regenQuality = this._evaluateEmotionalCoherence(regen.text, affectVector, responseArc);
        if (this.debug) console.log(`  - Regeneration quality: ${regenQuality} (vs ${qualityScore})`);
        if (regenQuality >= qualityScore) {
          finalResponse = regen;
          if (this.debug) console.log(`  - Regeneration successful. New text: "${regen.text}"`);
        } else {
          if (this.debug) console.log('  - Regeneration did not improve quality; keeping original render.');
        }
      } catch (e) { 
        if (this.debug) console.error('[Catharsis] Regeneration attempt failed.', e);
      }
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
            if (this.debug) console.log('[Catharsis] Interaction recorded to memory.');
        }
    } catch (e) { 
        if (this.debug) console.error('[Catharsis] Memory.recordInteraction failed (non-fatal).', e);
    }

    return out;
  }
}

export default CatharsisEngine;
