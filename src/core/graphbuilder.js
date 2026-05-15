/**
 * src/core/graphbuilder.js
 * الوظيفة: المهندس المعماري (The Architect).
 * تم التعديل لتسجيل العقد الثابتة (Constants) وتأمين الـ Data Flow للـ Memory Planner.
 */

import { OpNode } from './opnode.js';

export class GraphBuilder {
    constructor() {
        this.nodes = new Map();
        this.executionOrder = [];
    }

    /**
     * تتبع مسار العمليات وبناء تسلسل التنفيذ الشامل
     */
    trace(rootTensor) {
        this.nodes.clear();
        this.executionOrder = [];
        const visited = new Set();
        
        const walk = (tensor) => {
            if (!tensor) return;
            // صمام أمان: لو التنسور ملوش ID (تجنباً للمشاكل) بنسجل له واحد تلقائي
            if (!tensor.id) {
                tensor.id = `tensor_auto_${Math.random().toString(36).substr(2, 9)}`;
            }

            if (visited.has(tensor.id)) return;
            
            // إذا كان التنسور ناتج عن عملية (وليس ثابت)
            if (tensor.inputs && tensor.inputs.length > 0) {
                // زيارة المدخلات أولاً (Bottom-up)
                for (const input of tensor.inputs) {
                    walk(input);
                }

                // بناء العقدة البرمجية للعملية
                const opNode = new OpNode(tensor.op, tensor.inputs);
                
                try {
                    opNode.validateShapes();
                } catch (err) {
                    throw new Error(`Graph Construction Failed: ${err.message} at tensor ${tensor.id}`);
                }

                visited.add(tensor.id);
                this.nodes.set(tensor.id, opNode);
                
                this.executionOrder.push({
                    outputId: tensor.id,
                    op: opNode,
                    shape: tensor.shape,
                    tensor: tensor // تمرير المرجع الحقيقي للتنسور عشان الـ Engine يعرف يشحنه
                });
            } else {
                // 🔥 صمام أمان إبراهيم شحات: تسجيل العُقد الثابتة والمدخلات (Constants/Inputs)
                // عشان الـ Memory Planner والـ Backend يشوفوا البفرات دي ويحجزوا لها مساحة حقيقية بالأوزان
                const constNode = new OpNode('const', []);
                visited.add(tensor.id);
                this.nodes.set(tensor.id, constNode);
                
                this.executionOrder.unshift({ // بنحطها في أول الطابور لأنها خامات ابتدائية
                    outputId: tensor.id,
                    op: constNode,
                    shape: tensor.shape,
                    tensor: tensor
                });
            }
        };

        walk(rootTensor);
        return this.executionOrder;
    }

    /**
     * تجميع العمليات التي يمكن دمجها (Kernel Fusion)
     */
    getFusableGroups() {
        const groups = [];
        let currentGroup = [];

        for (const step of this.executionOrder) {
            // تجاهل عقد الثوابت من الـ Fusion لأنها داتا مش عمليات
            if (step.op.type === 'const') {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
                groups.push([step]);
                continue;
            }

            const def = step.op.getOpDefinition?.() || null;
            
            if (def && def.isElementWise) {
                currentGroup.push(step);
            } else {
                if (currentGroup.length > 0) groups.push(currentGroup);
                groups.push([step]);
                currentGroup = [];
            }
        }

        if (currentGroup.length > 0) groups.push(currentGroup);
        return groups;
    }

    /**
     * استخراج ملخص للـ Graph لمراجعته في الـ Logs
     */
    dumpGraph() {
        if (this.executionOrder.length === 0) return "Graph is empty.";
        
        return this.executionOrder.map((step, index) => {
            const inputs = step.op.inputs ? step.op.inputs.map(i => i.id).join(', ') : 'none';
            return `${index}: [${step.outputId}] Shape(${step.shape}) = ${step.op.type}(${inputs})`;
        }).join('\n');
    }
}
