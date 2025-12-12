

// /analysis_engines/catharsis_engine.js
// CatharsisEngine v1.9-adapted-full - Compatible with ResponseOrchestrator v1.0+
// - Uses generate(...) when render(...) isn't available
// - Converts concept keys (e.g. "depression_symptom") to readable Arabic phrases
// - Verbose logging for full traceability

import { sample, getTopN } from '../core/utils.js';

export class CatharsisEngine {
  constructor(dictionaries = {}, protocols = {}, memorySystem = {}) {
    if (!dictionaries.GENERATIVE_ENGINE || !dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator) {
      throw new Error("CatharsisEngine requires dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator.");
    }

    const GenerativeOrchestratorClass = dictionaries.GENERATIVE_ENGINE.ResponseOrchestrator;
    this.generativeOrchestrator = new GenerativeOrchestratorClass({
      dnaLibrary: dictionaries.GENERATIVE_ENGINE.EMOTIONAL_DNA || {},
      lexicalPools: dictionaries.GENERATIVE_ENGINE.LEXICAL_POOLS || {},
      memory: memorySystem
    });

    this.lexicalPools = dictionaries.GENERATIVE_ENGINE.LEXICAL_POOLS || {};
    this.dnaLibrary = dictionaries.GENERATIVE_ENGINE.EMOTIONAL_DNA || {};

    this.protocols = protocols || {};
    this.memory = memorySystem || null;

    // debug = true to enable verbose logging
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

    // Lightweight concept -> human phrase map (extendable)
    this.conceptPhrases = {
      depression_symptom: "أعراض الاكتئاب",
      sadness: "الحزن",
      anxiety: "القلق",
      helplessness: "الإحساس بالعجز",
      loneliness: "الوحدة",
      catastrophizing: "تضخيم المخاوف",
      stagnation: "الركود",
      hope: "الأمل",
      resilience: "المرونة",
      guilt: "الذنب",
      anger: "الغضب",
      safety: "الشعور بالأمان"
      // <-- أضف هنا أي مفاهيم عندك في البروتوكولات
    };

    if (this.debug) console.log("[CatharsisEngine] Initialized (compat mode) - debug ON");
  }

  // ------------------------
  // Intent candidate helpers
  // ------------------------
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

  // ------------------------
  // Gem lookup helpers
  // ------------------------
  _findGemInBank(bank = {}, candidates = [], roomName = '', protocolTag = '') {
    if (!bank || typeof bank !== 'object') return null;

    for (const cand of candidates) {
      if (Object.prototype.hasOwnProperty.call(bank, cand) && Array.isArray(bank[cand]) && bank[cand].length) {
        if (this.debug) console.log(`      [findGem] Exact match for '${cand}' in room '${roomName}' of protocol '${protocolTag}'`);
        return sample(bank[cand]);
      }
    }

    const bankKeys = Object.keys(bank || {});
    for (const key of bankKeys) {
      const keyLower = String(key).toLowerCase();
      for (const cand of candidates) {
        if (keyLower === cand || keyLower.includes(cand) || cand.includes(keyLower)) {
          const arr = bank[key];
          if (Array.isArray(arr) && arr.length) {
            if (this.debug) console.log(`      [findGem] Substring match: bankKey='${key}' matched candidate='${cand}' in room '${roomName}' protocol '${protocolTag}'`);
            return sample(arr);
          }
        }
      }
    }

    return null;
  }

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

  // ------------------------
  // DNA blending
  // ------------------------
  _blendDNA(affectVector = {}) {
    try {
      if (this.generativeOrchestrator) {
        if (typeof this.generativeOrchestrator.mixDNA === 'function') {
          if (this.debug) console.log('[blendDNA] Using generativeOrchestrator.mixDNA');
          return this.generativeOrchestrator.mixDNA(affectVector);
        }
        if (typeof this.generativeOrchestrator._mixDNA === 'function') {
          if (this.debug) console.log('[blendDNA] Using generativeOrchestrator._mixDNA (internal)');
          try { return this.generativeOrchestrator._mixDNA(affectVector, []); } catch (e) { /* ignore */ }
          return this.generativeOrchestrator._mixDNA(affectVector);
        }
      }
    } catch (e) {
      if (this.debug) console.warn('[blendDNA] orchestrator mix attempt failed, falling back.', e);
    }

    // Heuristic fallback
    const styles = [];
    if ((affectVector.sadness || 0) > 0.5) styles.push('poetic');
    if ((affectVector.anxiety || 0) > 0.5) styles.push('grounded');
    if ((affectVector.joy || 0) > 0.5) styles.push('tender');
    if (styles.length === 0) styles.push(this.DNA_BLEND_DEFAULT);
    return { style: styles.join('+'), meta: { blendedFrom: styles } };
  }

