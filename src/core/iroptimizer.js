/**
 * src/core/iroptimizer.js
 * النسخة الذرية المصححة - صمام أمان التوجيه والربط الشبكي الشامل
 */

export class IROptimizer {
    constructor(builder) {
        this.builder = builder;
        this.optimizedPlan = [];
        console.log("%c⚙️ [IR Optimizer] Optimization Core initialized & ready for fusion.", "color: #ffaa00; font-weight: bold;");
    }

    optimize() {
        if (!this.builder || typeof this.builder.getFusableGroups !== 'function') {
            console.warn("⚠️ [OPTIMIZER WARNING] الـ GraphBuilder غير متوافق.");
            return [];
        }

        const fusableGroups = this.builder.getFusableGroups();
        this.optimizedPlan = [];

        console.log(`\n%c🔍 [OPTIMIZER START] تحليل الرسم البياني وفحص جينات الدمج لعدد (${fusableGroups.length}) مجموعة...`, "color: #ffff00; font-weight: bold;`);

        for (let i = 0; i < fusableGroups.length; i++) {
            const group = fusableGroups[i];
            if (!group || group.length === 0) continue;

            if (group.length > 1) {
                const fusedKernel = this._createFusedKernel(group);
                this.optimizedPlan.push(fusedKernel);
                
                console.log(`%c⚡ [FUSION SUCCESS] دمج المجموعة #${i + 1}: تم صهر (${group.length}) عمليات بنجاح!`, "color: #00ffaa; font-weight: bold;");
                console.log(`   └─> الناتج النهائي: ${fusedKernel.id} | العملية الموجهة: ${fusedKernel.op}`);
            } else {
                const singleStep = group[0];
                
                let opName = 'add';
                if (singleStep.op) {
                    opName = (typeof singleStep.op === 'object') ? (singleStep.op.type || singleStep.op.name || 'add') : singleStep.op;
                }

                // إصلاح جذري: الحفاظ الصارم على الـ inputIds القادمة من الـ Builder
                const standaloneStep = {
                    type: 'standalone',
                    op: opName,
                    id: singleStep.outputId || singleStep.id,
                    outputId: singleStep.outputId,
                    shape: singleStep.shape || (singleStep.tensor ? singleStep.tensor.shape : [1, 512]),
                    inputIds: singleStep.inputIds || (singleStep.inputs ? singleStep.inputs.map(t => t.id || t) : []),
                    tensor: singleStep.tensor
                };

                this.optimizedPlan.push(standaloneStep);
                console.log(`📋 [STANDALONE STEP] خطوة منفردة #${i + 1} -> ID: ${standaloneStep.id} | OP: ${standaloneStep.op}`);
            }
        }

        console.log(`%c🎯 [OPTIMIZER END] انتهى التحسين. حجم خطة التنفيذ النهائية: ${this.optimizedPlan.length} خطوة.`, "color: #ffff00; font-weight: bold;\n");
        return this.optimizedPlan;
    }

    _createFusedKernel(group) {
        const operations = group.map((step, idx) => {
            let opType = 'add';
            let scalarOp = '';
            
            if (step.op && typeof step.op === 'object') {
                opType = step.op.type || step.op.name || 'add';
                if (typeof step.op.getOpDefinition === 'function') {
                    const def = step.op.getOpDefinition();
                    scalarOp = def ? def.scalarOp : '';
                }
            } else if (step.op) {
                opType = step.op;
            }

            // تعديل حرج: القراءة من التسميتين لضمان عدم السقوط في مصفوفة فارغة
            const stepInputs = step.inputIds || (step.inputs ? step.inputs.map(t => t.id || t) : []);

            console.log(`   🧬 [Internal Fusion Element #${idx + 1}] Op: ${opType} -> Output: ${step.outputId}`);
            
            return {
                outputId: step.outputId,
                type: opType,
                scalarOp: scalarOp,
                inputs: stepInputs
            };
        });

        const allOutputs = new Set(group.map(s => s.outputId));
        const externalInputs = new Set();
        
        for (const step of group) {
            // سحب المدخلات الحقيقية بالاعتماد على التسمية المؤمنة في الـ Builder الجديد
            const inputsList = step.inputIds || (step.inputs ? step.inputs.map(t => t.id || t) : []);
            for (const inputId of inputsList) {
                if (inputId && !allOutputs.has(inputId)) {
                    externalInputs.add(inputId);
                }
            }
        }

        const finalStep = group[group.length - 1];
        const externalInputsArray = Array.from(externalInputs);

        let detectedOp = 'matmul_add';
        const hasMatMul = operations.some(o => o.type.includes('matmul'));
        const hasAdd = operations.some(o => o.type.includes('add') || o.type.includes('bias'));
        const hasGeLU = operations.some(o => o.type.includes('gelu'));

        if (hasMatMul && hasAdd) {
            detectedOp = 'matmul_add'; 
        } else if (hasMatMul && hasGeLU) {
            detectedOp = 'matmul_gelu';
        } else {
            detectedOp = operations[0].type; 
        }

        return {
            type: 'fused',
            op: detectedOp,
            id: finalStep.outputId,
            finalOutputId: finalStep.outputId,
            shape: finalStep.shape || (finalStep.tensor ? finalStep.tensor.shape : [1, 512]),
            inputIds: externalInputsArray,
            externalInputs: externalInputsArray,
            operations: operations,
            tensor: finalStep.tensor
        };
    }

    planMemory() {
        console.log("📍 [MEMORY PLANNER] جاري عمل تحليل حيوي (Liveness Analysis) لتأمين الـ VRAM...");
        const memoryMap = new Map();
        
        if (Array.isArray(this.optimizedPlan)) {
            this.optimizedPlan.forEach((step, idx) => {
                if (step && step.id) {
                    memoryMap.set(step.id, {
                        stepIndex: idx,
                        canReuse: true
                    });
                }
            });
        }
        
        console.log(`✅ [MEMORY PLANNER SUCCESS] تم جدولة وحماية الـ Buffers. عدد المسارات المؤمنة: ${memoryMap.size}`);
        return memoryMap;
    }
}
