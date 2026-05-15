/**
 * src/core/akasharunner.js
 * الحالة: المايسترو المصحح (النسخة الحية)
 * التحديث: توليد الأوزان تلقائياً ومطابقة أبعاد القاموس لمنع موت الإشارة
 */

import { Embedding } from './layers/embedding.js';
import { MultiHeadAttention } from './layers/attention.js';
import { FeedForward } from './layers/ffn.js';
import { Tensor } from './tensor.js';

export class AkashaRunner {
    constructor(backend, vocabSize = 2526) { // نمرر الـ vocabSize الافتراضي أو الحقيقي
        this.backend = backend;
        this.vocabSize = vocabSize;
        
        console.log(`%c[Akasha Runner] Initializing Layers with Vocab Size: ${vocabSize}`, "color: #00bfff; font-weight: bold;");

        // تهيئة الطبقات بأبعاد مطابقة تماماً للواقع
        this.embedding = new Embedding(vocabSize, 512, 128); 
        this.attention = new MultiHeadAttention({ embedDim: 512, numHeads: 8 });
        this.ffn = new FeedForward(512, 2048);

        // صدمة الأوزان: لازم نملأ الطبقات بأرقام عشوائية عشان الإشارة تعيش!
        this._initializeRandomWeights();
    }

    async run(tokenIds) {
        try {
            if (tokenIds.length === 0) return new Float32Array(this.vocabSize).fill(0);

            // 1. تحويل التوكنز لتنسور مدخلات آمن
            const inputTensor = new Tensor(new Float32Array(tokenIds), { 
                shape: [tokenIds.length], 
                op: 'input',
                id: 'input_ids'
            });

            // 2. تتبع العمليات وبناء الـ Graph
            let x = this.embedding.forward(inputTensor);
            x = this.attention.forward(x);
            x = this.ffn.forward(x);

            // 3. بناء خطة التنفيذ خطوة بخطوة
            const plan = this._buildPlan(x);

            // 4. الـ Checkpoint الأخير: التأكد من إن الأوزان مش أصفار قبل الإرسال للـ GPU
            this._checkPlanHealth(plan);

            // 5. التنفيذ على الـ GPU
            const result = await this.backend.execute(plan);

            return result;
        } catch (err) {
            console.error("[Akasha Runner Error]:", err);
            throw err;
        }
    }

    /**
     * دالة سحرية لملء الأوزان بقيم عشوائية صغيرة (Xavier-like) لمنع الأصفار القاتلة
     */
    _initializeRandomWeights() {
        const layers = [this.embedding, this.attention, this.ffn];
        
        layers.forEach(layer => {
            // هنلف على كل الخصائص جوه الكلاس بتاع الطبقة، لو لقينا تنسور (Tensor) ونوعه 'const' نملأه داتا
            for (let key in layer) {
                if (layer[key] && layer[key].op === 'const') {
                    const tensor = layer[key];
                    if (tensor.data && tensor.data.some(v => v !== 0)) {
                        // الطبقة محملة أوزان فعلاً، سيبها في حالها
                        continue;
                    }
                    
                    // توليد أوزان عشوائية ذكية (بين -0.02 و 0.02) شبه أوزان GPT
                    const size = tensor.data ? tensor.data.length : tensor.shape.reduce((a,b)=>a*b, 1);
                    const randomData = new Float32Array(size);
                    for(let i=0; i<size; i++) {
                        randomData[i] = (Math.random() - 0.5) * 0.02; 
                    }
                    tensor.data = randomData;
                    console.log(`[Weight Init] Armed Layer Component: ${tensor.id} | Size: ${size}`);
                }
            }
        });
    }

    _checkPlanHealth(plan) {
        let constCount = 0;
        let deadConstCount = 0;

        plan.forEach(step => {
            if (step.op === 'const' && step.data) {
                constCount++;
                const isDead = !step.data.some(v => v !== 0);
                if (isDead) deadConstCount++;
            }
        });

        if (deadConstCount > 0) {
            console.warn(`%c[⚠️ CRITICAL] Plan contains ${deadConstCount}/${constCount} DEAD weight layers (all zeros)!`, "background: #ffff00; color: black;");
        } else {
            console.log(`%c[🔥 PLAN HEALTHY] All ${constCount} weight layers contain live signals.`, "color: #00ff41;");
        }
    }

    _buildPlan(lastTensor) {
        const plan = [];
        const visited = new Set();

        const traverse = (t) => {
            if (!t || visited.has(t.id)) return;

            if (t.inputs && t.inputs.length > 0) {
                t.inputs.forEach(input => traverse(input));
            }

            const step = {
                op: t.op,
                id: t.id,
                shape: t.shape,
                data: t.data,      
                params: t.params || {}, 
                inputIds: t.inputs ? t.inputs.map(i => i.id) : []
            };

            plan.push(step);
            visited.add(t.id);
        };

        traverse(lastTensor);
        return plan;
    }
}
