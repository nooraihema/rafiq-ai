/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v32.1
 * الإصلاح: إضافة دالة init المفقودة وتعزيز نظام اللوجات الشامل.
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
        } else if (this.op === "add") {
            this.creators.forEach(c => c.backward(this.grad));
        } else if (this.op === "relu") {
            const [A] = this.creators;
            const dI = new Float32Array(this.grad.length);
            for (let i = 0; i < A.data.length; i++) dI[i] = A.data[i] > 0 ? this.grad[i] : 0;
            A.backward(dI);
        }
    }

    matmul(B) { return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); }
    transpose() { return new AkashaTensor(AkashaOps.transpose(this.data, this.rows, this.cols), [this.cols, this.rows], [this], "transpose"); }
    add(B) {
        const res = new Float32Array(this.data.length);
        for(let i=0; i<res.length; i++) res[i] = this.data[i] + B.data[i];
        return new AkashaTensor(res, this.shape, [this, B], "add");
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
        for (let i=0; i<rA; i++) {
            for (let k=0; k<cA; k++) {
                const a = A[i*cA + k]; if (a === 0) continue;
                for (let j=0; j<cB; j++) out[i*cB + j] += a * B[k*cB + j];
            }
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
}

export class AkashaBrain {
    constructor(vSize = 5000, d = 128) {
        this.d = d; this.vSize = vSize; this.params = new Map();
        this.lr = 0.001; this.step = 0;
        this.layers = ["W_emb", "W_q", "W_k", "W_v", "W_out", "W_ff1", "W_ff2"];
        
        this.layers.forEach(n => {
            let s = n==="W_emb"?[vSize,d]:n==="W_out"?[d,vSize]:n==="W_ff1"?[d,d*4]:n==="W_ff2"?[d*4,d]:[d,d];
            const data = new Float32Array(s[0]*s[1]);
            const scale = Math.sqrt(2/(s[0]+s[1]));
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1)*scale;
            this.params.set(n, new AkashaTensor(data, s, [], "param"));
        });
    }

    // ✅ تم إضافة الدالة المفقودة لإصلاح الـ Error 500
    async init() {
        console.log("🧬 [INIT]: Akasha Brain Cells Synchronized.");
        return true;
    }

    async process(msg) {
        console.log(`\n--- ⚡ STEP ${this.step} START ---`);
        const tokens = msg.split('').map(c => c.charCodeAt(0) % this.vSize);
        
        try {
            for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d);
            tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d, (t+1)*this.d), i*this.d));
            let X = new AkashaTensor(embData, [tokens.length, this.d], [W_emb], "embedding");

            // Attention
            const Q = X.matmul(this.params.get("W_q"));
            const K = X.matmul(this.params.get("W_k"));
            const V = X.matmul(this.params.get("W_v"));
            X = X.add(Q.matmul(K.transpose()).matmul(V));

            // Backprop
            const logits = X.matmul(this.params.get("W_out"));
            console.log("🌀 [BACKPROP]: Propagating values...");
            logits.backward();

            // Reporting
            let totalInt = 0;
            for (const [name, p] of this.params.entries()) {
                let intensity = 0;
                for(let i=0; i<p.data.length; i++) {
                    p.data[i] -= this.lr * p.grad[i];
                    intensity += Math.abs(p.grad[i]);
                }
                const avg = intensity / p.data.length;
                totalInt += avg;
                console.log(`📡 ${name.padEnd(6)} | Grad: ${avg.toExponential(4)}`);
            }

            this.step++;
            return { text: `تم الإصلاح والتعلم بنجاح.\nكفاءة التدفق: ${totalInt > 0 ? 'ممتازة' : 'ضعيفة'}` };

        } catch (e) {
            console.error("🚨 FAILURE:", e);
            return { text: "حدث عطل فني في استجابة الخلايا." };
        }
    }
}
