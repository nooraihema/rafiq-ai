
// /analysis_engines/catharsis_engine.js
// CatharsisEngine v1.10 - Enhanced Logging & Organized
// Handles response generation, protocol matching, gem selection, and emotional coherence evaluation

import { sample, getTopN } from '../core/utils.js';

export class CatharsisEngine {
  constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
    if (!dictionaries.GENERATIVE_ENGINE || !dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator) {
      throw new Error("CatharsisEngine v1.10 requires dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator.");
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

    if (this.debug) console.log(`[CatharsisEngine] Initialized at ${new Date().toISOString()}`);
  }

  // ---------------------------
  // Intent Candidate Resolution
  // ---------------------------
  _intentCandidates(intent) {
    if (!intent) return [];
    const base = (typeof intent === 'string') ? intent.toLowerCase() : (intent.intent ? String(intent.intent).toLowerCase() : '');
    const candidates = new Set();
    if (base) candidates.add(base);

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

    for (const [k, arr] of Object.entries(synonymMap)) {
      if (k === base || arr.includes(base)) arr.forEach(x => candidates.add(x));
    }

    // broad matching for common terms
    if (base.includes('action')) ['action_prompt','action','action_proposal','action_proposal_immediate'].forEach(x=>candidates.add(x));
    if (base.includes('question') || base.includes('prompt')) ['open_question','question','prompt','action_prompt'].forEach(x=>candidates.add(x));
    if (base.includes('hope')) ['hope_injection','hope','injection'].forEach(x=>candidates.add(x));
    if (base.includes('normalize') || base.includes('ground')) ['normalization','grounding','ground'].forEach(x=>candidates.add(x));

    ['empathy','normalization','action_prompt','invitation','validation','insight','encouragement','gratitude','reframe','validation','kindness','validation_short'].forEach(x=>candidates.add(x));

    const result = Array.from(candidates).filter(Boolean).map(s=>String(s).toLowerCase());
    if (this.debug) console.log(`[IntentCandidates] Base='${base}' => Candidates:`, result);
    return result;
  }

  // ---------------------------
  // Gem Selection from Bank
  // ---------------------------
  _findGemInBank(bank = {}, candidates = [], roomName = '', protocolTag = '') {
    if (!bank || typeof bank !== 'object') return null;

    for (const cand of candidates) {
      if (bank[cand] && Array.isArray(bank[cand]) && bank[cand].length) {
        if (this.debug) console.log(`[findGem] Exact match for '${cand}' in room '${roomName}' of protocol '${protocolTag}'`);
        return sample(bank[cand]);
      }
    }

    // substring/fuzzy match
    for (const key of Object.keys(bank)) {
      for (const cand of candidates) {
        if (String(key).toLowerCase().includes(cand) || cand.includes(String(key).toLowerCase())) {
          if (Array.isArray(bank[key]) && bank[key].length) {
            if (this.debug) console.log(`[findGem] Fuzzy match: bankKey='${key}' matched candidate='${cand}'`);
            return sample(bank[key]);
          }
        }
      }
    }

    return null;
  }

  // ---------------------------
  // Design Response Arc
  // ---------------------------
  _designResponseArc(insight) {
    const arc = [];
    const emotion = (insight?.emotionProfile?.primaryEmotion) || { name: 'neutral', score: 0 };
    const synthesis = insight?.synthesisProfile || {};
    const pivotalConcept = insight?.semanticMap?.pivotalConcept || null;

    // Stage-based intent selection
    if (emotion.score >= 0.6) {
      arc.push({ intent: 'grounding', source: 'emotion' });
      arc.push({ intent: 'empathy', target: emotion.name, source: 'emotion' });
    } else if (emotion.score >= 0.35) {
      arc.push({ intent: 'validation', target: pivotalConcept, source: 'concept' });
      arc.push({ intent: 'empathy', target: emotion.name, source: 'emotion' });
    } else {
      arc.push({ intent: 'validation', target: pivotalConcept, source: 'concept' });
    }

    const topHypothesis = synthesis?.cognitiveHypotheses?.[0] || null;
    if (topHypothesis?.confidence > 0.75) arc.push({ intent: 'insight_delivery', data: topHypothesis, source: 'synthesis' });
    else if (insight?.emotionProfile?.dissonance?.dissonanceScore > 0.5) arc.push({ intent: 'probe_dissonance', data: insight.emotionProfile.dissonance.flags, source: 'emotion' });
    else if (synthesis?.coreConflict) arc.push({ intent: 'probe_conflict', data: synthesis.coreConflict, source: 'synthesis' });
    else arc.push({ intent: 'open_question', source: 'default' });

    if (emotion.name === 'sadness' && emotion.score > 0.55) arc.push({ intent: 'hope_injection', source: 'emotion' });
    else if (emotion.name === 'anxiety' && emotion.score > 0.55) arc.push({ intent: 'grounding', source: 'emotion' });
    else if (emotion.name === 'anger' && emotion.score > 0.55) arc.unshift({ intent: 'safety_check', source: 'emotion' });

    if (synthesis?.therapeuticPlan?.immediate?.length > 0) arc.push({ intent: 'action_proposal_immediate', data: synthesis.therapeuticPlan.immediate[0], source: 'synthesis' });
    else if (synthesis?.therapeuticPlan?.microInterventions?.length > 0) arc.push({ intent: 'action_proposal_micro', data: synthesis.therapeuticPlan.microInterventions[0], source: 'synthesis' });
    else arc.push({ intent: 'open_question', source: 'default' });

    if (this.debug) console.log(`[designArc] Built arc intents: ${arc.map(a=>a.intent).join(' -> ')}`);
    return arc;
  }

