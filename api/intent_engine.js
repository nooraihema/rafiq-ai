// intent_engine.js v10.0 - The Meta-Cognitive Oracle

import fs from "fs";
import path from "path";
import { DEBUG } from './config.js';
import { normalizeArabic, tokenize, levenshtein, hasNegationNearby, hasEmphasisNearby } from './utils.js';

// --- Global Variables ---
let intentIndex = [];
export let tagToIdx = {};
let synonymData = { map: {}, weights: {} };

// --- Synonym Engine v3.0 (Dynamic Weights) ---
function loadSynonyms() {
    const synonymsPath = path.join(process.cwd(), "synonyms.json");
    if (fs.existsSync(synonymsPath)) {
        try {
            const raw = fs.readFileSync(synonymsPath, "utf8");
            const parsedSynonyms = JSON.parse(raw);
            synonymData = { map: {}, weights: {} };
            
            for (const key in parsedSynonyms) {
                const normalizedKey = normalizeArabic(key);
                const values = parsedSynonyms[key].map(v => normalizeArabic(v));
                const allWords = [normalizedKey, ...values];

                allWords.forEach(word => {
                    synonymData.map[word] = allWords;
                    const distance = levenshtein(word, normalizedKey);
                    const weight = Math.max(0.7, 1 - (distance / (normalizedKey.length * 1.5)));
                    synonymData.weights[word] = (word === normalizedKey) ? 1.0 : parseFloat(weight.toFixed(2));
                });
            }
            if (DEBUG) console.log(`📚 Synonyms v3.0 (Dynamic Weights) loaded with ${Object.keys(parsedSynonyms).length} groups.`);
        } catch (e) {
            console.error("❌ Failed to parse synonyms.json.", e);
        }
    }
}

function getSynonymWeight(token) {
    return synonymData.weights[token] || 1.0;
}

// --- Intent Loading and Indexing ---
function loadIntentsRaw() {
    let intentsDir = path.join(process.cwd(), "intents");
    if (!fs.existsSync(intentsDir)) intentsDir = path.join(process.cwd(), "api", "intents");
    
    if (!fs.existsSync(intentsDir)) {
        const errorMsg = "CRITICAL ERROR: Could not find the 'intents/' directory.";
        console.error(errorMsg);
        throw new Error(errorMsg);
    } 
    console.log(`✅ SUCCESS: Located intents directory at: ${intentsDir}`);
    
    let allIntents = [];
    try {
        const files = fs.readdirSync(intentsDir);
        for (const file of files) {
            if (file.endsWith(".json")) {
                const filePath = path.join(intentsDir, file);
                const rawContent = fs.readFileSync(filePath, "utf8");
                const jsonContent = JSON.parse(rawContent);
                const intentsArray = Array.isArray(jsonContent.intents) ? jsonContent.intents : (Array.isArray(jsonContent) ? jsonContent : []);
                allIntents = allIntents.concat(intentsArray);
            }
        }
        if (DEBUG) console.log(`✨ Total intents loaded: ${allIntents.length}`);
        return allIntents;
    } catch (e) {
        console.error(`❌ ERROR: Failed to read/parse files from intents directory. Error: ${e.message}`);
        return [];
    }
}

function cosineScore(vecA, vecB, normA, normB) {
  if (!vecA || !vecB) return 0;
  let dot = 0;
  for (const t in vecA) {
    if (vecB[t]) dot += vecA[t] * vecB[t];
  }
  const denom = (normA || 1) * (normB || 1);
  return denom ? (dot / denom) : 0;
}

function autoLinkIntents() {
    let linkCount = 0;
    for (let i = 0; i < intentIndex.length; i++) {
        for (let j = i + 1; j < intentIndex.length; j++) {
            const sim = cosineScore(
                intentIndex[i].tfidfVector,
                intentIndex[j].tfidfVector,
                intentIndex[i].tfidfNorm,
                intentIndex[j].tfidfNorm
            );
            if (sim > 0.6) { // Similarity threshold for auto-linking
                intentIndex[i].related_intents.push(intentIndex[j].tag);
                intentIndex[j].related_intents.push(intentIndex[i].tag);
                linkCount++;
            }
        }
    }
    if (DEBUG) console.log(`🔗 Auto-linked ${linkCount} pairs of related intents.`);
}


