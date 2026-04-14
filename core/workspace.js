
/**
 * /core/workspace.js
 * Unified Semantic Workspace v1.0 - "The Cognitive Field"
 * وظيفته: العمل كفضاء موحد لكل المحركات (القارئ، العواطف، الانتباه، الاستدلال).
 * هو "المائدة المستديرة" التي يتم فوقها نسج الوعي بالحالة.
 */

export class UnifiedWorkspace {
    constructor(rawText) {
        // البيانات الخام
        this.rawText = rawText;
        this.createdAt = Date.now();

        // 1. نسيج العقد (Node Mesh) - سيملؤه الـ Reader
        this.nodes = []; 
        
        // 2. شبكة العلاقات (Relational Links)
        this.links = [];

        // 3. طبقات البيانات (Data Layers) - تملؤها المحركات تباعاً
        this.attentionMap = {}; // خريطة الانتباه
        this.semantic = null;    // البيانات الدلالية
        this.emotion = null;     // البيانات العاطفية (VAD)
        this.synthesis = null;   // البيانات التركيبية
        this.reasoning = null;   // القرار الاستراتيجي
        this.clinicalInsights = []; // المراجع الطبية

        // 4. الحالة العالمية للفضاء (Global Field State)
        // هذا الكائن يتم تحديثه لحظياً من كل محرك ليعكس "الخلاصة"
        this.state = {
            dominantConcept: null,
            globalMood: "neutral",
            energyLevel: 0,
            trajectory: "INITIAL",
            intent: "unknown",
            certainty: 0.5,
            fieldIntensity: 0,
            conflictDetected: false,
            semanticImpact: 0
        };

        console.log("%c🌌 [UnifiedWorkspace] تم إنشاء فضاء المعنى الموحد للجملة.", "color: #607D8B; font-weight: bold;");
    }

    /**
     * وظيفة لإضافة رابط بين عقدتين (علاقة نفي، تضخيم، فاعل، الخ)
     */
    addLink(fromIndex, toIndex, type, weight = 1.0) {
        const link = { from: fromIndex, to: toIndex, type, weight };
        this.links.push(link);
        // تحديث العقد لإعلامها بالرابط
        if (this.nodes[fromIndex]) this.nodes[fromIndex].relations.influences.push(link);
        if (this.nodes[toIndex]) this.nodes[toIndex].relations.influencedBy.push(link);
    }

    /**
     * وظيفة استدلالية: هل يوجد تناقض في هذا الفضاء؟
     */
    hasDissonance() {
        // إذا وجد السيمانتيك اكتئاباً والعواطف وجدت فرحاً (أو العكس)
        const isDepressed = this.state.dominantConcept === "depression_symptom";
        const isPositiveV = this.emotion?.stateModel?.v > 0.3;
        return isDepressed && isPositiveV;
    }

    /**
     * حساب "كتلة الوعي" (Cognitive Mass) للموقف
     * تجمع بين الانتباه والشدة والأثر الدلالي
     */
    calculateFieldMass() {
        const impact = this.state.semanticImpact || 0;
        const intensity = this.emotion?.intensity?.overall || 0;
        const certainty = this.state.certainty || 0.5;

        return (impact * intensity * certainty);
    }

    /**
     * توليد "تقرير الميدان" (Field Report) لـ Console
     */
    generateFieldReport() {
        console.log("\n" + "%c📊 [Unified Field Report]".repeat(1), "background: #263238; color: #fff; padding: 2px 5px;");
        console.log(`   📍 Focus: ${this.state.dominantConcept || 'none'}`);
        console.log(`   💓 Mood: ${this.state.globalMood} (Energy: ${this.state.energyLevel.toFixed(2)})`);
        console.log(`   🎯 Strategic Intent: ${this.state.intent}`);
        console.log(`   📈 Trajectory: ${this.state.trajectory}`);
        console.log(`   ⚖️ Conflict: ${this.state.conflictDetected ? "YES" : "NO"}`);
        console.log(`   🔗 Total Relations: ${this.links.length}`);
        console.log("-----------------------------------------");
    }
}

export default UnifiedWorkspace;
