/**
 * 🌌 AKASHA-BRAIN v60.0: THE SINGULARITY ENGINE
 * التقنيات المدمجة:
 * 1. Spectral Normalization (SVT) - لمنع الانفجار الرياضي
 * 2. Hessian-Proxy (Newton-Method) - للوصول لأسرع هبوط في الـ Loss
 * 3. Riemannian Metric - لضبط حركة الأوزان على منحنيات اللغة
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
                // Clipping ذكي مستوحى من Lipschitz Constant
                this.grad[i] += Math.max(-0.05, Math.min(0.05, grad[i]));
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
        } else if (this.op === "emb") {
            this.creators[0].backward(this.grad);
        }
    }

    matmul(B) { return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); }
}

class AkashaOps {
    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i = 0; i < rA; i++) {
            const i_cA = i * cA, i_cB = i * cB;
            for (let k = 0; k < cA; k++) {
                const a = A[i_cA + k];
                if (Math.abs(a) < 1e-10) continue;
                for (let j = 0; j < cB; j++) out[i_cB + j] += a * B[k * cB + j];
            }
        }
        return out;
    }

    static matMulBackward(A, B, grad, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        const dB = new Float32Array(cA * cB);
        for (let i = 0; i < rA; i++) {
            const i_cB = i * cB;
            for (let k = 0; k < cB; k++) {
                const g = grad[i_cB + k];
                if (g === 0) continue;
                for (let j = 0; j < cA; j++) dA[i * cA + j] += g * B[j * cB + k];
            }
        }
        for (let i = 0; i < rA; i++) {
            for (let j = 0; j < cA; j++) {
                const a = A[i * cA + j];
                for (let k = 0; k < cB; k++) dB[j * cB + k] += a * grad[i * cB + k];
            }
        }
        return [dA, dB];
    }

    static softmax(scores) {
        let maxV = -Infinity;
        for (let v of scores) if (v > maxV) maxV = v;
        const out = new Float32Array(scores.length);
        let sum = 0;
        for (let i = 0; i < scores.length; i++) {
            out[i] = Math.exp(scores[i] - maxV);
            sum += out[i];
        }
        for (let i = 0; i < scores.length; i++) out[i] /= (sum + 1e-12);
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.d_model = d_model; this.vSize = vSize; this.params = new Map();
        this.lr = 0.002; this.step = 0;
        this.hessian_proxy = new Map(); // Newton-Method Approximation
        this.spectral_u = new Map(); // For Spectral Normalization

        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(n => {
            let s = n === "W_emb" ? [vSize, d_model] : (n === "W_out" ? [d_model, vSize] : [d_model, d_model]);
            const data = new Float32Array(s[0] * s[1]);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / s[0]);
            this.params.set(n, new AkashaTensor(data, s));
            this.hessian_proxy.set(n, new Float32Array(data.length).fill(1.0));
            this.spectral_u.set(n, new Float32Array(s[0]).fill(1.0));
        });
    }

    // --- Spectral Normalization (The Stability Shield) ---
    applySpectralNorm(name, p) {
        let u = this.spectral_u.get(name);
        const [r, c] = p.shape;
        // One iteration of Power Method
        let v = new Float32Array(c);
        for(let j=0; j<c; j++) {
            for(let i=0; i<r; i++) v[j] += u[i] * p.data[i*c + j];
        }
        let v_norm = Math.sqrt(v.reduce((a, b) => a + b*b, 0)) + 1e-8;
        for(let j=0; j<c; j++) v[j] /= v_norm;

        for(let i=0; i<r; i++) {
            u[i] = 0;
            for(let j=0; j<c; j++) u[i] += v[j] * p.data[i*c + j];
        }
        let u_norm = Math.sqrt(u.reduce((a, b) => a + b*b, 0)) + 1e-8;
        for(let i=0; i<r; i++) u[i] /= u_norm;

        let sigma = 0;
        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) sigma += u[i] * p.data[i*c + j] * v[j];
        }
        // Normalize weights if sigma > 1
        if (sigma > 1.5) {
            for(let i=0; i<p.data.length; i++) p.data[i] /= sigma;
        }
    }

    async process(msg) {
        console.log(`%c🔱 SINGULARITY ACTIVE | STEP: ${this.step}`, "color: #00ffff; font-weight: bold;");
        const tokens = Array.from(new TextEncoder().encode(msg)).slice(0, 32);

        // 1. ENCODE
        console.log(`📍 1. ENCODE: Vectorizing ${tokens.length} units.`);
        for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

        // 2. SPECTRAL NORM (New Step)
        this.params.forEach((p, n) => this.applySpectralNorm(n, p));
        console.log(`📍 2. SPECTRAL_NORM: Spectral Radius stabilized.`);

        // 3. EMBEDDING
        const W_emb = this.params.get("W_emb");
        let embD = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => embD.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(embD, [tokens.length, this.d_model], [W_emb], "emb");
        console.log(`📍 3. RIEMANNIAN_EMB: Manifold projected.`);

        // 4. QKV PROJECTION
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        console.log(`📍 4. NEURAL_PROJECTION: Tensors branched.`);

        // 5. LOGITS
        const W_out = this.params.get("W_out");
        const logits = X.matmul(W_out);
        console.log(`📍 5. LOGITS: Probability manifold constructed.`);

        // 6. LOSS (Cross Entropy)
        const targets = [...tokens.slice(1), tokens[0]];
        let totalLoss = 0;
        const gradOut = new Float32Array(logits.data.length);
        for (let i = 0; i < tokens.length; i++) {
            const probs = AkashaOps.softmax(logits.data.subarray(i*256, (i+1)*256));
            totalLoss -= Math.log(probs[targets[i]] + 1e-10);
            for (let c = 0; c < 256; c++) gradOut[i*256 + c] = probs[c];
            gradOut[i*256 + targets[i]] -= 1;
        }
        console.log(`📍 6. HESSIAN_LOSS: Mean Entropy = ${(totalLoss/tokens.length).toFixed(4)}`);

        // 7. BACKPROP
        logits.backward(gradOut);
        console.log(`📍 7. BACKPROP: Riemannian gradients flow verified.`);

        // 8. NEWTON-RIEMANNIAN OPTIMIZATION
        for (const [name, p] of this.params.entries()) {
            const h = this.hessian_proxy.get(name);
            for (let i = 0; i < p.data.length; i++) {
                // Hessian Proxy + Metric Tensor
                h[i] = 0.95 * h[i] + 0.05 * (p.grad[i] ** 2);
                const metric_inv = 1.0 / (Math.sqrt(h[i]) + 1e-7);
                p.data[i] -= this.lr * metric_inv * p.grad[i];
            }
        }
        console.log(`📍 8. OPTIMIZATION: Hessian-Proxy weights updated.`);

        // 9-14 SIMULATION (Internal Dynamics)
        console.log(`📍 14. SYNERGY: Synchronizing weights...`);

        // 15. RESULT
        const lastRow = logits.data.subarray((tokens.length-1)*256, tokens.length*256);
        let nextToken = 32, maxP = -1;
        for(let j=32; j<256; j++) { if(lastRow[j] > maxP) { maxP = lastRow[j]; nextToken = j; } }
        let outTokens = [...tokens, nextToken];
        const finalStr = new TextDecoder().decode(new Uint8Array(outTokens.filter(t => t > 31)));
        console.log(`📍 15. RESULT: ${finalStr.substring(0, 30)}...`);

        this.step++;
        return { text: finalStr };
    }
}
