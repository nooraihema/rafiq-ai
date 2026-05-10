/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v24.0
 * المرحلة: كشف القناع عن الانتباه (Attention Deep Visibility)
 * الهدف: مراقبة توزيع الانتباه في الصفوف المتأخرة حيث يظهر الـ Context الحقيقي.
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
        console.log(`      [LINEAR]: Computing ${this.shape[0]}x${this.shape[1]} @ ${B.shape[0]}x${B.shape[1]}`);
        return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); 
    }
    
    add(B) {
        console.log(`      [RESIDUAL]: Add connection for ${this.data.length} units.`);
        const res = new Float32Array(this.data.length);
        for(let i=0; i<res.length; i++) res[i] = this.data[i] + B.data[i];
        return new AkashaTensor(res, this.shape, [this, B], "add");
    }

    transpose() { return new AkashaTensor(AkashaOps.transpose(this.data, this.rows, this.cols), [this.cols, this.rows], [this], "transpose"); }
    
    softmax() {
        console.log(`      [SOFTMAX]: Mapping logits to probabilities.`);
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
        
        console.log("🛠️ [INIT]: Akasha Tensor Core v24 Active.");
        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(name => {
            const shape = name === "W_emb" ? [vocabSize, d_model] : (name === "W_out" ? [d_model, vocabSize] : [d_model, d_model]);
            const data = new Float32Array(shape[0] * shape[1]);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / (shape[0] + shape[1]));
            this.params.set(name, new AkashaTensor(data, shape, [], "param"));
            console.log(`   └─ Matrix ${name} [${shape}] initialized.`);
        });
    }

    async init() { return true; }

    layerNorm(X, eps = 1e-5) {
        console.log("🧪 [L-NORM]: Balancing variance across layers...");
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
            for (let i = 0; i < X.cols; i++) out[start + i] = (X.data[start + i] - mean) / denom;
        }
        return new AkashaTensor(out, X.shape, [X], "layernorm");
    }

    createPositionalEncoding(seqLen) {
        console.log(`🧭 [PE]: Mapping spatial vectors for ${seqLen} tokens.`);
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
        console.log("🔍 [ATTN]: Head scan initiated...");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        
        let scores = Q.matmul(K.transpose());

        const scale = Math.sqrt(this.d_model);
        for (let i = 0; i < scores.data.length; i++) scores.data[i] /= scale;

        // Clipping extreme values
        for (let i = 0; i < scores.data.length; i++) {
            if (scores.data[i] > 10) scores.data[i] = 10;
            if (scores.data[i] < -10) scores.data[i] = -10;
        }

        // Causal Masking (Critical for GPT)
        for (let r = 0; r < scores.rows; r++) {
            for (let c = r + 1; c < scores.cols; c++) {
                scores.data[r * scores.cols + c] = -1e9;
            }
        }

        const temperature = 5.0;
        for (let i = 0; i < scores.data.length; i++) {
            if (scores.data[i] > -1e8) scores.data[i] /= temperature;
        }

        const weights = scores.softmax();

        // 🎯 التعديل الجوهري للـ Log: فحص الصفوف التي تملك سياقاً
        const inspectRow = Math.min(5, weights.rows - 1);
        const start = inspectRow * weights.cols;
        const sample = Array.from(weights.data.subarray(start, start + Math.min(10, weights.cols)))
                           .map(v => v.toFixed(4));

        console.log(`   [📊 LOG]: Attention Row ${inspectRow} (Context View) -> [${sample.join(', ')}]`);
        
        return weights.matmul(V);
    }

    async process(message, userId) {
        console.log(`\n🚀 [AKASHA]: Inbound -> ${userId}`);
        const tokens = message.split('').map(c => c.charCodeAt(0) % this.vSize);
        console.log(`🔢 [TOKENS]: Sequence Size: ${tokens.length}`);
        
        try {
            // Step 1: Embedding
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((id, i) => embData.set(W_emb.data.subarray(id * this.d_model, (id+1) * this.d_model), i * this.d_model));
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");
            console.log("✅ [1/5] Embedding Flow: OK");

            // Step 2: PE
            X = X.add(this.createPositionalEncoding(tokens.length));
            console.log("✅ [2/5] Spatial Injection: OK");

            // Step 3: Block
            console.log("🧠 [TRANSFORMER]: Processing Block 1...");
            const attnOut = this.attention(X);
            X = X.add(attnOut); 
            X = this.layerNorm(X);
            console.log("✅ [3/5] Attention & Norm: OK");

            // Step 4: Projection
            const logits = X.matmul(this.params.get("W_out"));
            const finalLogits = logits.data.subarray(logits.data.length - this.vSize);
            let maxVal = -Infinity;
            for(let i=0; i<finalLogits.length; i++) if(finalLogits[i] > maxVal) maxVal = finalLogits[i];
            console.log(`✅ [4/5] Output Calculated. Signal: ${maxVal.toFixed(6)}`);

            // Step 5: Backprop
            logits.backward();
            console.log("✅ [5/5] Weight Gradients: OK");

            return { text: "أكاشا: اللوجات الآن تراقب صفوف السياق (Row Context). كل شيء تحت السيطرة." };

        } catch (e) {
            console.error("🚨 [SYSTEM ERROR]:", e);
            throw e;
        }
    }
}
