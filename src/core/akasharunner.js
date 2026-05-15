
/**
 * src/core/akasharunner.js
 *
 * الحالة: المايسترو السيادي (Production Tracing Runner)
 *
 * الهدف:
 * - بناء الرسم الحسابي الكامل للـ Transformer.
 * - جمع كل العقد والأوزان والثوابت بالترتيب الصحيح.
 * - تمرير params إلى الـ Backend (ضروري للـ Attention / LayerNorm / Positional Encoding).
 * - التحقق من سلامة الخطة قبل التنفيذ.
 * - التخلص من مشكلة المخرجات الصفرية الناتجة عن غياب الأوزان أو الـ params.
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(backend, config = {}) {
        this.backend = backend;

        // الإعدادات الافتراضية للنموذج
        this.config = {
            vocabSize: config.vocabSize || 5000,
            embedDim: config.embedDim || 512,
            numHeads: config.numHeads || 8,
            hiddenDim: config.hiddenDim || 2048,
            maxSeqLen: config.maxSeqLen || 512
        };

        // التحقق من صحة الإعدادات
        if (this.config.embedDim % this.config.numHeads !== 0) {
            throw new Error(
                `[AkashaRunner] embedDim (${this.config.embedDim}) ` +
                `must be divisible by numHeads (${this.config.numHeads})`
            );
        }

        // إنشاء الطبقات
        this.embedding = new Embedding(
            this.config.vocabSize,
            this.config.embedDim,
            this.config.maxSeqLen
        );

        this.attention = new MultiHeadAttention({
            embedDim: this.config.embedDim,
            numHeads: this.config.numHeads
        });

        this.ffn = new FeedForward(
            this.config.embedDim,
            this.config.hiddenDim
        );

        console.log('[RUNNER] AkashaRunner initialized.');
        console.log(
            `[RUNNER] Config => ` +
            `vocab=${this.config.vocabSize}, ` +
            `embed=${this.config.embedDim}, ` +
            `heads=${this.config.numHeads}, ` +
            `hidden=${this.config.hiddenDim}, ` +
            `maxSeq=${this.config.maxSeqLen}`
        );
    }

    /**
     * تنفيذ النموذج بالكامل
     * @param {number[]} tokenIds
     * @returns {Promise<Float32Array>}
     */
    async run(tokenIds) {
        try {
            // 1. التحقق من المدخلات
            this._validateInput(tokenIds);

            console.log(`[TOKEN] Input IDs: [${tokenIds.join(', ')}]`);

            // 2. إنشاء Tensor الإدخال
            const inputTensor = this._createInputTensor(tokenIds);

            // 3. Forward Pass
            let x = this.embedding.forward(inputTensor);
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 4. بناء خطة التنفيذ
            const plan = this._buildPlan(x);

            // 5. التحقق من سلامة الخطة
            this._validatePlan(plan);

            // 6. لوج تشخيصية
            this._logPlanSummary(plan);

            // 7. التنفيذ
            const output = await this.backend.execute(plan);

            // 8. التحقق من الناتج
            this._validateOutput(output);

            return output;
        } catch (err) {
            console.error('[RUNNER ERROR]:', err);
            throw err;
        }
    }

    /**
     * إنشاء Tensor الإدخال
     */
    _createInputTensor(tokenIds) {
        const data = new Float32Array(tokenIds);

        return new Tensor(data, {
            shape: [tokenIds.length],
            op: 'const',
            id: 'input_token_ids'
        });
    }

    /**
     * التحقق من صحة المدخلات
     */
    _validateInput(tokenIds) {
        if (!Array.isArray(tokenIds)) {
            throw new Error('[AkashaRunner] tokenIds must be an array.');
        }

        if (tokenIds.length === 0) {
            throw new Error('[AkashaRunner] tokenIds cannot be empty.');
        }

        if (tokenIds.length > this.config.maxSeqLen) {
            throw new Error(
                `[AkashaRunner] Sequence length ${tokenIds.length} ` +
                `exceeds maxSeqLen ${this.config.maxSeqLen}`
            );
        }

        for (let i = 0; i < tokenIds.length; i++) {
            const id = tokenIds[i];

            if (!Number.isFinite(id)) {
                throw new Error(
                    `[AkashaRunner] Invalid token at index ${i}: ${id}`
                );
            }

            if (id < 0) {
                throw new Error(
                    `[AkashaRunner] Negative token ID at index ${i}: ${id}`
                );
            }
        }
    }

    /**
     * بناء خطة التنفيذ (Topological Sort)
     *
     * الأهم هنا:
     * - جمع جميع العقد.
     * - جمع الأوزان والثوابت.
     * - تمرير params.
     */
    _buildPlan(lastTensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (tensor) => {
            if (!tensor) return;
            if (!tensor.id) {
                throw new Error('[AkashaRunner] Tensor without ID detected.');
            }

            if (visited.has(tensor.id)) return;
            visited.add(tensor.id);

            // زيارة المدخلات أولاً
            if (tensor.inputs && tensor.inputs.length > 0) {
                for (const input of tensor.inputs) {
                    traverse(input);
                }
            }

            // بناء خطوة التنفيذ
            const step = {
                id: tensor.id,
                op: tensor.op,
                shape: Array.isArray(tensor.shape)
                    ? [...tensor.shape]
                    : [],
                data: tensor.data || null,
                inputIds: tensor.inputs
                    ? tensor.inputs.map(input => input.id)
                    : [],
                params: tensor.params || null
            };

            plan.push(step);
        };

        traverse(lastTensor);

        return plan;
    }

    /**
     * التحقق من صحة خطة التنفيذ
     */
    _validatePlan(plan) {
        if (!Array.isArray(plan) || plan.length === 0) {
            throw new Error('[AkashaRunner] Execution plan is empty.');
        }

        const knownIds = new Set();

        for (const step of plan) {
            if (!step.id) {
                throw new Error('[AkashaRunner] Step missing ID.');
            }

            if (!step.op) {
                throw new Error(
                    `[AkashaRunner] Step ${step.id} missing op.`
                );
            }

            if (!Array.isArray(step.shape) || step.shape.length === 0) {
                throw new Error(
                    `[AkashaRunner] Step ${step.id} has invalid shape.`
                );
            }

            // التأكد أن كل المدخلات تم تعريفها قبل هذه الخطوة
            for (const inputId of step.inputIds || []) {
                if (!knownIds.has(inputId)) {
                    throw new Error(
                        `[AkashaRunner] Step ${step.id} references ` +
                        `undefined input ${inputId}.`
                    );
                }
            }

            knownIds.add(step.id);
        }
    }

    /**
     * التحقق من الناتج النهائي
     */
    _validateOutput(output) {
        if (!(output instanceof Float32Array)) {
            throw new Error(
                '[AkashaRunner] Output is not a Float32Array.'
            );
        }

        if (output.length === 0) {
            throw new Error(
                '[AkashaRunner] Output is empty.'
            );
        }

        // فحص إذا كان كل الناتج صفراً
        let allZero = true;
        for (let i = 0; i < output.length; i++) {
            if (output[i] !== 0) {
                allZero = false;
                break;
            }
        }

        if (allZero) {
            console.warn(
                '[RUNNER WARNING] Output contains only zeros. ' +
                'Check backend kernels and tensor parameters.'
            );
        }

        // فحص NaN / Infinity
        for (let i = 0; i < output.length; i++) {
            const value = output[i];
            if (!Number.isFinite(value)) {
                throw new Error(
                    `[AkashaRunner] Invalid output value at index ${i}: ${value}`
                );
            }
        }
    }

    /**
     * لوج مختصر للخطة
     */
    _logPlanSummary(plan) {
        const constCount = plan.filter(s => s.op === 'const').length;

        console.log(`[PLAN] Total Steps: ${plan.length}`);
        console.log(`[PLAN] Constants: ${constCount}`);
        console.log(
            `[PLAN] Final Op: ${plan[plan.length - 1].op}`
        );

        const preview = plan.slice(0, 10).map(step => ({
            id: step.id,
            op: step.op,
            shape: step.shape
        }));

        console.table(preview);
    }

    /**
     * تنظيف الموارد
     */
    dispose() {
        if (this.backend && typeof this.backend.dispose === 'function') {
            this.backend.dispose();
        }

        console.log('[RUNNER] Resources released.');
    }
}