  // ------------------------
  // Evaluate coherence (heuristic)
  // ------------------------
  _evaluateEmotionalCoherence(generatedText = '', affectVector = {}, arc = []) {
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

  // ------------------------
  // Echo closure
  // ------------------------
  _applyEchoClosure(text, dnaMeta = {}) {
    const style = (dnaMeta && (dnaMeta.style || dnaMeta)) || this.DNA_BLEND_DEFAULT;
    const echoes = {
      poetic: "\nأحيانًا يكفي أن نستمع لنبض داخلك بصمت.",
      grounded: "\nخذ نفسًا عميقًا الآن — أنت على الطريق الصحيح خطوة بخطوة.",
      tender: "\nأنت لست وحدكِ/وحيدًا؛ هذا الشعور يُرى ويُقدّر.",
      dynamic: "\nلو حابب، أحب أسمع منك المزيد."
    };
    for (const key of Object.keys(echoes)) {
      if (typeof style === 'string' && style.includes(key)) {
        return text + echoes[key];
      }
    }
    return text + "\nأنا هنا إذا أحببت أن تكمل الحديث.";
  }

  // ------------------------
  // Convert a concept key into readable Arabic phrase
  // (tries multiple strategies)
  // ------------------------
  _conceptToReadable(concept) {
    if (!concept) return concept;

    // 1) direct map
    if (this.conceptPhrases[concept]) return this.conceptPhrases[concept];

    // 2) try lexicalPools synonyms: if lexicalPools.synonyms has a mapping for concept (unlikely),
    //    choose a variant (we imported sample from utils)
    try {
      if (this.lexicalPools && this.lexicalPools.synonyms && this.lexicalPools.synonyms[concept]) {
        const arr = this.lexicalPools.synonyms[concept];
        if (Array.isArray(arr) && arr.length) return sample(arr);
      }
    } catch (e) {
      if (this.debug) console.warn('[conceptToReadable] lexicalPools lookup failed for', concept, e);
    }

    // 3) fallback: convert snake_case / kebab-case to spaced phrase and attempt light Arabicization
    //    e.g., "depression_symptom" -> "اكتئاب (depression symptom)"
    const human = String(concept)
      .replace(/[_\-]+/g, ' ')
      .replace(/\b([a-z])/g, (m) => m.toLowerCase());

    return `${human}`; // keep english token as last resort (we prefer at least replacing underscores)
  }

  // ------------------------
  // Replace raw concept tokens inside a text with readable phrases.
  // It looks for exact token matches or common variations (with underscores).
  // ------------------------
  _replaceConceptTokensInText(text = '', conceptKeys = []) {
    if (!text || !conceptKeys || !conceptKeys.length) return text;
    let out = text;
    // sort by length desc to avoid partial short-key replacing first
    const sorted = [...new Set(conceptKeys)].sort((a,b) => b.length - a.length);
    for (const key of sorted) {
      const phrase = this._conceptToReadable(key) || key;
      // replace whole-word occurrences, and also occurrences with punctuation
      const re = new RegExp(`\\b${this._escapeRegex(key)}\\b`, 'gi');
      out = out.replace(re, phrase);
      // also try replacing key with underscores replaced by spaces
      const alt = key.replace(/[_\-]+/g, ' ');
      const re2 = new RegExp(`\\b${this._escapeRegex(alt)}\\b`, 'gi');
      out = out.replace(re2, phrase);
    }
    return out;
  }

  _escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ------------------------
  // Protocol matching (as before)
  // ------------------------
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

      const intersection = lowerKeywords.filter(kw => allEvidence.some(ev => String(ev).toLowerCase() === kw));

      if (intersection.length > 0) {
        score = intersection.length * 2.0;
        if (this.debug) console.log(`  - Protocol '${tag}' got +${score} score for direct match on: [${intersection.join(', ')}]`);
      } else {
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

      if (score > 0) scores.set(tag, score);
    }

    if (this.debug && scores.size > 0) {
      console.log('[Catharsis] Protocol Match Scores:', Object.fromEntries(scores));
    } else if (this.debug) {
      console.log('[Catharsis] No protocol scored above 0 with current evidence.');
    }

    return getTopN(Object.fromEntries(scores), 2).map(it => it.key);
  }

  // ------------------------
  // Main generation pipeline
  // ------------------------
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

    // 1. design arc
    const responseArc = this._designResponseArc(insight);
    if (this.debug) console.log("\n[Catharsis] Step 1: Designed Response Arc:", responseArc.map(a => a.intent));

