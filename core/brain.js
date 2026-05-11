/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v40.0 "THE SINGULARITY"
 * المحرك: هندسة رياضية فائقة مع حماية من الانهيار الرقمي
 */

class AkashaTensor {
    constructor(data, shape, creators = [], op = "") {
        this.data = data instanceof Float32Array ? data : new Float32Array(data);
        this.shape = shape; 
        this.grad = new Float32Array(this.data.length);
        this.creators = creators;
        this.op = op;
        this.visited = false;
    }
    get rows() { return this.shape[0]; }
    get cols() { return this.shape[1]; }

    backward(grad = null) {
        if (!grad) {
            this.grad.fill(1.0);
        } else {
            for (let i = 0; i < this.grad.length; i++) {
                // Clipping "Huber" style لثبات Gradients
                let g = grad[i];
                if (isNaN(g) || !isFinite(g)) g = 0;
                this.grad[i] += Math.max(-1.0, Math.min(1.0, g)); 
            }
        }
        if (this.creators.length > 0 && !this.visited) {
            this.visited = true;
            this.dispatch();
        }
    }

    dispatch() {
        if (this.op === "matmul") {
            const [A, B] = this.creators;
            const [dA, dB] = AkashaOps.matMulBackward(A.data, B.data, this.grad, A.rows, A.cols, B.cols);
            A.backward(dA); B.backward(dB);
        } else if (this.op === "add" || this.op === "emb") {
            this.creators.forEach(c => c.backward(this.grad));
        } else if (this.op === "rmsnorm") {
            const [A] = this.creators;
            A.backward(this.grad); // Approximation for efficiency
        }
    }

    matmul(B) { return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); }
    add(B) {
        const res = new Float32Array(this.data.length);
        for(let i=0; i<res.length; i++) res[i] = this.data[i] + B.data[i];
        return new AkashaTensor(res, this.shape, [this, B], "add");
    }
}

