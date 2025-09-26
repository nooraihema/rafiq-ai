// intelligence/linguistic_core/dictionaries/patterns.js

// يحتوي على "الحكمة" النفسية. يربط بين مجموعة من المفاهيم واستنتاج (فرضية) ذكي.
export const CAUSAL_PATTERNS = [
    {
        concepts: ["sadness", "helplessness"], 
        hypothesis: "كتير مننا لما بيحس بالحزن الشديد، ده بيستنزف طاقته وبيخليه يحس بالعجز، كأن فيه قوة خفية بتشده لتحت. هل ده بيوصف اللي بتحس بيه؟",
    },
    {
        concepts: ["anxiety", "overthinking"], 
        hypothesis: "القلق أحيانًا بيشغل عقلنا في حلقة مفرغة من التفكير الزائد عشان يحاول يسيطر على الموقف. هل بتلاحظ إن عقلك بيعيد ويزيد في نفس الأفكار؟",
    },
    // ... سنضيف العشرات من هذه الأنماط في المستقبل
];

// --- [إضافة جديدة] ---
// قاموس جديد للتوترات السردية (الصراعات النفسية الشائعة)
export const NARRATIVE_TENSIONS = [
    {
        // الصراع بين الرغبة في التغيير والخوف منه
        concepts: ["goal_setting", "fear"],
        tension_name: "change_vs_fear",
        description: "صراع بين الرغبة في تحقيق هدف جديد والخوف من الفشل أو المجهول."
    },
    {
        // الصراع بين الشعور بالذنب والرغبة في مسامحة النفس
        concepts: ["guilt", "self_compassion"],
        tension_name: "guilt_vs_forgiveness",
        description: "صراع بين لوم الذات على أخطاء الماضي والرغبة في التسامح والمضي قدمًا."
    },
    {
        // الصراع بين الشعور بالوحدة والخوف من التواصل الاجتماعي
        concepts: ["loneliness", "anxiety"],
        tension_name: "loneliness_vs_social_anxiety",
        description: "صراع بين الشعور بالوحدة والرغبة في التواصل، والخوف أو القلق من التفاعلات الاجتماعية."
    },
    // ... يمكن إضافة العشرات من هذه الصراعات النفسية
];
