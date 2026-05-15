/**
 * src/core/webgpubackend.js
 * الحالة: النسخة الكاملة النهائية (Full Akasha Pro-Engine)
 * التحديث: دمج الـ Attention مع الـ MatMul والـ Embedding Lookup
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.tensorBuffers = new Map();
        console.log("%c[Akasha GPU] Engine Armed & Ready", "color: #00ff41; font-weight: bold;");
    }

    async execute(plan) {
        if (!this.device) return new Float32Array(512).fill(0);

        const commandEncoder = this.device.createCommandEncoder();

        for (const step of plan) {
            const outputSize = this._calculateSize(step.shape);
            const outBuffer = this._getOrCreateBuffer(step.id, outputSize);

            if ((step.op === 'const' || step.op === 'input') && step.data) {
                this.device.queue.writeBuffer(outBuffer, 0, step.data);
                continue;
            }

            const inputBuffers = (step.inputIds || []).map(id => {
                const b = this.tensorBuffers.get(id);
                if (!b) throw new Error(`Missing Buffer: ${id} for Op: ${step.op}`);
                return b;
            });

            const shaderCode = this._getShader(step.op);
            const uniformBuffer = this._createUniformBuffer(step.shape, step.params);
            
            await this._dispatch(shaderCode, commandEncoder, inputBuffers, outBuffer, uniformBuffer, step.shape, step.params);
        }

        const lastStep = plan[plan.length - 1];
        const finalBuffer = this.tensorBuffers.get(lastStep.id);
        const finalSize = this._calculateSize(lastStep.shape);

        return await this._readBuffer(commandEncoder, finalBuffer, finalSize);
    }

    _getShader(op) {
        const kernels = {
            embedding_lookup: `
                struct Params { seq_len: f32, embed_dim: f32, vocab_size: f32, unused: f32 };
                @group(0) @binding(0) var<storage, read> input_ids: array<f32>;
                @group(0) @binding(1) var<storage, read> weights: array<f32>;
                @group(0) @binding(2) var<storage, read_write> output: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= u32(p.seq_len)) { return; }
                    let token_id = u32(input_ids[idx]);
                    let start = token_id * u32(p.embed_dim);
                    for (var i = 0u; i < u32(p.embed_dim); i++) {
                        output[idx * u32(p.embed_dim) + i] = weights[start + i];
                    }
                }
            `,

            matmul: `
                struct Params { M: f32, N: f32, K: f32, unused: f32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; let col = id.y;
                    if (row >= u32(p.M) || col >= u32(p.N)) { return; }
                    var sum = 0.0;
                    for (var k = 0u; k < u32(p.K); k++) {
                        sum += A[row * u32(p.K) + k] * B[k * u32(p.N) + col];
                    }
                    C[row * u32(p.N) + col] = sum;
                }
            `,

            attention_core: `
                struct Params { seq_len: f32, head_dim: f32, num_heads: f32, scale: f32 };
                @group(0) @binding(0) var<storage, read> Q: array<f32>;
                @group(0) @binding(1) var<storage, read> K: array<f32>;
                @group(0) @binding(2) var<storage, read> V: array<f32>;
                @group(0) @binding(3) var<storage, read_write> Out: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let q_idx = id.y; let head_idx = id.z;
                    let embed_dim = p.head_dim * p.num_heads;
                    if (q_idx >= u32(p.seq_len)) { return; }
                    var scores: array<f32, 128>; var max_score = -1e32;
                    for (var k_idx = 0u; k_idx < u32(p.seq_len); k_idx++) {
                        if (k_idx > q_idx) { scores[k_idx] = -1e32; } 
                        else {
                            var sum = 0.0;
                            for (var d = 0u; d < u32(p.head_dim); d++) {
                                let q_off = (q_idx * u32(embed_dim)) + (head_idx * u32(p.head_dim)) + d;
                                let k_off = (k_idx * u32(embed_dim)) + (head_idx * u32(p.head_dim)) + d;
                                sum += Q[q_off] * K[k_off];
                            }
                            scores[k_idx] = sum * p.scale;
                        }
                        max_score = max(max_score, scores[k_idx]);
                    }
                    var exp_sum = 0.0;
                    for (var i = 0u; i < u32(p.seq_len); i++) {
                        scores[i] = exp(scores[i] - max_score);
                        exp_sum += scores[i];
                    }
                    for (var d = 0u; d < u32(p.head_dim); d++) {
                        var res = 0.0;
                        for (var i = 0u; i < u32(p.seq_len); i++) {
                            let v_off = (i * u32(embed_dim)) + (head_idx * u32(p.head_dim)) + d;
                            res += scores[i] / exp_sum * V[v_off];
                        }
                        let out_off = (q_idx * u32(embed_dim)) + (head_idx * u32(p.head_dim)) + d;
                        Out[out_off] = res;
                    }
                }
            `,

            layer_norm: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> gamma: array<f32>;
                @group(0) @binding(2) var<storage, read> beta: array<f32>;
                @group(0) @binding(3) var<storage, read_write> C: array<f32>;
                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; let N = arrayLength(&gamma); let row_off = row * N;
                    if (row_off >= arrayLength(&A)) { return; }
                    var m = 0.0; for(var i=0u; i<N; i++){ m += A[row_off+i]; } m /= f32(N);
                    var v = 0.0; for(var i=0u; i<N; i++){ let d = A[row_off+i]-m; v += d*d; } v /= f32(N);
                    let inv = 1.0 / sqrt(v + 1e-5);
                    for(var i=0u; i<N; i++){ C[row_off+i] = (A[row_off+i]-m)*inv*gamma[i] + beta[i]; }
                }
            `,

            gelu: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;
                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if (id.x >= arrayLength(&C)) { return; }
                    let x = A[id.x];
                    C[id.x] = 0.5 * x * (1.0 + tanh(0.79788456 * (x + 0.044715 * x * x * x)));
                }
            `
        };

        if (!kernels[op]) throw new Error(`Missing Shader: ${op}`);
        return kernels[op];
    }

    async _dispatch(shader, encoder, inputs, output, uniform, shape, params) {
        const pipeline = await this._getOrCreatePipeline(shader);
        const entries = inputs.map((buf, i) => ({ binding: i, resource: { buffer: buf } }));
        entries.push({ binding: inputs.length, resource: { buffer: output } });
        if (uniform) entries.push({ binding: inputs.length + 1, resource: { buffer: uniform } });

        const bindGroup = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);

        if (shader.includes('attention_core')) {
            pass.dispatchWorkgroups(1, shape[0], params?.numHeads || 1);
        } else if (shader.includes('matmul')) {
            pass.dispatchWorkgroups(Math.ceil(shape[0]/8), Math.ceil((params?.N || 512)/8));
        } else {
            pass.dispatchWorkgroups(Math.ceil(this._calculateSize(shape) / 64));
        }
        pass.end();
    }

    _createUniformBuffer(shape, params) {
        const data = new Float32Array(4);
        data[0] = shape[0]; 
        data[1] = params?.N || params?.headDim || params?.embedDim || 512;
        data[2] = params?.K || params?.numHeads || 512;
        data[3] = params?.scale || 1.0;

        const buffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(buffer, 0, data);
        return buffer;
    }

    _getOrCreateBuffer(id, size) {
        if (this.tensorBuffers.has(id)) return this.tensorBuffers.get(id);
        const buffer = this.device.createBuffer({
            size: Math.ceil(Math.max(size * 4, 64) / 16) * 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.tensorBuffers.set(id, buffer);
        return buffer;
    }

    async _readBuffer(encoder, gpuBuffer, elements) {
        const size = elements * 4;
        const staging = this.device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        encoder.copyBufferToBuffer(gpuBuffer, 0, staging, 0, size);
        this.device.queue.submit([encoder.finish()]);
        await staging.mapAsync(GPUMapMode.READ);
        const res = new Float32Array(staging.getMappedRange().slice(0));
        staging.unmap(); staging.destroy();
        return res;
    }

    async _getOrCreatePipeline(code) {
        if (this.pipelineCache.has(code)) return this.pipelineCache.get(code);
        const module = this.device.createShaderModule({ code });
        const pipeline = await this.device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'main' } });
        this.pipelineCache.set(code, pipeline);
        return pipeline;
    }

    _calculateSize(shape) { return shape.reduce((a, b) => a * b, 1); }
}
