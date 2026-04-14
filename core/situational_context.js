
/**
 * /core/situational_context.js
 * SituationalContext v1.0 - "The Oracle of Life Domains"
 * وظيفته: تزويد المحركات بالخلفية الثقافية لتصنيف أحداث الحياة.
 * يربط الكلمات بنطاقات (Domains) وأوزان خطورة (Risk Weights).
 */

export const SITUATIONAL_CONTEXT = {
    // نطاقات الحياة الكبرى
    DOMAINS: {
        WORK: {
            name: "البيئة المهنية",
            keywords: ["شغل", "عمل", "مدير", "مرتب", "وظيفة", "انترفيو", "زملاء", "ترقية", "مكتب", "استقالة", "رفض"],
            impact_weight: 0.7, // مدى تأثير هذا النطاق على الهوية
            is_external: true
        },
        FAMILY: {
            name: "المحيط الأسري",
            keywords: ["أبويا", "أمي", "مراتي", "جوزي", "البيت", "أهلي", "أخويا", "ابني", "بنتي", "بيت العيلة", "والدي", "والدتي"],
            impact_weight: 0.9,
            is_external: true
        },
        HEALTH: {
            name: "الحالة الجسدية/الصحية",
            keywords: ["تعبان", "مريض", "دكتور", "علاج", "دوا", "عملية", "وجع", "جسمي", "مرهق", "صداع", "نوم"],
            impact_weight: 0.8,
            is_external: false
        },
        FINANCE: {
            name: "الوضع المادي",
            keywords: ["فلوس", "دين", "قسط", "محفظة", "غالي", "رخيص", "بنك", "سلف", "فقر", "ميزانية"],
            impact_weight: 0.75,
            is_external: true
        },
        EXISTENTIAL: {
            name: "النطاق الوجودي/المعنى",
            keywords: ["حياتي", "مستقبل", "هدفي", "ليه", "فراغ", "بكرة", "نهاية", "ضياع", "تايه", "أنا مين"],
            impact_weight: 1.0, // أعلى تأثير لأنه يمس جوهر الوجود
            is_external: false
        },
        SOCIAL: {
            name: "العلاقات الاجتماعية",
            keywords: ["ناس", "شارع", "خروجة", "أصحاب", "كلام", "إحراج", "وحدة", "صحاب", "جيران"],
            impact_weight: 0.6,
            is_external: true
        }
    },

    // محفزات الأحداث (Event Triggers)
    EVENT_TYPES: {
        LOSS: ["موت", "فراق", "خسارة", "ضياع", "تركني", "مشي"],
        CONFLICT: ["خناقة", "زعيق", "مشكلة", "ضرب", "إهانة", "خيانة"],
        FAILURE: ["فشل", "رفض", "غلطت", "بوظت", "خسرت"],
        STRESS: ["ضغط", "تراكم", "كتير", "مش ملاحق", "مسؤولية"]
    }
};

export default SITUATIONAL_CONTEXT;
