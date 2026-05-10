/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v30.0
 * المرحلة الثالثة: تعميق التمثيل (Representation Depth)
 * الإضافات: Feed Forward Network (FFN) + ReLU Activation + Dual Residual Blocks.
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
                this.grad[i] += Math.max(-0.1, Math.min(0.1, g)); 
            }
        }
        if (this.creators.length > 0) this.dispatch();
    }

    dispatch() {
        if (this.op === "matmul") {
            const [A, B] = this.creators;
            const dA = AkashaOps.matMul(this.grad, AkashaOps.transpose(B.data, B.rows, B.cols), this.rows, this.cols, A.cols);
            const dB = AkashaOps.matMul(AkashaOps.transpose(A.data, A.rows, A.cols), this.grad, A.cols, A.rows, this.cols);
            A.backward(dA); B.backward(dB);
        } else if (this.op === "relu") {
            const [A] = this.creators;
            const dInput = new Float32Array(this.grad.length);
            for (let i = 0; i < A.data.length; i++) {
                dInput[i] = A.data[i] > 0 ? this.grad[i] : 0;
            }
            A.backward(dInput);
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
    
    softmax() {
        const out = new Float32Array(this.data.length);
        for (let r = 0; r < this.rows; r++) {
            const start = r * this.cols;
            let max = -Infinity;
            for (let i = 0; i < this.cols; i++) if (this.data[start + i] > max) max = this.data[start + i];
            let sum = 0;
            for (let i = 0; i < this.cols; i++) {
                const e = Math.exp(this.data[start + i] - max);
                out[start + i] = e;
                sum += e;
            }
            for (let i = 0; i < this.cols; i++) out[start + i] /= (sum + 1e-8);
        }
        return new AkashaTensor(out, this.shape, [this], "softmax");
    }

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
        this.learningRate = 0.0001;
        this.stepCount = 0;

        console.log("🛠️ [SYSTEM]: Building Architecture v30.0 - The Transformer Deep Block.");
        
        // أوزان الـ Attention والـ Embedding
        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(name => {
            const shape = name === "W_emb" ? [vocabSize, d_model] : (name === "W_out" ? [d_model, vocabSize] : [d_model, d_model]);
            this.initParam(name, shape);
        });

        // ✅ المرحلة 3: أوزان الـ Feed Forward Network (FFN)
        const d_ff = d_model * 4; // العرف السائد في GPT
        this.initParam("W_ff1", [d_model, d_ff]);
        this.initParam("W_ff2", [d_ff, d_model]);
    }

    initParam(name, shape) {
        const data = new Float32Array(shape[0] * shape[1]);
        const scale = Math.sqrt(2 / (shape[0] + shape[1]));
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * scale;
        this.params.set(name, new AkashaTensor(data, shape, [], "param"));
        console.log(`   └─ Allocated ${name.padEnd(6)}: [${shape[0]}x${shape[1]}]`);
    }

    async init() { return true; }

    zeroGrad() { for (const p of this.params.values()) p.grad.fill(0); }

    // ✅ دالة الـ Feed Forward مع ReLU Activation
    forwardFFN(X) {
        console.log("🧠 [FFN]: Thinking - Hidden Layer Expansion (d_ff = 512)");
        const W1 = this.params.get("W_ff1");
        const W2 = this.params.get("W_ff2");

        // 1. Linear 1
        let hidden = X.matmul(W1);

        // 2. ReLU Activation (Non-linearity)
        const reluData = new Float32Array(hidden.data.length);
        for (let i = 0; i < hidden.data.length; i++) reluData[i] = Math.max(0, hidden.data[i]);
        let activated = new AkashaTensor(reluData, hidden.shape, [hidden], "relu");
        console.log(`      [LOG]: ReLU Activation applied to ${hidden.data.length} neurons.`);

        // 3. Linear 2 (Projection back to d_model)
        return activated.matmul(W2);
    }

    attention(X) {
        console.log("🔍 [ATTN]: Scanning Contextual Importance...");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        
        let scores = Q.matmul(K.transpose());
        const scale = Math.sqrt(this.d_model);
        for (let i = 0; i < scores.data.length; i++) scores.data[i] /= scale;

        for (let r = 0; r < scores.rows; r++) {
            for (let c = r + 1; c < scores.cols; c++) scores.data[r * scores.cols + c] = -1e9;
        }

        const weights = scores.softmax();
        const ir = Math.min(1, weights.rows - 1);
        const sample = Array.from(weights.data.subarray(ir * weights.cols, ir * weights.cols + 5)).map(v => v.toFixed(3));
        console.log(`   [📊 LOG]: Attention Map (Row ${ir}): [${sample.join(', ')}]`);
        
        return weights.matmul(V);
    }

    applyGradients() {
        console.log(`🔧 [OPTIMIZER]: Applying Updates for Step ${this.stepCount + 1}`);
        for (const [name, param] of this.params.entries()) {
            let gNorm = 0;
            for (let i = 0; i < param.data.length; i++) {
                param.data[i] -= this.learningRate * param.grad[i];
                gNorm += Math.abs(param.grad[i]);
            }
            console.log(`   └─ ${name.padEnd(6)} | Intensity: ${(gNorm/param.data.length).toExponential(4)}`);
        }
        this.stepCount++;
    }

    async process(message, userId) {
        console.log(`\n🔥 [AKASHA]: --- New Neural Cycle Started ---`);
        const tokens = message.split('').map(c => c.charCodeAt(0) % this.vSize);
        
        try {
            this.zeroGrad();

            // 1. Input Layer
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");
            console.log(`✅ Tokens Embedded: [${tokens.length} x ${this.d_model}]`);

            // --- Transformer Block Start ---

            // Sub-layer 1: Attention + Residual + LayerNorm
            console.log("🟦 [BLOCK]: Processing Self-Attention Sub-layer");
            let attnOut = this.attention(X.layerNorm()); 
            X = X.add(attnOut); // Residual Connection 1
            console.log("      [LOG]: Residual Connection 1 (Attn) complete.");

            // Sub-layer 2: FFN + Residual + LayerNorm
            console.log("🟦 [BLOCK]: Processing Feed-Forward Sub-layer");
            let ffnOut = this.forwardFFN(X.layerNorm());
            X = X.add(ffnOut); // Residual Connection 2
            console.log("      [LOG]: Residual Connection 2 (FFN) complete.");

            // --- Transformer Block End ---

            const logits = X.matmul(this.params.get("W_out"));

            console.log("🟨 [BACKWARD]: Starting Global Error Propagation...");
            logits.backward();

            this.applyGradients();

            return { text: `أكاشا: تمت المرحلة الثالثة بنجاح. لقد أضفنا الـ Feed Forward Network (FFN) ونظام الـ Residual المزدوج. العقل الآن أعمق!` };

        } catch (e) {
            console.error("🚨 [CRITICAL CRASH]:", e.stack);
            throw e;
        }
    }
}
