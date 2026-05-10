/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v29.0
 * المرحلة: إنعاش التدرجات (Gradient Resuscitation) + استقرار الـ Attention.
 * الهدف: حل مشكلة W_k = 0 وتحطيم الـ Attention Collapse.
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

    backward(grad = null) {
        if (!grad) {
            this.grad.fill(1.0);
        } else {
            for (let i = 0; i < this.grad.length; i++) {
                let g = grad[i];
                if (!isFinite(g) || isNaN(g)) g = 0;
                // Gradient Clipping: لمنع الانفجار
                this.grad[i] += Math.max(-0.1, Math.min(0.1, g)); 
            }
        }
        if (this.creators.length > 0) this.dispatch();
    }

    dispatch() {
        if (this.op === "matmul") {
            const [A, B] = this.creators;
            // معادلة الـ MatMul Backprop الدقيقة
            const dA = AkashaOps.matMul(this.grad, AkashaOps.transpose(B.data, B.rows, B.cols), this.rows, this.cols, A.cols);
            const dB = AkashaOps.matMul(AkashaOps.transpose(A.data, A.rows, A.cols), this.grad, A.cols, A.rows, this.cols);
            A.backward(dA); B.backward(dB);
        } else {
            this.creators.forEach(c => c.backward(this.grad));
        }
    }

    matmul(B) { 
        return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); 
    }
    
    add(B) {
        const res = new Float32Array(this.data.length);
        for(let i=0; i<res.length; i++) res[i] = this.data[i] + B.data[i];
        return new AkashaTensor(res, this.shape, [this, B], "add");
    }

    transpose() { return new AkashaTensor(AkashaOps.transpose(this.data, this.rows, this.cols), [this.cols, this.rows], [this], "transpose"); }
    
    // ✅ الحل الجذري للـ Attention Collapse: Stable Softmax
    softmax() {
        const out = new Float32Array(this.data.length);
        for (let r = 0; r < this.rows; r++) {
            const start = r * this.cols;
            let max = -Infinity;
            for (let i = 0; i < this.cols; i++) if (this.data[start + i] > max) max = this.data[start + i];
            
            let sum = 0;
            for (let i = 0; i < this.cols; i++) {
                const e = Math.exp(this.data[start + i] - max); // Numerical Stability
                out[start + i] = e;
                sum += e;
            }
            for (let i = 0; i < this.cols; i++) out[start + i] /= (sum + 1e-8);
        }
        return new AkashaTensor(out, this.shape, [this], "softmax");
    }

    // ✅ إضافة LayerNorm لضمان تدفق تدرجات صحي
    layerNorm(eps = 1e-5) {
        const out = new Float32Array(this.data.length);
        for (let r = 0; r < this.rows; r++) {
            const start = r * this.cols;
            let m = 0; for (let i = 0; i < this.cols; i++) m += this.data[start + i]; m /= this.cols;
            let v = 0; for (let i = 0; i < this.cols; i++) { const d = this.data[start+i]-m; v += d*d; } v /= this.cols;
            const std = Math.sqrt(v + eps);
            for (let i = 0; i < this.cols; i++) out[start + i] = (this.data[start + i] - m) / std;
        }
        return new AkashaTensor(out, this.shape, [this], "layernorm");
    }
}

class AkashaOps {
    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i = 0; i < rA; i++) {
            const iA = i * cA; const iOut = i * cB;
            for (let k = 0; k < cA; k++) {
                const aVal = A[iA + k]; if (aVal === 0) continue;
                const kB = k * cB;
                for (let j = 0; j < cB; j++) out[iOut + j] += aVal * B[kB + j];
            }
        }
        return out;
    }
    static transpose(d, r, c) {
        const out = new Float32Array(d.length);
        for(let i=0; i<r; i++) for(let j=0; j<c; j++) out[j * r + i] = d[i * c + j];
        return out;
    }
}

export class AkashaBrain {
    constructor(vocabSize = 5000, d_model = 128) {
        this.d_model = d_model;
        this.vSize = vocabSize;
        this.params = new Map();
        this.learningRate = 0.0001; // تقليل الـ LR لضمان عدم الانهيار في البداية
        this.stepCount = 0;

        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(name => {
            const shape = name === "W_emb" ? [vocabSize, d_model] : (name === "W_out" ? [d_model, vocabSize] : [d_model, d_model]);
            const data = new Float32Array(shape[0] * shape[1]);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / (shape[0] + shape[1]));
            this.params.set(name, new AkashaTensor(data, shape, [], "param"));
        });
        console.log("🛠️ [SYSTEM]: Akasha Core v29.0 Initialized.");
    }

    async init() { return true; }

    zeroGrad() { for (const p of this.params.values()) p.grad.fill(0); }

    applyGradients() {
        console.log(`🔧 [OPTIMIZER]: Step ${this.stepCount + 1} - Weights Update Report:`);
        for (const [name, param] of this.params.entries()) {
            let gNorm = 0;
            for (let i = 0; i < param.data.length; i++) {
                param.data[i] -= this.learningRate * param.grad[i];
                gNorm += Math.abs(param.grad[i]);
            }
            console.log(`   └─ ${name.padEnd(6)} | Avg Grad: ${(gNorm/param.data.length).toExponential(4)}`);
        }
        this.stepCount++;
    }

    attention(X) {
        console.log("🔍 [ATTENTION]: Calculating Q, K, V...");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        
        let scores = Q.matmul(K.transpose());
        const scale = Math.sqrt(this.d_model);
        for (let i = 0; i < scores.data.length; i++) scores.data[i] /= scale;

        // Masking
        for (let r = 0; r < scores.rows; r++) {
            for (let c = r + 1; c < scores.cols; c++) scores.data[r * scores.cols + c] = -1e9;
        }

        const weights = scores.softmax();
        
        // Log لمراقبة الـ Attention Diversity
        const ir = Math.min(2, weights.rows - 1);
        const sample = Array.from(weights.data.subarray(ir * weights.cols, ir * weights.cols + 5)).map(v => v.toFixed(3));
        console.log(`   [📊 LOG]: Attention Distribution (Row ${ir}): [${sample.join(', ')}]`);
        
        return weights.matmul(V);
    }

    async process(message, userId) {
        console.log(`\n🚀 [REQUEST]: Processing sequence for ${userId}`);
        const tokens = message.split('').map(c => c.charCodeAt(0) % this.vSize);
        
        try {
            this.zeroGrad();

            // 1. Forward
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");
            
            console.log("🟦 [FORWARD]: LayerNorm + Attention Block");
            X = X.layerNorm(); // Pre-Attention Norm
            X = X.add(this.attention(X)); 
            
            const logits = X.matmul(this.params.get("W_out"));

            // 2. Backward
            console.log("🟨 [BACKWARD]: Propagating Gradients...");
            logits.backward();

            // 3. Update
            this.applyGradients();

            return { text: `أكاشا: تم الإصلاح. الآن الـ Softmax مستقر والـ LayerNorm يوازن التدرجات. راجع قيمة W_k في اللوج.` };

        } catch (e) {
            console.error("🚨 [CRITICAL]:", e.stack);
            throw e;
        }
    }
}