    // 2. protocol matching
    const matchedProtocols = this._matchProtocols(insight);
    if (this.debug) console.log("[Catharsis] Step 2: Matched Protocols:", matchedProtocols);

    // 3. assemble gems
    const assembledGems = responseArc.map(step => {
      try {
        return this._selectGem(step, matchedProtocols);
      } catch (e) {
        if (this.debug) console.error('[Catharsis] _selectGem threw for step:', step, e);
        return { gem: sample(["أنا سامعك وبقلب معك."]), source: 'fallback_error' };
      }
    });
    if (this.debug) console.log("[Catharsis] Step 3: Assembled Raw Gems:", assembledGems.map(g => `(${g.source}) -> "${g.gem}"`));

    const rawGems = assembledGems.map(g => g.gem).filter(Boolean);
    const affectVector = insight.emotionProfile?.affectVector || {};
    const dnaBlend = this._blendDNA(affectVector);
    if (this.debug) console.log("[Catharsis] Step 4: Determined DNA Blend:", dnaBlend);

    // Build conceptProfile for orchestrator.generate if needed
    const conceptProfile = {};
    const conceptInsights = insight.semanticMap?.conceptInsights || {};
    for (const [k, v] of Object.entries(conceptInsights || {})) {
      if (v && typeof v === 'object') {
        conceptProfile[k] = (v.score || v.weight || v.totalWeight || 0.0);
      } else if (typeof v === 'number') {
        conceptProfile[k] = v;
      } else {
        conceptProfile[k] = 0.0;
      }
    }

    const context = {
      username: (this.memory && this.memory.getUserProfile && this.memory.getUserProfile()?.name) || null,
      primaryEmotion: (insight.emotionProfile && insight.emotionProfile.primaryEmotion && insight.emotionProfile.primaryEmotion.name) || null,
      primaryConcept: (insight.semanticMap && insight.semanticMap.pivotalConcept) || null,
      arc: responseArc,
      rawGems
    };

    if (this.debug) console.log("[Catharsis] Context & Profiles prepared:", { conceptProfile, affectVector, context });

