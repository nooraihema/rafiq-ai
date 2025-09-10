// intelligence_layer.js v13.0 - Integrated Wisdom Layer
// Now fully integrated with the main chat handler and featuring periodic insights.

// =================================================================
// START: ADVANCED MEMORY & PATTERN RECOGNITION FUNCTIONS
// =================================================================

/**
 * Checks if any entity in the current message has a significant negative history.
 * @returns {object|null} An object with { entity, insight } or null.
 */
export function getHistoricalContext(entities, profile) {
  if (!entities || entities.length === 0 || !profile?.longTermProfile?.mentioned_entities) {
    return null;
  }

  // Find the first entity mentioned that has a significant history
  for (const entity of entities) {
    const memory = profile.longTermProfile.mentioned_entities[entity];
    if (!memory) continue;

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

    // If the entity is mentioned often and is associated with negative feelings, create an insight.
    if (memory.mention_count > 2 && ['حزن', 'قلق', 'غضب'].includes(dominantSentiment)) {
      return {
        entity,
        insight: `أتذكر أننا تحدثنا عن "${entity}" من قبل. يبدو أنه موضوع يمثل تحديًا مستمرًا لك.`
      };
    }
  }
  
  return null;
}

/**
 * Suggests a personalized conversation starter based on long-term memory.
 * Used for returning users with an empty message or generic greeting.
 * @returns {string|null} A proactive opening string or null.
 */
export function getProactiveOpening(profile) {
  if (!profile?.longTermProfile?.mentioned_entities) {
    return null;
  }

  let lastImportantTopic = null;
  let lastDate = new Date(0);

  for (const entityName in profile.longTermProfile.mentioned_entities) {
    const entity = profile.longTermProfile.mentioned_entities[entityName];
    const entityDate = new Date(entity.last_mentioned);
    
    // An important topic is one mentioned multiple times and recently.
    if (entity.mention_count > 3 && entityDate > lastDate) {
      lastDate = entityDate;
      lastImportantTopic = entityName;
    }
  }

  // Check if the last conversation was recent (e.g., within the last 7 days)
  const daysSinceLastTalk = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
  
  if (lastImportantTopic && daysSinceLastTalk < 7) {
    return `أهلاً بعودتك. في آخر مرة تحدثنا، كان موضوع "${lastImportantTopic}" يشغل تفكيرك. كيف هي الأمور بخصوص هذا الموضوع الآن؟`;
  }

  return null;
}


/**
 * Periodically analyzes long-term memory for recurring negative patterns.
 * This should be called only at certain milestones (e.g., every 25 messages).
 * @returns {string|null} An insightful observation string or null.
 */
export function getPeriodicInsight(profile) {
  if (!profile?.longTermProfile?.mentioned_entities || !profile.moodHistory) {
    return null;
  }
  
  const totalMessages = profile.moodHistory.length;
  // Trigger only at specific milestones and only once per milestone.
  const milestones = [25, 50, 100, 200];
  const currentMilestone = milestones.find(m => totalMessages >= m && !profile.flags[`insight_shared_${m}`]);

  if (!currentMilestone) {
    return null;
  }

  let mostNegativeEntity = null;
  let maxNegativeScore = 0;

  for (const entityName in profile.longTermProfile.mentioned_entities) {
    const entity = profile.longTermProfile.mentioned_entities[entityName];
    const negativeScore = (entity.sentiment_associations?.['حزن'] || 0) + 
                          (entity.sentiment_associations?.['قلق'] || 0) + 
                          (entity.sentiment_associations?.['غضب'] || 0);

    // An entity becomes a significant pattern if associated with negative feelings many times.
    if (negativeScore > 5 && negativeScore > maxNegativeScore) {
      maxNegativeScore = negativeScore;
      mostNegativeEntity = entityName;
    }
  }

  if (mostNegativeEntity) {
    // Mark this insight as shared so we don't repeat it.
    profile.flags[`insight_shared_${currentMilestone}`] = true;
    return `بالمناسبة، أثناء حديثنا معًا، لاحظت شيئًا قد يكون مهمًا. يبدو أن موضوع "${mostNegativeEntity}" يظهر بشكل متكرر عندما نتحدث عن المشاعر الصعبة. هل تلاحظ هذا الرابط أيضًا؟`;
  }

  return null;
}

// =================================================================
// END: ADVANCED MEMORY & PATTERN RECOGNITION FUNCTIONS
// =================================================================


// --- Compositional Intelligence Function (For structured intents) ---
// This function remains for intents that have a "response_constructor" field.
export function composeResponse(constructor, context) {
  if (!constructor) return null;

  const { mood, entities, isRecurring, intentTag, profile, historicalInsight } = context;
  let finalResponseParts = [];
  const mainEntity = entities.length > 0 ? entities[0] : null;

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