export function buildIndexSync() {
    loadSynonyms();
    const INTENTS_RAW = loadIntentsRaw();
    if (INTENTS_RAW.length === 0) console.warn("WARNING: No intents were loaded.");
    
    const docs = INTENTS_RAW.map(it => tokenize([...(it.patterns || []), ...(it.keywords || [])].join(" ")));
    
    const df = {};
    docs.forEach(tokens => new Set(tokens).forEach(t => df[t] = (df[t] || 0) + 1));
    const N = Math.max(1, docs.length);
    const idf = {};
    Object.keys(df).forEach(t => idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1);

    intentIndex = INTENTS_RAW.map((it, i) => {
        const tokens = docs[i];
        const vec = {};
        let sq = 0;
        const tokenCounts = tokens.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
        const totalTokens = Math.max(1, tokens.length);
        
        for (const t in tokenCounts) {
            const tf = tokenCounts[t] / totalTokens;
            const v = tf * (idf[t] || 1);
            vec[t] = v;
            sq += v * v;
        }
        
        const compiledPatterns = (it.patterns || []).map(p => {
            try {
                const escapedPattern = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(escapedPattern, 'i');
            } catch (e) {
                console.warn(`⚠️ Invalid regex pattern skipped in tag [${it.tag}]: ${p}`);
                return null;
            }
        }).filter(Boolean);

        return {
            tag: it.tag, 
            responses: it.responses, 
            response_constructor: it.response_constructor, 
            safety: it.safety,
            keywords: (it.keywords || []).map(normalizeArabic), 
            patterns: compiledPatterns,
            follow_up_intents: it.follow_up_intents || [],
            related_intents: it.related_intents || [],
            tfidfVector: vec, 
            tfidfNorm: Math.sqrt(sq) || 1, 
        };
    });
    
    autoLinkIntents(); // Auto-link intents after they are all indexed

    tagToIdx = {};
    intentIndex.forEach((e, idx) => tagToIdx[e.tag] = idx);
    if (DEBUG) console.log("🚀 Engine v10.0 (Meta-Cognitive Oracle) indexed successfully. Total Intents:", intentIndex.length);
}

// --- Scoring Engine v10.0 ---
function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

