// context_engine.js v15.1 - The Conscious Mind (Part 1.1: Memory Weighting + Smart Flags)
// ------------------------------------------------------------------------------
// Purpose:
// This iteration enhances v15.0 with two practical improvements:
//   1) Memory Weighting: give different turns different influence when analyzing
//      mid/long-term patterns (based on length, intensity, and recency).
//   2) Smart Context Flags: richer, more actionable flags emitted alongside the userModel.
//
// Design goals:
// - Keep the same external interface as v15.0 (generateFullContext) for backward compatibility.
// - Do NOT assume or modify behavior of other modules; treat user history as read-only input.
// - Keep code modular and well-documented so future sensors/weights can be added easily.
//
// NOTE: This module expects that each history "turn" has (where available):
//   - turn.timestamp (ISO string or Date-compatible string)
//   - turn.user_fingerprint: { concepts: [{concept, weighted}], chosenPrimaryNeed, intensity }
//   - turn.user_message: original text (optional, but used for length-based weighting)
//   - turn.clarity_score (optional, 0..1)
// ------------------------------------------------------------------------------

import { DEBUG } from './config.js';
import { MOTIVATIONAL_MAP } from './knowledge_base.js';
import { getTimeOfDay, getDayOfWeek } from './utils.js';

// Tunable windows
const MID_TERM_WINDOW = 15;   // number of recent turns to consider as "mid-term"
const LONG_TERM_WINDOW = 50;  // number of recent turns to consider as "long-term"

// Weighting parameters (easily tunable)
const BASE_LENGTH_WEIGHT = 0.5;        // base multiplier for message length
const MAX_LENGTH_WEIGHT = 1.5;         // cap for length influence
const INTENSITY_WEIGHT_FACTOR = 1.2;   // how strongly fingerprint.intensity affects weight
const RECENCY_DECAY_HALF_LIFE = 7;     // half-life in turns for recency decay (exponential)

// Minimum counts to surface a long-term trigger
const LONG_TERM_TRIGGER_THRESHOLD = 4;

// Utility: safe parse date
function _toDate(d) {
  try { return d ? new Date(d) : new Date(); } catch (e) { return new Date(); }
}

// Utility: recency decay factor based on index (0 = most recent)
function _recencyDecay(index) {
  // exponential decay: decay = 0.5 ^ (index / half_life)
  return Math.pow(0.5, index / RECENCY_DECAY_HALF_LIFE);
}

// Utility: compute weight for a given turn
function _computeTurnWeight(turn, indexFromMostRecent = 0) {
  // length-based weight
  const msg = (turn.user_message || '');
  const len = Math.min(1000, msg.length); // clamp length
  // normalize length to [0..1] (simple heuristic): sqrt scale
  const lengthFactor = Math.sqrt(len) / Math.sqrt(1000);
  const lengthWeight = BASE_LENGTH_WEIGHT + (MAX_LENGTH_WEIGHT - BASE_LENGTH_WEIGHT) * lengthFactor;

  // intensity-based weight (fingerprint.intensity expected in 0..2.5 maybe)
  const intensity = (turn.user_fingerprint && typeof turn.user_fingerprint.intensity === 'number')
    ? turn.user_fingerprint.intensity
    : 0;
  const intensityWeight = 1 + Math.min(1.5, intensity / INTENSITY_WEIGHT_FACTOR); // cap influence

  // clarity penalty (if clarity_score exists and is low, reduce weight)
  const clarity = (typeof turn.clarity_score === 'number') ? turn.clarity_score : 1.0; // default clear
  const clarityPenalty = Math.max(0.5, clarity); // if clarity <0.5, penalize but keep >=0.5

  // recency decay
  const recency = _recencyDecay(indexFromMostRecent);

  const raw = lengthWeight * intensityWeight * clarityPenalty * recency;
  return parseFloat(raw.toFixed(4));
}

// HistoryAnalyzer: now with weighting, dominant pattern detection, and frequency with weights.
class HistoryAnalyzer {
  constructor(fullHistory) {
    // fullHistory: array of turns ordered oldest -> newest
    this.history = Array.isArray(fullHistory) ? fullHistory.slice() : [];
  }

  // internal helper: take last N turns and compute weights (most recent has index 0)
  _getWindowWithWeights(windowSize) {
    const recent = this.history.slice(-windowSize); // oldest -> newest
    // reverse for indexFromMostRecent
    const rev = recent.slice().reverse(); // newest -> oldest
    const withWeights = rev.map((turn, idx) => {
      const w = _computeTurnWeight(turn, idx);
      return { turn, weight: w, indexFromMostRecent: idx };
    });
    return withWeights; // newest first
  }

