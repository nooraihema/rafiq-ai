/**
 * src/core/graphbuilder.js
 * 
 * الحالة: تم المراجعة والاعتماد لبيئة الإنتاج (Vercel Ready).
 */

import { OpNode } from './opnode.js';

export class GraphBuilder {
    constructor() {
        this.nodes = new Map();
        this.executionOrder = [];
    }

    trace(rootTensor) {
        this.nodes.clear();
        this.executionOrder = [];
        const visited = new Set();
        
        const walk = (tensor) => {
            if (!tensor || visited.has(tensor.id)) return;
            visited.add(tensor.id);

            if (tensor.op) {
                // التأكد من استيراد OpNode واستخدامها بشكل صحيح
                const opNode = new OpNode(tensor.op, tensor.inputs);
                
                if (!opNode.validateShapes()) {
                    throw new Error(`Graph Error: Shape mismatch in operation '${tensor.op}' for tensor ${tensor.id}`);
                }

                for (const input of tensor.inputs) {
                    walk(input);
                }

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

    getFusableGroups() {
        const groups = [];
        let currentGroup = [];

        for (const step of this.executionOrder) {
            const def = step.op.getOpDefinition();
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

    dumpGraph() {
        return this.executionOrder.map((step, index) => {
            const inputs = step.op.inputs.map(i => i.id).join(', ');
            return `${index}: [${step.outputId}] = ${step.op.type}(${inputs})`;
        }).join('\n');
    }
}
