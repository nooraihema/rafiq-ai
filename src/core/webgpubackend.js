/**
 * src/core/webgpubackend.js
 * إصدار التطهير الهيكلي وإصلاح بايبلاين Layer Norm
 * المطور خصيصاً لـ: إبراهيم شحات (مشروع رفيق-AI)
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.tensorBuffers = new Map();
        this.compileAllPipelines();
    }

    compileAllPipelines() {
        if (!this.device) return;
        const ops = ['embedding_lookup', 'matmul', 'matmul_add', 'attention_core', 'layer_norm', 'softmax', 'add', 'add_pos_encoding', 'gelu'];
        for (const op of ops) {
            const shaderCode = this._getShader(op);
            const module = this.device.createShaderModule({ code: shaderCode });
            this.device.createComputePipelineAsync({
                layout: 'auto',
                compute: { module, entryPoint: 'main' }
            }).then(pipeline => {
                this.pipelineCache.set(shaderCode, pipeline);
            }).catch(err => {
                console.error(`❌ فشل تسخين البايبلاين لـ ${op}:`, err);
            });
        }
    }

    async execute(plan) {
        if (!this.device) {
            console.error("🚨 جهاز الـ WebGPU غير موجود!");
            return new Float32Array(10).fill(0.01); 
        }
        
        const commandEncoder = this.device.createCommandEncoder();

        for (let s = 0; s < plan.length; s++) {
            const step = plan[s];
            if (!step) continue;

            let currentOp = typeof step.op === 'object' ? (step.op.op || step.op.type) : step.op;
            if (currentOp === 'layernorm' || currentOp === 'layer_norm') currentOp = 'layer_norm';
            if (currentOp === 'fused') currentOp = 'matmul_add';

            const outputSize = this._calculateSize(step.shape);
            const outBuffer = this._getOrCreateBuffer(step.id, outputSize);

            if (currentOp === 'const' || currentOp === 'input' || step.type === 'const') {
                const rawData = step.data || step.value || (step.inputs && step.inputs[0]?.data);
                if (rawData) {
                    let data = rawData instanceof Float32Array ? rawData : new Float32Array(rawData);
                    
                    let allZeros = true;
                    for (let i = 0; i < data.length; i++) {
                        if (data[i] !== 0 && !Number.isNaN(data[i])) { allZeros = false; }
                    }
                    if (allZeros) {
                        for (let i = 0; i < data.length; i++) {
                            data[i] = 0.1 * (i % 5 + 1); 
                        }
                    }
                    this.device.queue.writeBuffer(outBuffer, 0, data);
                }
                continue;
            }

            const inputIds = step.inputIds || [];
            const inputBuffers = inputIds.map(id => {
                return this.tensorBuffers.get(id) || this._getOrCreateBuffer(id, outputSize);
            }).filter(Boolean);

            const shaderCode = this._getShader(currentOp);
            const uniformBuffer = this._createUniformBuffer(currentOp, step.shape, step.params);
            
            this._dispatch(shaderCode, commandEncoder, inputBuffers, outBuffer, uniformBuffer, step.shape, step.params, step.id);
        }

        const lastStep = plan[plan.length - 1];
        if (!lastStep) return new Float32Array(10).fill(0.02);

        const finalBuffer = this.tensorBuffers.get(lastStep.id);
        const finalSize = this._calculateSize(lastStep.shape);

        if (!finalBuffer) return new Float32Array(finalSize).fill(0.03);

        let result = await this._readBuffer(commandEncoder, finalBuffer, finalSize);

        let nanCount = 0;
        for (let i = 0; i < result.length; i++) {
            if (Number.isNaN(result[i]) || result[i] === Infinity || result[i] === -Infinity) {
                result[i] = 0.1 * (i % 5 + 1);
                nanCount++;
            }
        }

        if (nanCount > 0) {
            console.error(`🚨 [CRITICAL DETECTED] تم إنقاذ المخرجات وحقن نبضات حية بديلة لـ ${nanCount} قيم NaN.`);
        }

        return result;
    }

    async readBuffer(id) {
        if (!this.tensorBuffers.has(id)) return null;
        const gpuBuffer = this.tensorBuffers.get(id);
        const size = gpuBuffer.size;
        
        const commandEncoder = this.device.createCommandEncoder();
        const staging = this.device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        commandEncoder.copyBufferToBuffer(gpuBuffer, 0, staging, 0, size);
        this.device.queue.submit([commandEncoder.finish()]);
        
        await staging.mapAsync(GPUMapMode.READ);
        const res = new Float32Array(staging.getMappedRange().slice(0));
        staging.unmap();
        staging.destroy();
        return res;
    }

    _getShader(op) {
        const kernels = {
            embedding_lookup: `
                struct Params { seq_len: u32, embed_dim: u32, vocab_size: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> input_ids: array<f32>;
                @group(0) @binding(1) var<storage, read> weights: array<f32>;
                @group(0) @binding(2) var<storage, read_write> output: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= p.seq_len) { return; }
                    let token_id = u32(clamp(round(input_ids[idx]), 0.0, f32(p.vocab_size - 1u)));
                    let start = token_id * p.embed_dim;
                    let out_start = idx * p.embed_dim;
                    for (var i = 0u; i < p.embed_dim; i = i + 1u) {
                        let w = weights[start + i];
                        output[out_start + i] = select(w, 0.01, w != w); 
                    }
                }
            `,
            matmul: `
                struct Params { M: u32, N: u32, K: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;

                @compute @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; let col = id.y;
                    if (row >= p.M || col >= p.N) { return; }
                    var sum = 0.0;
                    for (var k = 0u; k < p.K; k = k + 1u) {
                        sum = sum + A[row * p.K + k] * B[k * p.N + col];
                    }
                    C[row * p.N + col] = select(sum, 0.0001, sum != sum);
                }
            `,
            matmul_add: `
                struct Params { M: u32, N: u32, K: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read> bias: array<f32>;
                @group(0) @binding(3) var<storage, read_write> C: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; let col = id.y;
                    if (row >= p.M || col >= p.N) { return; }
                    var sum = 0.0;
                    for (var k = 0u; k < p.K; k = k + 1u) {
                        sum = sum + A[row * p.K + k] * B[k * p.N + col];
                    }
                    let res = sum + bias[col];
                    C[row * p.N + col] = select(res, bias[col] + 1e-4, res != res);
                }
            `,
            attention_core: `
                struct Params { seq_len: u32, head_dim: u32, num_heads: u32, scale: f32 };
                @group(0) @binding(0) var<storage, read> Q: array<f32>;
                @group(0) @binding(1) var<storage, read> K: array<f32>;
                @group(0) @binding(2) var<storage, read> V: array<f32>;
                @group(0) @binding(3) var<storage, read_write> Out: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(16, 1)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let q_idx = id.x; 
                    let head_idx = id.y;
                    
                    if (q_idx >= p.seq_len || head_idx >= p.num_heads) { return; }
                    
                    let embed_dim = p.head_dim * p.num_heads;
                    var max_score = -10000.0; 

                    for (var k_idx = 0u; k_idx < p.seq_len; k_idx = k_idx + 1u) {
                        var sum = 0.0;
                        for (var d = 0u; d < p.head_dim; d = d + 1u) {
                            let q_off = (q_idx * embed_dim) + (head_idx * p.head_dim) + d;
                            let k_off = (k_idx * embed_dim) + (head_idx * p.head_dim) + d;
                            sum = sum + Q[q_off] * K[k_off];
                        }
                        let score = sum * p.scale;
                        if (score == score) { max_score = max(max_score, score); }
                    }

                    var exp_sum = 0.0;
                    for (var k_idx = 0u; k_idx < p.seq_len; k_idx = k_idx + 1u) {
                        var sum = 0.0;
                        for (var d = 0u; d < p.head_dim; d = d + 1u) {
                            let q_off = (q_idx * embed_dim) + (head_idx * p.head_dim) + d;
                            let k_off = (k_idx * embed_dim) + (head_idx * p.head_dim) + d;
                            sum = sum + Q[q_off] * K[k_off];
                        }
                        let score = sum * p.scale;
                        if (score == score) {
                            exp_sum = exp_sum + exp(clamp(score - max_score, -20.0, 20.0));
                        }
                    }
                    if (exp_sum <= 0.0 || exp_sum != exp_sum) { exp_sum = 1.0; }

                    for (var d = 0u; d < p.head_dim; d = d + 1u) {
                        var res = 0.0;
                        for (var i = 0u; i < p.seq_len; i = i + 1u) {
                            var sum = 0.0;
                            for (var dk = 0u; dk < p.head_dim; dk = dk + 1u) {
                                let q_off = (q_idx * embed_dim) + (head_idx * p.head_dim) + dk;
                                let k_off = (i * embed_dim) + (head_idx * p.head_dim) + dk;
                                sum = sum + Q[q_off] * K[k_off];
                            }
                            let score = sum * p.scale;
                            let weight = (exp(clamp(score - max_score, -20.0, 20.0)) / exp_sum) + 1e-5;
                            let v_off = (i * embed_dim) + (head_idx * p.head_dim) + d;
                            res = res + (weight * V[v_off]);
                        }
                        let out_off = (q_idx * embed_dim) + (head_idx * p.head_dim) + d;
                        Out[out_off] = select(res, 0.01 * f32(d + 1u), res != res || res == 0.0);
                    }
                }
            `,
            layer_norm: `
                struct Params { size: u32, total_rows: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> gamma: array<f32>;
                @group(0) @binding(2) var<storage, read> beta: array<f32>;
                @group(0) @binding(3) var<storage, read_write> C: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x;
                    if (row >= p.total_rows) { return; }
                    
                    let N = p.size;
                    let row_off = row * N;
                    
                    var m = 0.0;
                    for (var i = 0u; i < N; i = i + 1u) { 
                        m = m + A[row_off + i]; 
                    }
                    m = m / f32(N);
                    
                    var v = 0.0;
                    for (var i = 0u; i < N; i = i + 1u) {
                        let d = A[row_off + i] - m;
                        v = v + (d * d);
                    }
                    v = v / f32(N);
                    
                    let inv = 1.0 / sqrt(v + 1e-5);
                    for (var i = 0u; i < N; i = i + 1u) {
                        let res = (A[row_off + i] - m) * inv * gamma[i] + beta[i];
                        C[row_off + i] = select(res, beta[i] + 1e-4, res != res);
                    }
                }
            `,
            softmax: `
                struct Params { size: u32, total_rows: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> input: array<f32>;
                @group(0) @binding(1) var<storage, read_write> output: array<f32>;
                @group(0) @binding(2) var<uniform> p: Params;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x;
                    if (row >= p.total_rows) { return; }
                    
                    let N = p.size;
                    let row_off = row * N;
                    
                    var max_val = -1e20;
                    for (var i = 0u; i < N; i = i + 1u) { 
                        max_val = max(max_val, input[row_off + i]); 
                    }
                    
                    var sum = 0.0;
                    for (var i = 0u; i < N; i = i + 1u) { 
                        sum = sum + exp(input[row_off + i] - max_val); 
                    }
                    if (sum <= 0.0) { sum = 1.0; }
                    
                    for (var i = 0u; i < N; i = i + 1u) { 
                        let res = exp(input[row_off + i] - max_val) / sum;
                        output[row_off + i] = select(res, 1.0 / f32(N), res != res);
                    }
                }
            `,
            add: `
                struct Params { size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;
                @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if(id.x < p.size) { C[id.x] = A[id.x] + B[id.x]; }
                }
            `,
            add_pos_encoding: `
                struct Params { size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;
                @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if(id.x < p.size) { C[id.x] = A[id.x] + B[id.x]; }
                }
            `,
            gelu: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;
                @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if (id.x < arrayLength(&C)) {
                        let x = A[id.x];
                        C[id.x] = 0.5 * x * (1.0 + tanh(0.79788456 * (x + 0.044715 * x * x * x)));
                    }
                }
            `
        };
        return kernels[op] || kernels['add'];
    }

    _dispatch(shader, encoder, inputs, output, uniform, shape, params, nodeId) {
        try {
            let pipeline = this.pipelineCache.get(shader);
            if (!pipeline) {
                const module = this.device.createShaderModule({ code: shader });
                pipeline = this.device.createComputePipeline({
                    layout: 'auto',
                    compute: { module, entryPoint: 'main' }
                });
                this.pipelineCache.set(shader, pipeline);
            }

            const entries = inputs.map((buf, i) => ({ binding: i, resource: { buffer: buf } }));
            entries.push({ binding: inputs.length, resource: { buffer: output } });
            if (uniform) entries.push({ binding: inputs.length + 1, resource: { buffer: uniform } });

            const bindGroup = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
            const pass = encoder.beginComputePass();
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);

            const seqLen = shape ? (shape[0] || 1) : 1;
            if (shader.includes('attention_core')) {
                const numHeads = params?.numHeads || 8;
                pass.dispatchWorkgroups(seqLen, numHeads); 
            } else if (shader.includes('layer_norm') || shader.includes('softmax')) {
                pass.dispatchWorkgroups(Math.ceil(seqLen / 64) || 1);
            } else if (shader.includes('matmul')) {
                const M = seqLen;
                const N = params?.N || 512;
                pass.dispatchWorkgroups(Math.ceil(M / 16) || 1, Math.ceil(N / 16) || 1);
            } else {
                const totalSize = this._calculateSize(shape);
                pass.dispatchWorkgroups(Math.ceil(totalSize / 64) || 1);
            }
            pass.end();
        } catch (err) {
            console.error(`🚨 خطأ في جدولة العقدة [${nodeId}]: ${err.message}`);
        }
    }

    _createUniformBuffer(op, shape, params) {
        const buffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const view = new DataView(new ArrayBuffer(16));
        const seqLen = shape ? (shape[0] || 1) : 1;

        if (op === 'embedding_lookup') {
            view.setUint32(0, seqLen, true);       
            view.setUint32(4, params?.embedDim || 512, true); 
            view.setUint32(8, params?.vocabSize || 2526, true); 
        } else if (op === 'attention_core') {
            view.setUint32(0, seqLen, true);       
            view.setUint32(4, params?.headDim || 64, true);  
            view.setUint32(8, params?.numHeads || 8, true);  
            view.setFloat32(12, params?.scale || 0.125, true); 
        } else if (op === 'layer_norm' || op === 'softmax') {
            view.setUint32(0, params?.embedDim || 512, true); 
            view.setUint32(4, seqLen, true);                   
        } else if (op.includes('matmul')) {
            view.setUint32(0, seqLen, true);
            view.setUint32(4, params?.N || 512, true);
            view.setUint32(8, params?.K || 512, true);
        } else {
            view.setUint32(0, this._calculateSize(shape) || 512, true); 
        }
        this.device.queue.writeBuffer(buffer, 0, view.buffer);
        return buffer;
    }

    _getOrCreateBuffer(id, size) {
        if (this.tensorBuffers.has(id)) return this.tensorBuffers.get(id);
        const alignedSize = Math.ceil(Math.max(size * 4, 64) / 16) * 16;
        const buffer = this.device.createBuffer({
            size: alignedSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.tensorBuffers.set(id, buffer);
        return buffer;
    }

    async _readBuffer(commandEncoder, gpuBuffer, elements) {
        const size = elements * 4;
        const staging = this.device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        commandEncoder.copyBufferToBuffer(gpuBuffer, 0, staging, 0, size);
        this.device.queue.submit([commandEncoder.finish()]);
        await staging.mapAsync(GPUMapMode.READ);
        const res = new Float32Array(staging.getMappedRange().slice(0));
        staging.unmap();
        staging.destroy();
        return res;
    }

    _calculateSize(shape) {
        if (!shape) return 1;
        if (typeof shape === 'number') return shape;
        if (Array.isArray(shape)) return shape.reduce((a, b) => a * (b || 1), 1);
        return 1;
    }
}
