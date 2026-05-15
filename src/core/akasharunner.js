/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المطور (Tracing Pipeline)
 */

export class AkashaRunner {
    constructor(backend) {
        this.backend = backend;
        this.embedding = new Embedding(5000, 512);
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);
    }

    /**
     * التطوير: الـ run دلوقتي مش هتحسب القيم، هي هتبني "الخريطة" بس
     */
    async run(tokenIds) {
        // 1. نبني التنسور المبدئي (بدون تنفيذ حسابي)
        let x = this.embedding.forward(tokenIds);

        // 2. بنسجل العمليات (Tracing) بدل تنفيذها
        x = this.attention.forward(x);
        x = this.ffn.forward(x);

        // 3. بناء الخطة (الخريطة الكبيرة لكل العمليات اللي سجلناها)
        const plan = this._buildPlan(x);

        // 4. إرسال الخطة كاملة للـ GPU
        try {
            return await this.backend.execute(plan);
        } catch (err) {
            console.error("[RUNNER ERROR]: GPU Pipeline failure", err);
            throw err;
        }
    }

    _buildPlan(tensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;
            
            // معالجة المدخلات أولاً (عمقاً)
            if (t.inputs) {
                t.inputs.forEach(input => traverse(input));
            }

            // إضافة العملية للخطة
            plan.push({
                op: t.op,
                id: t.id,
                shape: t.shape,
                data: t.data,
                // نمرر الـ IDs الخاصة بالمدخلات للـ Backend
                inputIds: t.inputs ? t.inputs.map(i => i.id) : []
            });
            visited.add(t.id);
        };

        traverse(tensor);
        return plan;
    }
}
