
// /analysis_engines/catharsis_engine.js
// CatharsisEngine v1.11 - Full Compatibility + Verbose Logging
// - Compatible with ResponseOrchestrator v1.0 (generate, _mixDNA) and older render/mixDNA
// - Returns { responseText, _meta } for API compatibility
// - Defensive: supports sync/async generate + fallbacks
// - Exhaustive debug logs

import { sample, getTopN } from '../core/utils.js';

export class CatharsisEngine {
  constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
    // sanity checks
    if (!dictionaries || !dictionaries.GENERATIVE_ENGINE || !dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator) {
      throw new Error("CatharsisEngine v1.11 requires dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator.");
    }

    this.debug = true;
    if (this.debug) console.log("[CatharsisEngine] Initializing (v1.11) - debug ON");

    const GenerativeOrchestratorClass = dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator;
    // instantiate orchestrator (it expects dnaLibrary, lexicalPools, memory)
    try {
      this.generativeOrchestrator = new GenerativeOrchestratorClass({
        dnaLibrary: dictionaries.GENERATIVE_ENGINE.EMOTIONAL_DNA || {},
        lexicalPools: dictionaries.GENERATIVE_ENGINE.LEXICAL_POOLS || {},
        memory: memorySystem
      });
      if (this.debug) console.log("[CatharsisEngine] GenerativeOrchestrator instantiated.");
    } catch (e) {
      console.error("[CatharsisEngine] Failed to instantiate ResponseOrchestrator:", e);
      throw e;
    }

    this.protocols = protocols || {};
    this.memory = memorySystem || null;

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

