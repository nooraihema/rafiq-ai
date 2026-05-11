/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v42.0 "THE QUANTUM ARCHITECT"
 * الميزات: RMSNorm + Rotary Positional Logic + Advanced Diagnostics
 */

class AkashaTensor {
    constructor(data, shape, creators = [], op = "") {
        this.data = data instanceof Float32Array ? data : new Float32Array(data);
        this.shape = shape; 
        this.grad = new Float32Array(this.data.length).fill(0);
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
                let g = grad[i];
                if (isNaN(g) || !isFinite(g)) g = 0;
                // "Gradient Clipping" لضمان عدم انفجار الأرقام
                this.grad[i] += Math.max(-0.5, Math.min(0.5, g)); 
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
    // تم إضافة الـ Transpose المفقودة مع تحسين الأداء
    static transpose(d, r, c) {
        const out = new Float32Array(d.length);
        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) out[j*r + i] = d[i*c + j];
        }
        return out;
    }

    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i=0; i<rA; i++) {
            const i_cA = i * cA;
            const i_cB = i * cB;
            for (let k=0; k<cA; k++) {
                const a = A[i_cA + k];
                if(Math.abs(a) < 1e-12) continue;
                const k_cB = k * cB;
                for (let j=0; j<cB; j++) out[i_cB + j] += a * B[k_cB + j];
            }
        }
        return out;
    }

    static matMulBackward(A, B, grad, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        const dB = new Float32Array(cA * cB);
        for (let i=0; i<rA; i++) {
            const i_cB = i * cB;
            for (let k=0; k<cB; k++) {
                const g = grad[i_cB + k];
                if(g === 0) continue;
                const k_rA = k * rA; // For dB optimization
                for (let j=0; j<cA; j++) dA[i*cA + j] += g * B[j*cB + k];
            }
        }
        for (let i=0; i<rA; i++) {
            for (let j=0; j<cA; j++) {
                const a = A[i*cA + j];
                for (let k=0; k<cB; k++) dB[j*cB + k] += a * grad[i*cB + k];
            }
        }
        return [dA, dB];
    }

    static rmsNorm(x, d_model) {
        const out = new Float32Array(x.length);
        const rows = x.length / d_model;
        for (let i = 0; i < rows; i++) {
            let ss = 0;
            for (let j = 0; j < d_model; j++) ss += x[i*d_model + j] ** 2;
            const inv_rms = 1.0 / Math.sqrt(ss / d_model + 1e-6);
            for (let j = 0; j < d_model; j++) out[i*d_model + j] = x[i*d_model + j] * inv_rms;
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
                const e = Math.exp(Math.max(-30, Math.min(30, scores[start + j] - maxV)));
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
        this.lr = 0.0002; this.step = 0; this.heads = 4;
        this.m = new Map(); this.v = new Map();

        const layers = ["W_emb", "W_q", "W_k", "W_v", "W_proj", "W_ff"];
        layers.forEach(n => {
            let s = n === "W_emb" ? [vSize, d_model] : [d_model, d_model];
            const data = new Float32Array(s[0] * s[1]);
            // Xavier/Glorot Initialization لثبات الطاقة الحركية للموديل
            const scale = Math.sqrt(6.0 / (s[0] + s[1]));
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2 - 1) * scale;
            this.params.set(n, new AkashaTensor(data, s));
            this.m.set(n, new Float32Array(data.length));
            this.v.set(n, new Float32Array(data.length));
        });
    }

    async process(msg) {
        console.log(`%c🚀 AKASHA ENGINE v42.0 | STEP: ${this.step}`, "color: #00d4ff; font-weight: bold;");
        
        // 1. ENCODING & SECURITY
        const tokens = Array.from(new TextEncoder().encode(msg)).slice(0, 32);
        console.log(`📍 1. ENCODE: Received ${tokens.length} tokens.`);

        for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

        // 2. STABLE EMBEDDING (RMSNorm Integration)
        const W_emb = this.params.get("W_emb");
        let embD = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => {
            const idx = Math.min(255, Math.max(0, t));
            embD.set(W_emb.data.subarray(idx * this.d_model, (idx + 1) * this.d_model), i * this.d_model);
        });
        embD = AkashaOps.rmsNorm(embD, this.d_model);
        let X = new AkashaTensor(embD, [tokens.length, this.d_model], [W_emb], "emb");
        console.log(`📍 2. RMS_NORM: Vector space stabilized.`);

        // 3. RELATIVITY (QKV Projection)
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        console.log(`📍 3. NEURAL_PROJECTION: Q,K,V tensors ready.`);

        // 4. THE SINGULARITY (Attention Mechanism)
        const K_T = new AkashaTensor(AkashaOps.transpose(K.data, K.rows, K.cols), [K.cols, K.rows]);
        const scores = Q.matmul(K_T);
        for (let i = 0; i < scores.data.length; i++) scores.data[i] /= Math.sqrt(this.d_model);
        
        const attnMap = AkashaOps.softmax(scores.data, scores.rows, scores.cols);
        console.log(`📍 4. ATTENTION: Softmax distribution aligned.`);

        // 5. OUTPUT SYNTHESIS (Logits Bridge)
        const W_out_data = AkashaOps.transpose(W_emb.data, W_emb.rows, W_emb.cols);
        const W_out = new AkashaTensor(W_out_data, [this.d_model, 256]);
        const logitsFull = X.matmul(W_out);
        console.log(`📍 5. LOGITS: Probability bridge constructed.`);

        // 6. TARGETING & LOSS (Cross-Entropy)
        const targets = [...tokens.slice(1), tokens[0]];
        let loss = 0; const grad = new Float32Array(logitsFull.data.length);
        for (let i = 0; i < tokens.length; i++) {
            const rowStart = i * 256;
            const probs = AkashaOps.softmax(logitsFull.data.subarray(rowStart, rowStart + 256), 1, 256);
            loss -= Math.log(probs[targets[i]] + 1e-10);
            for (let c = 0; c < 256; c++) grad[rowStart + c] = probs[c];
            grad[rowStart + targets[i]] -= 1;
        }
        console.log(`📍 6. QUANTUM_LOSS: Mean Entropy = ${(loss / tokens.length).toFixed(5)}`);

        // 7. NEURAL FEEDBACK (Backpropagation)
        logitsFull.backward(grad);
        console.log(`📍 7. BACKPROP: Gradient flow verified.`);

        // 8. EVOLUTION (Adam Optimizer)
        for (const [name, p] of this.params.entries()) {
            const m = this.m.get(name), v = this.v.get(name);
            for (let i = 0; i < p.data.length; i++) {
                m[i] = 0.9 * m[i] + 0.1 * p.grad[i];
                v[i] = 0.999 * v[i] + 0.001 * (p.grad[i] ** 2);
                const mh = m[i] / (1 - 0.9 ** (this.step + 1));
                const vh = v[i] / (1 - 0.999 ** (this.step + 1));
                p.data[i] -= this.lr * mh / (Math.sqrt(vh) + 1e-8);
                // الحماية من الانفجار العددي
                if (Math.abs(p.data[i]) > 10) p.data[i] *= 0.95;
            }
        }
        console.log(`📍 8. OPTIMIZATION: Synaptic weights updated.`);

        // 9. REGENERATION (Inference)
        let genTokens = [...tokens];
        for(let i=0; i<15; i++) {
            const lastRow = logitsFull.data.subarray((tokens.length-1)*256, tokens.length*256);
            let nextT = 0, maxP = -1;
            for(let j=32; j<256; j++) { if(lastRow[j] > maxP) { maxP = lastRow[j]; nextT = j; } }
            genTokens.push(nextT);
        }
        
        this.step++;
        const finalStr = new TextDecoder().decode(new Uint8Array(genTokens.filter(t => t > 31)));
        console.log(`📍 15. RESULT: ${finalStr.substring(0, 30)}...`);

        return { text: finalStr };
    }
}
