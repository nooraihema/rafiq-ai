
/**
 * /core/workspace.js
 * Unified Semantic Workspace v2.0 - [THE GOLDEN FIELD]
 * وظيفته: العمل كفضاء موحد "مشحون" بالبيانات من LexicalProcessor.
 * هو "المائدة المستديرة" التي يجتمع عليها العقل والقلب والذاكرة.
 */

export class UnifiedWorkspace {
    constructor(rawText) {
        // 1. البيانات الأساسية والهوية
        this.rawText = rawText;
        this.createdAt = Date.now();
        this.id = `field_${Math.random().toString(36).substr(2, 9)}`;

        // 2. [القلب النابض الجديد]: طبق الذهب (Gold Plate)
        // سيتم ملؤه بواسطة LexicalProcessor في أول مرحلة
        this.goldPlate = null; 

        // 3. نسيج العقد (Node Mesh) - يملؤه الـ Reader للعرض والتحليل المكاني
        this.nodes = []; 
        this.links = [];

        // 4. طبقات المعالجة (Processed Layers)
        this.attentionMap = {};    // توزيع طاقة التركيز
        this.semantic = null;       // التحليل الدلالي الإكلينيكي
        this.emotion = null;        // التحليل العاطفي (VAD)
        this.synthesis = null;      // التركيب النفسي والفرضيات
        this.reasoning = null;      // القرار الاستراتيجي النهائي
        this.clinicalInsights = []; // المراجع العلمية المستدعاة

        // 5. الحالة العالمية للمجال (Global Field State)
        this.state = {
            dominantConcept: null,
            globalMood: "neutral",
            energyLevel: 0,
            trajectory: "INITIAL",
            intent: "unknown",
            certainty: 0.5,
            fieldIntensity: 0,
            conflictDetected: false,
            semanticImpact: 0,
            intelligenceDepth: 'BASIC'
        };

        console.log("%c🌌 [UnifiedWorkspace v2.0] تم إنشاء فضاء الوعي الموحد.", "color: #607D8B; font-weight: bold;");
    }

    /**
     * وظيفة للتحقق: هل الفضاء جاهز للمعالجة العميقة؟
     */
    isGoldReady() {
        return this.goldPlate !== null && this.goldPlate.nodes.length > 0;
    }

    /**
     * إضافة رابط بين العقد (علاقة نفي، تضخيم، إلخ)
     */
    addLink(fromIndex, toIndex, type, weight = 1.0) {
        const link = { from: fromIndex, to: toIndex, type, weight };
        this.links.push(link);
        if (this.nodes[fromIndex]) this.nodes[fromIndex].relations.influences.push(link);
        if (this.nodes[toIndex]) this.nodes[toIndex].relations.influencedBy.push(link);
    }

    /**
     * كشف التنافر المعرفي بين الكلمات (GoldPlate) والمزاج (VAD)
     */
    hasDissonance() {
        if (!this.emotion || !this.state.dominantConcept) return false;
        
        // مثال: اكتشاف حالة "الابتسامة الحزينة"
        const isDepressedConcept = ["depression_symptom", "sadness"].includes(this.state.dominantConcept);
        const isPositiveValence = this.emotion.stateModel.v > 0.4;
        
        return isDepressedConcept && isPositiveValence;
    }

    /**
     * توليد "تقرير الميدان" النهائي (Field Report)
     * تم تعديله ليظهر بيانات طبق الذهب
     */
    generateFieldReport() {
        console.log("\n" + "%c📊 [ULTIMATE FIELD REPORT]".repeat(1), "background: #263238; color: #fff; padding: 2px 5px;");
        
        // إحصائيات طبق الذهب
        const gp = this.goldPlate;
        const gpStats = gp ? `Concepts: ${gp.nodes.flatMap(n=>n.concepts).length} | Emotions: ${gp.nodes.filter(n=>n.emotion).length}` : "EMPTY";

        console.log(`   🔸 Gold Plate Status: ${gpStats}`);
        console.log(`   📍 Primary Focus: ${this.state.dominantConcept || 'none'}`);
        console.log(`   💓 Mood/VAD: ${this.state.globalMood} (Energy: ${this.state.energyLevel.toFixed(2)})`);
        console.log(`   🎯 Strategic Intent: ${this.state.intent}`);
        console.log(`   📈 User Trajectory: ${this.state.trajectory}`);
        console.log(`   ⚖️ Internal Conflict: ${this.state.conflictDetected ? "YES" : "NO"}`);
        console.log(`   🔍 Intelligence Depth: ${this.state.intelligenceDepth}`);
        
        if (this.clinicalInsights.length > 0) {
            console.log(`   📖 Clinical Reference: [${this.clinicalInsights[0].source}]`);
        }
        
        console.log("-----------------------------------------");
    }
}

export default UnifiedWorkspace;

