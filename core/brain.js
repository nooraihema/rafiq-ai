/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v21.0
 * المرحلة الثانية (معمارياً): Layer Normalization
 * الهدف: تثبيت التوزيع الإحصائي ومنع الـ Gradient Collapse.
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
        if (grad) {
            for (let i = 0; i < this.grad.length; i++) this.grad[i] += Math.max(-1, Math.min(1, grad[i]));
        } else {
            this.grad.fill(1.0);
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
        console.log(`   [MATH]: MatMul -> (${this.shape}) x (${B.shape})`);
        return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); 
    }
    
    add(B) {
        console.log(`   [MATH]: Add -> Tensors of length ${this.data.length}`);
        const res = new Float32Array(this.data.length);
        for(let i=0; i<res.length; i++) res[i] = this.data[i] + B.data[i];
        return new AkashaTensor(res, this.shape, [this, B], "add");
    }

    transpose() { return new AkashaTensor(AkashaOps.transpose(this.data, this.rows, this.cols), [this.cols, this.rows], [this], "transpose"); }
    
    softmax() {
        console.log(`   [MATH]: Softmax -> Row-wise Probability Mapping`);
        const out = new Float32Array(this.data.length);
        for (let r = 0; r < this.rows; r++) {
            const start = r * this.cols;
            const row = this.data.subarray(start, start + this.cols);
            const maxVal = Math.max(...row);
            let sum = 0;
            for (let i = 0; i < this.cols; i++) {
                out[start + i] = Math.exp(row[i] - maxVal);
                sum += out[start + i];
            }
            for (let i = 0; i < this.cols; i++) out[start + i] /= (sum + 1e-10);
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
        
        console.log("🛠️ [INIT]: Calibrating Akasha Core...");
        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(name => {
            const shape = name === "W_emb" ? [vocabSize, d_model] : (name === "W_out" ? [d_model, vocabSize] : [d_model, d_model]);
            const size = shape[0] * shape[1];
            const data = new Float32Array(size);
            for (let i = 0; i < size; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / (shape[0] + shape[1]));
            }
            this.params.set(name, new AkashaTensor(data, shape, [], "param"));
            console.log(`   └─ ✅ Param: ${name} Ready.`);
        });
    }

    async init() { 
        console.log("⚡ [HANDSHAKE]: System Bridge Established.");
        return true; 
    }

    // 🧪 المرحلة الثانية: Layer Normalization
    layerNorm(X, eps = 1e-5) {
        console.log("🧪 [LAYER NORM]: Normalizing activations for stability...");
        const out = new Float32Array(X.data.length);
        for (let r = 0; r < X.rows; r++) {
            const start = r * X.cols;
            let mean = 0;
            for (let i = 0; i < X.cols; i++) mean += X.data[start + i];
            mean /= X.cols;

            let variance = 0;
            for (let i = 0; i < X.cols; i++) {
                const diff = X.data[start + i] - mean;
                variance += diff * diff;
            }
            variance /= X.cols;

            const denom = Math.sqrt(variance + eps);
            for (let i = 0; i < X.cols; i++) {
                out[start + i] = (X.data[start + i] - mean) / denom;
            }
            if (r === 0) console.log(`   └─ [DEBUG]: Row 0 Stats -> Mean: ${mean.toFixed(6)}, Var: ${variance.toFixed(6)}`);
        }
        return new AkashaTensor(out, X.shape, [X], "layernorm");
    }

    createPositionalEncoding(seqLen) {
        console.log(`🧭 [POS_ENC]: Mapping ${seqLen} slots in space-time...`);
        const data = new Float32Array(seqLen * this.d_model);
        for (let pos = 0; pos < seqLen; pos++) {
            for (let i = 0; i < this.d_model; i += 2) {
                const angle = pos / Math.pow(10000, i / this.d_model);
                data[pos * this.d_model + i] = Math.sin(angle);
                if (i + 1 < this.d_model) data[pos * this.d_model + i + 1] = Math.cos(angle);
            }
        }
        return new AkashaTensor(data, [seqLen, this.d_model], [], "positional");
    }

    attention(X) {
        console.log("🔍 [ATTENTION]: Firing Neural Synapses...");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        
        let scores = Q.matmul(K.transpose());
        const scale = Math.sqrt(this.d_model);
        for (let i = 0; i < scores.data.length; i++) scores.data[i] /= scale;

        const mean = scores.data.reduce((a, b) => a + b, 0) / scores.data.length;
        for (let i = 0; i < scores.data.length; i++) scores.data[i] -= mean * 0.1;

        for(let r=0; r<scores.rows; r++) 
            for(let c=r+1; c<scores.cols; c++) scores.data[r * scores.cols + c] = -1e9;

        const weights = scores.softmax();
        console.log(`   [DEBUG]: Attention Weights (First 3): ${weights.data.subarray(0, 3).join(', ')}`);
        return weights.matmul(V);
    }

    async process(message, userId) {
        console.log(`\n🚀 [AKASHA-ENTRY]: User: ${userId} | Message: "${message}"`);
        const tokens = message.split('').map(c => c.charCodeAt(0) % this.vSize);
        console.log(`🔢 [TOKENS]: Sequence length: ${tokens.length}`);
        
        try {
            // 1. Embedding
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((id, i) => {
                embData.set(W_emb.data.subarray(id * this.d_model, (id+1) * this.d_model), i * this.d_model);
            });
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");
            console.log("✅ [1/5] Embedding Layer: DONE");

            // 2. Positional Encoding
            const PE = this.createPositionalEncoding(tokens.length);
            X = X.add(PE);
            console.log("✅ [2/5] Positional Encoding: DONE");

            // 3. Transformer Block (Attention + LayerNorm)
            console.log("🧠 [TRANSFORMER BLOCK]: Processing...");
            const attnOut = this.attention(X);
            X = X.add(attnOut); // Residual connection
            
            // تطبيق الـ LayerNorm بعد الـ Attention
            X = this.layerNorm(X);
            console.log("✅ [3/5] Attention & LayerNorm: DONE");

            // 4. Projection (Logits)
            console.log("🏁 [PROJECTION]: Finalizing output...");
            const logits = X.matmul(this.params.get("W_out"));
            const finalLogits = logits.data.subarray(logits.data.length - this.vSize);
            
            let maxVal = -Infinity;
            let predToken = 0;
            for(let i=0; i<finalLogits.length; i++) {
                if(finalLogits[i] > maxVal) {
                    maxVal = finalLogits[i];
                    predToken = i;
                }
            }
            console.log(`✅ [4/5] Logits calculated. Max Signal: ${maxVal.toFixed(6)}`);

            // 5. Backprop
            logits.backward();
            console.log("✅ [5/5] Gradient Update: DONE");

            return { text: "أكاشا: تم تفعيل Layer Normalization. الإحصائيات الآن تحت السيطرة الكاملة." };

        } catch (e) {
            console.error("🚨 [CRASH REPORT]:", e);
            throw e;
        }
    }
}
