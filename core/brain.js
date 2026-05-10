/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v27.0
 * المرحلة: إحياء الانتباه والوعي المكاني (Spatial Revival)
 * التعديل: إضافة Positional Encoding + تنظيف الـ Attention Scaling.
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
                this.grad[i] += Math.max(-1, Math.min(1, g)); // Clip gradients
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
        } else if (["softmax", "add", "embedding", "positional", "layernorm"].includes(this.op)) {
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
            const row = this.data.subarray(start, start + this.cols);
            const maxVal = Math.max(...row);
            let sum = 0;
            for (let i = 0; i < this.cols; i++) {
                out[start + i] = Math.exp(row[i] - (isFinite(maxVal) ? maxVal : 0));
                sum += out[start + i];
            }
            const safeSum = (sum > 1e-10) ? sum : 1;
            for (let i = 0; i < this.cols; i++) out[start + i] /= safeSum;
        }
        return new AkashaTensor(out, this.shape, [this], "softmax");
    }
}

class AkashaOps {
    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i = 0; i < rA; i++) {
            const iA = i * cA; const iOut = i * cB;
            for (let k = 0; k < cA; k++) {
                const aVal = A[iA + k]; if (aVal === 0 || isNaN(aVal)) continue;
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
        this.learningRate = 0.001;
        this.stepCount = 0;

        console.log("🛠️ [INIT]: Akasha Spatial Engine v27.0");
        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(name => {
            const shape = name === "W_emb" ? [vocabSize, d_model] : (name === "W_out" ? [d_model, vocabSize] : [d_model, d_model]);
            const data = new Float32Array(shape[0] * shape[1]);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / (shape[0] + shape[1]));
            this.params.set(name, new AkashaTensor(data, shape, [], "param"));
        });
    }

    // ✅ الخطوة 1: إضافة الوعي بالترتيب (Positional Encoding)
    positionalEncoding(seqLen, d_model) {
        console.log(`🧭 [PE]: Generating Sin/Cos waves for ${seqLen} tokens.`);
        const pe = new Float32Array(seqLen * d_model);
        for (let pos = 0; pos < seqLen; pos++) {
            for (let i = 0; i < d_model; i++) {
                const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / d_model);
                pe[pos * d_model + i] = (i % 2 === 0) ? Math.sin(angle) : Math.cos(angle);
            }
        }
        return new AkashaTensor(pe, [seqLen, d_model], [], "positional");
    }

    zeroGrad() {
        for (const p of this.params.values()) p.grad.fill(0);
    }

    applyGradients() {
        console.log("🔧 [OPTIMIZER]: Updating Weights...");
        for (const [name, param] of this.params.entries()) {
            const data = param.data;
            const grad = param.grad;
            let gNorm = 0;
            for (let i = 0; i < data.length; i++) {
                data[i] -= this.learningRate * grad[i];
                gNorm += Math.abs(grad[i]);
            }
            console.log(`   └─ ${name} | Mean Grad: ${(gNorm/data.length).toExponential(3)}`);
        }
        this.stepCount++;
    }

    layerNorm(X, eps = 1e-5) {
        const out = new Float32Array(X.data.length);
        for (let r = 0; r < X.rows; r++) {
            const start = r * X.cols;
            let m = 0; for (let i = 0; i < X.cols; i++) m += X.data[start + i]; m /= X.cols;
            let v = 0; for (let i = 0; i < X.cols; i++) { const d = X.data[start+i]-m; v += d*d; } v /= X.cols;
            const s = Math.sqrt(v + eps);
            for (let i = 0; i < X.cols; i++) out[start + i] = (X.data[start + i] - m) / s;
        }
        return new AkashaTensor(out, X.shape, [X], "layernorm");
    }

    // ✅ الخطوة 2: إصلاح الـ Attention وتجنب الـ Collapse
    attention(X) {
        console.log("🔍 [ATTN]: Head scanning...");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        
        let scores = Q.matmul(K.transpose());
        
        // Scaled Dot-Product Attention: القسمة على جذر d_model فقط
        const scale = Math.sqrt(this.d_model);
        console.log(`      [LOG]: Attention Scale Factor: ${scale.toFixed(4)}`);
        for (let i = 0; i < scores.data.length; i++) {
            scores.data[i] /= scale;
        }

        // Causal Mask
        for (let r = 0; r < scores.rows; r++) {
            for (let c = r + 1; c < scores.cols; c++) scores.data[r * scores.cols + c] = -1e9;
        }

        const weights = scores.softmax();
        
        // Log لمراقبة التباين (Discrimination)
        const ir = Math.min(5, weights.rows - 1);
        const sample = Array.from(weights.data.subarray(ir * weights.cols, ir * weights.cols + Math.min(10, weights.cols))).map(v => v.toFixed(4));
        console.log(`   [📊 ATTN-REVIVAL]: Row ${ir} Distribution: [${sample.join(', ')}]`);
        
        return weights.matmul(V);
    }

    async process(message, userId) {
        console.log(`\n🚀 [AKASHA]: Starting Step ${this.stepCount + 1}`);
        const tokens = message.split('').map(c => c.charCodeAt(0) % this.vSize);
        
        try {
            this.zeroGrad();

            // 1. Embedding
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((t, i) => embData.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");
            console.log("   ✅ Embedding Matrix Prepared.");

            // ✅ الخطوة 3: دمج المعلومات المكانية (PE)
            const PE = this.positionalEncoding(tokens.length, this.d_model);
            X = X.add(PE);
            console.log("   ✅ Spatial Intelligence Injected.");

            // 2. Transformer Block
            X = X.add(this.attention(X)); 
            X = this.layerNorm(X);

            // 3. Output
            const logits = X.matmul(this.params.get("W_out"));
            
            // 4. Learning
            logits.backward();
            this.applyGradients();

            return { text: `أكاشا: الخطوة ${this.stepCount} تمت بنجاح. لقد قمت بحقن الوعي المكاني (Positional Encoding) وإعادة معايرة الـ Attention.` };

        } catch (e) {
            console.error("🚨 [ERROR]:", e);
            throw e;
        }
    }
}