  // findDominantPatterns: returns weighted dominant concepts and needs
  findDominantPatterns(windowSize) {
    const window = this._getWindowWithWeights(windowSize); // newest->oldest
    const conceptScores = {}; // concept -> accumulated weight
    const needScores = {};    // need -> accumulated weight

    for (const entry of window) {
      const { turn, weight } = entry;
      const fp = turn.user_fingerprint || {};
      // concepts: each concept may have its own 'weighted' value; we'll combine
      (fp.concepts || []).forEach(c => {
        const name = (typeof c === 'string') ? c : (c.concept || 'unknown');
        // concept local score: turn weight * (c.weighted || 1)
        const local = weight * (typeof c.weighted === 'number' ? c.weighted : 1);
        conceptScores[name] = (conceptScores[name] || 0) + local;
      });
      // chosenPrimaryNeed
      const need = fp.chosenPrimaryNeed;
      if (need) {
        needScores[need] = (needScores[need] || 0) + weight;
      }
    }

    // convert to sorted arrays
    const dominantConcepts = Object.keys(conceptScores)
      .map(k => ({ concept: k, score: conceptScores[k] }))
      .sort((a, b) => b.score - a.score)
      .map(e => e.concept)
      .slice(0, 5); // choose top 5 for richer signal

    const dominantNeeds = Object.keys(needScores)
      .map(k => ({ need: k, score: needScores[k] }))
      .sort((a, b) => b.score - a.score)
      .map(e => e.need)
      .slice(0, 3);

    return {
      dominantConcepts,
      dominantNeeds,
      rawConceptScores: conceptScores,
      rawNeedScores: needScores
    };
  }

  // detectCorrelations: now also signals frequency counts with weights, and returns structured insights
  detectCorrelations() {
    const insights = [];
    // Example: day-of-week correlation for a target concept like 'anxiety'
    const targetConcepts = ['anxiety', 'قلق']; // bilingual heuristic
    // Map dayIndex -> weighted count
    const dayCounts = {};
    for (let i = 0; i < 7; i++) dayCounts[i] = 0;

    // iterate full history with recency weighting (most recent counts more)
    const revAll = this.history.slice().reverse(); // newest first
    for (let idx = 0; idx < revAll.length; idx++) {
      const turn = revAll[idx];
      const fp = turn.user_fingerprint || {};
      const date = _toDate(turn.timestamp);
      const day = date.getDay(); // 0-6
      // compute turn weight (indexFromMostRecent = idx)
      const weight = _computeTurnWeight(turn, idx);
      const hasTarget = (fp.concepts || []).some(c => {
        const name = (typeof c === 'string') ? c : (c.concept || '').toString();
        return targetConcepts.includes(name);
      });
      if (hasTarget) {
        dayCounts[day] = dayCounts[day] + weight;
      }
    }

    // check if any day has significantly higher weighted count
    const entries = Object.entries(dayCounts).map(([d, v]) => ({ day: Number(d), score: v }));
    entries.sort((a, b) => b.score - a.score);
    if (entries.length > 0) {
      const top = entries[0];
      const second = entries[1] || { score: 0 };
      // if top is substantially higher than second and above a threshold
      if (top.score > 0.5 && top.score > (second.score * 1.8 + 0.01)) {
        const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        insights.push(`Pattern detected: User expresses target emotional concepts more often on ${dayNames[top.day]}.`);
      }
    }

    // Long-term trigger discovery by frequency of concepts (weighted)
    const weightedConceptTotals = {};
    const revWindow = this.history.slice().reverse().slice(0, LONG_TERM_WINDOW); // newest first
    for (let idx = 0; idx < revWindow.length; idx++) {
      const t = revWindow[idx];
      const fp = t.user_fingerprint || {};
      const w = _computeTurnWeight(t, idx);
      (fp.concepts || []).forEach(c => {
        const name = (typeof c === 'string') ? c : (c.concept || 'unknown');
        weightedConceptTotals[name] = (weightedConceptTotals[name] || 0) + w;
      });
    }
    // Find concepts exceeding threshold
    const frequent = Object.entries(weightedConceptTotals)
      .map(([k, v]) => ({ concept: k, score: v }))
      .filter(e => e.score >= LONG_TERM_TRIGGER_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    frequent.slice(0, 5).forEach(f => {
      insights.push(`Long-term trigger: Frequent concept detected -> ${f.concept} (score: ${f.score.toFixed(2)})`);
    });

    return insights;
  }
}

// Main ContextEngine with User Modeling + Flags + Weighted summaries
export class ContextEngine {
  constructor(userProfile = {}, requestInfo = {}) {
    // userProfile.longTermHistory should be an array of turns (oldest -> newest)
    this.userProfile = userProfile;
    this.requestInfo = requestInfo;
    this.historyAnalyzer = new HistoryAnalyzer(this.userProfile.longTermHistory || []);
  }

  // gather external context sensors
  _gatherExternalContext() {
    return {
      timeOfDay: getTimeOfDay(),
      dayOfWeek: getDayOfWeek()
    };
  }

