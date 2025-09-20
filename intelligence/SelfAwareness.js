
// intelligence/SelfAwareness.js v1.0
// Conscious Meta-Layer: Self-Aware Engine Monitoring + Adaptive Persona Weighting
// Author: Generated for Rafiq AI system
// Notes: evaluates candidates before final fusion, tracks learning

import { DEBUG } from '../shared/config.js';
import { jaccardSim, clamp, safeStr } from './utils.js'; // assumed shared helpers

const DEFAULT_PERSONA_WEIGHTS = {
  logical: 1.0,
  empathic: 1.0,
  visionary: 0.9,
  pragmatic: 1.0,
  playful: 0.5
};

export class SelfAwareness {
  constructor() {
    this.personaWeights = { ...DEFAULT_PERSONA_WEIGHTS };
    this.engineHistory = {}; // track engine performance over turns
    this.innerVoice = [];
  }

  /**
   * Evaluate candidates for awareness signals:
   * novelty, contradiction, confidence, persona alignment
   */
  evaluateCandidates(candidates = [], tracker = null) {
    const history = (tracker && tracker.getHistory) ? tracker.getHistory() : [];
    const recentReplies = history.slice(-6).map(t => t.ai_response?.reply || '');

    return candidates.map(c => {
      const reply = safeStr(c.reply);
      const baseConf = clamp(c.confidence ?? 0.6, 0, 1);
      
      // novelty: dissimilarity from recent replies
      const maxSim = recentReplies.reduce((m, r) => Math.max(m, jaccardSim(reply, r || '')), 0);
      const novelty = 1 - maxSim;

      // simple contradiction detection within candidate itself
      const contradictions = this.detectSelfContradiction(reply) ? 1 : 0;

      // persona alignment weighting
      const personaScore = Object.keys(this.personaWeights).reduce((sum, p) => {
        const w = this.personaWeights[p] ?? 0.5;
        return sum + w * this.heuristicPersonaScore(reply, p);
      }, 0) / Object.keys(this.personaWeights).length;

      // final metaScore
      const metaScore = clamp(baseConf * 0.45 + personaScore * 0.35 + novelty * 0.15 - contradictions * 0.1, 0, 1);

      // track engine history
      this.trackEnginePerformance(c.source, metaScore);

      return {
        candidate: c,
        metaScore,
        novelty,
        contradictions,
        personaScore
      };
    }).sort((a, b) => b.metaScore - a.metaScore);
  }

  /** Simple heuristic for persona alignment */
  heuristicPersonaScore(reply, persona) {
    reply = reply.toLowerCase();
    if(persona === 'logical' && /لأن|السبب|بسبب|خطوة/.test(reply)) return 1.0;
    if(persona === 'empathic' && /أنا معاك|مفهومة/.test(reply)) return 0.95;
    if(persona === 'visionary' && /تخيل|لو/.test(reply)) return 0.9;
    if(persona === 'pragmatic' && /جرب|قيّم/.test(reply)) return 0.98;
    if(persona === 'playful' && /😂|فكر/.test(reply)) return 0.7;
    return 0.5;
  }

  /** Detect simple contradictions inside a single reply */
  detectSelfContradiction(reply) {
    const checks = [["افعل","لا تفعل"],["ابدأ","انتظر"],["قم","تجنب"]];
    return checks.some(([a,b]) => reply.includes(a) && reply.includes(b));
  }

  /** Track engine performance over time */
  trackEnginePerformance(engineName, score) {
    if(!engineName) return;
    if(!this.engineHistory[engineName]) this.engineHistory[engineName] = [];
    this.engineHistory[engineName].push({ score, timestamp: Date.now() });
  }

  /** Adjust persona weights dynamically based on performance feedback */
  adaptPersonaWeights() {
    for(const p of Object.keys(this.personaWeights)) {
      let avgScore = 0, count = 0;
      for(const eng in this.engineHistory) {
        const arr = this.engineHistory[eng];
        if(arr.length > 0) {
          avgScore += arr[arr.length-1].score; // last turn
          count++;
        }
      }
      if(count>0) this.personaWeights[p] = clamp(this.personaWeights[p] * avgScore, 0.3, 1.2);
    }
  }

  /** Generate inner voice metadata for experiments */
  generateInnerVoice(candidates) {
    const altReplies = candidates.map(c => c.reply).slice(1,3); // top 2 alternatives
    const voice = `داخلية: كنت ممكن أختار ${altReplies.join(' || ')}`;
    this.innerVoice.push(voice);
    return voice;
  }

  /** Main entry point: decides on candidate ordering and adjustments */
  decide(candidates=[], tracker=null) {
    const evaluated = this.evaluateCandidates(candidates, tracker);
    this.adaptPersonaWeights();
    const innerVoice = this.generateInnerVoice(evaluated.map(e=>e.candidate));
    return { topCandidate: evaluated[0]?.candidate, evaluated, innerVoice, personaWeights: {...this.personaWeights} };
  }
}
