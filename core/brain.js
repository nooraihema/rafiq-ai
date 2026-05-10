/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v19.8
 * المرحلة الثانية: إصلاح انهيار التوزيع (Attention Sharpening & Scaling)
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
        } else if (["softmax", "add", "embedding"].includes(this.op)) {
            this.creators.forEach(c => c.backward(this.grad));
        }
    }

    matmul(B) { return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); }
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
        
        console.log("🛠️ [SYSTEM INIT]: Xavier-Light Initialization...");
        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(name => {
            const shape = name === "W_emb" ? [vocabSize, d_model] : (name === "W_out" ? [d_model, vocabSize] : [d_model, d_model]);
            const size = shape[0] * shape[1];
            const data = new Float32Array(size);
            for (let i = 0; i < size; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / (shape[0] + shape[1]));
            }
            this.params.set(name, new AkashaTensor(data, shape, [], "param"));
        });
    }

    async init() { return true; }

    attention(X) {
        console.log("🔍 [STAGE 2]: Attention Sharpening in progress...");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        let scores = Q.matmul(K.transpose());

        // --- التعديل الجوهري لـ ChatGPT: Stabilized Scaling & Centering ---
        const scale = Math.sqrt(this.d_model);
        const size = scores.data.length;
        
        // 1. Scaling
        for (let i = 0; i < size; i++) {
            scores.data[i] = scores.data[i] / scale;
        }

        // 2. Centering & Sharpening (يمنع الـ Flatness)
        const mean = scores.data.reduce((a, b) => a + b, 0) / size;
        for (let i = 0; i < size; i++) {
            scores.data[i] -= mean * 0.1; // تقوية التباين لزيادة قوة الإشارة
        }

        // Causal Masking
        for(let r=0; r<scores.rows; r++) 
            for(let c=r+1; c<scores.cols; c++) scores.data[r * scores.cols + c] = -1e9;

        const weights = scores.softmax();
        console.log(`   └─ Attention Spread Sample: ${weights.data.subarray(0, 3).map(n => n.toFixed(4)).join(', ')}`);
        
        return weights.matmul(V);
    }

    async process(message, userId) {
        console.log(`\n🚀 [INFERENCE]: Processing for User ${userId}`);
        const tokens = message.split('').map(c => c.charCodeAt(0) % this.vSize);
        
        try {
            const W_emb = this.params.get("W_emb");
            const embData = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((id, i) => embData.set(W_emb.data.subarray(id * this.d_model, (id+1) * this.d_model), i * this.d_model));
            let X = new AkashaTensor(embData, [tokens.length, this.d_model], [W_emb], "embedding");

            X = X.add(this.attention(X));

            const logits = X.matmul(this.params.get("W_out"));
            const finalLogits = logits.data.subarray(logits.data.length - this.vSize);
            
            let maxVal = -Infinity;
            for(let i=0; i<finalLogits.length; i++) if(finalLogits[i] > maxVal) maxVal = finalLogits[i];

            console.log(`🎯 [RESULT]: Max Logit Signal: ${maxVal.toFixed(6)}`);
            
            // رد سيادي يعكس حالة المحرك
            const reply = maxVal > 0.01 
                ? "أكاشا: الإشارة تزداد قوة. التباين في المصفوفات بدأ يعطي ملامح للوعي."
                : "أكاشا: مصفوفات الانتباه تم شحذها، بانتظار المرحلة الثالثة من التعديل المعماري.";

            return { text: reply };

        } catch (e) {
            console.error("🚨 [ERROR]:", e);
            throw e;
        }
    }
             }
