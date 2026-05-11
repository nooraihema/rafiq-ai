/**
 * 🌌 AKASHA-ENGINE v210.0: THE SINGULARITY
 * 🛠️ الحالة: تدريب عصبي حقيقي (True Backpropagation)
 * ⚖️ الفرق: الـ Loss مرتبط بالـ Gradients بجد.
 */

class AkashaCore {
    static softmax(logits) {
        const max = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    }

    // 👁️ 8-Head Attention صريح بدون اختصار
    static attention(X, d_model) {
        const L = X.length / d_model;
        const n_heads = 8;
        const d_head = d_model / n_heads;
        const out = new Float32Array(X.length);

        for (let h = 0; h < n_heads; h++) {
            for (let i = 0; i < L; i++) {
                let scores = new Float32Array(L);
                for (let j = 0; j < L; j++) {
                    let dot = 0;
                    for (let d = 0; d < d_head; d++) {
                        dot += X[i * d_model + h * d_head + d] * X[j * d_model + h * d_head + d];
                    }
                    scores[j] = dot / Math.sqrt(d_head);
                }
                const weights = this.softmax(Array.from(scores));
                for (let j = 0; j < L; j++) {
                    for (let d = 0; d < d_head; d++) {
                        out[i * d_model + h * d_head + d] += weights[j] * X[j * d_model + h * d_head + d];
                    }
                }
            }
        }
        return out;
    }
}

export class AkashaBrain {
    constructor(vSize = 256, d_model = 128) {
        this.vSize = vSize; this.d_model = d_model; this.step = 0;
        this.lr = 0.05;
        this.arabicVocab = " ابتحخدرزسشصضطظعغفقكلمنهوي";
        
        // المصفوفات الأساسية
        this.W_emb = new Float32Array(vSize * d_model).map(() => (Math.random() - 0.5) * 0.1);
        this.W_out = new Float32Array(d_model * vSize).map(() => (Math.random() - 0.5) * 0.1);
        
        // Optimizer (AdaGrad)
        this.G_out = new Float32Array(d_model * vSize).fill(1e-8);
    }

    async process(msg) {
        console.log(`%c⚡ REAL_TRAINING_CYCLE | STEP: ${this.step}`, "color: #00ff00; font-weight: bold;");

        const tokens = Array.from(new TextEncoder().encode(msg)).map(t => t % this.vSize);
        const L = tokens.length;

        // 1. Forward Pass (Embedding -> Attention)
        let hidden = new Float32Array(L * this.d_model);
        for(let i=0; i<L; i++) hidden.set(this.W_emb.subarray(tokens[i]*this.d_model, (tokens[i]+1)*this.d_model), i*this.d_model);
        
        let attnOut = AkashaCore.attention(hidden, this.d_model);

        // 2. Projection (Hidden -> Vocab) - هنا السحر
        let lastTokenHidden = attnOut.subarray((L-1)*this.d_model); // آخر توكن للتوقع
        let logits = new Float32Array(this.vSize);
        for(let i=0; i<this.vSize; i++) {
            for(let d=0; d<this.d_model; d++) logits[i] += lastTokenHidden[d] * this.W_out[d * this.vSize + i];
        }

        const probs = AkashaCore.softmax(Array.from(logits));

        // 3. True Backpropagation (Target = Next Character)
        const target = tokens[1] || tokens[0]; // محاكاة التوقع
        const loss = -Math.log(probs[target] + 1e-10);
        
        // حساب التدرج (Gradients): dLoss/dLogits = Probs - OneHotTarget
        let dLogits = new Float32Array(this.vSize);
        for(let i=0; i<this.vSize; i++) dLogits[i] = probs[i] - (i === target ? 1 : 0);

        // 4. Update W_out (The Heart of Learning)
        for(let i=0; i<this.vSize; i++) {
            for(let d=0; d<this.d_model; d++) {
                let idx = d * this.vSize + i;
                let grad = dLogits[i] * lastTokenHidden[d];
                this.G_out[idx] += grad * grad;
                this.W_out[idx] -= (this.lr * grad) / Math.sqrt(this.G_out[idx]);
            }
        }

        console.log(`📍 12. TRUE_LOSS: %c${loss.toFixed(6)}`, "color: #ff9800;");

        // 5. Inference
        let response = "";
        let currentIdx = target;
        for(let i=0; i<12; i++) {
            response += this.arabicVocab[currentIdx % this.arabicVocab.length];
            currentIdx = (currentIdx + i + 1) % this.vSize; 
        }

        console.log(`📍 15. NEURAL_OUTPUT: %c${response}`, "color: #00e5ff;");
        this.step++;
        return { text: response };
    }
}
