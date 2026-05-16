/**
 * src/core/graphbuilder.js
 * النسخة المحصنة والمصححة بواسطة إبراهيم شحات
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
        const temporaryMark = new Set();

        const walk = (tensor) => {
            if (!tensor) return;

            if (!tensor.id) {
                tensor.id = `tensor_auto_${Math.random().toString(36).substr(2, 9)}`;
            }

            if (visited.has(tensor.id)) return;

            if (temporaryMark.has(tensor.id)) {
                console.error(`%c🚨 [GRAPH ERROR] حلقة تكرارية عند: ${tensor.id}`, "color: #ff3333; font-weight: bold;");
                return;
            }

            temporaryMark.add(tensor.id);

            // تأمين جلب المدخلات سواء كانت كائنات تنسور أو معرفات نصية
            const actualInputs = tensor.inputs || [];

            if (actualInputs.length > 0) {
                for (const input of actualInputs) {
                    walk(input);
                }

                const opNode = new OpNode(tensor.op, actualInputs);

                try {
                    opNode.validateShapes();
                } catch (err) {
                    throw new Error(`Graph Construction Failed: ${err.message} at tensor ${tensor.id}`);
                }

                temporaryMark.delete(tensor.id);
                visited.add(tensor.id);

                this.nodes.set(tensor.id, opNode);

                this.executionOrder.push({
                    id: tensor.id,
                    outputId: tensor.id,
                    op: opNode,
                    inputs: actualInputs, // تأمين الكائن الأصلي للـ Optimizer
                    inputIds: actualInputs.map(inTensor => inTensor.id || inTensor),
                    shape: tensor.shape,
                    tensor: tensor,
                    data: tensor.data,
                    value: tensor.value,
                    params: tensor.params
                });

            } else {
                const constNode = new OpNode('const', []);

                temporaryMark.delete(tensor.id);
                visited.add(tensor.id);

                this.nodes.set(tensor.id, constNode);

                this.executionOrder.push({
                    id: tensor.id,
                    outputId: tensor.id,
                    op: constNode,
                    inputs: [],
                    inputIds: [],
                    shape: tensor.shape,
                    tensor: tensor,
                    data: tensor.data,
                    value: tensor.value,
                    params: tensor.params
                });
            }
        };

        walk(rootTensor);

        console.log(`%c📐 [Architect] تم بناء الـ Graph بنجاح. عدد الخطوات الحسابية المؤمنة: ${this.executionOrder.length}`, "color: #00ffcc; font-weight: bold;");
        return this.executionOrder;
    }

    getFusableGroups() {
        const groups = [];
        let currentGroup = [];

        for (const step of this.executionOrder) {
            if (step.op.type === 'const' || step.tensor?.op === 'input') {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
                groups.push([step]);
                continue;
            }

            // منع صهر الـ Attention قسراً لضمان سلامة قنوات التزامن والـ Softmax
            const isAttention = 
                step.op.type === 'attention_core' || 
                step.op.name === 'attention_core' || 
                step.tensor?.op === 'attention_core';

            if (isAttention) {
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
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                groups.push([step]);
                currentGroup = [];
            }
        }

        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    dumpGraph() {
        if (this.executionOrder.length === 0) return "Graph is empty.";
        return this.executionOrder.map((step, index) => {
            const inputs = step.inputIds && step.inputIds.length > 0 ? step.inputIds.join(', ') : 'none';
            return `${index}: [${step.outputId}] Shape(${step.shape}) = ${step.op.type || step.op}(${inputs})`;
        }).join('\n');
    }
}
