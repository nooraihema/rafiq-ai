// intelligence_layer.js

// =================================================================
// START: ADVANCED INTELLIGENCE LAYER - HELPER FUNCTIONS
// =================================================================
export function getHistoricalContext(entities, profile) {
  if (!entities || entities.length === 0 || !profile.longTermProfile || !profile.longTermProfile.mentioned_entities) {
    return null;
  }

  const mainEntity = entities[0];
  const memory = profile.longTermProfile.mentioned_entities[mainEntity];

  if (!memory) return null;

  let dominantSentiment = null;
  let maxCount = 0;
  if (memory.sentiment_associations) {
    for (const sentiment in memory.sentiment_associations) {
      if (memory.sentiment_associations[sentiment] > maxCount) {
        maxCount = memory.sentiment_associations[sentiment];
        dominantSentiment = sentiment;
      }
    }
  }

  if (memory.mention_count > 2 && ['حزن', 'قلق', 'غضب'].includes(dominantSentiment)) {
    return {
      entity: mainEntity,
      insight: `أتذكر أننا تحدثنا عن "${mainEntity}" من قبل، ويبدو أنه موضوع يمثل تحديًا مستمرًا لك.`
    };
  }
  
  return null;
}

export function getProactiveOpening(profile) {
  if (!profile.longTermProfile || !profile.longTermProfile.mentioned_entities) {
    return null;
  }

  let lastImportantTopic = null;
  let lastDate = new Date(0);

  for (const entityName in profile.longTermProfile.mentioned_entities) {
    const entity = profile.longTermProfile.mentioned_entities[entityName];
    const entityDate = new Date(entity.last_mentioned);
    
    if (entity.mention_count > 3 && entityDate > lastDate) {
      lastDate = entityDate;
      lastImportantTopic = entityName;
    }
  }

  if (lastImportantTopic) {
    return `أهلاً بعودتك. في آخر مرة تحدثنا، كان "${lastImportantTopic}" يشغل تفكيرك. كيف هي الأمور بخصوص هذا الموضوع الآن؟`;
  }

  return null;
}

export function analyzePatterns(profile) {
  if (!profile.longTermProfile || !profile.longTermProfile.mentioned_entities) {
    return null;
  }

  let mostNegativeEntity = null;
  let maxNegativeScore = 0;

  for (const entityName in profile.longTermProfile.mentioned_entities) {
    const entity = profile.longTermProfile.mentioned_entities[entityName];
    const negativeScore = (entity.sentiment_associations?.['حزن'] || 0) + 
                          (entity.sentiment_associations?.['قلق'] || 0) + 
                          (entity.sentiment_associations?.['غضب'] || 0);

    if (negativeScore > 5 && negativeScore > maxNegativeScore) {
      maxNegativeScore = negativeScore;
      mostNegativeEntity = entityName;
    }
  }

  if (mostNegativeEntity) {
    if (profile.flags && !profile.flags.shared_pattern_insight) {
      return `لقد لاحظت شيئًا أثناء حديثنا معًا، وربما أكون مخطئًا. يبدو أن موضوع "${mostNegativeEntity}" يظهر بشكل متكرر عندما نتحدث عن المشاعر الصعبة. هل تلاحظ هذا الرابط أيضًا؟`;
    }
  }
  return null;
}
// =================================================================
// END: ADVANCED INTELLIGENCE LAYER - HELPER FUNCTIONS
// =================================================================


// --- Compositional Intelligence Function ---
export function composeResponse(constructor, context) {
  if (!constructor) return null;

  const { mood, entities, isRecurring, intentTag, profile, historicalInsight } = context;
  let finalResponseParts = [];
  const mainEntity = entities.length > 0 ? entities[0] : null;

  // ADVANCED INTELLIGENCE: Prioritize historical insight as the strongest opener.
  if (historicalInsight && historicalInsight.insight) {
      finalResponseParts.push(historicalInsight.insight);
  } else if (constructor.openers && constructor.openers.length > 0) {
    let opener = constructor.openers[Math.floor(Math.random() * constructor.openers.length)];
    if (mainEntity) opener = opener.replace(/\{ENTITY\}/g, mainEntity);
    if (mood && mood !== 'محايد') opener = opener.replace(/\{MOOD\}/g, mood);
    finalResponseParts.push(opener);
  }

  if (constructor.memory_hooks && constructor.memory_hooks.length > 0) {
    for (const hook of constructor.memory_hooks) {
      if (hook.if_recurring_theme && isRecurring && hook.if_recurring_theme === intentTag) {
        finalResponseParts.push(hook.phrase);
      }
      if (hook.if_entity_mentioned && mainEntity && hook.if_entity_mentioned === mainEntity) {
        let phrase = hook.phrase.replace(/\{ENTITY\}/g, mainEntity);
        finalResponseParts.push(phrase);
      }
    }
  }
  
  if (constructor.validations && constructor.validations.length > 0) {
    const validation = constructor.validations[Math.floor(Math.random() * constructor.validations.length)];
    finalResponseParts.push(validation);
  }
  
  if (constructor.continuers && constructor.continuers.length > 0) {
    const continuer = constructor.continuers[Math.floor(Math.random() * constructor.continuers.length)];
    finalResponseParts.push(continuer);
  }

  return finalResponseParts.filter(Boolean).join(' ');
}

