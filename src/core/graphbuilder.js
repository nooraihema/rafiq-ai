/**
 * src/core/graphbuilder.js
 * * الوظيفة: المهندس المعماري (The Architect).
 * مسؤول عن بناء مسار العمليات والتأكد من توافق الأبعاد الرياضية.
 */

import { OpNode } from './opnode.js';

export class GraphBuilder {
    constructor() {
        this.nodes = new Map();
        this.executionOrder = [];
    }

    /**
     * تتبع مسار العمليات وبناء تسلسل التنفيذ
     */
    trace(rootTensor) {
        this.nodes.clear();
        this.executionOrder = [];
        const visited = new Set();
        
        // دالة Walk لزيارة كل الـ Tensors المرتبطة
        const walk = (tensor) => {
            if (!tensor || visited.has(tensor.id)) return;
            
            // إذا كان التنسور ناتج عن عملية (وليس ثابت)
            if (tensor.inputs && tensor.inputs.length > 0) {
                // زيارة المدخلات أولاً (Bottom-up)
                for (const input of tensor.inputs) {
                    walk(input);
                }

                // بناء العقدة البرمجية للعملية
                const opNode = new OpNode(tensor.op, tensor.inputs);
                
                // التحقق من الأبعاد قبل الإضافة
                try {
                    opNode.validateShapes();
                } catch (err) {
                    // تحويل الخطأ ليكون أوضح في الـ Logs
                    throw new Error(`Graph Construction Failed: ${err.message} at tensor ${tensor.id}`);
                }

                visited.add(tensor.id);
                this.nodes.set(tensor.id, opNode);
                
                // إضافة العملية لترتيب التنفيذ
                this.executionOrder.push({
                    outputId: tensor.id,
                    op: opNode,
                    shape: tensor.shape
                });
            }
        };

        walk(rootTensor);
        return this.executionOrder;
    }

    /**
     * تجميع العمليات التي يمكن دمجها (Kernel Fusion)
     * ميزة احترافية لتقليل حركات الذاكرة في الـ GPU
     */
    getFusableGroups() {
        const groups = [];
        let currentGroup = [];

        for (const step of this.executionOrder) {
            const def = step.op.getOpDefinition();
            
            // إذا كانت العملية بسيطة (مثل جمع أو ضرب) ندمجها
            if (def && def.isElementWise) {
                currentGroup.push(step);
            } else {
                // لو عملية معقدة (مثل Matrix Multiply) تقفل المجموعة وتبدأ جديدة
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
            const inputs = step.op.inputs.map(i => i.id).join(', ');
            return `${index}: [${step.outputId}] Shape(${step.shape}) = ${step.op.type}(${inputs})`;
        }).join('\n');
    }
}