  // generate the enriched user model with weighted patterns
  _generateUserModel() {
    // weighted mid-term patterns
    const mid = this.historyAnalyzer.findDominantPatterns(MID_TERM_WINDOW);
    // weighted long-term correlations
    const longCorrelations = this.historyAnalyzer.detectCorrelations();

    // Build a "confidence" score for each dominant need concept by normalizing rawNeedScores
    const needConfidences = {};
    const rawNeedScores = mid.rawNeedScores || {};
    const maxNeed = Math.max(0, ...Object.values(rawNeedScores));
    Object.keys(rawNeedScores).forEach(k => {
      needConfidences[k] = maxNeed > 0 ? parseFloat((rawNeedScores[k] / maxNeed).toFixed(3)) : 0;
    });

    const userModel = {
      dominantMidTermConcepts: mid.dominantConcepts,
      dominantMidTermNeeds: mid.dominantNeeds,
      needConfidences,
      detectedLongTermPatterns: longCorrelations,
      // lightweight persona hints (future): communication_style, preferred_persona
    };

    if (DEBUG) console.log('🧭 [ContextEngine] Generated User Model:', userModel);
    return userModel;
  }

  // smart flags that combine short/mid/long signals (no side-effects)
  _generateSmartFlags() {
    const flags = [];
    const history = this.userProfile.longTermHistory || [];
    const lastN = history.slice(-MID_TERM_WINDOW);

    // possible_loop_detected: identical user fingerprint chosenPrimaryNeed repeated 4 times
    if (lastN.length >= 4) {
      let repeated = true;
      const firstNeed = lastN[lastN.length - 1].user_fingerprint?.chosenPrimaryNeed || null;
      if (!firstNeed) repeated = false;
      for (let i = 0; i < 4 && repeated; i++) {
        const idx = lastN.length - 1 - i;
        const need = lastN[idx].user_fingerprint?.chosenPrimaryNeed || null;
        if (need !== firstNeed) repeated = false;
      }
      if (repeated && firstNeed) flags.push(`possible_loop_detected:${firstNeed}`);
    }

    // emotional_spike_detected: if newest turn intensity >> mid-term average
    const newest = history[history.length - 1];
    if (newest && newest.user_fingerprint && typeof newest.user_fingerprint.intensity === 'number') {
      // compute mid-term avg intensity (weighted)
      const window = this.historyAnalyzer._getWindowWithWeights(MID_TERM_WINDOW);
      const avgIntensity = window.length > 0
        ? (window.reduce((s, e) => s + ((e.turn.user_fingerprint && e.turn.user_fingerprint.intensity) || 0) * e.weight, 0)
           / (window.reduce((s, e) => s + e.weight, 0) || 1))
        : 0;
      const currentIntensity = newest.user_fingerprint.intensity;
      if (avgIntensity > 0 && currentIntensity >= avgIntensity * 1.8 && currentIntensity > 0.6) {
        flags.push('emotional_spike_detected');
      }
    }

    // long_term_trigger: if detectCorrelations returns items
    const longCorrelations = this.historyAnalyzer.detectCorrelations();
    longCorrelations.forEach(ic => {
      if (ic && ic.toString) flags.push(`long_term_insight:${ic.toString()}`);
    });

    // low_clarity_detected: check last few turns for clarity_score < 0.5
    const lowClarityCount = (history.slice(-10) || []).filter(t => typeof t.clarity_score === 'number' && t.clarity_score < 0.5).length;
    if (lowClarityCount >= 3) flags.push('low_clarity_detected');

    return flags;
  }

  // Main function to generate the full context (backward compatible)
  generateFullContext() {
    if (DEBUG) console.log(`[ContextEngine v15.1] Generating full context for user ${this.userProfile.id || '<anon>'}...`);

    const external = this._gatherExternalContext();
    const userModel = this._generateUserModel();
    const flags = this._generateSmartFlags();

    // Provide quick weighted summaries for consumers
    const midWindow = this.historyAnalyzer.findDominantPatterns(MID_TERM_WINDOW);
    const longWindow = this.historyAnalyzer.findDominantPatterns(LONG_TERM_WINDOW);
    // create compact weighted signals
    const weightedSummary = {
      topMidConcepts: midWindow.dominantConcepts,
      topMidNeeds: midWindow.dominantNeeds,
      topLongConcepts: longWindow.dominantConcepts,
      topLongNeeds: longWindow.dominantNeeds
    };

    const fullContext = {
      // structural pieces
      external,
      userModel,
      flags,

      // convenience aliases for legacy modules
      timeOfDay: external.timeOfDay,
      dominantNeeds: userModel.dominantMidTermNeeds,
      dominantConcepts: userModel.dominantMidTermConcepts,

      // weighted summary for fast decision heuristics
      weightedSummary
    };

    if (DEBUG) console.log('[ContextEngine v15.1] fullContext ready:', {
      timeOfDay: fullContext.timeOfDay,
      flags: fullContext.flags,
      topNeeds: fullContext.dominantNeeds
    });

    return fullContext;
  }
}
