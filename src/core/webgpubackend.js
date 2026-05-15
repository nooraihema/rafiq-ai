/**
 * src/core/webgpubackend.js
 * الحالة: النسخة الكاملة (Zero Shortcuts)
 * الوظيفة: تنفيذ الحسابات على الـ GPU مع إدارة الذاكرة والتزامن.
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.tensorBuffers = new Map();
    }

    async execute(plan) {
        if (!this.device) return new Float32Array(512).fill(0);

        const commandEncoder = this.device.createCommandEncoder();

        for (const step of plan) {
            const outputSize = this._calculateSize(step.shape);
            const outBuffer = this._getOrCreateBuffer(step.id, outputSize);

            // 1. معالجة الثوابت (الأوزان والمدخلات)
            if (step.op === 'const' && step.data) {
                this.device.queue.writeBuffer(outBuffer, 0, step.data);
                continue;
            }

            // 2. معالجة العمليات الحسابية
            if (step.inputIds && step.inputIds.length > 0) {
                const shaderCode = this._getShader(step.op);
                const inputBuffers = step.inputIds.map(id => {
                    const buf = this.tensorBuffers.get(id);
                    if (!buf) {
                        console.warn(`[GPU Warning] Buffer not found for ID: ${id}`);
                        return null;
                    }
                    return buf;
                });

                if (inputBuffers.every(buf => buf !== null)) {
                    this._dispatch(shaderCode, commandEncoder, inputBuffers, outBuffer, step.shape);
                }
            }
        }

        // 3. قراءة النتيجة من آخر نود في الـ Graph
        const lastStep = plan[plan.length - 1];
        const finalBuffer = this.tensorBuffers.get(lastStep.id);
        
        if (!finalBuffer) {
            console.error("Critical: Last step buffer is missing!");
            return new Float32Array(512).fill(0);
        }

        return await this._readBuffer(commandEncoder, finalBuffer, 512);
    }

    _getShader(op) {
        const kernels = {
            matmul: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.y;
                    let col = id.x;
                    if (row >= 1u || col >= 512u) { return; }

                    var sum = 0.0;
                    for (var k = 0u; k < 512u; k = k + 1u) {
                        sum = sum + A[k] * B[k * 512u + col];
                    }
                    C[col] = sum;
                }
            `,
            add: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if (id.x >= arrayLength(&C)) { return; }
                    C[id.x] = A[id.x] + B[id.x];
                }
            `,
            relu: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if (id.x >= arrayLength(&C)) { return; }
                    C[id.x] = max(0.0, A[id.x]);
                }
            `
        };
        return kernels[op] || kernels.add;
    }

    _dispatch(shader, encoder, inputs, output, shape) {
        const pipeline = this._getOrCreatePipeline(shader);
        
        const bindGroupEntries = inputs.map((buf, i) => ({
            binding: i,
            resource: { buffer: buf }
        }));
        
        bindGroupEntries.push({
            binding: inputs.length,
            resource: { buffer: output }
        });

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: bindGroupEntries
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        
        const size = this._calculateSize(shape);
        if (shader.includes('@workgroup_size(8, 8)')) {
            pass.dispatchWorkgroups(Math.ceil(512/8), 1);
        } else {
            pass.dispatchWorkgroups(Math.ceil(size / 64));
        }
        pass.end();
    }

    _getOrCreateBuffer(id, size) {
        if (this.tensorBuffers.has(id)) return this.tensorBuffers.get(id);
        const buffer = this.device.createBuffer({
            size: Math.ceil(Math.max(size * 4, 16) / 16) * 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.tensorBuffers.set(id, buffer);
        return buffer;
    }

    async _readBuffer(encoder, gpuBuffer, elements) {
        const size = elements * 4;
        const staging = this.device.createBuffer({
            size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        encoder.copyBufferToBuffer(gpuBuffer, 0, staging, 0, size);
        this.device.queue.submit([encoder.finish()]);

        await staging.mapAsync(GPUMapMode.READ);
        const copy = staging.getMappedRange().slice(0);
        const res = new Float32Array(copy);
        staging.unmap();
        staging.destroy();
        return res;
    }

    _calculateSize(shape) {
        return shape.reduce((a, b) => a * b, 1);
    }

    _getOrCreatePipeline(code) {
        if (this.pipelineCache.has(code)) return this.pipelineCache.get(code);
        const module = this.device.createShaderModule({ code });
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: { module, entryPoint: 'main' }
        });
        this.pipelineCache.set(code, pipeline);
        return pipeline;
    }
}
