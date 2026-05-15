/**
 * src/core/webgpubackend.js
 * الحالة: محرك الـ Graph الشامل (Dynamic Execution)
 * الوظيفة: تنفيذ الخطة بناءً على ربط الـ IDs الفعلي.
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.tensorBuffers = new Map(); // مخزن لكل Tensor ID على الـ GPU
    }

    async execute(plan) {
        if (!this.device) return new Float32Array(512).fill(0);

        const commandEncoder = this.device.createCommandEncoder();

        for (const step of plan) {
            // 1. تحضير Buffer لكل نود في الخطة إذا لم يوجد
            const outputSize = this._calculateSize(step.shape);
            const outBuffer = this._getOrCreateBuffer(step.id, outputSize);

            // 2. إذا كانت العملية 'const' (أوزان)، نرفعها للـ GPU فوراً
            if (step.op === 'const' && step.data) {
                this.device.queue.writeBuffer(outBuffer, 0, step.data);
                continue;
            }

            // 3. إذا كانت عملية حسابية (matmul, add, relu)
            if (step.inputIds && step.inputIds.length > 0) {
                const shaderCode = this._getShader(step.op);
                const inputBuffers = step.inputIds.map(id => this.tensorBuffers.get(id));
                
                // التأكد أن كل المدخلات موجودة في ذاكرة الـ GPU
                if (inputBuffers.every(buf => buf !== undefined)) {
                    this._dispatch(shaderCode, commandEncoder, inputBuffers, outBuffer, step.shape);
                }
            }
        }

        // 4. استخراج النتيجة النهائية (آخر Tensor في الخطة)
        const lastStep = plan[plan.length - 1];
        return await this._readBuffer(commandEncoder, this.tensorBuffers.get(lastStep.id), 512);
    }

    _getShader(op) {
        const kernels = {
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
            `,
            matmul: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.y; let col = id.x;
                    // ضرب مصفوفات مبسط لـ [1xN] * [NxM]
                    var sum = 0.0;
                    for (var k = 0u; k < 512u; k++) {
                        sum += A[k] * B[k * 512u + col];
                    }
                    C[col] = sum;
                }
            `
        };
        return kernels[op] || kernels.add;
    }

    _dispatch(shader, encoder, inputs, output, shape) {
        const pipeline = this._getOrCreatePipeline(shader);
        const entries = inputs.map((buf, i) => ({ binding: i, resource: { buffer: buf } }));
        entries.push({ binding: inputs.length, resource: { buffer: output } });

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: entries
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(this._calculateSize(shape) / 64));
        pass.end();
    }

    _getOrCreateBuffer(id, size) {
        if (this.tensorBuffers.has(id)) return this.tensorBuffers.get(id);
        const buffer = this.device.createBuffer({
            size: Math.max(size * 4, 16), // minimum 16 bytes
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.tensorBuffers.set(id, buffer);
        return buffer;
    }

    _calculateSize(shape) {
        return shape.reduce((a, b) => a * b, 1);
    }

    async _readBuffer(encoder, gpuBuffer, elements) {
        const size = elements * 4;
        const staging = this.device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        encoder.copyBufferToBuffer(gpuBuffer, 0, staging, 0, size);
        this.device.queue.submit([encoder.finish()]);
        await staging.mapAsync(GPUMapMode.READ);
        const res = new Float32Array(staging.getMappedRange().slice(0));
        staging.unmap();
        return res;
    }

    _getOrCreatePipeline(code) {
        if (this.pipelineCache.has(code)) return this.pipelineCache.get(code);
        const module = this.device.createShaderModule({ code });
        const pipeline = this.device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });
        this.pipelineCache.set(code, pipeline);
        return pipeline;
    }
}
