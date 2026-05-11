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

    transpose() {
        const out = new Float32Array(this.data.length);
        for (let i = 0; i < this.rows; i++)
            for (let j = 0; j < this.cols; j++)
                out[j * this.rows + i] = this.data[i * this.cols + j];

        return new AkashaTensor(out, [this.cols, this.rows], [this], "transpose");
    }

    clip(x) {
        return Math.max(-1, Math.min(1, x));
    }

    backward(grad = null) {
        if (!grad) {
            this.grad.fill(1);
        } else {
            for (let i = 0; i < grad.length; i++) {
                const g = grad[i];
                this.grad[i] += isFinite(g) ? this.clip(g) : 0;
            }
        }
        this.dispatch();
    }

    dispatch() {
        if (this.op === "matmul") {
            const [A, B] = this.creators;
            const [dA, dB] = AkashaOps.matMulBackward(A, B, this.grad);
            A.backward(dA);
            B.backward(dB);
        } else {
            this.creators.forEach(c => c.backward(this.grad));
        }
    }

    matmul(B) {
        const out = AkashaOps.matMul(this.data, B.data, this.rows, this.cols, B.cols);
        return new AkashaTensor(out, [this.rows, B.cols], [this, B], "matmul");
    }

    add(B) {
        const out = new Float32Array(this.data.length);
        for (let i = 0; i < out.length; i++)
            out[i] = this.data[i] + B.data[i];

        return new AkashaTensor(out, this.shape, [this, B], "add");
    }

    layerNorm() {
        const out = new Float32Array(this.data.length);

        for (let r = 0; r < this.rows; r++) {
            const start = r * this.cols;

            let mean = 0;
            for (let i = 0; i < this.cols; i++)
                mean += this.data[start + i];
            mean /= this.cols;

            let varr = 0;
            for (let i = 0; i < this.cols; i++) {
                const d = this.data[start + i] - mean;
                varr += d * d;
            }
            varr /= this.cols;

            const std = Math.sqrt(varr + 1e-6);

            for (let i = 0; i < this.cols; i++) {
                let v = (this.data[start + i] - mean) / std;
                out[start + i] = isFinite(v) ? v : 0;
            }
        }

        return new AkashaTensor(out, this.shape, [this], "ln");
    }
}

class AkashaOps {

    static matMul(A, B, rA, cA, cB) {
        const out = new Float32Array(rA * cB);

        for (let i = 0; i < rA; i++) {
            for (let k = 0; k < cA; k++) {
                const a = A[i * cA + k];
                if (!a) continue;

                for (let j = 0; j < cB; j++) {
                    out[i * cB + j] += a * B[k * cB + j];
                }
            }
        }
        return out;
    }

    static matMulBackward(A, B, grad) {
        const dA = new Float32Array(A.rows * A.cols);
        const dB = new Float32Array(B.rows * B.cols);

        for (let i = 0; i < A.rows; i++) {
            for (let j = 0; j < A.cols; j++) {
                let sum = 0;
                for (let k = 0; k < B.cols; k++)
                    sum += grad[i * B.cols + k] * B.data[j * B.cols + k];
                dA[i * A.cols + j] = sum;
            }
        }

        for (let i = 0; i < B.rows; i++) {
            for (let j = 0; j < B.cols; j++) {
                let sum = 0;
                for (let k = 0; k < A.rows; k++)
                    sum += A.data[k * A.cols + i] * grad[k * B.cols + j];
                dB[i * B.cols + j] = sum;
            }
        }

        return [dA, dB];
    }

    static softmax(x, rows, cols) {
        const out = new Float32Array(x.length);

        for (let r = 0; r < rows; r++) {
            const start = r * cols;

            let max = -1e9;
            for (let i = 0; i < cols; i++)
                max = Math.max(max, x[start + i]);

            let sum = 0;
            for (let i = 0; i < cols; i++) {
                const e = Math.exp(Math.min(10, x[start + i] - max));
                out[start + i] = e;
                sum += e;
            }

            for (let i = 0; i < cols; i++)
                out[start + i] /= (sum + 1e-8);
        }

        return out;
    }
}

