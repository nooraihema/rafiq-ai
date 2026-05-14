/**
 * src/core/graphbuilder.js
 * 
 * الوظيفة: محرك بناء الرسم البياني (Graph Orchestrator).
 * يقوم هذا الملف بتجميع الـ Tensors والـ OpNodes في هيكل شجري (Tree Structure).
 * هذا الهيكل هو ما سيتم إرساله لاحقاً للـ Optimizer لدمج العمليات (Fusion).
 */

import { OpNode } from './opnode.js';

export class GraphBuilder {
    constructor() {
        // تخزين كافة العقد (Nodes) في الرسم البياني
        this.nodes = new Map();
        // تتبع الترتيب الزمني للعمليات لضمان صحة التنفيذ
        this.executionOrder = [];
    }

    /**
     * تتبع المسار من Tensor معين إلى أصوله (Trace Back)
     * @param {Tensor} rootTensor - الـ Tensor الذي نريد حساب قيمته
     */
    trace(rootTensor) {
        this.nodes.clear();
        this.executionOrder = [];
        
        const visited = new Set();
        
        const walk = (tensor) => {
            if (!tensor || visited.has(tensor.id)) return;
            
            visited.add(tensor.id);

            // إذا كان الـ Tensor ناتج عن عملية، نتتبع مدخلات هذه العملية أولاً
            if (tensor.op) {
                const opNode = new OpNode(tensor.op, tensor.inputs);
                
                // التأكد من صحة الأبعاد قبل الإضافة للرسم البياني
                if (!opNode.validateShapes()) {
                    throw new Error(`Graph Error: Shape mismatch in operation '${tensor.op}' for tensor ${tensor.id}`);
                }

                // التتبع العميق (Depth-First Search)
                for (const input of tensor.inputs) {
                    walk(input);
                }

                // إضافة العملية للرسم البياني بعد معالجة مدخلاتها
                this.nodes.set(tensor.id, opNode);
                this.executionOrder.push({
                    outputId: tensor.id,
                    op: opNode
                });
            }
        };

        walk(rootTensor);
        return this.executionOrder;
    }

    /**
     * تحليل الرسم البياني للبحث عن فرص الدمج (Kernel Fusion)
     * ملاحظة: هذا تمهيد لملف IROptimizer.js
     */
    getFusableGroups() {
        const groups = [];
        let currentGroup = [];

        for (const step of this.executionOrder) {
            const def = step.op.getOpDefinition();
            
            // إذا كانت العملية بسيطة (Element-wise)، نضمها لمجموعة الدمج
            if (def && def.isElementWise) {
                currentGroup.push(step);
            } else {
                // إذا واجهنا عملية معقدة (مثل MatMul)، نغلق المجموعة الحالية ونبدأ جديدة
                if (currentGroup.length > 0) groups.push(currentGroup);
                groups.push([step]);
                currentGroup = [];
            }
        }

        if (currentGroup.length > 0) groups.push(currentGroup);
        return groups;
    }

    /**
     * تفريغ الرسم البياني كملف نصي (Debugging)
     */
    dumpGraph() {
        return this.executionOrder.map((step, index) => {
            const inputs = step.op.inputs.map(i => i.id).join(', ');
            return `${index}: [${step.outputId}] = ${step.op.type}(${inputs})`;
        }).join('\n');
    }
}