  // ---------------------------
  // Protocol Matching
  // ---------------------------
  _matchProtocols(insight) {
    const scores = new Map();
    const conceptInsights = insight?.semanticMap?.conceptInsights || {};
    const concepts = Object.keys(conceptInsights);
    const sourceTokens = [...new Set(Object.values(conceptInsights).flatMap(i => i.sourceTokens || []))];
    const allEvidence = [...new Set([...concepts, ...sourceTokens])];

    if (this.debug) console.log(`[ProtocolMatch] All Evidence:`, allEvidence);

    for (const [tag, protocol] of Object.entries(this.protocols || {})) {
      let score = 0;
      const keywords = (protocol.nlu?.keywords?.map(k => k.word) || []).map(String).map(k => k.toLowerCase());
      const intersection = keywords.filter(kw => allEvidence.some(ev => String(ev).toLowerCase() === kw));
      if (intersection.length > 0) score = intersection.length * 2.0;
      else {
        for (const kw of keywords) for (const ev of allEvidence) {
          const evL = String(ev).toLowerCase();
          if (evL.includes(kw) || kw.includes(evL)) score += 1.0;
        }
      }
      if (score > 0) scores.set(tag, score);
    }

    if (this.debug) console.log(`[ProtocolMatch] Scores:`, Object.fromEntries(scores));
    return getTopN(Object.fromEntries(scores), 2).map(it => it.key);
  }

  // ---------------------------
  // Gem Selection
  // ---------------------------
  _selectGem(intent, matchedProtocols) {
    const intentName = intent?.intent || intent;
    if (this.debug) console.log(`[selectGem] Selecting gem for intent: '${intentName}'`);

    const fallbackGems = [
      "أنا سامعك وبقلب معك.",
      "ده شيء صعب، وشجاعتك في قول ده واضحة.",
      "خليني معاك خطوة خطوة."
    ];
    let selection = { gem: sample(fallbackGems), source: 'fallback' };
    const candidates = this._intentCandidates(intentName);

    if (this.debug) console.log(`[selectGem] Intent candidates:`, candidates);

    for (const protocolTag of matchedProtocols) {
      const protocol = this.protocols[protocolTag];
      if (!protocol) continue;

      for (const roomName in (protocol.conversation_rooms || {})) {
        const room = protocol.conversation_rooms[roomName];
        const banksToCheck = [
          room.dynamic_gems_logic?.gems_bank,
          room.gems_bank,
          room.dynamic_gems_logic?.default_gems_bank,
          room.default_gems_bank
        ].filter(Boolean);

        for (const bank of banksToCheck) {
          try {
            const found = this._findGemInBank(bank, candidates, roomName, protocolTag);
            if (found) return { gem: found, source: `${protocolTag}/${roomName}` };
          } catch (e) {
            if (this.debug) console.error(`[selectGem] Error searching bank:`, e);
          }
        }
      }
    }

    return selection;
  }

  // ---------------------------
  // Emotional DNA blending
  // ---------------------------
  _blendDNA(affectVector = {}) {
    if (this.generativeOrchestrator?.mixDNA) {
      try { return this.generativeOrchestrator.mixDNA(affectVector); } 
      catch (e) { if (this.debug) console.warn('[blendDNA] mixDNA failed', e); }
    }
    const styles = [];
    if ((affectVector.sadness || 0) > 0.5) styles.push('poetic');
    if ((affectVector.anxiety || 0) > 0.5) styles.push('grounded');
    if ((affectVector.joy || 0) > 0.5) styles.push('tender');
    if (styles.length === 0) styles.push(this.DNA_BLEND_DEFAULT);
    return { style: styles.join('+'), meta: { blendedFrom: styles } };
  }

