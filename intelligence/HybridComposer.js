// intelligence/HybridComposer.js (v10.1 - Upgraded Core Integration)
// This version maintains the robust structure of v10.0, but updates the call
// to the linguistic core to pass the full, rich context it now requires,
// including the complete user state for advanced memory and mood analysis.

import { generateAdvancedReply } from './linguistic_core/index.js';

// =================================================================
// SECTION 1: LEGACY HELPERS & PERSONAS (Preserved for Fallback Logic)
// =================================================================

const DEBUG = true; // Set to true to see detailed logs

function safeStr(s) { return (s === null || s === undefined) ? "" : String(s); }
function nowISO() { return (new Date()).toISOString(); }
function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function sample(arr) { if (!arr || arr.length === 0) return null; return arr[Math.floor(Math.random() * arr.length)]; }
function tokenizeWords(text) {
    if (!text) return [];
    return safeStr(text).toLowerCase().split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}_]+/gu, "")).filter(Boolean);
}
function jaccardSim(a = "", b = "") {
    const s1 = new Set(tokenizeWords(a));
    const s2 = new Set(tokenizeWords(b));
    if (s1.size === 0 && s2.size === 0) return 1;
    const inter = [...s1].filter(x => s2.has(x)).length;
    const union = new Set([...s1, ...s2]).size || 1;
    return inter / union;
}
function firstSentence(text) {
    if (!text) return "";
    const m = safeStr(text).split(/(?<=[.؟!?])\s+/);
    return m[0] || text;
}
function dedupeSentences(text) {
    if (!text) return text;
    const parts = safeStr(text).split(/(?<=[.؟!?])\s+/).map(s => s.trim()).filter(Boolean);
    const seen = new Set(); const out = [];
    for (const p of parts) {
        const key = p.replace(/\s+/g, ' ').toLowerCase();
        if (!seen.has(key)) { seen.add(key); out.push(p); }
    }
    return out.join(' ');
}
function safeTruncateText(text, maxChars = 2400) {
    if (!text) return text;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars - 3) + '...';
}
function polishReply(text){
    if(!text) return text;
    let out = dedupeSentences(safeStr(text));
    out = out.replace(/\s+/g,' ').trim();
    out = out.replace(/\s+([؟.!])/g,'$1');
    return out;
}

const PERSONA_FUNCS = {
    logical: (candidate) => ({ persona: "logical", segment: "اقتراح منطقي: حاول كتابة الخيارات ثم قيّم كل خيار.", score: 0.95 }),
    empathic: (candidate) => ({ persona: "empathic", segment: `${firstSentence(candidate.reply) || "واضح إن الوضع صعب."} أنا معاك — مشاعرك مفهومة.`, score: 0.98 }),
    pragmatic: (candidate) => ({ persona: "pragmatic", segment: sample(["اقتراح عملي: جرّب تنفيذ أصغر نسخة من القرار لمدة 24 ساعة."]), score: 0.97 })
};

function analyzeCandidates(candidates = [], tracker = null, fingerprint = {}) {
    const history = tracker?.getHistory ? tracker.getHistory() : [];
    const recent = history.slice(-6).map(t => safeStr(t.ai_response?.reply || ""));
    return candidates.map(c => {
        const baseConf = clamp(Number(c.confidence ?? 0.6), 0, 1);
        const novelty = 1 - recent.reduce((m, r) => Math.max(m, jaccardSim(c.reply || "", r || "")), 0);
        const calibrated = clamp(baseConf * 0.8 + novelty * 0.2, 0, 1);
        return { candidate: c, calibratedScore: calibrated };
    }).sort((a, b) => b.calibratedScore - a.calibratedScore);
}

function pickBestForProtocol(scoredCandidates, protocolTag) {
    if (!protocolTag) return null;
    const matches = scoredCandidates.filter(s => safeStr(s.candidate.source).includes(protocolTag));
    if (matches.length === 0) return null;
    return matches[0].candidate;
}

function safetyCheck(fingerprint) {
    const flags = [];
    const text = safeStr(fingerprint?.originalMessage).toLowerCase();
    for (const e of ["انتحار", "بموت", "أقتل", "أذبح"]) if (text.includes(e)) flags.push("emergency_critical");
    return { ok: flags.length === 0, flags };
}

function createEmpathyBridge() {
    return sample(["أتفهم أنك تتعامل مع أكثر من شيء في نفس الوقت.", "شكرًا لمشاركة كل هذا."]);
}

function smartWeave(activeCandidate, newCandidate, fingerprint, scoredCandidates) {
    const empathic = scoredCandidates.find(s => s.candidate.source.includes('empathic'))?.candidate || activeCandidate;
    const practical = newCandidate;
    const intro = firstSentence(empathic.reply);
    const body = firstSentence(practical.reply);
    const reply = `${intro}\n\n${createEmpathyBridge()}\n\nوبخصوص الجزء العملي، ${body}`;
    return { reply, source: 'maestro_weaver:smart_weave', confidence: 0.98, metadata: { strategy: 'empathic_then_practical' } };
}

// =================================================================
// SECTION 2: THE NEW UNIFIED API
// =================================================================

