/**
 * src/core/graphbuilder.js
 * الوظيفة: المهندس المعماري (The Architect) - النسخة المفتشة والمؤمنة هندسياً
 * المطور: إبراهيم شحات (مشروع رفيق-AI)
 * الصيانة: تأمين مصفوفات الـ inputIds وتثبيت الترتيب الطوبولوجي الحقيقي لمنع تصفير الـ Attention
 */

import { OpNode } from './opnode.js';

export class GraphBuilder {
    constructor() {
        this.nodes = new Map();
        this.executionOrder = [];
    }

    /**
     * تتبع مسار العمليات وبناء تسلسل التنفيذ الشامل بترتيب طوبولوجي متين
     */
    trace(rootTensor) {
        this.nodes.clear();
        this.executionOrder = [];
        const visited = new Set();
        const temporaryMark = new Set(); // لمنع الحلقات التكرارية اللانهائية

        const walk = (tensor) => {
            if (!tensor) return;

            if (!tensor.id) {
                tensor.id = `tensor_auto_${Math.random().toString(36).substr(2, 9)}`;
            }

            if (visited.has(tensor.id)) return;

            if (temporaryMark.has(tensor.id)) {
                console.error(
                    `%c🚨 [GRAPH ERROR] تم رصد حلقة تكرارية قاتلة عند التنسور: ${tensor.id}`,
                    "color: #ff3333; font-weight: bold;"
                );
                return;
            }

            temporaryMark.add(tensor.id);

            // =========================
            // 📌 التعامل مع العقد ذات المدخلات (Operations)
            // =========================
            if (tensor.inputs && tensor.inputs.length > 0) {

                for (const input of tensor.inputs) {
                    walk(input);
                }

                const opNode = new OpNode(tensor.op, tensor.inputs);

                try {
                    opNode.validateShapes();
                } catch (err) {
                    throw new Error(
                        `Graph Construction Failed: ${err.message} at tensor ${tensor.id}`
                    );
                }

                temporaryMark.delete(tensor.id);
                visited.add(tensor.id);

                this.nodes.set(tensor.id, opNode);

                this.executionOrder.push({
                    id: tensor.id,
                    outputId: tensor.id,
                    op: opNode,
                    inputIds: tensor.inputs.map(inTensor => inTensor.id),
                    shape: tensor.shape,
                    tensor: tensor,

                    // 🔥 FIX: تمرير بيانات التنسور الخام (كان مفقود ويؤدي لصفرية الإشارة)
                    data: tensor.data,
                    value: tensor.value,
                    params: tensor.params
                });

            } 
            // =========================
            // 📌 التعامل مع العقد الثابتة (Const / Input)
            // =========================
            else {

                const constNode = new OpNode('const', []);

                temporaryMark.delete(tensor.id);
                visited.add(tensor.id);

                this.nodes.set(tensor.id, constNode);

                this.executionOrder.push({
                    id: tensor.id,
                    outputId: tensor.id,
                    op: constNode,
                    inputIds: [],
                    shape: tensor.shape,
                    tensor: tensor,

                    // 🔥 FIX: تمرير بيانات الثوابت بشكل صريح
                    data: tensor.data,
                    value: tensor.value,
                    params: tensor.params
                });
            }
        };

        walk(rootTensor);

        console.log(
            `%c📐 [Architect] تم بناء الـ Graph بنجاح. عدد الخطوات الحسابية المؤمنة: ${this.executionOrder.length}`,
            "color: #00ffcc; font-weight: bold;"
        );

        return this.executionOrder;
    }

    /**
     * تجميع العمليات التي يمكن دمجها (Kernel Fusion)
     */
    getFusableGroups() {
        const groups = [];
        let currentGroup = [];

        for (const step of this.executionOrder) {

            // =========================
            // 📌 حماية const
            // =========================
            if (step.op.type === 'const') {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
                groups.push([step]);
                continue;
            }

            const def = step.op.getOpDefinition?.() || null;

            // =========================
            // 🔥 FIX CRITICAL: fallback آمن لمنع فقدان attention / ops
            // =========================
            const isAttention =
                step.op.type === 'attention_core' ||
                step.op.name === 'attention_core';

            if (isAttention) {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
                groups.push([step]);
                continue;
            }

            // =========================
            // 📌 ElementWise fusion logic
            // =========================
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

    /**
     * استخراج ملخص للـ Graph لمراجعته في الـ Logs
     */
    dumpGraph() {
        if (this.executionOrder.length === 0) return "Graph is empty.";

        return this.executionOrder.map((step, index) => {
            const inputs =
                step.inputIds && step.inputIds.length > 0
                    ? step.inputIds.join(', ')
                    : 'none';

            return `${index}: [${step.outputId}] Shape(${step.shape}) = ${step.op.type}(${inputs})`;
        }).join('\n');
    }
}