  // ---------------------------
  // Emotional coherence scoring
  // ---------------------------
  _evaluateEmotionalCoherence(text = '', affectVector = {}, arc = []) {
    if (this.generativeOrchestrator?.evaluateEmotionCoherence) {
      try { return this.generativeOrchestrator.evaluateEmotionCoherence(text, affectVector); } 
      catch (e) { if (this.debug) console.warn('[evaluateEmotionalCoherence] failed', e); }
    }

    const aggregate = {};
    for (const step of arc) {
      const sig = this.INTENT_EMOTION_SIGNATURES[step.intent] || {};
      for (const [k,v] of Object.entries(sig)) aggregate[k] = (aggregate[k]||0) + v;
    }

    const keys = Array.from(new Set([...Object.keys(aggregate), ...Object.keys(affectVector)]));
    let dot=0, magA=0, magB=0;
    for (const k of keys) { const a=aggregate[k]||0; const b=affectVector[k]||0; dot+=a*b; magA+=a*a; magB+=b*b; }
    if (!magA || !magB) return 0.5;
    return Number(Math.min(0.95, Math.max(0.2, dot/(Math.sqrt(magA)*Math.sqrt(magB)))).toFixed(3));
  }

  // ---------------------------
  // Echo closure
  // ---------------------------
  _applyEchoClosure(text, dnaMeta = {}) {
    const style = dnaMeta?.style || this.DNA_BLEND_DEFAULT;
    const echoes = {
      poetic: "\nأحيانًا يكفي أن نستمع لنبض داخلك بصمت.",
      grounded: "\nخذ نفسًا عميقًا الآن — أنت على الطريق الصحيح خطوة بخطوة.",
      tender: "\nأنت لست وحدكِ/وحيدًا؛ هذا الشعور يُرى ويُقدّر.",
      dynamic: "\nلو حابب، أحب أسمع منك المزيد."
    };
    for (const key of Object.keys(echoes)) if (style.includes(key)) return text+echoes[key];
    return text + "\nأنا هنا إذا أحببت أن تكمل الحديث.";
  }

  // ---------------------------
  // Main Response Generation
  // ---------------------------
  async generateResponse(insight = {}) {
    if (this.debug) console.log(`[generateResponse] Start for user at ${new Date().toISOString()}`);

    const arc = this._designResponseArc(insight);
    const matchedProtocols = this._matchProtocols(insight);
    const assembledGems = arc.map(step => this._selectGem(step, matchedProtocols));
    const rawGems = assembledGems.map(g=>g.gem);
    const affectVector = insight.emotionProfile?.affectVector || {};
    const dnaBlend = this._blendDNA(affectVector);

    const context = {
      username: this.memory?.getUserProfile?.()?.name || null,
      primaryEmotion: insight.emotionProfile?.primaryEmotion?.name || null,
      primaryConcept: insight.semanticMap?.pivotalConcept || null,
      arc
    };

    let finalResponse = { text: '', meta: {} };
    try {
      finalResponse = await this.generativeOrchestrator.generate({
        conceptProfile: insight.semanticMap?.conceptInsights || {},
        emotionalProfile: affectVector,
        context
      });
    } catch (e) {
      if (this.debug) console.error("[generateResponse] Generative failed, using fallback", e);
      finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend, error:'fallback used' } };
    }

    let combined = `${rawGems.join(' ')}\n${finalResponse.text}`.trim();
    const coherenceScore = this._evaluateEmotionalCoherence(combined, affectVector, arc);
    if (this.debug) console.log(`[generateResponse] Emotional coherence: ${coherenceScore}`);

    combined = this._applyEchoClosure(combined, dnaBlend.meta || dnaBlend);

    return {
      text: combined,
      gems: rawGems,
      dna: dnaBlend,
      arc,
      protocols_used: matchedProtocols,
      emotional_coherence: coherenceScore,
      meta: {
        generator: finalResponse.meta || {},
        selection_path: assembledGems,
        debug_logs: this.debug ? { protocol_match: matchedProtocols, arc: arc.map(a=>a.intent), affectVector, dnaBlend } : null
      }
    };
  }
}