export function synthesizeHybridResponse(candidates = [], briefing = {}, context = {}, options = {}) {
    console.log(`\n\n- - - [HybridComposer ENTRY v10.1] ---`);
    const { tracker = null, fingerprint = {}, user_message = "", userId = 'anon' } = context;

    // --- SAFETY & PRE-CHECKS ---
    if (!Array.isArray(candidates) || candidates.length === 0) {
        console.log("[HybridComposer] EXIT: No candidates provided. Returning fallback.");
        return { reply: "أنا معاك، ممكن توضّح أكتر؟", source: "maestro_fallback", metadata: { reason: "no_candidates" } };
    }
    const safety = safetyCheck(fingerprint);
    if (!safety.ok) {
        console.log("[HybridComposer] EXIT: Safety check triggered. Returning emergency reply.");
        return { reply: "لقد لاحظت إشارات للخطر في كلامك...", source: "safety_net", metadata: { safetyFlags: safety.flags } };
    }

    try {
        // --- [NEW] PRIMARY STRATEGY: Attempt to use the Linguistic Core ---
        console.log("\n[HybridComposer] --- Attempting Primary Strategy: Linguistic Core ---");
        
        // --- [التعديل الوحيد] ---
        // قمنا بتمرير كل البيانات التي تحتاجها المكتبة المطورة، بما في ذلك `userState` الكامل.
        const advancedReply = generateAdvancedReply(user_message, fingerprint, userId, tracker.getState());

        if (advancedReply && advancedReply.reply) {
            console.log("[HybridComposer] SUCCESS: Linguistic Core produced a valid response.");
            console.log(`[HybridComposer] Generated Reply: { source: '${advancedReply.source}', reply: '${advancedReply.reply.slice(0, 90)}...' }`);
            
            // [تعديل] تحديث حالة الـ tracker بالبيانات الجديدة التي أعادها "الدماغ"
            if(advancedReply.updatedUserState) {
                tracker.setState(advancedReply.updatedUserState);
            }

            // Final polishing and returning the advanced reply
            let finalDecision = { ...advancedReply };
            finalDecision.reply = polishReply(finalDecision.reply);
            finalDecision.reply = safeTruncateText(finalDecision.reply, 2500);
            finalDecision.metadata.produced_at = nowISO();

            // Attach memory passport (important)
            const primaryProtocolForMemory = briefing?.potentialNewProtocols?.[0] || briefing?.activeProtocol;
            if (primaryProtocolForMemory?.intent?.tag) {
                const scored = analyzeCandidates(candidates, tracker);
                const bestCandidateForProtocol = pickBestForProtocol(scored, primaryProtocolForMemory.intent.tag);
                if (bestCandidateForProtocol?.metadata?.nextSessionContext) {
                    finalDecision.metadata.nextSessionContext = bestCandidateForProtocol.metadata.nextSessionContext;
                }
            }
            
            console.log("[HybridComposer] EXIT: Returning response from Linguistic Core.");
            return finalDecision;
        }

        // --- FALLBACK STRATEGY: Use the reliable v6.1 Maestro Logic ---
        console.log("\n[HybridComposer] --- LINGUISTIC CORE FAILED ---");
        console.log("[HybridComposer] --- Executing Fallback Strategy: v6.1 Maestro Logic ---");

        const scored = analyzeCandidates(candidates, tracker, fingerprint);
        const { activeProtocol, potentialNewProtocols } = briefing || {};
        
        const activeCandidate = activeProtocol ? pickBestForProtocol(scored, activeProtocol.intent.tag) : null;
        const newCandidate = potentialNewProtocols?.[0] ? pickBestForProtocol(scored, potentialNewProtocols[0].tag) : null;
        const topScored = scored[0]?.candidate || candidates[0];
        const empathicCandidate = candidates.find(c => c.source === 'empathic_safety_net');

        let fallbackDecision = null;

        if (activeCandidate && newCandidate && (safeStr(activeCandidate.source) !== safeStr(newCandidate.source))) {
            console.log("[HybridComposer Fallback] Path: Smart Weave.");
            fallbackDecision = smartWeave(activeCandidate, newCandidate, fingerprint, scored);
        } else if (activeCandidate) {
            console.log("[HybridComposer Fallback] Path: Active Protocol.");
            fallbackDecision = activeCandidate;
        } else if (newCandidate) {
            console.log("[HybridComposer Fallback] Path: New Protocol.");
            fallbackDecision = newCandidate;
        } else {
            console.log("[HybridComposer Fallback] Path: Top Scored or Empathic.");
            fallbackDecision = empathicCandidate || topScored;
        }

        if (!fallbackDecision || !fallbackDecision.reply) {
             console.log("[HybridComposer Fallback] CRITICAL: No decision could be made. Returning absolute fallback.");
             return { reply: "أنا هنا معاك — ممكن توضّح أكتر؟", source: "maestro_critical_fallback" };
        }

        // Final polishing for the fallback response
        fallbackDecision.reply = polishReply(fallbackDecision.reply);
        fallbackDecision.reply = safeTruncateText(fallbackDecision.reply, 2500);
        fallbackDecision.metadata = fallbackDecision.metadata || {};
        fallbackDecision.metadata.produced_by = 'maestro_fallback_logic_v6.1';
        fallbackDecision.metadata.produced_at = nowISO();

        if (activeCandidate?.metadata?.nextSessionContext) {
             fallbackDecision.metadata.nextSessionContext = activeCandidate.metadata.nextSessionContext;
        } else if (newCandidate?.metadata?.nextSessionContext) {
             fallbackDecision.metadata.nextSessionContext = newCandidate.metadata.nextSessionContext;
        }
        
        console.log(`[HybridComposer] EXIT: Returning response from Fallback Logic.`);
        return fallbackDecision;

    } catch (err) {
        if (DEBUG) console.error("Maestro FATAL error:", err);
        return { reply: "أنا هنا — ممكن توضّح أكتر؟", source: "maestro_error_fallback", metadata:{ error: String(err) } };
    }
}

export default { synthesizeHybridResponse };
