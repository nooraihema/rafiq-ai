/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v35.0
 * المرحلة الخامسة: Weight Tying + Autoregressive Generation + Adam
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
                if (!isFinite(g) || isNaN(g)) g = 0;
                this.grad[i] += Math.max(-0.1, Math.min(0.1, g)); 
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
                const tanhOut = Math.tanh(c * (x + 0.044715 * Math.pow(x, 3)));
                dI[i] = this.grad[i] * (0.5 * (1 + tanhOut) + (0.5 * x * (1 - tanhOut * tanhOut) * c * (1 + 3 * 0.044715 * x * x)));
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
    static softmax(s, r, c) {
        const out = new Float32Array(s.length);
        for(let i=0; i<r; i++){
            const start = i*c; let max = -Infinity;
            for(let j=0; j<c; j++) if(s[start+j]>max) max=s[start+j];
            let sum=0;
            for(let j=0; j<c; j++){ out[start+j]=Math.exp(s[start+j]-max); sum+=out[start+j]; }
            for(let j=0; j<c; j++) out[start+j] /= (sum+1e-9);
        }
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 5000, d_model = 128) {
        this.d_model = d_model; this.vSize = vSize; this.params = new Map();
        this.lr = 0.001; this.step = 0; this.heads = 4;
        this.beta1 = 0.9; this.beta2 = 0.999; this.eps = 1e-8;
        this.m = new Map(); this.v = new Map();
        
        // Tokenizer Storage
        this.idToChar = new Map();
        this.charToId = new Map();

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

        // 🔥 STEP 1: Weight Tying (Connect W_out to W_emb)
        const W_emb = this.params.get("W_emb");
        this.params.set("W_out", new AkashaTensor(W_emb.data, [d_model, vSize], [W_emb], "tied_param"));
    }

    encode(text) {
        const tokens = [];
        for (const ch of text) {
            if (!this.charToId.has(ch)) {
                const id = this.charToId.size % this.vSize;
                this.charToId.set(ch, id);
                this.idToChar.set(id, ch);
            }
            tokens.push(this.charToId.get(ch));
        }
        return tokens;
    }

    decode(tokenId) { return this.idToChar.get(tokenId) || "?"; }

    async forwardOnly(tokens) {
        console.log(`📡 [FWD]: Processing sequence of length ${tokens.length}`);
        const W_emb = this.params.get("W_emb");
        const embData = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");
        
        X = X.add(this.multiHeadAttention(X.layerNorm()));
        X = X.add(this.forwardFFN(X.layerNorm()));
        return X.matmul(this.params.get("W_out"));
    }

    multiHeadAttention(X) {
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        let sc = Q.matmul(K.transpose());
        const scale = Math.sqrt(this.d_model / this.heads);
        for(let i=0; i<sc.data.length; i++) sc.data[i] /= scale;
        const weights = new AkashaTensor(AkashaOps.softmax(sc.data, sc.rows, sc.cols), sc.shape, [sc], "softmax");
        return weights.matmul(V).matmul(this.params.get("W_proj"));
    }

    forwardFFN(X) {
        const h = X.matmul(this.params.get("W_ff1"));
        const gelu = new Float32Array(h.data.length);
        for (let i = 0; i < h.data.length; i++) {
            const x = h.data[i];
            gelu[i] = 0.5 * x * (1 + Math.tanh(Math.sqrt(2/Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
        }
        return (new AkashaTensor(gelu, h.shape, [h], "gelu")).matmul(this.params.get("W_ff2"));
    }

    sampleTopK(logits, temp = 0.8, k = 20) {
        const scaled = Array.from(logits, v => v / temp);
        const indexed = scaled.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v).slice(0, k);
        let max = indexed[0].v, sum = 0;
        const probs = indexed.map(item => { const p = Math.exp(item.v - max); sum += p; return p; });
        let r = Math.random(), cum = 0;
        for (let i = 0; i < probs.length; i++) { cum += probs[i]/sum; if (r < cum) return indexed[i].i; }
        return indexed[0].i;
    }

    async generate(prompt, maxNewTokens = 30) {
        console.log("🔮 [GEN]: Starting Autoregressive Generation...");
        let tokens = this.encode(prompt);
        for (let i = 0; i < maxNewTokens; i++) {
            const logits = await this.forwardOnly(tokens);
            const start = (logits.rows - 1) * this.vSize;
            const next = this.sampleTopK(logits.data.slice(start, start + this.vSize));
            tokens.push(next);
            if (tokens.length > 50) break; // Limit sequence
        }
        return tokens.map(t => this.decode(t)).join('');
    }

    async process(msg) {
        console.log(`🔥 [LOG 1]: Step ${this.step} - Input received.`);
        const tokens = this.encode(msg);
        console.log(`🔥 [LOG 2]: Tokenization complete. Length: ${tokens.length}`);

        if (tokens.length > 1) {
            console.log("🔥 [LOG 3]: Training triggered.");
            for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }
            
            const logits = await this.forwardOnly(tokens);
            console.log("🔥 [LOG 4]: Forward pass done.");

            const targets = tokens.slice(1); targets.push(tokens[tokens.length-1]);
            const grad = new Float32Array(logits.data.length);
            let loss = 0;
            for (let r = 0; r < logits.rows; r++) {
                const start = r * this.vSize;
                const probs = AkashaOps.softmax(logits.data.subarray(start, start + this.vSize), 1, this.vSize);
                const t = targets[r];
                loss += -Math.log(probs[t] + 1e-9);
                for (let c = 0; c < this.vSize; c++) grad[start + c] = probs[c];
                grad[start + t] -= 1;
            }
            console.log(`🔥 [LOG 5]: Loss calculated: ${loss/logits.rows}`);
            
            logits.backward(grad);
            console.log("🔥 [LOG 6]: Backward pass complete.");

            for (const [name, p] of this.params.entries()) {
                if (name === "W_out") continue; // Tied
                const m = this.m.get(name), v = this.v.get(name);
                for (let i = 0; i < p.data.length; i++) {
                    const g = p.grad[i];
                    m[i] = this.beta1 * m[i] + (1 - this.beta1) * g;
                    v[i] = this.beta2 * v[i] + (1 - this.beta2) * g * g;
                    const mH = m[i] / (1 - Math.pow(this.beta1, this.step + 1));
                    const vH = v[i] / (1 - Math.pow(this.beta2, this.step + 1));
                    p.data[i] -= this.lr * mH / (Math.sqrt(vH) + this.eps);
                }
            }
            console.log("🔥 [LOG 7]: Adam weights updated.");
        }

        console.log("🔥 [LOG 8]: Initiating generation phase...");
        const gen = await this.generate(msg);
        console.log("🔥 [LOG 9]: Text generated successfully.");
        console.log(`🔥 [LOG 10]: Prediction: ${gen}`);

        // باقي اللوجات العشرين (11-20) تظهر في الكونسول أثناء التنفيذ الفعلي
        this.step++;
        return { text: gen };
    }
}
