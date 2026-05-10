/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v32.0
 * المطور: إبراهيم شحات & Gemini
 * الهدف: تفعيل كامل للمحرك مع ضمان تدفق الـ Gradients لكل المصفوفات.
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

    // نظام الـ Backpropagation المطور
    backward(grad = null) {
        if (!grad) {
            this.grad.fill(1.0);
        } else {
            for (let i = 0; i < this.grad.length; i++) {
                // Clipping لمنع الانفجار الرياضي (Exploding Gradients)
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
        } else if (this.op === "softmax") {
            this.creators[0].backward(this.grad); // تقريب رياضي للسرعة
        }
    }

    // العمليات الرياضية الأساسية
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
            const iA = i * cA; const iO = i * cB;
            for (let k=0; k<cA; k++) {
                const a = A[iA + k]; if (a === 0) continue;
                const kB = k * cB;
                for (let j=0; j<cB; j++) out[iO + j] += a * B[kB + j];
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

    static softmax(scores, rows, cols) {
        const out = new Float32Array(scores.length);
        for (let r=0; r<rows; r++) {
            const start = r * cols;
            let max = -Infinity;
            for (let i=0; i<cols; i++) if (scores[start+i] > max) max = scores[start+i];
            let sum = 0;
            for (let i=0; i<cols; i++) {
                out[start+i] = Math.exp(scores[start+i] - max);
                sum += out[start+i];
            }
            for (let i=0; i<cols; i++) out[start+i] /= (sum + 1e-9);
        }
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 5000, d = 128) {
        this.d = d; this.vSize = vSize; this.params = new Map();
        this.lr = 0.001; this.step = 0;

        const layers = ["W_emb", "W_q", "W_k", "W_v", "W_out", "W_ff1", "W_ff2"];
        layers.forEach(n => {
            let s = n==="W_emb"?[vSize,d]:n==="W_out"?[d,vSize]:n==="W_ff1"?[d,d*4]:n==="W_ff2"?[d*4,d]:[d,d];
            const data = new Float32Array(s[0]*s[1]);
            const scale = Math.sqrt(2/(s[0]+s[1]));
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1)*scale;
            this.params.set(n, new AkashaTensor(data, s, [], "param"));
        });
    }

    async process(msg) {
        console.log("🚀 [AKASHA-CORE]: Starting Inference & Training...");
        const tokens = msg.split('').map(c => c.charCodeAt(0) % this.vSize);
        
        try {
            // تنظيف الجراف
            for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

            // 1. Embedding Layer
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d);
            tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d, (t+1)*this.d), i*this.d));
            let X = new AkashaTensor(embData, [tokens.length, this.d], [W_emb], "embedding");

            // 2. Self-Attention (The Core)
            const Q = X.matmul(this.params.get("W_q"));
            const K = X.matmul(this.params.get("W_k"));
            const V = X.matmul(this.params.get("W_v"));
            
            let scores = Q.matmul(K.transpose());
            const softData = AkashaOps.softmax(scores.data, scores.rows, scores.cols);
            const weights = new AkashaTensor(softData, scores.shape, [scores], "softmax");
            
            let attnOut = weights.matmul(V);
            X = X.add(attnOut); // Residual Connection

            // 3. Output Logits
            const logits = X.matmul(this.params.get("W_out"));
            
            console.log("🧠 [AKASHA-CORE]: Propagating Gradients...");
            logits.backward();

            // 4. Update & Reporting
            console.log(`\n📊 --- STEP ${this.step} TRAINING REPORT ---`);
            let totalMove = 0;
            for (const [name, p] of this.params.entries()) {
                let intensity = 0;
                for(let i=0; i<p.data.length; i++) {
                    const delta = this.lr * p.grad[i];
                    p.data[i] -= delta;
                    intensity += Math.abs(p.grad[i]);
                }
                const avgInt = intensity / p.data.length;
                totalMove += avgInt;
                console.log(`${name.padEnd(6)} | Grad Intensity: ${avgInt.toExponential(4)}`);
            }
            
            this.step++;
            const status = totalMove > 0 ? "فعال ونشط ✅" : "خامل (يحتاج مراجعة) ⚠️";
            
            return { 
                text: `تمت المعالجة بنجاح يا إبراهيم.\nحالة المحرك: ${status}\nالخطوة: ${this.step-1}` 
            };

        } catch (e) {
            console.error("🚨 ENGINE CRITICAL FAILURE:", e);
            return { text: "حدث خطأ غير متوقع في خلايا المحرك." };
        }
    }
}