export class AkashaBrain {

    constructor(vSize = 256, d_model = 128) {
        this.vSize = vSize;
        this.d_model = d_model;
        this.lr = 0.0007;
        this.step = 0;

        this.m = new Map();
        this.v = new Map();
        this.params = new Map();

        const init = (name, shape) => {
            const data = new Float32Array(shape[0] * shape[1]);
            for (let i = 0; i < data.length; i++)
                data[i] = (Math.random() - 0.5) * 0.02;

            const t = new AkashaTensor(data, shape);
            this.params.set(name, t);

            this.m.set(name, new Float32Array(data.length));
            this.v.set(name, new Float32Array(data.length));
        };

        init("W_emb", [vSize, d_model]);
        init("W_q", [d_model, d_model]);
        init("W_k", [d_model, d_model]);
        init("W_v", [d_model, d_model]);
        init("W_out", [d_model, vSize]);
        init("W_ff1", [d_model, d_model * 4]);
        init("W_ff2", [d_model * 4, d_model]);
    }

    encode(t) {
        return Array.from(new TextEncoder().encode(t));
    }

    decode(t) {
        return new TextDecoder().decode(new Uint8Array(t));
    }

    softmaxStable(logits) {
        return AkashaOps.softmax(logits, 1, this.vSize);
    }

    forward(x) {
        const W = this.params.get("W_emb");
        const emb = new Float32Array(x.length * this.d_model);

        x.forEach((t, i) => {
            const idx = Math.min(this.vSize - 1, t);
            emb.set(W.data.slice(idx * this.d_model, (idx + 1) * this.d_model), i * this.d_model);
        });

        let X = new AkashaTensor(emb, [x.length, this.d_model]);

        const Q = X.matmul(this.params.get("W_q"));
        const K = X.matmul(this.params.get("W_k"));
        const V = X.matmul(this.params.get("W_v"));

        let S = Q.matmul(K.transpose());

        for (let i = 0; i < S.data.length; i++)
            S.data[i] /= Math.sqrt(this.d_model);

        const A = new AkashaTensor(
            AkashaOps.softmax(S.data, S.rows, S.cols),
            S.shape
        );

        X = X.add(A.matmul(V)).layerNorm();

        const ffn = X.matmul(this.params.get("W_ff1"));
        X = X.add(ffn.matmul(this.params.get("W_ff2")));

        return X.matmul(this.params.get("W_out")).data;
    }

    sample(logits) {
        const arr = Array.from(logits);
        let max = Math.max(...arr);
        let sum = 0;

        const probs = arr.map(v => {
            const e = Math.exp(v - max);
            sum += e;
            return e;
        });

        let r = Math.random();
        let acc = 0;

        for (let i = 0; i < probs.length; i++) {
            acc += probs[i] / sum;
            if (r < acc) return i;
        }

        return 0;
    }

    async trainStep(text) {

        console.log(`\n🔥 STEP ${this.step}`);

        const tokens = this.encode(text).slice(0, 64);

        console.log("📥 tokens:", tokens.length);

        const logits = this.forward(tokens);

        let loss = 0;
        const grad = new Float32Array(logits.length);

        for (let i = 0; i < tokens.length; i++) {
            const base = i * this.vSize;

            let max = -1e9;
            for (let j = 0; j < this.vSize; j++)
                max = Math.max(max, logits[base + j]);

            let sum = 0;
            for (let j = 0; j < this.vSize; j++) {
                const e = Math.exp(logits[base + j] - max);
                grad[base + j] = e;
                sum += e;
            }

            const t = tokens[i];
            grad[base + t] -= 1;

            loss += -Math.log((grad[base + t] + 1e-9) / (sum + 1e-9));
        }

        console.log("📉 loss:", loss / tokens.length);

        for (const p of this.params.values())
            p.grad.fill(0);

        this.step++;
    }
}
