/**
 * src/core/iroptimizer.js
 * 
 * الوظيفة: مُحسن التمثيل الوسيط (IR Optimizer).
 * يقوم بتحليل الـ Graph الناتج من GraphBuilder وتحويله إلى "خطة تنفيذ" (Execution Plan).
 * الهدف الأساسي هو دمج العمليات (Fusion) لتقليل عدد الـ GPU Kernel Dispatches.
 */

export class IROptimizer {
    /**
     * @param {GraphBuilder} builder - باني الرسم البياني
     */
    constructor(builder) {
        this.builder = builder;
        this.optimizedPlan = [];
    }

    /**
     * تحسين الرسم البياني وتحويله إلى خطة تنفيذ
     */
    optimize() {
        const fusableGroups = this.builder.getFusableGroups();
        this.optimizedPlan = [];

        for (const group of fusableGroups) {
            if (group.length > 1) {
                // دمج مجموعة عمليات بسيطة في Kernel واحد (Fusion)
                this.optimizedPlan.push(this._createFusedKernel(group));
            } else {
                // عملية معقدة أو وحيدة تظل كما هي
                this.optimizedPlan.push({
                    type: 'standalone',
                    op: group[0].op,
                    outputId: group[0].outputId
                });
            }
        }

        return this.optimizedPlan;
    }

    /**
     * إنشاء تعريف لـ Kernel مدمج (Fused Kernel)
     */
    _createFusedKernel(group) {
        // تجميع كل المعادلات الرياضية في سلسلة واحدة
        // مثال: (a + b) * c
        const operations = group.map(step => {
            const def = step.op.getOpDefinition();
            return {
                outputId: step.outputId,
                type: step.op.type,
                scalarOp: def.scalarOp,
                inputs: step.op.inputs.map(t => t.id)
            };
        });

        // تحديد المدخلات النهائية (التي ليست ناتجة عن عمليات داخل نفس المجموعة)
        const allOutputs = new Set(group.map(s => s.outputId));
        const externalInputs = new Set();
        
        for (const step of group) {
            for (const input of step.op.inputs) {
                if (!allOutputs.has(input.id)) {
                    externalInputs.add(input.id);
                }
            }
        }

        return {
            type: 'fused',
            finalOutputId: group[group.length - 1].outputId,
            externalInputs: Array.from(externalInputs),
            operations: operations
        };
    }

    /**
     * تخطيط الذاكرة: تحديد الـ Buffers التي يمكن إعادة استخدامها
     * لمنع الـ GPU Memory Fragmentation
     */
    planMemory() {
        const memoryMap = new Map();
        // منطق متقدم لتحديد عمر كل Buffer (Liveness Analysis)
        // سيتم تطويره لضمان أقصى كفاءة في الـ VRAM
        return memoryMap;
    }
}
