
/**
 * /core/dynamic_lexicon_v2.js
 * DynamicLexicon v2.0 - Emotional Language Orchestrator
 * الهدف: تحويل الذرات اللغوية إلى نظام توليد سياقي واعي (Context-Aware Emotional Composer)
 */

export const DYNAMIC_LEXICON = {

    // =========================
    // 1. VALIDATION ATOMS
    // =========================
    VALIDATION: [
        {
            id: "val_1",
            text: "أنا سامعك بعمق وحاسس بثقل اللي جواك",
            valence: -0.9,
            arousal: 0.7,
            intensity: [0.6, 1.0],
            tags: ["empathy", "deep_validation"]
        },
        {
            id: "val_2",
            text: "واضح إن اللي بتمر بيه مش سهل خالص، ومهم أقولك إن ده مفهوم",
            valence: -0.8,
            arousal: 0.6,
            intensity: [0.5, 0.9],
            tags: ["normalization", "support"]
        },
        {
            id: "val_3",
            text: "أنا مقدّر جدًا إنك قادر تحكي الكلام ده بصراحة",
            valence: -0.6,
            arousal: 0.5,
            intensity: [0.3, 0.8],
            tags: ["acknowledgment"]
        }
    ],

    // =========================
    // 2. EMOTIONAL MIRRORING ATOMS
    // =========================
    MIRRORING: [
        {
            id: "mir_1",
            text: "حاسس إن التعب ده مش بس لحظة، لكنه ممتد جواك",
            mapsTo: ["sadness", "fatigue"],
            strength: 0.8
        },
        {
            id: "mir_2",
            text: "فيه إحساس كأن كل حاجة تقيلة ومفيش مساحة للتنفس",
            mapsTo: ["depression_symptom"],
            strength: 0.9
        },
        {
            id: "mir_3",
            text: "كأنك بتحاول تمشي وإنت شايل حمل زيادة عن طاقتك",
            mapsTo: ["overload", "stress"],
            strength: 0.7
        }
    ],

    // =========================
    // 3. BRIDGE SYSTEM (CONTEXT SHIFT LAYER)
    // =========================
    BRIDGES: [
        {
            id: "br_1",
            text: "ومن هنا ممكن نفهم اللي بيحصل بشكل مختلف شوية",
            type: "soft_reframe"
        },
        {
            id: "br_2",
            text: "خلينا نبص عليها من زاوية أهدى شوية",
            type: "gentle_transition"
        },
        {
            id: "br_3",
            text: "مش الهدف إننا نغيّر إحساسك، لكن نفهمه",
            type: "meta_awareness"
        }
    ],

    // =========================
    // 4. COGNITIVE REFRAMING ATOMS
    // =========================
    REFRAMES: [
        {
            id: "ref_1",
            text: "العقل أحيانًا بيستخدم التوقف كطريقة لحماية الطاقة مش كفشل",
            tags: ["depression", "fatigue"]
        },
        {
            id: "ref_2",
            text: "الإحساس ده مش دليل ضعف، لكنه غالبًا علامة ضغط متراكم",
            tags: ["self_worth"]
        },
        {
            id: "ref_3",
            text: "مشاعرك مش ضدك، لكنها طريقة الجسم يطلب فيها مساعدة بطريقة غير مباشرة",
            tags: ["emotional_processing"]
        }
    ],

    // =========================
    // 5. SOFT ACTION ATOMS (Behavioral Activation)
    // =========================
    ACTIONS: [
        {
            id: "act_1",
            text: "ممكن نبدأ بحاجة بسيطة جدًا… زي إنك تقف وتشرب مياه بس",
            intensity: [0.0, 0.5]
        },
        {
            id: "act_2",
            text: "لو عندك أقل طاقة، جرّب تعمل حاجة واحدة صغيرة لمدة دقيقتين",
            intensity: [0.4, 0.8]
        },
        {
            id: "act_3",
            text: "مش محتاج تغير كل حاجة… خطوة واحدة كفاية دلوقتي",
            intensity: [0.6, 1.0]
        }
    ],

    // =========================
    // 6. CLOSURE SYSTEM
    // =========================
    CLOSURES: [
        {
            id: "cl_1",
            text: "أنا موجود معاك هنا، خطوة خطوة",
            valence: 0.9
        },
        {
            id: "cl_2",
            text: "خد وقتك… مفيش استعجال هنا",
            valence: 0.8
        },
        {
            id: "cl_3",
            text: "لو حابب تكمل كلامك، أنا سامعك",
            valence: 0.85
        }
    ],

    // =========================
    // 7. SELECTION POLICY (IMPORTANT ADDITION)
    // =========================
    SELECTION_POLICY: {
        validate: { weight: 0.35 },
        mirror: { weight: 0.25 },
        bridge: { weight: 0.15 },
        reframe: { weight: 0.15 },
        action: { weight: 0.07 },
        closure: { weight: 0.03 },

        rules: {
            maxAtoms: 5,
            avoidRepetition: true,
            emotionalContinuity: true,
            intensityMatching: true
        }
    },

    // =========================
    // 8. EMOTIONAL ROUTING MAP (NEW CORE)
    // =========================
    ROUTING: {
        depression_symptom: ["VALIDATION", "MIRRORING", "BRIDGES", "ACTIONS", "CLOSURES"],
        anxiety: ["VALIDATION", "BRIDGES", "ACTIONS", "CLOSURES"],
        sadness: ["VALIDATION", "MIRRORING", "CLOSURES"],
        neutral: ["VALIDATION", "BRIDGES", "CLOSURES"]
    }
};

export default DYNAMIC_LEXICON;
