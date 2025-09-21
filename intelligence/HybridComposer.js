// intelligence/HybridComposer.js v2.0-maestro (FINAL UPGRADED VERSION)
// THE HYBRID COMPOSER — "THE CONSCIOUS MAESTRO"

const DEBUG = false;

/* =========================
   Tunables & Config (As before)
   ========================= */
const DEFAULT_PERSONAS = [
  { id: "logical", weight: 1.0, desc: "منطق، أسباب، خطوات" },
  { id: "empathic", weight: 1.0, desc: "تعاطف، تطبيع، تأييد" },
  { id: "pragmatic", weight: 1.0, desc: "خطوات عملية قابلة للتنفيذ" },
  { id: "visionary", weight: 0.9, desc: "سناريوهات مستقبلية" },
  { id: "playful", weight: 0.4, desc: "خفيف، تقليل توتر" }
];

// ... (All other constants like MAX_VARIANTS, etc. remain the same) ...

/* =========================
   Helpers (As before)
   ========================= */
function safeStr(s) { return (s === null || s === undefined) ? "" : String(s); }
function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function sample(arr) { if (!arr || arr.length === 0) return null; return arr[Math.floor(Math.random() * arr.length)]; }
function nowISO() { return (new Date()).toISOString(); }
function tokenizeWords(text) { /* ... as before ... */ }
function jaccardSim(a = "", b = "") { /* ... as before ... */ }
function firstSentence(text) { /* ... as before ... */ }

/* =========================
   Persona modules (As before)
   ========================= */
// ... (All persona functions like personaLogical, personaEmpathic, etc. remain exactly the same) ...

/* =========================
   Inner Critics / Validators (As before)
   ========================= */
// ... (All validator functions like safetyCheck, hallucinationCheck, etc. remain exactly the same) ...

/* =========================
   Fusion Core (As before)
   ========================= */
// ... (All core functions like analyzeCandidates, composeFragmentsFromAnalysis, etc. remain exactly the same) ...


// --- [NEW STRATEGIC LAYER] ---
/* =================================================
   THE MAESTRO'S WEAVING ROOM: From Selection to Artful Synthesis
   ================================================= */
function createEmpathyBridge(fingerprint) {
    const bridges = [
        "أنا هنا معك في هذا الشعور. وعندما تشعر أنك مستعد، يمكننا أن نلقي نظرة على خطوة صغيرة جدًا قد تساعد.",
        "من المهم أن نعطي هذا الشعور حقه. وفي نفس الوقت، أحيانًا خطوة عملية بسيطة يمكن أن تخفف بعض العبء. ما رأيك أن نجرب؟",
        "دعنا لا نحاول حل المشكلة الكبيرة الآن، بل فقط نضيء شمعة صغيرة في هذا المكان المظلم. إليك فكرة بسيطة:"
    ];
    // Future enhancement: select bridge based on fingerprint.intensity
    return sample(bridges);
}

function weaveEmpathyAndAction(empathicCandidate, practicalCandidate, fingerprint) {
    // 1. Start with pure, unconditional empathy
    const validation = firstSentence(empathicCandidate.reply);
    
    // 2. Build a bridge that connects the feeling to the problem
    const bridge = createEmpathyBridge(fingerprint);
    
    // 3. Offer a gentle, simplified version of the practical advice
    const gentleAction = `كخطوة أولى، ${firstSentence(practicalCandidate.reply).replace("اقتراح عملي:", "").trim()}`;

    const finalReplyText = `${validation}\n\n${bridge}\n\n${gentleAction}`;
    
    return { 
        reply: finalReplyText, 
        source: 'maestro_weaver:empathy_to_action',
        confidence: 0.98, // High confidence as it's a strategic composition
        metadata: {
            strategy: 'weave',
            components: [empathicCandidate.source, practicalCandidate.source]
        }
    };
}


/* =========================
   API: synthesizeHybridResponse (THE MAESTRO'S PODIUM)
   ========================= */
function synthesizeHybridResponse(candidates = [], context = {}) {
  const { tracker = null, fingerprint = {} } = context;

  const fallbackResponse = {
    reply: "أنا معاك، ممكن توضّح أكتر؟", source: "hybrid_composer_fallback",
    variants: [], metadata: { reason: "no_candidates_or_analysis_failed" }
  };

  if (!Array.isArray(candidates) || candidates.length === 0) return fallbackResponse;
  
  const safety = safetyCheck(fingerprint, candidates);
  if (!safety.ok) {
    return { reply: "لاحظت إشارات للخطر...", source: "hybrid_safety", variants: [], metadata: { safetyFlags: safety.flags } };
  }

  const analyzed = analyzeCandidates(candidates, tracker, fingerprint);
  if (!analyzed || analyzed.length === 0) return fallbackResponse;
  
  // --- [NEW MAESTRO STRATEGIC LOGIC] ---
  const primaryEmotion = fingerprint?.primaryEmotion?.type || 'neutral';
  const hasProblemContext = fingerprint?.concepts?.some(c => ['decision_making', 'work', 'procrastination'].includes(c.concept));
  
  // STRATEGY 1: Handle complex emotional + practical situations (The Weaving Strategy)
  if ((primaryEmotion === 'anxiety' || primaryEmotion === 'sadness') && hasProblemContext) {
      if (DEBUG) console.log("MAESTRO STRATEGY: Weaving Empathy with Action.");
      
      const empathicSource = analyzed.find(c => c.candidate.source === 'empathic_safety_net' || c.personaAvg > 0.6);
      const practicalSource = analyzed.find(c => c.candidate.source.includes('v9engine') || c.candidate.source.includes('synthesizer'));

      if (empathicSource && practicalSource) {
          const wovenResponse = weaveEmpathyAndAction(empathicSource.candidate, practicalSource.candidate, fingerprint);
          // We can generate variants for this woven response as well
          const variants = generateVariants(wovenResponse.reply, []); // Simplified variants for now
          return { ...wovenResponse, variants };
      }
  }

  // STRATEGY 2: Default to the best-analyzed candidate if no special strategy applies (The Conductor Strategy)
  if (DEBUG) console.log("MAESTRO STRATEGY: Conducting - Selecting the best single performer.");
  const topCandidate = analyzed[0].candidate;
  
  // We still use the original logic for fragment composition and variant generation for the top candidate
  const { fragments: rawFragments, provenance } = composeFragmentsFromAnalysis(analyzed, context);
  const { fragments } = resolveContradictions(rawFragments);
  
  const fusedText = surfaceRealizer(fragments);
  const variants = generateVariants(fusedText, fragments);
  
  let primaryVariant = variants.find(v => v.id === "expanded") || variants[0] || { text: topCandidate.reply };

  const metadata = {
    source: `maestro_conductor:${topCandidate.source}`,
    provenance: buildProvenance(provenance, analyzed, fragments, variants, fingerprint),
    // ... other metadata
  };

  return {
    reply: `${primaryVariant.text}\n\n[ملحوظة: تم توليد الرد من مزيج متعدد الأصوات.]`,
    variants,
    metadata
  };
}

// --- MODIFICATION: Standardized the default export ---
export default { synthesizeHybridResponse };

// NOTE: Some original functions like `generateFollowUpSeeds` are now part of the main function flow
// or can be called on the final response object. The core logic is preserved and built upon.
