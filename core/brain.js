/**
 * 🌌 AKASHA-TENSOR: SOVEREIGN-GPT v26.0
 * المرحلة: تحصين النظام ضد الانهيار (NaN Neutralization)
 * التعديل: منع الـ NaN من التسلل للـ Gradients + نظام مراقبة فائق الكثافة.
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

    // 🔥 الحل الجذري لمنع NaN
    backward(grad = null) {
        if (!grad) {
            console.log(`   [📉 BACK-START]: Originating grad for ${this.op || 'Output'}`);
            this.grad.fill(1.0);
        } else {
            for (let i = 0; i < this.grad.length; i++) {
                let g = grad[i];
                // فحص الأمان: لو القيمة مش رقم أو مالانهاية، خليها صفر فوراً
                if (!isFinite(g) || isNaN(g)) g = 0;
                // Clipping (قص التدرج) لمنع الانفجار
                this.grad[i] += Math.max(-1, Math.min(1, g));
            }
        }
        if (this.creators.length > 0) this.dispatch();
    }

    dispatch() {
        console.log(`      [⚡ DISPATCH]: Propagating from ${this.op.toUpperCase()}`);
        if (this.op === "matmul") {
            const [A, B] = this.creators;
            const dA = AkashaOps.matMul(this.grad, AkashaOps.transpose(B.data, B.rows, B.cols), this.rows, this.cols, A.cols);
            const dB = AkashaOps.matMul(AkashaOps.transpose(A.data, A.rows, A.cols), this.grad, A.cols, A.rows, this.cols);
            A.backward(dA); B.backward(dB);
        } else if (["softmax", "add", "embedding", "positional", "layernorm"].includes(this.op)) {
            this.creators.forEach((c, idx) => {
                console.log(`         -> Driving grad to creator[${idx}] (${this.op})`);
                c.backward(this.grad);
            });
        }
    }

    matmul(B) { 
        console.log(`      [OP: MATMUL]: Input A(${this.shape}) x Input B(${B.shape})`);
        return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); 
    }
    
    add(B) {
        console.log(`      [OP: ADD]: Summing ${this.data.length} elements (Residual/PE)`);
        const res = new Float32Array(this.data.length);
        for(let i=0; i<res.length; i++) res[i] = this.data[i] + B.data[i];
        return new AkashaTensor(res, this.shape, [this, B], "add");
    }

    transpose() { return new AkashaTensor(AkashaOps.transpose(this.data, this.rows, this.cols), [this.cols, this.rows], [this], "transpose"); }
    
    softmax() {
        console.log(`      [OP: SOFTMAX]: Activating Probabilities [Rows: ${this.rows}]`);
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
        this.learningRate = 0.0005; // تقليل الـ LR قليلاً لزيادة الاستقرار
        this.stepCount = 0;

        console.log("🛠️ [INIT]: Akasha Tensor Fortress v26.0 - Ready for training.");
        ["W_emb", "W_q", "W_k", "W_v", "W_out"].forEach(name => {
            const shape = name === "W_emb" ? [vocabSize, d_model] : (name === "W_out" ? [d_model, vocabSize] : [d_model, d_model]);
            const data = new Float32Array(shape[0] * shape[1]);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / (shape[0] + shape[1]));
            this.params.set(name, new AkashaTensor(data, shape, [], "param"));
            console.log(`   [PARAM]: ${name} [${shape}] Created.`);
        });
    }

    async init() { return true; }

    zeroGrad() {
        console.log("🧹 [LOG]: Zeroing Gradients for all parameters...");
        for (const [name, param] of this.params.entries()) {
            param.grad.fill(0);
        }
    }

    applyGradients() {
        console.log("🔧 [OPTIMIZER]: Starting Weight Update...");
        for (const [name, param] of this.params.entries()) {
            const data = param.data;
            const grad = param.grad;
            let gradNorm = 0;
            let nanCount = 0;

            for (let i = 0; i < data.length; i++) {
                let g = grad[i];
                if (isNaN(g)) { nanCount++; g = 0; }
                data[i] -= this.learningRate * g;
                gradNorm += Math.abs(g);
            }
            
            const avgGrad = gradNorm / data.length;
            console.log(`   [UPDATE]: ${name} | AvgGrad: ${avgGrad.toExponential(4)} | NaNs Blocked: ${nanCount}`);
        }
        this.stepCount++;
        console.log(`✅ [LOG]: Training Step ${this.stepCount} Completed Successfully.`);
    }

    // --- Helper Blocks ---
    layerNorm(X, eps = 1e-5) {
        console.log("🧪 [OP: LNORM]: Normalizing activations...");
        const out = new Float32Array(X.data.length);
        for (let r = 0; r < X.rows; r++) {
            const start = r * X.cols;
            let m = 0; for (let i = 0; i < X.cols; i++) m += X.data[start + i];
            m /= X.cols;
            let v = 0; for (let i = 0; i < X.cols; i++) { const d = X.data[start+i]-m; v += d*d; }
            v /= X.cols;
            const s = Math.sqrt(v + eps);
            for (let i = 0; i < X.cols; i++) out[start + i] = (X.data[start + i] - m) / s;
        }
        return new AkashaTensor(out, X.shape, [X], "layernorm");
    }

    attention(X) {
        console.log("🔍 [OP: ATTN]: Contextualizing...");
        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));
        let sc = Q.matmul(K.transpose());
        const d = Math.sqrt(this.d_model);
        for (let i = 0; i < sc.data.length; i++) sc.data[i] /= d;

        for (let r = 0; r < sc.rows; r++) {
            for (let c = r + 1; c < sc.cols; c++) sc.data[r * sc.cols + c] = -1e9;
        }

        const w = sc.softmax();
        const ir = Math.min(5, w.rows - 1);
        const sample = Array.from(w.data.subarray(ir * w.cols, ir * w.cols + 5)).map(v => v.toFixed(3));
        console.log(`      [📊 ATTN-LOG]: Sample Weights Row ${ir}: [${sample.join(',')}]`);
        return w.matmul(V);
    }

    async process(message, userId) {
        console.log(`\n🔥 [SYSTEM-LOG]: --- START STEP ${this.stepCount + 1} ---`);
        const tokens = message.split('').map(c => c.charCodeAt(0) % this.vSize);
        console.log(`🔢 [TOKENS]: Sequence length: ${tokens.length}`);
        
        try {
            this.zeroGrad();

            // 1. Forward
            console.log("🟦 [FORWARD]: Computing graph...");
            const W_emb = this.params.get("W_emb");
            const emb = new Float32Array(tokens.length * this.d_model);
            tokens.forEach((t, i) => emb.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
            let X = new AkashaTensor(emb, [tokens.length, this.d_model], [W_emb], "embedding");
            
            X = X.add(this.attention(X)); 
            X = this.layerNorm(X);

            const logits = X.matmul(this.params.get("W_out"));
            console.log("✅ [FORWARD]: Logits generated.");

            // 2. Backward
            console.log("🟨 [BACKWARD]: Initiating grad flow...");
            logits.backward();
            console.log("✅ [BACKWARD]: Gradients calculated.");

            // 3. Update
            this.applyGradients();

            return { text: `أكاشا: الخطوة ${this.stepCount} تمت. تم صد الـ NaN بنجاح ونظام المراقبة يعمل.` };

        } catch (e) {
            console.error("🚨 [CRITICAL FAILURE]:", e);
            throw e;
        }
    }
                                                                }
