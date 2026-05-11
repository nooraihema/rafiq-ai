/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v40.0
 * الإصلاح: إضافة دالة transpose المفقودة داخل الكلاس + استقرار الـ Gradients
 */

class AkashaTensor {
    constructor(data, shape, creators = [], op = "") {
        this.data = data instanceof Float32Array ? data : new Float32Array(data);
        this.shape = shape; 
        this.grad = new Float32Array(this.data.length).fill(0);
        this.creators = creators;
        this.op = op;
    }
    get rows() { return this.shape[0]; }
    get cols() { return this.shape[1]; }

    // 🛠️ الربط المفقود الذي تسبب في الـ Error
    transpose() {
        return new AkashaTensor(
            AkashaOps.transpose(this.data, this.rows, this.cols),
            [this.cols, this.rows],
            [this],
            "transpose"
        );
    }

    backward(grad = null) {
        if (grad) {
            for (let i = 0; i < this.grad.length; i++) {
                this.grad[i] += Math.max(-1.0, Math.min(1.0, grad[i])); 
            }
        } else {
            this.grad.fill(1.0);
        }
        this.dispatch();
    }

    dispatch() {
        if (this.op === "matmul") {
            const [A, B] = this.creators;
            const dA = AkashaOps.matMulGradA(this.grad, B.data, A.rows, A.cols, B.cols);
            const dB = AkashaOps.matMulGradB(this.grad, A.data, A.rows, A.cols, B.cols);
            A.backward(dA); 
            B.backward(dB);
        } else if (this.op === "add" || this.op === "emb" || this.op === "transpose") {
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
    static transpose(d, r, c) {
        const out = new Float32Array(d.length);
        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) {
                out[j*r+i] = d[i*c+j];
            }
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
                if(a === 0) continue;
                const k_cB = k * cB;
                for (let j=0; j<cB; j++) out[i_cB + j] += a * B[k_cB + j];
            }
        }
        return out;
    }

    static matMulGradA(grad, B, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        for (let i=0; i<rA; i++) {
            const i_cB = i * cB;
            const i_cA = i * cA;
            for (let j=0; j<cA; j++) {
                let sum = 0;
                const j_cB = j * cB;
                for (let k=0; k<cB; k++) sum += grad[i_cB + k] * B[j_cB + k];
                dA[i_cA + j] = sum;
            }
        }
        return dA;
    }

    static matMulGradB(grad, A, rA, cA, cB) {
        const dB = new Float32Array(cA * cB);
        for (let i=0; i<cA; i++) {
            for (let j=0; j<cB; j++) {
                let sum = 0;
                for (let k=0; k<rA; k++) sum += A[k * cA + i] * grad[k * cB + j];
                dB[i * cB + j] = sum;
            }
        }
        return dB;
    }

    static softmax(scores, rows, cols) {
        const out = new Float32Array(scores.length);
        for (let i = 0; i < rows; i++) {
            const start = i * cols;
            let maxVal = -Infinity;
            for (let j = 0; j < cols; j++) if (scores[start + j] > maxVal) maxVal = scores[start + j];
            let sum = 0;
            for (let j = 0; j < cols; j++) {
                const e = Math.exp(Math.max(-50, Math.min(50, scores[start + j] - maxVal)));
                out[start + j] = e; sum += e;
            }
            for (let j = 0; j < cols; j++) out[start + j] /= (sum + 1e-9);
        }
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.d_model = d_model; this.vSize = vSize; this.params = new Map();
        this.lr = 0.005; this.step = 0; this.heads = 4;
        this.m = new Map(); this.v = new Map();

        const layers = ["W_emb", "W_q", "W_k", "W_v", "W_ff1", "W_ff2", "W_proj"];
        layers.forEach(n => {
            let s = n==="W_emb"?[vSize,d_model]:n==="W_ff1"?[d_model,d_model*4]:n==="W_ff2"?[d_model*4,d_model]:[d_model,d_model];
            const data = new Float32Array(s[0]*s[1]);
            const scale = Math.sqrt(2/(s[0]+s[1]));
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1)*scale;
            this.params.set(n, new AkashaTensor(data, s, [], "param"));
            this.m.set(n, new Float32Array(data.length));
            this.v.set(n, new Float32Array(data.length));
        });
        const W_emb = this.params.get("W_emb");
        this.params.set("W_out", new AkashaTensor(W_emb.data, [d_model, vSize], [W_emb], "tied_param"));
    }

    encode(text) { return Array.from(new TextEncoder().encode(text)); }
    decode(tokens) {
        const clean = tokens.map(t => Math.round(t)).filter(t => t > 31 && t < 256);
        return new TextDecoder('utf-8').decode(new Uint8Array(clean));
    }

    sampleTopK(logits, k = 10, temp = 0.7) {
        const scaled = Array.from(logits, v => isFinite(v) ? v / temp : -100);
        const indexed = scaled.map((v, i) => ({ i, v }))
            .filter(it => it.i > 31)
            .sort((a, b) => b.v - a.v).slice(0, k);
        const maxV = indexed[0].v;
        let sum = 0;
        const probs = indexed.map(it => { const p = Math.exp(it.v - maxV); sum += p; return p; });
        let r = Math.random(), cum = 0;
        for (let i = 0; i < probs.length; i++) { 
            cum += probs[i]/sum; 
            if (r <= cum) return indexed[i].i; 
        }
        return indexed[0].i;
    }

    async forwardInference(tokens) {
        const W_emb = this.params.get("W_emb");
        const embData = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => {
            const idx = Math.min(this.vSize-1, Math.max(0, t));
            embData.set(W_emb.data.subarray(idx*this.d_model, (idx+1)*this.d_model), i*this.d_model)
        });
        let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "emb");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        let sc = Q.matmul(K.transpose());
        for(let i=0; i<sc.data.length; i++) sc.data[i] /= Math.sqrt(this.d_model);
        const attnWeights = AkashaOps.softmax(sc.data, sc.rows, sc.cols);
        X = X.add((new AkashaTensor(attnWeights, sc.shape)).matmul(V).matmul(this.params.get("W_proj")));
        const h = X.matmul(this.params.get("W_ff1"));
        X = X.add(h.matmul(this.params.get("W_ff2")));
        return X.matmul(this.params.get("W_out")).data;
    }

    async process(msg) {
        console.log(`--- [START STEP ${this.step}] ---`);
        const tokens = this.encode(msg).slice(0, 64);
        console.log(`📍 1. ENCODE: [${tokens.slice(0, 5)}...]`);

        // Forward
        const W_emb = this.params.get("W_emb");
        const embData = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "emb");
        console.log(`📍 2. EMBED: [${X.shape}]`);

        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const sc = Q.matmul(K.transpose());
        console.log(`📍 3. ATTN_SC: [${sc.shape}]`);

        const logitsFull = X.matmul(this.params.get("W_out"));
        console.log(`📍 4. LOGITS: OK`);

        // Loss & Grad
        const targets = tokens.slice(1); targets.push(tokens[tokens.length-1]);
        const grad = new Float32Array(logitsFull.data.length);
        let totalLoss = 0;
        for (let r = 0; r < logitsFull.rows; r++) {
            const start = r * this.vSize;
            const probs = AkashaOps.softmax(logitsFull.data.subarray(start, start + this.vSize), 1, this.vSize);
            const t = targets[r];
            totalLoss += -Math.log(probs[t] + 1e-9);
            for (let c = 0; c < this.vSize; c++) grad[start + c] = probs[c];
            grad[start + t] -= 1;
        }
        console.log(`📍 6. LOSS: ${(totalLoss/tokens.length).toFixed(4)}`);

        // Backward
        for (const p of this.params.values()) p.grad.fill(0);
        logitsFull.backward(grad);
        console.log(`📍 7. BACKWARD: Done`);

        const qGrad = this.params.get("W_q").grad.subarray(0,3);
        console.log(`📍 8. GRAD_CHECK: [${qGrad.map(v=>v.toExponential(1))}]`);

        // Optimizer
        for (const [name, p] of this.params.entries()) {
            if (name === "W_out") continue;
            const m = this.m.get(name), v = this.v.get(name);
            for (let i = 0; i < p.data.length; i++) {
                m[i] = 0.9 * m[i] + 0.1 * p.grad[i];
                v[i] = 0.999 * v[i] + 0.001 * p.grad[i] * p.grad[i];
                p.data[i] -= this.lr * m[i] / (Math.sqrt(v[i]) + 1e-8);
            }
        }
        console.log(`📍 9. OPTIMIZE: Done`);

        // Gen
        let genTokens = [...tokens];
        for (let i = 0; i < 30; i++) {
            const currentLogits = await this.forwardInference(genTokens);
            const lastRow = currentLogits.slice((genTokens.length - 1) * this.vSize, genTokens.length * this.vSize);
            genTokens.push(this.sampleTopK(lastRow));
        }
        const finalOutput = this.decode(genTokens);
        console.log(`📍 15. RESULT: [${finalOutput.substring(0, 30)}...]`);
        
        this.step++;
        return { text: finalOutput };
    }
}
