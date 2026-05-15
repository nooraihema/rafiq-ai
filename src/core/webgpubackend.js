/**
 * src/core/webgpubackend.js
 * الحالة: المحرك القتالي مع نظام التتبع (Diagnostic Pro-Engine)
 * التحديث: إضافة Logging عميق وفحص سلامة الـ Buffers وكشف الأوزان الصفرية.
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.tensorBuffers = new Map();
        console.log("%c[WebGPU] Backend Initialized", "color: #00ff41; font-weight: bold;");
    }

    async execute(plan) {
        if (!this.device) {
            console.error("[WebGPU] No device found! Check initialization.");
            return new Float32Array(512).fill(0);
        }

        const commandEncoder = this.device.createCommandEncoder();

        for (const step of plan) {
            const outputSize = this._calculateSize(step.shape);
            const outBuffer = this._getOrCreateBuffer(step.id, outputSize);

            // 1. التعامل مع الثوابت (الأوزان)
            if (step.op === 'const' && step.data) {
                // فحص سريع: هل بنبعت أصفار؟
                const isAllZeros = step.data.every(v => v === 0);
                if (isAllZeros) {
                    console.warn(`%c[DATA WARNING] Step ${step.id} (op: const) is sending ONLY ZEROS!`, "color: #ff4d4d");
                }
                
                this.device.queue.writeBuffer(outBuffer, 0, step.data);
                console.log(`[EXEC] Step: ${step.id} | Type: Const | Size: ${step.data.length}`);
                continue;
            }

            // 2. تجهيز المدخلات
            const inputBuffers = (step.inputIds || []).map(id => {
                const buf = this.tensorBuffers.get(id);
                if (!buf) {
                    console.error(`[EXEC ERROR] Buffer missing for ID: ${id} in step: ${step.id}`);
                    throw new Error(`Buffer missing: ${id}`);
                }
                return buf;
            });

            // تمرير الأبعاد ديناميكياً
            const uniformBuffer = this._createUniformBuffer(step.shape, step.params);
            const shaderCode = this._getShader(step.op);

            console.log(`[EXEC] Step: ${step.id} | Op: ${step.op} | Inputs: ${step.inputIds.length}`);
            
            await this._dispatch(shaderCode, commandEncoder, inputBuffers, outBuffer, uniformBuffer, step.shape, step.params);
        }

        // 3. قراءة النتيجة النهائية
        const lastStep = plan[plan.length - 1];
        if (!lastStep) {
            console.error("[EXEC ERROR] Execution plan is empty!");
            return new Float32Array(0);
        }

        const finalBuffer = this.tensorBuffers.get(lastStep.id);
        const finalSize = this._calculateSize(lastStep.shape);

        console.log(`[READBACK] Final Step: ${lastStep.id} | Requesting: ${finalSize} elements`);
        return await this._readBuffer(commandEncoder, finalBuffer, finalSize);
    }

    _getShader(op) {
        const kernels = {
            attention_core: `
                struct Params { seq_len: f32, head_dim: f32, num_heads: f32, scale: f32 };
                @group(0) @binding(0) var<storage, read> Q: array<f32>;
                @group(0) @binding(1) var<storage, read> K: array<f32>;
                @group(0) @binding(2) var<storage, read> V: array<f32>;
                @group(0) @binding(3) var<storage, read_write> Out: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let q_idx = id.y; 
                    let head_idx = id.z;
                    let embed_dim = p.head_dim * p.num_heads;
                    
                    if (q_idx >= u32(p.seq_len)) { return; }

                    var scores: array<f32, 128>; 
                    var max_score = -1e32;

                    for (var k_idx = 0u; k_idx < u32(p.seq_len); k_idx++) {
                        if (k_idx > q_idx) { 
                            scores[k_idx] = -1e32; 
                        } else {
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
                    let row = id.x;
                    let N = arrayLength(&gamma);
                    let row_offset = row * N;
                    if (row_offset >= arrayLength(&A)) { return; }

                    var mean = 0.0;
                    for (var i = 0u; i < N; i++) { mean += A[row_offset + i]; }
                    mean /= f32(N);

                    var variance = 0.0;
                    for (var i = 0u; i < N; i++) {
                        let diff = A[row_offset + i] - mean;
                        variance += diff * diff;
                    }
                    variance /= f32(N);
                    let invStd = 1.0 / sqrt(variance + 1e-5);

                    for (var i = 0u; i < N; i++) {
                        C[row_offset + i] = (A[row_offset + i] - mean) * invStd * gamma[i] + beta[i];
                    }
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
        return kernels[op] || kernels.gelu;
    }

    async _dispatch(shader, encoder, inputs, output, uniform, shape, params) {
        const pipeline = await this._getOrCreatePipeline(shader);
        const entries = inputs.map((buf, i) => ({ binding: i, resource: { buffer: buf } }));
        entries.push({ binding: inputs.length, resource: { buffer: output } });
        if (uniform) entries.push({ binding: inputs.length + 1, resource: { buffer: uniform } });

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);

        if (shader.includes('attention_core')) {
            pass.dispatchWorkgroups(1, shape[0], params.numHeads || 1);
        } else {
            pass.dispatchWorkgroups(Math.ceil(this._calculateSize(shape) / 64));
        }
        pass.end();
    }

    _createUniformBuffer(shape, params) {
        if (!params) return null;
        const data = new Float32Array([
            shape[0], // seq_len
            params.headDim || 0,
            params.numHeads || 0,
            params.scale || 1.0
        ]);
        const buffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
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
        
        // فحص النتيجة النهائية قبل إرجاعها للـ Runner
        const hasSignal = res.some(v => v !== 0);
        if (!hasSignal) {
            console.error("%c[CRITICAL] GPU returned a Zero-Filled Array!", "background: #ff0000; color: #fff; padding: 5px;");
        } else {
            console.log("%c[SUCCESS] GPU Result contains non-zero data.", "color: #00ff41;");
        }
        
        return res;
    }

    async _getOrCreatePipeline(code) {
        if (this.pipelineCache.has(code)) return this.pipelineCache.get(code);
        const module = this.device.createShaderModule({ code });
        const info = await module.getCompilationInfo();
        if (info.messages.some(m => m.type === 'error')) {
            console.error("[WGSL ERROR]", info.messages);
        }
        const pipeline = this.device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });
        this.pipelineCache.set(code, pipeline);
        return pipeline;
    }

    _calculateSize(shape) { return shape.reduce((a, b) => a * b, 1); }
}
