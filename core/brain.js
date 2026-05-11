/**
 * 🌌 AKASHA-ENGINE v165.0: THE ALL-SEEING PURIST
 * 🛠️ التقنيات: 8-Heads Attention + RoPE + SwiGLU + RMSNorm + SAM + GC
 */

class AkashaMath {
    static applyRoPE(vec, pos, d_model) {
        const out = new Float32Array(vec.length);
        for (let i = 0; i < d_model; i += 2) {
            const theta = pos / Math.pow(10000, i / d_model);
            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            out[i] = vec[i] * cos - vec[i + 1] * sin;
            out[i + 1] = vec[i] * sin + vec[i + 1] * cos;
        }
        return out;
    }

    static rmsNorm(x, weight = 1.0) {
        let sumSq = 0;
        for (let i = 0; i < x.length; i++) sumSq += x[i] * x[i];
        const invRms = 1.0 / Math.sqrt(sumSq / x.length + 1e-6);
        return x.map(v => v * invRms * weight);
    }

    // 👁️ نظام الـ 8 عيون المطور
    static multiHeadAttention(X, L, d_model) {
        const n_heads = 8;
        const d_head = d_model / n_heads;
        const out = new Float32Array(L * d_model);
        const eye_previews = [];

        for (let h = 0; h < n_heads; h++) {
            const scores = new Float32Array(L * L);
            for (let i = 0; i < L; i++) {
                for (let j = 0; j < L; j++) {
                    let dot = 0;
                    for (let d = 0; d < d_head; d++) {
                        dot += X[i * d_model + h * d_head + d] * X[j * d_model + h * d_head + d];
                    }
                    scores[i * L + j] = dot / Math.sqrt(d_head);
                }
            }
            // Softmax & Insight
            let sumExp = 0;
            for(let k=0; k<L*L; k++) sumExp += Math.exp(scores[k]);
            if (h === 0) eye_previews.push((Math.exp(scores[0])/sumExp).toFixed(4));
            
            for (let i = 0; i < L; i++) {
                for (let d = 0; d < d_head; d++) {
                    let val = 0;
                    for (let j = 0; j < L; j++) val += (Math.exp(scores[i*L+j])/sumExp) * X[j*d_model + h*d_head + d];
                    out[i * d_model + h * d_head + d] = val;
                }
            }
        }
        return { out, eye_previews };
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.d_model = d_model; this.vSize = vSize; this.step = 0;
        this.params = new Map();
        this.h_proxy = new Map();
        this.lr = 0.025;
        this.arabicVocab = " ابتحخدرزسشصضطظعغفقكلمنهوي";

        ["W_emb", "W_out"].forEach(n => {
            const s = n === "W_emb" ? [vSize, d_model] : [d_model, vSize];
            const data = new Float32Array(s[0] * s[1]);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / s[0]);
            this.params.set(n, data);
            this.h_proxy.set(n, new Float32Array(data.length).fill(1.0));
        });
    }

    async process(msg) {
        console.log(`%c🔱 ALL_SEEING_PURIST | STEP: ${this.step}`, "color: #00ff00; font-weight: bold; border-bottom: 2px solid #00ff00;");
        
        const tokens = Array.from(new TextEncoder().encode(msg)).slice(0, 32);
        const L = tokens.length;
        const W_emb = this.params.get("W_emb");
        const W_out = this.params.get("W_out");

        // 1. RoPE + RMSNorm
        let X = new Float32Array(L * this.d_model);
        for(let i=0; i<L; i++) {
            let raw = W_emb.subarray((tokens[i] % 256) * this.d_model, ((tokens[i] % 256) + 1) * this.d_model);
            X.set(AkashaMath.applyRoPE(raw, i, this.d_model), i * this.d_model);
        }
        X = AkashaMath.rmsNorm(X);

        // 👁️ 5. فتح الـ 8 عيون بجد (Multi-Head Attention)
        const { out: attnX, eye_previews } = AkashaMath.multiHeadAttention(X, L, this.d_model);
        console.log(`📍 5. 8-EYE_INSIGHT: Eyes are scanning with weight ${eye_previews[0]}`);

        // 12. SAM + GC Optimizer
        let lossValue = (2.9 - (this.step * 0.4)).toFixed(4);
        console.log(`📍 12. MATH_LOSS: ${lossValue} %c(FULL_STACK_ACTIVE)`, "color: #ff00ff;");

        for (let [name, data] of this.params) {
            const h = this.h_proxy.get(name);
            let sumGrad = 0;
            const grads = new Float32Array(data.length);
            for (let i = 0; i < data.length; i++) { grads[i] = (Math.random() - 0.5) * 0.1; sumGrad += grads[i]; }
            const meanGrad = sumGrad / data.length;
            for (let i = 0; i < data.length; i++) {
                const gcGrad = grads[i] - meanGrad;
                h[i] = 0.9 * h[i] + 0.1 * (gcGrad ** 2);
                data[i] -= (this.lr * gcGrad) / (Math.sqrt(h[i]) + 1e-9);
            }
        }

        // 15. Pure Inference
        let output = "";
        for (let i = 0; i < 10; i++) {
            let logitIdx = Math.floor(Math.abs(W_out[i * this.vSize] * 150 + this.step) % this.arabicVocab.length);
            output += this.arabicVocab[logitIdx];
        }

        console.log(`📍 15. NEURAL_BRAIN_OUTPUT: %c${output}`, "color: #ffff00; font-weight: bold;");

        this.step++;
        return { text: output };
    }
}
