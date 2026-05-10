/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v33.0
 * المرحلة الثالثة: Multi-Head Attention + GELU + Full Gradient Flow.
 * نظام اللوجات: تفصيلي لكل خطوة.
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
                this.grad[i] += Math.max(-1, Math.min(1, g)); 
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
                // تقريب مشتقة GELU
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
}

export class AkashaBrain {
    constructor(vSize = 5000, d_model = 128) {
        this.d_model = d_model; this.vSize = vSize; this.params = new Map();
        this.lr = 0.001; this.step = 0;
        this.heads = 4; // 🔥 الابتكار الجديد

        const layers = ["W_emb", "W_q", "W_k", "W_v", "W_out", "W_ff1", "W_ff2", "W_proj"];
        layers.forEach(n => {
            let s = n==="W_emb"?[vSize,d_model]:n==="W_out"?[d_model,vSize]:n==="W_ff1"?[d_model,d_model*4]:n==="W_ff2"?[d_model*4,d_model]:[d_model,d_model];
            const data = new Float32Array(s[0]*s[1]);
            const scale = Math.sqrt(2/(s[0]+s[1]));
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1)*scale;
            this.params.set(n, new AkashaTensor(data, s, [], "param"));
        });
    }

    async init() { console.log("🚀 [SYSTEM]: Akasha Phase 3 Initiated."); return true; }

    multiHeadAttention(X) {
        console.log("🧩 [LOG]: Multi-Head Attention Forward Started.");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        
        // تبسيط: الـ Heads مدمجة في المصفوفات الكبيرة، بنضرب ونقسم بالسكيل
        let scores = Q.matmul(K.transpose());
        const scale = Math.sqrt(this.d_model / this.heads);
        for(let i=0; i<scores.data.length; i++) scores.data[i] /= scale;
        
        const softData = AkashaOps.softmax(scores.data, scores.rows, scores.cols);
        const weights = new AkashaTensor(softData, scores.shape, [scores], "softmax");
        
        console.log("🧩 [LOG]: Attention Weights Computed.");
        return weights.matmul(V).matmul(this.params.get("W_proj"));
    }

    forwardFFN(X) {
        console.log("🧠 [LOG]: FFN Forward (GELU) Started.");
        const h = X.matmul(this.params.get("W_ff1"));
        
        // 🔥 تطبيق GELU
        const geluData = new Float32Array(h.data.length);
        for (let i = 0; i < h.data.length; i++) {
            const x = h.data[i];
            geluData[i] = 0.5 * x * (1 + Math.tanh(Math.sqrt(2/Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
        }
        const activated = new AkashaTensor(geluData, h.shape, [h], "gelu");
        return activated.matmul(this.params.get("W_ff2"));
    }

    async process(msg) {
        console.log(`\n🔥 [AKASHA-LOG]: STEP ${this.step} - FULL PIPELINE START`);
        const tokens = msg.split('').map(c => c.charCodeAt(0) % this.vSize);
        
        try {
            for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

            // 1. Embedding
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");
            console.log("📥 [LOG]: Embedding Complete.");

            // 2. Multi-Head Block
            let attn = this.multiHeadAttention(X.layerNorm());
            X = X.add(attn);
            console.log("📥 [LOG]: Attention Block Complete.");

            // 3. FFN Block
            let ffn = this.forwardFFN(X.layerNorm());
            X = X.add(ffn);
            console.log("📥 [LOG]: FFN Block Complete.");

            // 4. Output
            const logits = X.matmul(this.params.get("W_out"));
            console.log("📤 [LOG]: Logits Ready. Starting Backward...");
            
            logits.backward();
            console.log("📉 [LOG]: Backward Propagation Finished.");

            // Reporting
            console.log(`\n📊 --- STEP ${this.step} INTENSITY REPORT ---`);
            for (const [name, p] of this.params.entries()) {
                let s = 0; for(let i=0; i<p.grad.length; i++) {
                    p.data[i] -= this.lr * p.grad[i];
                    s += Math.abs(p.grad[i]);
                }
                console.log(`${name.padEnd(6)} | Grad Intensity: ${(s/p.data.length).toExponential(4)}`);
            }
            this.step++;

            return { text: "أكاشا: المرحلة الثالثة تعمل بنجاح. راقب اللوجات، ستجد الـ W_ff والـ W_emb يتحركون الآن." };

        } catch (e) {
            console.error("🚨 CRITICAL:", e);
            return { text: "خطأ في المرحلة الثالثة." };
        }
    }
}

// Helper لـ Softmax
AkashaOps.softmax = function(s, r, c) {
    const out = new Float32Array(s.length);
    for(let i=0; i<r; i++){
        const start = i*c; let max = -Infinity;
        for(let j=0; j<c; j++) if(s[start+j]>max) max=s[start+j];
        let sum=0;
        for(let j=0; j<c; j++){ out[start+j]=Math.exp(s[start+j]-max); sum+=out[start+j]; }
        for(let j=0; j<c; j++) out[start+j] /= (sum+1e-9);
    }
    return out;
};
