/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v36.0
 * التعديلات: UTF-8 Byte Tokenizer + Causal Mask + Top-K + Deep Visual Logs
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
                this.grad[i] += Math.max(-0.1, Math.min(0.1, grad[i])); 
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
        } else if (this.op === "gelu") {
            const [A] = this.creators;
            const dI = new Float32Array(this.grad.length);
            for (let i = 0; i < A.data.length; i++) {
                const x = A.data[i];
                const c = Math.sqrt(2 / Math.PI);
                const t = Math.tanh(c * (x + 0.044715 * Math.pow(x, 3)));
                dI[i] = this.grad[i] * (0.5 * (1 + t) + (0.5 * x * (1 - t * t) * c * (1 + 3 * 0.044715 * x * x)));
            }
            A.backward(dI);
        } else {
            this.creators.forEach(c => c.backward(this.grad));
        }
    }

    matmul(B) { return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); }
    transpose() { return new AkashaTensor(AkashaOps.transpose(this.data, this.rows, this.cols), [this.cols, this.rows], [this], "transpose"); }
    add(B) {
        const res = new Float32Array(this.data.length);
        for(let i=0; i<res.length; i++) res[i] = this.data[i] + B.data[i];
        return new AkashaTensor(res, this.shape, [this, B], "add");
    }
    layerNorm() {
        const out = new Float32Array(this.data.length);
        for (let r = 0; r < this.rows; r++) {
            const start = r * this.cols;
            let m = 0; for (let i = 0; i < this.cols; i++) m += this.data[start+i]; m /= this.cols;
            let v = 0; for (let i = 0; i < this.cols; i++) { const d = this.data[start+i]-m; v += d*d; } v /= this.cols;
            const s = Math.sqrt(v + 1e-5);
            for (let i = 0; i < this.cols; i++) out[start+i] = (this.data[start+i]-m)/s;
        }
        return new AkashaTensor(out, this.shape, [this], "layernorm");
    }
}

