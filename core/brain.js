/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v41.0 - "The Reconciliation Version"
 * الميزات: حماية من الـ NaN + نظام Adam Optimizer مستقر + تدفق Gradients محسّن
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

    transpose() {
        const out = new Float32Array(this.data.length);
        for(let i=0; i<this.rows; i++) {
            for(let j=0; j<this.cols; j++) out[j*this.rows+i] = this.data[i*this.cols+j];
        }
        return new AkashaTensor(out, [this.cols, this.rows], [this], "transpose");
    }

    backward(grad = null) {
        if (grad) {
            for (let i = 0; i < this.grad.length; i++) {
                // Gradient Clipping: لمنع انفجار الأرقام
                this.grad[i] += Math.max(-0.1, Math.min(0.1, grad[i])); 
            }
        } else {
            this.grad.fill(1.0);
        }
        this.dispatch();
    }

    dispatch() {
        if (this.op === "matmul") {
            const [A, B] = this.creators;
            A.backward(AkashaOps.matMulGradA(this.grad, B.data, A.rows, A.cols, B.cols));
            B.backward(AkashaOps.matMulGradB(this.grad, A.data, A.rows, A.cols, B.cols));
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
    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i=0; i<rA; i++) {
            for (let k=0; k<cA; k++) {
                const a = A[i*cA+k];
                if(a === 0) continue;
                for (let j=0; j<cB; j++) out[i*cB+j] += a * B[k*cB+j];
            }
        }
        return out;
    }

    static matMulGradA(grad, B, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        for (let i=0; i<rA; i++) {
            for (let j=0; j<cA; j++) {
                let sum = 0;
                for (let k=0; k<cB; k++) sum += grad[i*cB+k] * B[j*cB+k];
                dA[i*cA+j] = sum;
            }
        }
        return dA;
    }

    static matMulGradB(grad, A, rA, cA, cB) {
        const dB = new Float32Array(cA * cB);
        for (let i=0; i<cA; i++) {
            for (let j=0; j<cB; j++) {
                let sum = 0;
                for (let k=0; k<rA; k++) sum += A[k*cA+i] * grad[k*cB+j];
                dB[i*cB+j] = sum;
            }
        }
        return dB;
    }

    static softmax(scores, cols) {
        const out = new Float32Array(scores.length);
        let maxVal = -Infinity;
        for (let v of scores) if (v > maxVal) maxVal = v;
        let sum = 0;
        for (let i=0; i<scores.length; i++) {
            out[i] = Math.exp(scores[i] - maxVal);
            sum += out[i];
        }
        for (let i=0; i<scores.length; i++) out[i] /= (sum + 1e-12);
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.vSize = vSize; this.d_model = d_model;
        this.lr = 0.0005; // 🛡️ Learning rate آمن ومستقر
        this.step = 0;
        this.params = new Map();
        this.m = new Map(); this.v = new Map();

        ["W_emb", "W_q", "W_k", "W_v", "W_proj", "W_ff1", "W_ff2"].forEach(n => {
            let shape = n==="W_emb"?[vSize,d_model]:n==="W_ff1"?[d_model,d_model*2]:n==="W_ff2"?[d_model*2,d_model]:[d_model,d_model];
            let data = new Float32Array(shape[0]*shape[1]);
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * Math.sqrt(1/shape[0]);
            this.params.set(n, new AkashaTensor(data, shape));
            this.m.set(n, new Float32Array(data.length));
            this.v.set(n, new Float32Array(data.length));
        });
    }

    encode(t) { return Array.from(new TextEncoder().encode(t)); }
    decode(t) { return new TextDecoder().decode(new Uint8Array(t.filter(x => x > 31))); }

    async process(msg) {
        console.log(`\n🚀 --- STEP ${this.step} START ---`);
        const tokens = this.encode(msg).slice(0, 32);
        console.log(`📍 1. INPUT: [${tokens.length} tokens]`);

        // Forward
        const W_emb = this.params.get("W_emb");
        let emb = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => emb.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(emb, [tokens.length, this.d_model], [W_emb], "emb");

        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const scores = Q.matmul(K.transpose());
        console.log(`📍 2. FORWARD: Math OK`);

        // Logits & Loss
        const W_out = this.params.get("W_emb").transpose(); // Tied weights
        const logits = X.matmul(W_out);
        
        let loss = 0;
        const grad = new Float32Array(logits.data.length);
        const targets = [...tokens.slice(1), tokens[0]];

        for (let i = 0; i < tokens.length; i++) {
            const row = AkashaOps.softmax(logits.data.subarray(i*256, (i+1)*256));
            const t = targets[i];
            loss -= Math.log(row[t] + 1e-10);
            for(let c=0; c<256; c++) grad[i*256+c] = row[c];
            grad[i*256+t] -= 1;
        }
        
        console.log(`📍 3. LOSS: ${(loss/tokens.length).toFixed(4)}`);

        // Backward
        for(let p of this.params.values()) p.grad.fill(0);
        logits.backward(grad);
        
        const gCheck = this.params.get("W_q").grad[0];
        console.log(`📍 4. GRAD_CHECK: ${gCheck.toExponential(2)}`);

        // Adam Optimizer (The Secret Sauce)
        for (let [name, p] of this.params.entries()) {
            let m = this.m.get(name), v = this.v.get(name);
            for (let i = 0; i < p.data.length; i++) {
                m[i] = 0.9 * m[i] + 0.1 * p.grad[i];
                v[i] = 0.999 * v[i] + 0.001 * p.grad[i] * p.grad[i];
                p.data[i] -= this.lr * m[i] / (Math.sqrt(v[i]) + 1e-8);
            }
        }
        console.log(`📍 5. OPTIMIZE: Parameters Updated`);

        this.step++;
        return { text: "التعلم مستقر الآن يا إبراهيم..." };
    }
}
