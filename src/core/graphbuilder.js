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
        const temporaryMark = new Set(); // لمنع الحلقات التكرارية اللانهائية (Cyclic Dependency Check)
        
        const walk = (tensor) => {
            if (!tensor) return;
            
            if (!tensor.id) {
                tensor.id = `tensor_auto_${Math.random().toString(36).substr(2, 9)}`;
            }

            if (visited.has(tensor.id)) return;
            if (temporaryMark.has(tensor.id)) {
                console.error(`%c🚨 [GRAPH ERROR] تم رصد حلقة تكرارية قاتلة عند التنسور: ${tensor.id}`, "color: #ff3333; font-weight: bold;");
                return;
            }

            // وضع علامة مؤقتة أثناء فحص الفروع
            temporaryMark.add(tensor.id);
            
            // إذا كان التنسور ناتج عن عملية (له مدخلات)
            if (tensor.inputs && tensor.inputs.length > 0) {
                // زيارة كافة المدخلات أولاً لضمان جهوزيتها في قاع المصفوفة (Post-order traversal)
                for (const input of tensor.inputs) {
                    walk(input);
                }

                const opNode = new OpNode(tensor.op, tensor.inputs);
                
                try {
                    opNode.validateShapes();
                } catch (err) {
                    throw new Error(`Graph Construction Failed: ${err.message} at tensor ${tensor.id}`);
                }

                temporaryMark.delete(tensor.id);
                visited.add(tensor.id);
                this.nodes.set(tensor.id, opNode);
                
                // حقن الـ inputIds صراحة لكي يراها بفر الـ WebGPUBackend فوراً
                this.executionOrder.push({
                    id: tensor.id, // تطابق مع متطلبات محرك الذاكرة
                    outputId: tensor.id,
                    op: opNode,
                    inputIds: tensor.inputs.map(inTensor => inTensor.id), // 🔥 المفتاح المفقود لحل لغز الأصفار!
                    shape: tensor.shape,
                    tensor: tensor
                });
            } else {
                // تسجيل العُقد الثابتة والمدخلات (Constants/Inputs) كقاعدة أساسية
                const constNode = new OpNode('const', []);
                
                temporaryMark.delete(tensor.id);
                visited.add(tensor.id);
                this.nodes.set(tensor.id, constNode);
                
                // استخدام push العادي؛ بما أننا شغالين Post-Order، العقد الصامتة (الخامات) 
                // هتتسجل تلقائياً في بداية المصفوفة بالترتيب الطبيعي للاستدعاء دون بعثرة الـ unshift
                this.executionOrder.push({
                    id: tensor.id,
                    outputId: tensor.id,
                    op: constNode,
                    inputIds: [], // الثوابت ليس لها مدخلات
                    shape: tensor.shape,
                    tensor: tensor
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
            const inputs = step.inputIds && step.inputIds.length > 0 ? step.inputIds.join(', ') : 'none';
            return `${index}: [${step.outputId}] Shape(${step.shape}) = ${step.op.type}(${inputs})`;
        }).join('\n');
    }
}