    if (this.debug) {
      console.log("[CatharsisEngine] Configuration:");
      console.log("  MIN_EMOTIONAL_INTEGRITY:", this.MIN_EMOTIONAL_INTEGRITY);
      console.log("  DNA_BLEND_DEFAULT:", this.DNA_BLEND_DEFAULT);
    }
  }

  // ---------------------------
  // Intent candidate generation
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
      if (k === base || arr.includes(base)) {
        arr.forEach(x => candidates.add(x));
        candidates.add(k);
      }
    }

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

    ['empathy','normalization','action_prompt','invitation','validation','insight','encouragement','gratitude','reframe','validation','kindness','validation_short'].forEach(x => candidates.add(x));

    return Array.from(candidates).filter(Boolean).map(s => String(s).toLowerCase());
  }

  // ---------------------------
  // Gem selection helpers
  // ---------------------------
  _findGemInBank(bank = {}, candidates = [], roomName = '', protocolTag = '') {
    if (!bank || typeof bank !== 'object') return null;

    // exact candidate property match
    for (const cand of candidates) {
      if (Object.prototype.hasOwnProperty.call(bank, cand) && Array.isArray(bank[cand]) && bank[cand].length) {
        if (this.debug) console.log(`      [findGem] Exact match '${cand}' in ${protocolTag}/${roomName}`);
        return sample(bank[cand]);
      }
    }

    // fuzzy match: keys containing candidate or vice versa
    const bankKeys = Object.keys(bank || {});
    for (const key of bankKeys) {
      const keyLower = String(key).toLowerCase();
      for (const cand of candidates) {
        if (keyLower === cand || keyLower.includes(cand) || cand.includes(keyLower)) {
          const arr = bank[key];
          if (Array.isArray(arr) && arr.length) {
            if (this.debug) console.log(`      [findGem] Substring match bankKey='${key}' vs candidate='${cand}' in ${protocolTag}/${roomName}`);
            return sample(arr);
          }
        }
      }
    }

    return null;
  }

  _selectGem(intent, matchedProtocols) {
    const intentName = (intent && (intent.intent || intent)) || intent;
    if (this.debug) console.log(`[selectGem] selecting for intent='${intentName}' across protocols:`, matchedProtocols);

    const fallbackGems = [
      "أنا سامعك وبقلب معك.",
      "ده شيء صعب، وشجاعتك في قول ده واضحة.",
      "خليني معاك خطوة خطوة."
    ];
    let selection = { gem: sample(fallbackGems), source: 'fallback' };

    const candidates = this._intentCandidates(intentName);
    if (this.debug) console.log("  [selectGem] intent candidates:", candidates);

    for (const protocolTag of (matchedProtocols || [])) {
      const protocol = this.protocols[protocolTag];
      if (!protocol) {
        if (this.debug) console.log(`  [selectGem] protocol '${protocolTag}' not found.`);
        continue;
      }
      if (this.debug) console.log(`  [selectGem] searching protocol '${protocolTag}'`);

      const rooms = protocol.conversation_rooms || {};
      for (const roomName of Object.keys(rooms)) {
        const room = rooms[roomName];
        if (this.debug) console.log(`    [selectGem] inspecting room '${roomName}' (purpose='${(room && room.purpose) || 'n/a'}')`);

        const banksToCheck = [];
        if (room.dynamic_gems_logic && room.dynamic_gems_logic.gems_bank) banksToCheck.push(room.dynamic_gems_logic.gems_bank);
        if (room.gems_bank) banksToCheck.push(room.gems_bank);
        if (room.dynamic_gems_logic && room.dynamic_gems_logic.default_gems_bank) banksToCheck.push(room.dynamic_gems_logic.default_gems_bank);
        if (room.default_gems_bank) banksToCheck.push(room.default_gems_bank);

        for (const bank of banksToCheck) {
          try {
            const found = this._findGemInBank(bank, candidates, roomName, protocolTag);
            if (found) {
              selection = { gem: found, source: `${protocolTag}/${room.purpose || roomName}` };
              if (this.debug) console.log(`    [selectGem] found gem: "${found}" from ${selection.source}`);
              return selection;
            } else {
              if (this.debug) console.log(`    [selectGem] no match in this bank.`);
            }
          } catch (e) {
            if (this.debug) console.error(`    [selectGem] error searching bank in ${protocolTag}/${roomName}:`, e);
          }
        }
      }
    }

    if (this.debug) console.log("  [selectGem] returning fallback:", selection);
    return selection;
  }

  // ---------------------------
  // DNA blending (defensive)
  // ---------------------------
  _blendDNA(affectVector = {}, topIntents = []) {
    if (this.generativeOrchestrator) {
      try {
        if (typeof this.generativeOrchestrator.mixDNA === 'function') {
          if (this.debug) console.log("[blendDNA] Using public mixDNA()");
          return this.generativeOrchestrator.mixDNA(affectVector);
        }
        if (typeof this.generativeOrchestrator._mixDNA === 'function') {
          if (this.debug) console.log("[blendDNA] Using internal _mixDNA()");
          // try internal call signature defensively
          try {
            return this.generativeOrchestrator._mixDNA(affectVector, topIntents);
          } catch (e) {
            // some versions expect only affectVector
            return this.generativeOrchestrator._mixDNA(affectVector);
          }
        }
      } catch (e) {
        if (this.debug) console.warn("[blendDNA] orchestrator mix attempt threw, falling back. Error:", e);
      }
    }

    // heuristic fallback
    const styles = [];
    if ((affectVector.sadness || 0) > 0.5) styles.push('poetic');
    if ((affectVector.anxiety || 0) > 0.5) styles.push('grounded');
    if ((affectVector.joy || 0) > 0.5) styles.push('tender');
    if (styles.length === 0) styles.push(this.DNA_BLEND_DEFAULT);
    const fallback = { style: styles.join('+'), meta: { blendedFrom: styles } };
    if (this.debug) console.log("[blendDNA] fallback dna:", fallback);
    return fallback;
  }

  // ---------------------------
  // Emotional coherence evaluator
  // ---------------------------
  _evaluateEmotionalCoherence(generatedText = '', affectVector = {}, arc = []) {
    if (!generatedText) return 0.2;
    const aggregateIntentSignature = {};
    for (const step of arc || []) {
      const sig = this.INTENT_EMOTION_SIGNATURES[step.intent] || {};
      for (const [k, v] of Object.entries(sig)) {
        aggregateIntentSignature[k] = (aggregateIntentSignature[k] || 0) + v;
      }
    }
    const keys = Array.from(new Set([...Object.keys(aggregateIntentSignature), ...Object.keys(affectVector || {})]));
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
    if (this.debug) console.log("[evaluateEmotionalCoherence] score:", score);
    return Number(score.toFixed(3));
  }

  // ---------------------------
  // Echo closure / final flourish
  // ---------------------------
  _applyEchoClosure(text, dnaMeta = {}) {
    const style = (dnaMeta && (dnaMeta.style || dnaMeta)) || this.DNA_BLEND_DEFAULT;
    const echoes = {
      poetic: "\nأحيانًا يكفي أن نستمع لنبض داخلك بصمت.",
      grounded: "\nخذ نفسًا عميقًا الآن — أنت على الطريق الصحيح خطوة بخطوة.",
      tender: "\nأنت لست وحدك؛ هذا الشعور مُرى ويُقدّر.",
      dynamic: "\nلو حابب، أحب أسمع منك المزيد."
    };
    for (const key of Object.keys(echoes)) {
      if (typeof style === 'string' && style.includes(key)) {
        return (text || "") + echoes[key];
      }
    }
    return (text || "") + "\nأنا هنا إذا أحببت أن تكمل الحديث.";
  }

  // ---------------------------
  // Top-level generator (the core function)
  // ---------------------------
  async generateResponse(comprehensiveInsight = {}) {
    const insight = comprehensiveInsight || {};

    if (this.debug) {
      console.log("\n--- [CatharsisEngine] generateResponse START ---");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Primary Emotion:", insight.emotionProfile?.primaryEmotion);
      console.log("Pivotal Concept:", insight.semanticMap?.pivotalConcept);
      console.log("All Concepts:", insight.semanticMap?.allConcepts);
      console.log("Dominant Pattern:", insight.synthesisProfile?.dominantPattern?.pattern_id);
    }

    // 1) Build arc
    let responseArc;
    try {
      responseArc = this._designResponseArc ? this._designResponseArc(insight) : [];
    } catch (e) {
      // fallback: minimal arc
      console.error("[generateResponse] _designResponseArc threw:", e);
      responseArc = [{ intent: 'validation' }];
    }
    if (this.debug) console.log("[Step 1] responseArc:", responseArc.map(a => a.intent));

    // 2) match protocols
    let matchedProtocols = [];
    try {
      matchedProtocols = this._matchProtocols ? this._matchProtocols(insight) : [];
    } catch (e) {
      console.error("[generateResponse] _matchProtocols threw:", e);
      matchedProtocols = [];
    }
    if (this.debug) console.log("[Step 2] matchedProtocols:", matchedProtocols);

    // 3) assemble gems
    const assembledGems = responseArc.map(step => {
      try {
        return this._selectGem(step, matchedProtocols);
      } catch (e) {
        if (this.debug) console.error("[Step 3] _selectGem threw for step:", step, e);
        return { gem: sample(["أنا سامعك وبقلب معك."]), source: 'fallback_error' };
      }
    });
    if (this.debug) console.log("[Step 3] assembledGems:", assembledGems.map(g => `(${g.source}) -> "${g.gem}"`));

    const rawGems = assembledGems.map(g => g.gem).filter(Boolean);
    if (this.debug) console.log("[Step 3] rawGems:", rawGems);

    // 4) affect vector and dnaBlend
    const affectVector = (insight.emotionProfile && insight.emotionProfile.affectVector) || insight.emotionProfile || {};
    const dnaBlend = this._blendDNA(affectVector, responseArc) || { style: 'dynamic', meta: {} };
    if (this.debug) console.log("[Step 4] dnaBlend:", dnaBlend);

    // 5) build conceptProfile for orchestrator.generate
    const conceptProfile = {};
    const conceptInsights = insight.semanticMap?.conceptInsights || {};
    for (const [k, v] of Object.entries(conceptInsights || {})) {
      if (v && typeof v === 'object') {
        conceptProfile[k] = Number(v.score || v.weight || v.totalWeight || 0) || 0;
      } else if (typeof v === 'number') {
        conceptProfile[k] = v;
      } else {
        conceptProfile[k] = 0;
      }
    }
    if (this.debug) console.log("[Step 5] conceptProfile:", conceptProfile);

    const context = {
      username: (this.memory && this.memory.getUserProfile && this.memory.getUserProfile()?.name) || null,
      primaryEmotion: (insight.emotionProfile && insight.emotionProfile.primaryEmotion && insight.emotionProfile.primaryEmotion.name) || null,
      primaryConcept: (insight.semanticMap && insight.semanticMap.pivotalConcept) || null,
      arc: responseArc,
      rawGems
    };
    if (this.debug) console.log("[Step 5] context:", context);

    // 6) call orchestrator - prefer render (old), else generate (new)
    let finalResponse = { text: '', meta: {} };
    try {
      if (this.generativeOrchestrator && typeof this.generativeOrchestrator.render === 'function') {
        if (this.debug) console.log("[Step 6] using orchestrator.render(rawGems, opts)");
        finalResponse = await this.generativeOrchestrator.render(rawGems, { dnaStyle: dnaBlend, context });
      } else if (this.generativeOrchestrator && typeof this.generativeOrchestrator.generate === 'function') {
        if (this.debug) console.log("[Step 6] using orchestrator.generate({conceptProfile, emotionalProfile, context})");
        // generate might be sync or async; accept both
        const out = this.generativeOrchestrator.generate({
          conceptProfile,
          emotionalProfile: affectVector,
          context
        });
        finalResponse = await Promise.resolve(out);
      } else {
        if (this.debug) console.log("[Step 6] no rendering function on orchestrator - falling back to raw gems join");
        finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend, fallback: true } };
      }
    } catch (e) {
      console.error("[Step 6] orchestrator call threw, falling back:", e);
      finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend, error: String(e) } };
    }
    if (this.debug) console.log("[Step 6] initial finalResponse:", finalResponse);

    // ensure finalResponse has text and meta structure
    finalResponse = finalResponse || {};
    finalResponse.text = finalResponse.text || (Array.isArray(rawGems) ? rawGems.join(' ') : String(rawGems || ''));
    finalResponse.meta = finalResponse.meta || {};
    if (!finalResponse.meta.dna) finalResponse.meta.dna = dnaBlend;

    // 7) evaluate coherence
    const qualityScore = this._evaluateEmotionalCoherence(finalResponse.text, affectVector, responseArc);
    if (this.debug) console.log("[Step 7] qualityScore:", qualityScore);

    // 8) regeneration attempt if low quality
    if (qualityScore < this.MIN_EMOTIONAL_INTEGRITY) {
      if (this.debug) console.log(`[Step 8] quality ${qualityScore} < MIN ${this.MIN_EMOTIONAL_INTEGRITY} -> attempting regeneration with neutralized DNA`);
      try {
        // neutralize affect vector
        const neutralAffect = {};
        for (const k of Object.keys(affectVector || {})) {
          neutralAffect[k] = Math.max(0, (affectVector[k] || 0) * 0.55);
        }
        const neutralBlend = this._blendDNA(neutralAffect, responseArc) || { style: 'dynamic' };
        if (this.debug) console.log("[Step 8] neutralBlend:", neutralBlend);

        if (this.generativeOrchestrator && typeof this.generativeOrchestrator.render === 'function') {
          if (this.debug) console.log("[Step 8] regenerating via render");
          finalResponse = await this.generativeOrchestrator.render(rawGems, { dnaStyle: neutralBlend, context: { ...context, regen: true } });
        } else if (this.generativeOrchestrator && typeof this.generativeOrchestrator.generate === 'function') {
          if (this.debug) console.log("[Step 8] regenerating via generate");
          const regenOut = this.generativeOrchestrator.generate({
            conceptProfile,
            emotionalProfile: neutralAffect,
            context: { ...context, regen: true }
          });
          finalResponse = await Promise.resolve(regenOut);
        } else {
          finalResponse = { text: this._applyEchoClosure(rawGems.join(' '), neutralBlend), meta: { dna: neutralBlend, regen: 'fallback' } };
        }

        finalResponse = finalResponse || {};
        finalResponse.text = finalResponse.text || rawGems.join(' ');
        finalResponse.meta = finalResponse.meta || {};
        if (!finalResponse.meta.dna) finalResponse.meta.dna = neutralBlend;

        if (this.debug) console.log("[Step 8] regeneration result:", finalResponse);
      } catch (e) {
        if (this.debug) console.error("[Step 8] regeneration attempt failed:", e);
      }
    }

    // 9) fuse gems with finalResponse carefully (avoid duplication)
    let combinedText;
    try {
      const genText = finalResponse.text || "";
      // If genText already contains a lot of rawGems content, avoid prefixing to prevent duplication.
      const joinedGems = rawGems.join(' ').trim();
      const lowerGen = (genText || "").toLowerCase();
      const lowerGems = (joinedGems || "").toLowerCase();

      let shouldPrefixGems = false;
      if (!joinedGems) {
        shouldPrefixGems = false;
      } else if (!lowerGen.includes(lowerGems)) {
        // if generator didn't already include full gems string, prefix them
        shouldPrefixGems = true;
      } else {
        shouldPrefixGems = false;
      }

      if (shouldPrefixGems && joinedGems.length > 0) {
        combinedText = `${joinedGems}\n${genText}`.trim();
      } else {
        combinedText = genText.trim();
      }
    } catch (e) {
      if (this.debug) console.error("[Step 9] gem fusion failed:", e);
      combinedText = finalResponse.text || rawGems.join(' ');
    }
    if (this.debug) console.log("[Step 9] combinedText (pre-echo):", combinedText);

    // 10) apply echo closure using dna meta
    let finalTextWithEcho = combinedText;
    try {
      const dnaMeta = (finalResponse.meta && finalResponse.meta.dna) ? finalResponse.meta.dna : dnaBlend;
      finalTextWithEcho = this._applyEchoClosure(combinedText, dnaMeta);
    } catch (e) {
      if (this.debug) console.error("[Step 10] applyEchoClosure failed:", e);
    }
    if (this.debug) console.log("[Step 10] finalTextWithEcho:", finalTextWithEcho);

    // 11) final coherence (optional re-eval) and metadata
    const finalCoherence = this._evaluateEmotionalCoherence(finalTextWithEcho, affectVector, responseArc);
    if (this.debug) console.log("[Step 11] finalCoherence:", finalCoherence);

    // 12) persist to memory if available
    try {
      if (this.memory && typeof this.memory.record === 'function') {
        if (this.debug) console.log("[Step 12] recording to memory (session)");
        this.memory.record(finalTextWithEcho);
      } else if (this.memory && typeof this.memory.recordInteraction === 'function') {
        if (this.debug) console.log("[Step 12] recording to memory (recordInteraction)");
        this.memory.recordInteraction({
          user: insight.rawText || (insight.semanticMap && insight.semanticMap.rawText) || '',
          ai: finalTextWithEcho,
          insightSummary: {
            primaryEmotion: insight.emotionProfile && insight.emotionProfile.primaryEmotion,
            primaryConcept: insight.semanticMap && insight.semanticMap.pivotalConcept
          },
          timestamp: Date.now()
        });
      } else {
        if (this.debug) console.log("[Step 12] no memory API available or unsupported, skipping persist");
      }
    } catch (e) {
      if (this.debug) console.error("[Step 12] memory record failed (non-fatal):", e);
    }

    // 13) Build final return object (API expects responseText)
    const out = {
      responseText: finalTextWithEcho,
      _meta: {
        arc: responseArc,
        matchedProtocols,
        assembledGems,
        dnaUsed: finalResponse.meta && finalResponse.meta.dna ? finalResponse.meta.dna : dnaBlend,
        qualityScore: Number((qualityScore || finalCoherence || 0).toFixed(3)),
        generatorMeta: finalResponse.meta || {},
        debug: this.debug ? {
          protocolMatch: matchedProtocols,
          arc: responseArc.map(a => a.intent),
          affectVector,
          dnaBlend,
          rawGems,
          finalCoherence
        } : null
      }
    };

    if (this.debug) {
      console.log("\n--- [CatharsisEngine] generateResponse END ---");
      console.log("Outgoing responseText preview:", (out.responseText || "").slice(0, 200));
      console.log("Outgoing _meta:", out._meta);
    }

    return out;
  }

  // NOTE: ensure _designResponseArc is defined on prototype below (keeps code organization)
  _designResponseArc(insight) {
    // (kept same logic as earlier versions)
    const arc = [];
    const emotion = (insight && insight.emotionProfile && insight.emotionProfile.primaryEmotion) || { name: 'neutral', score: 0 };
    const synthesis = insight.synthesisProfile || {};
    const pivotalConcept = (insight.semanticMap && (insight.semanticMap.pivotalConcept || null)) || null;

    if (emotion && typeof emotion.score === 'number' && emotion.score >= 0.6) {
      arc.push({ intent: 'grounding', source: 'emotion' });
      arc.push({ intent: 'empathy', target: emotion.name, source: 'emotion' });
    } else if (emotion && typeof emotion.score === 'number' && emotion.score >= 0.35) {
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

    if (emotion && emotion.name === 'sadness' && emotion.score > 0.55) {
      arc.push({ intent: 'hope_injection', source: 'emotion' });
    } else if (emotion && emotion.name === 'anxiety' && emotion.score > 0.55) {
      arc.push({ intent: 'grounding', source: 'emotion' });
    } else if (emotion && emotion.name === 'anger' && emotion.score > 0.55) {
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
}

export default CatharsisEngine;