class AkashaOps {
    static transpose(d, r, c) {
        const out = new Float32Array(d.length);
        for(let i=0; i<r; i++) for(let j=0; j<c; j++) out[j*r+i] = d[i*c+j];
        return out;
    }
    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i=0; i<rA; i++) for (let k=0; k<cA; k++) {
            const a = A[i*cA+k]; if(a===0) continue;
            for (let j=0; j<cB; j++) out[i*cB+j] += a * B[k*cB+j];
        }
        return out;
    }
    static matMulBackward(A, B, grad, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        const dB = new Float32Array(cA * cB);
        for (let i=0; i<rA; i++) for (let j=0; j<cA; j++) {
            let s=0; for (let k=0; k<cB; k++) s += grad[i*cB+k]*B[j*cB+k]; dA[i*cA+j]=s;
        }
        for (let i=0; i<cA; i++) for (let j=0; j<cB; j++) {
            let s=0; for (let k=0; k<rA; k++) s += A[k*cA+i]*grad[k*cB+j]; dB[i*cB+j]=s;
        }
        return [dA, dB];
    }
    static softmax(scores, rows, cols) {
        const out = new Float32Array(scores.length);
        for (let i = 0; i < rows; i++) {
            const start = i * cols;
            // 🔥 CAUSAL MASK: الموديل مبيشوفش غير الماضي
            for (let j = i + 1; j < cols; j++) scores[start + j] = -1e9;
            
            let maxVal = -Infinity;
            for (let j = 0; j < cols; j++) if (scores[start + j] > maxVal) maxVal = scores[start + j];
            let sum = 0;
            for (let j = 0; j < cols; j++) {
                const e = Math.exp(scores[start + j] - maxVal);
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
        this.lr = 0.001; this.step = 0; this.heads = 4;
        this.beta1 = 0.9; this.beta2 = 0.999; this.eps = 1e-8;
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
        // Weight Tying
        const W_emb = this.params.get("W_emb");
        this.params.set("W_out", new AkashaTensor(W_emb.data, [d_model, vSize], [W_emb], "tied_param"));
    }

    // 🔥 UTF-8 Byte Tokenizer
    encode(text) { return Array.from(new TextEncoder().encode(text)); }
    decode(tokens) {
        const clean = tokens.map(t => Math.max(0, Math.min(255, Math.round(t)))).filter(t => Number.isFinite(t));
        try { return new TextDecoder('utf-8').decode(new Uint8Array(clean)); }
        catch { return clean.map(t => String.fromCharCode(t)).join(''); }
    }

    sampleTopK(logits, k = 20, temp = 0.8) {
        const scaled = Array.from(logits, v => v / temp);
        const indexed = scaled.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v).slice(0, k);
        const maxV = indexed[0].v;
        let sum = 0;
        const probs = indexed.map(it => { const p = Math.exp(it.v - maxV); sum += p; return p; });
        let r = Math.random(), cum = 0;
        for (let i = 0; i < probs.length; i++) { cum += probs[i]/sum; if (r <= cum) return indexed[i].i; }
        return indexed[0].i;
    }

    async forwardInference(tokens) {
        const W_emb = this.params.get("W_emb");
        const embData = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "emb");
        
        // Multi-Head Attention
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        let sc = Q.matmul(K.transpose());
        const scale = Math.sqrt(this.d_model / this.heads);
        for(let i=0; i<sc.data.length; i++) sc.data[i] /= scale;
        
        const attnWeights = AkashaOps.softmax(sc.data, sc.rows, sc.cols);
        const weights = new AkashaTensor(attnWeights, sc.shape, [sc], "softmax");
        X = X.add(weights.matmul(V).matmul(this.params.get("W_proj")));

        // FFN
        const h = X.matmul(this.params.get("W_ff1"));
        const gelu = new Float32Array(h.data.length);
        for(let i=0; i<h.data.length; i++) {
            const x = h.data[i];
            gelu[i] = 0.5 * x * (1 + Math.tanh(Math.sqrt(2/Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
        }
        X = X.add((new AkashaTensor(gelu, h.shape, [h], "gelu")).matmul(this.params.get("W_ff2")));
        
        return X.matmul(this.params.get("W_out")).data;
    }

    async process(msg) {
        const tokens = this.encode(msg);
        console.log(`🔢 [MATH-LOG]: Encoding "${msg}" -> Bytes: [${tokens.slice(0,10)}...]`);
        
        // Training Step
        for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }
        const W_emb = this.params.get("W_emb");
        const embData = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "emb");
        
        // Attention + Forward
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const sc = Q.matmul(K.transpose());
        const smax = AkashaOps.softmax(sc.data, sc.rows, sc.cols);
        console.log(`🧠 [MATH-LOG]: Attention Matrix Sample (Row 0): [${smax.subarray(0, 5).map(v=>v.toFixed(3))}]`);

        const logitsFull = X.matmul(this.params.get("W_out"));
        
        // Loss
        const targets = tokens.slice(1); targets.push(tokens[tokens.length-1]);
        const grad = new Float32Array(logitsFull.data.length);
        let loss = 0;
        for (let r = 0; r < logitsFull.rows; r++) {
            const start = r * this.vSize;
            const probs = AkashaOps.softmax(logitsFull.data.subarray(start, start + this.vSize), 1, this.vSize);
            const t = targets[r];
            loss += -Math.log(probs[t] + 1e-9);
            for (let c = 0; c < this.vSize; c++) grad[start + c] = probs[c];
            grad[start + t] -= 1;
        }
        logitsFull.backward(grad);
        
        // Optimizer
        for (const [name, p] of this.params.entries()) {
            if (name === "W_out") continue;
            const m = this.m.get(name), v = this.v.get(name);
            for (let i = 0; i < p.data.length; i++) {
                m[i] = 0.9 * m[i] + 0.1 * p.grad[i];
                v[i] = 0.999 * v[i] + 0.001 * p.grad[i] * p.grad[i];
                p.data[i] -= 0.001 * (m[i]/(1-Math.pow(0.9, this.step+1))) / (Math.sqrt(v[i]/(1-Math.pow(0.999, this.step+1))) + 1e-8);
            }
        }

        // Generation
        console.log(`🔮 [GEN]: Starting Top-K Sampling...`);
        let genTokens = [...tokens];
        for (let i = 0; i < 40; i++) {
            const currentLogits = await this.forwardInference(genTokens);
            const lastRow = currentLogits.slice((genTokens.length - 1) * this.vSize, genTokens.length * this.vSize);
            const next = this.sampleTopK(lastRow, 20, 0.8);
            genTokens.push(next);
            if (next === 10) break; 
        }

        const finalOutput = this.decode(genTokens);
        console.log(`📝 [RESULT]: ${finalOutput}`);
        this.step++;
        return { text: finalOutput };
    }
}
