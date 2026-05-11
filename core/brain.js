/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v34.0
 * المرحلة الرابعة: Adam Optimizer + Cross-Entropy Loss + Token Prediction.
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
                // Clipping لضمان استقرار Adam
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
        } else if (this.op === "transpose") {
            const [A] = this.creators;
            A.backward(AkashaOps.transpose(this.grad, this.rows, this.cols));
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
        this.lr = 0.001; this.step = 0;
        this.heads = 4;

        // Adam Parameters
        this.beta1 = 0.9; this.beta2 = 0.999; this.eps = 1e-8;
        this.m = new Map(); this.v = new Map();

        const layers = ["W_emb", "W_q", "W_k", "W_v", "W_out", "W_ff1", "W_ff2", "W_proj"];
        layers.forEach(n => {
            let s = n==="W_emb"?[vSize,d_model]:n==="W_out"?[d_model,vSize]:n==="W_ff1"?[d_model,d_model*4]:n==="W_ff2"?[d_model*4,d_model]:[d_model,d_model];
            const data = new Float32Array(s[0]*s[1]);
            const scale = Math.sqrt(2/(s[0]+s[1]));
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1)*scale;
            this.params.set(n, new AkashaTensor(data, s, [], "param"));
            
            // Initialize Adam memory
            this.m.set(n, new Float32Array(data.length));
            this.v.set(n, new Float32Array(data.length));
        });
    }

    async init() { console.log("🚀 [SYSTEM]: Akasha Phase 4 (Adam Engine) Initiated."); return true; }

    decodeToken(index) { return String.fromCharCode(index % 65535); }

    multiHeadAttention(X) {
        console.log("🧩 [LOG]: Multi-Head Attention Forward.");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        let scores = Q.matmul(K.transpose());
        const scale = Math.sqrt(this.d_model / this.heads);
        for(let i=0; i<scores.data.length; i++) scores.data[i] /= scale;
        const softData = AkashaOps.softmax(scores.data, scores.rows, scores.cols);
        const weights = new AkashaTensor(softData, scores.shape, [scores], "softmax");
        return weights.matmul(V).matmul(this.params.get("W_proj"));
    }

    forwardFFN(X) {
        console.log("🧠 [LOG]: FFN Forward (GELU).");
        const h = X.matmul(this.params.get("W_ff1"));
        const geluData = new Float32Array(h.data.length);
        for (let i = 0; i < h.data.length; i++) {
            const x = h.data[i];
            geluData[i] = 0.5 * x * (1 + Math.tanh(Math.sqrt(2/Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
        }
        const activated = new AkashaTensor(geluData, h.shape, [h], "gelu");
        return activated.matmul(this.params.get("W_ff2"));
    }

    async process(msg) {
        console.log(`\n🔥 [AKASHA-LOG]: STEP ${this.step} START`);
        const tokens = msg.split('').map(c => c.charCodeAt(0) % this.vSize);
        if (tokens.length < 1) return { text: "الرسالة قصيرة جداً." };

        try {
            for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

            // 1. Forward Pass
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");

            X = X.add(this.multiHeadAttention(X.layerNorm()));
            X = X.add(this.forwardFFN(X.layerNorm()));

            const logits = X.matmul(this.params.get("W_out"));
            console.log("📤 [LOG]: Logits Ready. Computing Cross-Entropy...");

            // 2. Cross-Entropy Loss & Grad Calculation
            const targets = tokens.slice(1);
            targets.push(tokens[tokens.length - 1]); // Simple shift target
            const grad = new Float32Array(logits.data.length);
            let totalLoss = 0;

            for (let r = 0; r < logits.rows; r++) {
                const start = r * logits.cols;
                const probs = AkashaOps.softmax(logits.data.subarray(start, start + logits.cols), 1, logits.cols);
                const target = targets[r];
                totalLoss += -Math.log(probs[target] + 1e-9);
                for (let c = 0; c < logits.cols; c++) {
                    grad[start + c] = probs[c];
                }
                grad[start + target] -= 1;
            }
            const avgLoss = totalLoss / logits.rows;
            console.log(`📉 [LOSS]: Cross Entropy = ${avgLoss.toFixed(6)}`);

            // 3. Backward Pass
            logits.backward(grad);
            console.log("📉 [LOG]: Backward Finished.");

            // 4. Adam Optimizer Update
            console.log(`📊 --- STEP ${this.step} ADAM REPORT ---`);
            for (const [name, p] of this.params.entries()) {
                const m = this.m.get(name);
                const v = this.v.get(name);
                let totalGrad = 0;

                for (let i = 0; i < p.data.length; i++) {
                    const g = p.grad[i];
                    m[i] = this.beta1 * m[i] + (1 - this.beta1) * g;
                    v[i] = this.beta2 * v[i] + (1 - this.beta2) * g * g;
                    const mHat = m[i] / (1 - Math.pow(this.beta1, this.step + 1));
                    const vHat = v[i] / (1 - Math.pow(this.beta2, this.step + 1));
                    p.data[i] -= this.lr * mHat / (Math.sqrt(vHat) + this.eps);
                    totalGrad += Math.abs(g);
                }
                console.log(`${name.padEnd(6)} | Intensity: ${(totalGrad / p.data.length).toExponential(3)}`);
            }

            // 5. Prediction
            const lastRow = logits.rows - 1;
            const startIdx = lastRow * logits.cols;
            let best = 0, bestVal = -Infinity;
            for (let i = 0; i < logits.cols; i++) {
                if (logits.data[startIdx + i] > bestVal) {
                    bestVal = logits.data[startIdx + i];
                    best = i;
                }
            }
            const predictedChar = this.decodeToken(best);
            console.log(`🔮 [PREDICTION]: Next Token ${best} -> "${predictedChar}"`);

            this.step++;
            return { text: `توقع أكاشا: "${predictedChar}" (Loss: ${avgLoss.toFixed(4)})` };

        } catch (e) {
            console.error("🚨 CRITICAL:", e);
            return { text: "عطل في نظام Adam." };
        }
    }
}