export function scoreIntent(rawMessage, msgTfVec, msgTfNorm, intent, context, userProfile) {
  const normMsg = normalizeArabic(rawMessage);
  const originalMsgTokens = tokenize(rawMessage);
  
  let weightedMatchCount = 0;
  const matchedTerms = new Set();
  
  (intent.keywords || []).forEach(kw => {
    const nkw = normalizeArabic(kw);
    const kwTokens = tokenize(nkw);
    const expandedKwTokens = expandTokensWithSynonyms(kwTokens);
    
    if ([...expandedKwTokens].some(et => normMsg.includes(et)) && !hasNegationNearby(rawMessage, nkw)) {
        const matchingToken = originalMsgTokens.find(ut => expandedKwTokens.has(ut));
        if (matchingToken) {
            weightedMatchCount += getSynonymWeight(matchingToken);
            matchedTerms.add(nkw);
        }
    }
  });

  let bestPatternSimilarity = 0;
  (intent.patterns || []).forEach(regex => {
    if (regex.test(normMsg) && !hasNegationNearby(rawMessage, regex.source)) {
      weightedMatchCount += 1.0;
      matchedTerms.add(regex.source);
      
      const patternTokens = new Set(tokenize(regex.source));
      const similarity = jaccardSimilarity(new Set(originalMsgTokens), patternTokens);
      if (similarity > bestPatternSimilarity) {
        bestPatternSimilarity = similarity;
      }
    }
  });
  
  const countScore = weightedMatchCount > 0 ? (weightedMatchCount / (weightedMatchCount + 2)) : 0;
  const csTf = cosineScore(msgTfVec, intent.tfidfVector, msgTfNorm, intent.tfidfNorm) || 0;

  // --- Smart Bonuses v10.0 ---
  const tagWords = new Set((intent.tag || "").split('_'));
  const tagMatchCount = originalMsgTokens.filter(token => tagWords.has(token)).length;
  const tagBonus = tagMatchCount > 0 ? 0.25 * tagMatchCount : 0;
  const specificityBonus = bestPatternSimilarity * 0.30;
  let emphasisBoost = 0;
  matchedTerms.forEach(t => {
      if (hasEmphasisNearby(rawMessage, t)) emphasisBoost += 0.10;
  });

  // --- Decaying & Multi-Dimensional Context Boost v10.0 ---
  let contextBoost = 0;
  if (context && context.history) {
    context.history.forEach(item => {
        const lastIntent = intentIndex.find(i => i.tag === item.tag);
        if (lastIntent) {
            const decayFactor = Math.exp(-0.1 * item.age); // Exponential decay
            if (lastIntent.follow_up_intents.includes(intent.tag)) {
                contextBoost += 0.40 * decayFactor; 
            }
            if (lastIntent.related_intents.includes(intent.tag)) {
                contextBoost += 0.20 * decayFactor;
            }
        }
    });
  }

  // --- Adaptive Learning Boost v10.0 ---
  let adaptiveBoost = 0;
  if (userProfile && userProfile.intentSuccessCount && userProfile.intentSuccessCount[intent.tag]) {
      const successes = userProfile.intentSuccessCount[intent.tag];
      adaptiveBoost = Math.min(0.20, successes * 0.02);
      const lastUsed = userProfile.intentLastSuccess?.[intent.tag];
      if (lastUsed) {
          const ageDays = (Date.now() - new Date(lastUsed)) / (1000 * 60 * 60 * 24);
          adaptiveBoost *= Math.exp(-0.05 * ageDays);
      }
  }

  // --- Final Score Calculation v10.0 ---
  const wCount = 0.55;
  const wTf = 0.10;
  const final = (countScore * wCount) + (csTf * wTf) + tagBonus + specificityBonus + emphasisBoost + contextBoost + adaptiveBoost;
  
  // --- Confidence Levels v10.0 ---
  let confidence = "low";
  if (final > 0.7) confidence = "high";
  else if (final > 0.4) confidence = "medium";

  const scoreBreakdown = {
      base: { count: countScore * wCount, tfidf: csTf * wTf },
      bonuses: { tag: tagBonus, specificity: specificityBonus, emphasis: emphasisBoost },
      context: { context: contextBoost, adaptive: adaptiveBoost },
      final: Math.min(final, 1.0),
      confidence,
      matchedTerms: [...matchedTerms]
  };

  if (DEBUG && scoreBreakdown.final > 0.20) {
      console.log(`\n--- DEBUG [${intent.tag}] | Final: ${scoreBreakdown.final.toFixed(3)} (${confidence}) ---`);
      Object.keys(scoreBreakdown).forEach(key => {
          if (typeof scoreBreakdown[key] === 'object' && key !== 'matchedTerms') {
              const parts = Object.entries(scoreBreakdown[key]).map(([k, v]) => `${k}: ${v.toFixed(3)}`).join(' | ');
              console.log(`  - ${key.padEnd(10)}: ${parts}`);
          }
      });
  }
  
  return scoreBreakdown;
}

export function buildMessageTfVec(message) {
  const tokens = tokenize(message);
  const vec = {};
  const tokenCounts = tokens.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const totalTokens = Math.max(1, tokens.length);
  for (const t in tokenCounts) {
    const tf = tokenCounts[t] / totalTokens;
    vec[t] = tf;
  }
  // Norm calculation is not needed here as it's part of msgTfNorm in the handler
  return vec;
}

// All other functions (Embeddings etc.) are kept for potential future use but are not essential for v10.0 logic.
// They can be copy-pasted from previous versions if needed.
