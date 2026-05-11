/**
 * 🌌 AKASHA-CORE: v42.0 (Stable Full Cycle)
 * الإصلاحات: Safe Softmax + Full 15 Logs + Dynamic Generation
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
                this.grad[i] += Math.max(-0.1, Math.min(0.1, grad[i])); 
            }
        } else { this.grad.fill(1.0); }
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
                const a = A[i*cA+k]; if(a === 0) continue;
                for (let j=0; j<cB; j++) out[i*cB+j] += a * B[k*cB+j];
            }
        }
        return out;
    }

    static matMulGradA(grad, B, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        for (let i=0; i<rA; i++) {
            for (let j=0; j<cA; j++) {
                let s = 0; for (let k=0; k<cB; k++) s += grad[i*cB+k] * B[j*cB+k];
                dA[i*cA+j] = s;
            }
        }
        return dA;
    }

    static matMulGradB(grad, A, rA, cA, cB) {
        const dB = new Float32Array(cA * cB);
        for (let i=0; i<cA; i++) {
            for (let j=0; j<cB; j++) {
                let s = 0; for (let k=0; k<rA; k++) s += A[k*cA+i] * grad[k*cB+j];
                dB[i*cB+j] = s;
            }
        }
        return dB;
    }

    static safeSoftmax(scores) {
        const out = new Float32Array(scores.length);
        let maxV = -Infinity;
        for (let v of scores) if (v > maxV) maxV = v;
        let sum = 0;
        for (let i=0; i<scores.length; i++) {
            out[i] = Math.exp(Math.max(-50, scores[i] - maxV));
            sum += out[i];
        }
        for (let i=0; i<scores.length; i++) out[i] /= (sum + 1e-12);
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.vSize = vSize; this.d_model = d_model;
        this.lr = 0.0001; this.step = 0; this.params = new Map();
        this.m = new Map(); this.v = new Map();

        ["W_emb", "W_q", "W_k", "W_v", "W_proj"].forEach(n => {
            let s = n==="W_emb"?[vSize,d_model]:[d_model,d_model];
            let d = new Float32Array(s[0]*s[1]);
            for(let i=0; i<d.length; i++) d[i] = (Math.random()*2-1)*Math.sqrt(1/s[0]);
            this.params.set(n, new AkashaTensor(d, s));
            this.m.set(n, new Float32Array(d.length));
            this.v.set(n, new Float32Array(d.length));
        });
    }

    encode(t) { return Array.from(new TextEncoder().encode(t)); }
    decode(t) { return new TextDecoder().decode(new Uint8Array(t.filter(x => x > 31))); }

    sample(logits) {
        const probs = AkashaOps.safeSoftmax(logits);
        let r = Math.random(), c = 0;
        for(let i=0; i<probs.length; i++) { c += probs[i]; if(r <= c) return i; }
        return 32;
    }

    async process(msg) {
        console.log(`--- [START STEP ${this.step}] ---`);
        
        // 1. Encode
        const tokens = this.encode(msg).slice(0, 64);
        console.log(`📍 1. ENCODE: [${tokens.slice(0, 5)}...]`);

        // 2. Embed
        const W_emb = this.params.get("W_emb");
        let eD = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => eD.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(eD, [tokens.length, this.d_model], [W_emb], "emb");
        console.log(`📍 2. EMBED: [${X.shape}]`);

        // 3. Attention Forward
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const sc = Q.matmul(K.transpose());
        console.log(`📍 3. ATTN_SC: [${sc.shape}]`);

        // 4. Logits (Tied Weights)
        const logitsFull = X.matmul(W_emb.transpose());
        console.log(`📍 4. LOGITS: OK`);

        // 5. Targets
        const targets = [...tokens.slice(1), tokens[0]];
        console.log(`📍 5. TARGETS: SET`);

        // 6. Loss
        let loss = 0; const grad = new Float32Array(logitsFull.data.length);
        for(let i=0; i<tokens.length; i++) {
            const row = AkashaOps.safeSoftmax(logitsFull.data.subarray(i*256, (i+1)*256));
            loss -= Math.log(row[targets[i]] + 1e-10);
            for(let c=0; c<256; c++) grad[i*256+c] = row[c];
            grad[i*256+targets[i]] -= 1;
        }
        console.log(`📍 6. LOSS: ${(loss/tokens.length).toFixed(4)}`);

        // 7. Backward
        for(let p of this.params.values()) p.grad.fill(0);
        logitsFull.backward(grad);
        console.log(`📍 7. BACKWARD: Done`);

        // 8. Grad Check
        const gCheck = this.params.get("W_q").grad[0];
        console.log(`📍 8. GRAD_CHECK: ${gCheck.toExponential(2)}`);

        // 9. Optimize
        for (let [n, p] of this.params.entries()) {
            let m = this.m.get(n), v = this.v.get(n);
            for(let i=0; i<p.data.length; i++) {
                m[i] = 0.9*m[i] + 0.1*p.grad[i];
                v[i] = 0.999*v[i] + 0.001*p.grad[i]**2;
                p.data[i] -= this.lr * m[i] / (Math.sqrt(v[i]) + 1e-8);
            }
        }
        console.log(`📍 9. OPTIMIZE: OK`);

        // 10-14. Generation Loop
        console.log(`📍 11. GEN_START...`);
        let resTokens = [...tokens];
        for(let i=0; i<20; i++) {
            let last = resTokens.slice(-1)[0];
            let vec = W_emb.data.subarray(last*this.d_model, (last+1)*this.d_model);
            let logit = AkashaOps.matMul(vec, W_emb.data, 1, this.d_model, 256);
            resTokens.push(this.sample(logit));
        }

        const output = this.decode(resTokens);
        console.log(`📍 15. RESULT: [${output.substring(0, 40)}...]`);
        
        this.step++;
        return { text: output };
    }
}