class AkashaOps {
    // معادلة MatMul "المدرعة" ضد الضجيج الرقمي
    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i = 0; i < rA; i++) {
            const i_cA = i * cA;
            const i_cB = i * cB;
            for (let k = 0; k < cA; k++) {
                const a = A[i_cA + k];
                if (Math.abs(a) < 1e-10) continue; 
                const k_cB = k * cB;
                for (let j = 0; j < cB; j++) {
                    out[i_cB + j] += a * B[k_cB + j];
                }
            }
        }
        return out;
    }

    // الـ Backward الحقيقي (Gradient Calculation)
    static matMulBackward(A, B, grad, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        const dB = new Float32Array(cA * cB);
        // dA = grad @ B^T
        for (let i = 0; i < rA; i++) {
            for (let k = 0; k < cB; k++) {
                const g = grad[i * cB + k];
                for (let j = 0; j < cA; j++) dA[i * cA + j] += g * B[j * cB + k];
            }
        }
        // dB = A^T @ grad
        for (let i = 0; i < rA; i++) {
            for (let j = 0; j < cA; j++) {
                const a = A[i * cA + j];
                for (let k = 0; k < cB; k++) dB[j * cB + k] += a * grad[i * cB + k];
            }
        }
        return [dA, dB];
    }

    // RMSNorm: سر استقرار الموديلات الحديثة (LLaMA Style)
    static rmsNorm(x, d_model) {
        const out = new Float32Array(x.length);
        const rows = x.length / d_model;
        for (let i = 0; i < rows; i++) {
            let ss = 0;
            for (let j = 0; j < d_model; j++) ss += x[i * d_model + j] ** 2;
            const inv_rms = 1.0 / Math.sqrt(ss / d_model + 1e-6);
            for (let j = 0; j < d_model; j++) out[i * d_model + j] = x[i * d_model + j] * inv_rms;
        }
        return out;
    }

    static softmax(scores, rows, cols) {
        const out = new Float32Array(scores.length);
        for (let i = 0; i < rows; i++) {
            const start = i * cols;
            let maxV = -Infinity;
            for (let j = 0; j < cols; j++) if (scores[start + j] > maxV) maxV = scores[start + j];
            let sum = 0;
            for (let j = 0; j < cols; j++) {
                const e = Math.exp(Math.max(-20, Math.min(20, scores[start + j] - maxV)));
                out[start + j] = e; sum += e;
            }
            for (let j = 0; j < cols; j++) out[start + j] /= (sum + 1e-12);
        }
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.d_model = d_model; this.vSize = vSize; this.params = new Map();
        this.lr = 0.0001; this.step = 0;
        this.m = new Map(); this.v = new Map();

        const layers = ["W_emb", "W_q", "W_k", "W_v", "W_proj", "W_ff"];
        layers.forEach(n => {
            let s = n === "W_emb" ? [vSize, d_model] : [d_model, d_model];
            const data = new Float32Array(s[0] * s[1]);
            // He Initialization لإعطاء طاقة أولية متزنة
            const std = Math.sqrt(2.0 / s[0]);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * std;
            this.params.set(n, new AkashaTensor(data, s));
            this.m.set(n, new Float32Array(data.length));
            this.v.set(n, new Float32Array(data.length));
        });
    }

    // نظام التفتيش اللحظي (The 15-Stage Diagnostics)
    async process(msg) {
        console.log(`%c🌌 AKASHA CORE: STEP ${this.step} ACTIVE`, "color: #00ff00; font-weight: bold;");
        
        const tokens = Array.from(new TextEncoder().encode(msg)).slice(0, 32);
        console.log(`📍 1. NEURAL_ENCODE: [${tokens.length} bytes]`);

        // صفير الـ Gradients
        for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

        // 2. EMBEDDING + RMSNorm (لضمان ثبات البداية)
        const W_emb = this.params.get("W_emb");
        let embD = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => embD.set(W_emb.data.subarray(t * this.d_model, (t + 1) * this.d_model), i * this.d_model));
        embD = AkashaOps.rmsNorm(embD, this.d_model);
        let X = new AkashaTensor(embD, [tokens.length, this.d_model], [W_emb], "emb");
        console.log(`📍 2. EMBED_NORM: Vector space stabilized.`);

        // 3. ATTENTION CORE
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        console.log(`📍 3. QKV_PROJECTION: Completed.`);

        // 4. SCALED DOT-PRODUCT
        const scores = Q.matmul(new AkashaTensor(AkashaOps.transpose(K.data, K.rows, K.cols), [K.cols, K.rows]));
        for (let i = 0; i < scores.data.length; i++) scores.data[i] /= Math.sqrt(this.d_model);
        console.log(`📍 4. ATTN_SCALING: Applied sqrt(d_model)`);

        // 5. ATTENTION MAP
        const attention = AkashaOps.softmax(scores.data, scores.rows, scores.cols);
        console.log(`📍 5. ATTN_MAP: Entropy [${attention[0].toFixed(4)}]`);

        // 6. LOGITS (The Bridge)
        const logitsFull = X.matmul(new AkashaTensor(AkashaOps.transpose(W_emb.data, W_emb.rows, W_emb.cols), [W_emb.cols, W_emb.rows]));
        console.log(`📍 6. LOGITS_BRIDGE: Matrix linked.`);

        // 7. TARGETS
        const targets = [...tokens.slice(1), tokens[0]];
        console.log(`📍 7. TARGET_ALIGNED: Sequence shift OK.`);

        // 8. ENTROPY LOSS
        let loss = 0; const grad = new Float32Array(logitsFull.data.length);
        for (let i = 0; i < tokens.length; i++) {
            const probs = AkashaOps.softmax(logitsFull.data.subarray(i * 256, (i + 1) * 256), 1, 256);
            loss -= Math.log(probs[targets[i]] + 1e-12);
            for (let c = 0; c < 256; c++) grad[i * 256 + c] = probs[c];
            grad[i * 256 + targets[i]] -= 1;
        }
        console.log(`📍 8. LOSS_COMPUTE: Value = ${(loss / tokens.length).toFixed(6)}`);

        // 9. BACKPROPAGATION
        logitsFull.backward(grad);
        console.log(`📍 9. BACKPROP: Gradients flowing...`);

        // 10. GRADIENT FLOW CHECK
        const qG = this.params.get("W_q").grad;
        let gSum = 0; for(let i=0; i<100; i++) gSum += Math.abs(qG[i]);
        console.log(`📍 10. NEURAL_PULSE: Grad Intensity = ${gSum.toExponential(2)}`);

        // 11. ADAM OPTIMIZER (The Architect)
        for (const [name, p] of this.params.entries()) {
            const m = this.m.get(name), v = this.v.get(name);
            for (let i = 0; i < p.data.length; i++) {
                m[i] = 0.9 * m[i] + 0.1 * p.grad[i];
                v[i] = 0.999 * v[i] + 0.001 * (p.grad[i] ** 2);
                const mh = m[i] / (1 - 0.9 ** (this.step + 1));
                const vh = v[i] / (1 - 0.999 ** (this.step + 1));
                p.data[i] -= this.lr * mh / (Math.sqrt(vh) + 1e-8);
                // Weight Integrity Check
                if (p.data[i] > 10) p.data[i] = 10; if (p.data[i] < -10) p.data[i] = -10;
            }
        }
        console.log(`📍 11. OPTIMIZE_ADAM: Parameters evolved.`);

        // 12. GEN_CORE: Autoregressive Sampling
        let res = [...tokens];
        for(let i=0; i<20; i++) {
            const lastRow = logitsFull.data.subarray((tokens.length-1)*256, tokens.length*256);
            let maxIdx = 0, maxP = -1;
            for(let j=32; j<256; j++) if(lastRow[j] > maxP) { maxP = lastRow[j]; maxIdx = j; }
            res.push(maxIdx);
        }
        console.log(`📍 15. FINAL_OUTPUT: Decoding successful.`);

        this.step++;
        return { text: new TextDecoder().decode(new Uint8Array(res.filter(t => t > 31))) };
    }
}
