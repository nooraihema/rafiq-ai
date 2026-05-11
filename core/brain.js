/**
 * 🌌 AKASHA-TENSOR: THE JACOBI-SINGULARITY v50.0
 * المحرك: هندسة مصفوفات "يعقوبي" مع موازنة Spectral 
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
                if (isNaN(g) || !isFinite(g)) g = 0;
                // Clipping فائق لضمان استقرار "يعقوبي"
                this.grad[i] += Math.max(-0.1, Math.min(0.1, g)); 
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
        } else if (this.op === "add" || this.op === "emb") {
            this.creators.forEach(c => c.backward(this.grad));
        }
    }

    matmul(B) { return new AkashaTensor(AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols), [this.rows, B.cols], [this, B], "matmul"); }
}

class AkashaOps {
    static transpose(d, r, c) {
        const out = new Float32Array(d.length);
        for(let i=0; i<r; i++) {
            for(let j=0; j<c; j++) out[j*r + i] = d[i*c + j];
        }
        return out;
    }

    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);
        for (let i=0; i<rA; i++) {
            const i_cA = i * cA, i_cB = i * cB;
            for (let k=0; k<cA; k++) {
                const a = A[i_cA + k];
                if(Math.abs(a) < 1e-12) continue;
                const k_cB = k * cB;
                for (let j=0; j<cB; j++) out[i_cB + j] += a * B[k_cB + j];
            }
        }
        return out;
    }

    static matMulBackward(A, B, grad, rA, cA, cB) {
        const dA = new Float32Array(rA * cA);
        const dB = new Float32Array(cA * cB);
        for (let i=0; i<rA; i++) {
            const i_cB = i * cB;
            for (let k=0; k<cB; k++) {
                const g = grad[i_cB + k];
                if(g === 0) continue;
                for (let j=0; j<cA; j++) dA[i*cA + j] += g * B[j*cB + k];
            }
        }
        for (let i=0; i<rA; i++) {
            for (let j=0; j<cA; j++) {
                const a = A[i*cA + j];
                for (let k=0; k<cB; k++) dB[j*cB + k] += a * grad[i*cB + k];
            }
        }
        return [dA, dB];
    }

    static softmax(scores, rows, cols) {
        const out = new Float32Array(scores.length);
        for (let i = 0; i < rows; i++) {
            const start = i * cols;
            let maxV = -Infinity;
            for (let j = 0; j < cols; j++) if (scores[start + j] > maxV) maxV = scores[start + j];
            let sum = 0;
            for (let j = 0; j < cols; j++) {
                const e = Math.exp(Math.max(-20, Math.min(20, scores[start + j] - maxV)));
                out[start + j] = e; sum += e;
            }
            for (let j = 0; j < cols; j++) out[start + j] /= (sum + 1e-12);
        }
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.d_model = d_model; this.vSize = vSize; this.params = new Map();
        this.lr = 0.001; this.step = 0;
        // مصفوفات "يعقوبي" لضبط معدل التعلم لحظياً
        this.jacobi_diag = new Map(); 

        const layers = ["W_emb", "W_q", "W_k", "W_v", "W_out"];
        layers.forEach(n => {
            let s = n === "W_emb" ? [vSize, d_model] : [d_model, d_model];
            if(n === "W_out") s = [d_model, vSize];
            const data = new Float32Array(s[0] * s[1]);
            // Jacobi-Orthogonal Initialization
            for(let i=0; i<data.length; i++) data[i] = (Math.random()*2 - 1) * Math.sqrt(1/s[0]);
            this.params.set(n, new AkashaTensor(data, s));
            this.jacobi_diag.set(n, new Float32Array(data.length).fill(1.0));
        });
    }

    async process(msg) {
        console.log(`%c🔱 JACOBI-CORE ACTIVE | ITERATION: ${this.step}`, "color: #ff00ff; font-weight: bold;");
        
        const tokens = Array.from(new TextEncoder().encode(msg)).slice(0, 32);
        for (const p of this.params.values()) { p.grad.fill(0); p.visited = false; }

        // --- FORWARD PASS ---
        const W_emb = this.params.get("W_emb");
        let embD = new Float32Array(tokens.length * this.d_model);
        tokens.forEach((t, i) => embD.set(W_emb.data.subarray(t*this.d_model, (t+1)*this.d_model), i*this.d_model));
        let X = new AkashaTensor(embD, [tokens.length, this.d_model], [W_emb], "emb");

        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));

        const logitsFull = X.matmul(this.params.get("W_out"));

        // --- LOSS & JACOBI PRECONDITIONING ---
        const targets = [...tokens.slice(1), tokens[0]];
        let totalLoss = 0;
        const gradOut = new Float32Array(logitsFull.data.length);

        for (let i = 0; i < tokens.length; i++) {
            const row = logitsFull.data.subarray(i*256, (i+1)*256);
            const probs = AkashaOps.softmax(row, 1, 256);
            totalLoss -= Math.log(probs[targets[i]] + 1e-10);
            for (let c = 0; c < 256; c++) gradOut[i*256 + c] = probs[c];
            gradOut[i*256 + targets[i]] -= 1;
        }

        console.log(`📍 LOSS: ${(totalLoss/tokens.length).toFixed(4)}`);

        // --- BACKWARD PASS ---
        logitsFull.backward(gradOut);

        // --- JACOBI-OPTIMIZER (The Magic) ---
        for (const [name, p] of this.params.entries()) {
            const diag = this.jacobi_diag.get(name);
            for (let i = 0; i < p.data.length; i++) {
                // تحديث مصفوفة يعقوبي القطرية (Hessian Approximation)
                diag[i] = 0.9 * diag[i] + 0.1 * (p.grad[i] ** 2);
                const precond = 1.0 / (Math.sqrt(diag[i]) + 1e-8);
                // تحديث الوزن باستخدام القفزة الرياضية ليعقوبي
                p.data[i] -= this.lr * precond * p.grad[i];
            }
        }

        // --- GENERATION ---
        let res = [...tokens];
        const lastRow = logitsFull.data.subarray((tokens.length-1)*256, tokens.length*256);
        let nextToken = 0, maxP = -1;
        for(let j=32; j<256; j++) { if(lastRow[j] > maxP) { maxP = lastRow[j]; nextToken = j; } }
        res.push(nextToken);

        this.step++;
        return { text: new TextDecoder().decode(new Uint8Array(res.filter(t => t > 31))) };
    }
}