    // 4. call orchestrator (render OR generate)
    let finalResponse = { text: '', meta: {} };
    try {
      if (this.generativeOrchestrator && typeof this.generativeOrchestrator.render === 'function') {
        if (this.debug) console.log("[Catharsis] Using orchestrator.render(rawGems, opts)");
        finalResponse = await this.generativeOrchestrator.render(rawGems, { dnaStyle: dnaBlend, context });
      } else if (this.generativeOrchestrator && typeof this.generativeOrchestrator.generate === 'function') {
        if (this.debug) console.log("[Catharsis] Using orchestrator.generate({ conceptProfile, emotionalProfile, context })");
        // generate might be synchronous in orchestrator implementation; normalize:
        const genOut = this.generativeOrchestrator.generate({
          conceptProfile,
          emotionalProfile: affectVector,
          context
        });
        finalResponse = await Promise.resolve(genOut);
      } else {
        if (this.debug) console.log("[Catharsis] No orchestrator rendering function found — falling back to raw join");
        finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend, fallback: true } };
      }
    } catch (e) {
      if (this.debug) console.error("[Catharsis] Orchestrator render/generate failed, falling back to raw join.", e);
      finalResponse = { text: rawGems.join(' '), meta: { dna: dnaBlend, error: String(e) } };
    }
    finalResponse.meta = finalResponse.meta || {};
    if (!finalResponse.meta.dna) finalResponse.meta.dna = dnaBlend;

    if (this.debug) console.log(`[Catharsis] Step 5: Orchestrator output (pre-rewrite): "${finalResponse.text}"`);

    // 5. Replace any raw concept keys left in the generated text with readable phrases
    try {
      // gather possible concept keys to replace: keys from conceptProfile + keys found in assembledGems (if gems are keys)
      const conceptKeys = [
        ...Object.keys(conceptProfile || {}),
        // also from assembledGems if the gem equals a key (rare but safe)
        ...assembledGems.map(g => (typeof g.gem === 'string' ? g.gem : '')).filter(Boolean)
      ];
      // remove duplicates and non-words
      const cKeysUnique = Array.from(new Set(conceptKeys)).filter(k => typeof k === 'string' && k.length > 1);
      if (cKeysUnique.length) {
        if (this.debug) console.log("[Catharsis] Attempting concept token replacement for keys:", cKeysUnique);
        finalResponse.text = this._replaceConceptTokensInText(finalResponse.text, cKeysUnique);
        if (this.debug) console.log("[Catharsis] Post-replacement text:", finalResponse.text);
      } else {
        if (this.debug) console.log("[Catharsis] No concept keys found to replace.");
      }
    } catch (e) {
      if (this.debug) console.warn("[Catharsis] Concept token replacement failed:", e);
    }

    // 6. Evaluate emotional coherence (on replaced text)
    const qualityScore = this._evaluateEmotionalCoherence(finalResponse.text, affectVector, responseArc);
    if (this.debug) console.log(`[Catharsis] Step 6: Emotional Quality Score: ${qualityScore}`);

    // 7. if quality low, attempt regeneration with neutralized affect
    if (qualityScore < this.MIN_EMOTIONAL_INTEGRITY) {
      if (this.debug) console.log(`  - Quality (${qualityScore}) < threshold (${this.MIN_EMOTIONAL_INTEGRITY}). Attempting regeneration with neutralized affect.`);
      try {
        const neutralAffect = { ...affectVector };
        for (const k of Object.keys(neutralAffect)) neutralAffect[k] = Math.max(0, neutralAffect[k] * 0.55);

        const neutralBlend = this._blendDNA(neutralAffect) || { style: 'dynamic' };

        if (this.generativeOrchestrator && typeof this.generativeOrchestrator.render === 'function') {
          if (this.debug) console.log("[Catharsis] Regenerating using render with neutralBlend");
          finalResponse = await this.generativeOrchestrator.render(rawGems, { dnaStyle: neutralBlend, context: { ...context, regen: true } });
        } else if (this.generativeOrchestrator && typeof this.generativeOrchestrator.generate === 'function') {
          if (this.debug) console.log("[Catharsis] Regenerating using generate with neutralAffect");
          const regenOut = this.generativeOrchestrator.generate({
            conceptProfile,
            emotionalProfile: neutralAffect,
            context: { ...context, regen: true }
          });
          finalResponse = await Promise.resolve(regenOut);
        } else {
          if (this.debug) console.log("[Catharsis] Regenerate fallback: using raw gems with echo closure");
          finalResponse = { text: this._applyEchoClosure(rawGems.join(' '), neutralBlend), meta: { dna: neutralBlend, regen: 'fallback' } };
        }
        finalResponse.meta = finalResponse.meta || {};
        if (!finalResponse.meta.dna) finalResponse.meta.dna = neutralBlend;

        // replace concept tokens again after re-generation
        finalResponse.text = this._replaceConceptTokensInText(finalResponse.text, Object.keys(conceptProfile || {}));

        if (this.debug) console.log(`[Catharsis] Regenerated text: "${finalResponse.text}"`);
      } catch (e) {
        if (this.debug) console.error("[Catharsis] Regeneration attempt failed.", e);
      }
    }

    // 8. Apply echo closure and final polish
    try {
      const dnaMeta = finalResponse.meta && finalResponse.meta.dna ? finalResponse.meta.dna : dnaBlend;
      finalResponse.text = this._applyEchoClosure(finalResponse.text, dnaMeta);
    } catch (e) {
      if (this.debug) console.warn("[Catharsis] _applyEchoClosure failed:", e);
    }

    // 9. Persist to memory if available (non-fatal)
    try {
      if (this.memory && typeof this.memory.record === 'function') {
        this.memory.record(finalResponse.text);
        if (this.debug) console.log("[Catharsis] Recorded generated text into memory.");
      }
    } catch (e) {
      if (this.debug) console.warn("[Catharsis] Memory.record failed:", e);
    }

    // 10. Final debug log and return standardized shape (responseText + meta)
    if (this.debug) {
      console.log("[Catharsis] Final Response (returned object):", {
        responseText: finalResponse.text,
        meta: finalResponse.meta,
        arc: responseArc.map(a => a.intent),
        matchedProtocols
      });
    }

    // Ensure standardized return for external pipeline:
    // { responseText: "...", meta: {...}, arc: [...], matchedProtocols: [...], rawGems: [...], emotional_coherence: n }
    finalResponse.meta = finalResponse.meta || {};
    finalResponse.meta.arc = responseArc;
    finalResponse.meta.matchedProtocols = matchedProtocols;
    finalResponse.meta.assembledGems = assembledGems;
    finalResponse.meta.emotional_coherence = this._evaluateEmotionalCoherence(finalResponse.text, affectVector, responseArc);

    return {
      responseText: finalResponse.text,
      meta: finalResponse.meta,
      arc: responseArc,
      matchedProtocols,
      rawGems,
      emotional_coherence: finalResponse.meta.emotional_coherence
    };
  }
}

export default CatharsisEngine;
