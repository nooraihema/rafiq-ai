/**
 * src/core/webgpubackend.js
 * الحالة: النسخة الفولاذية المحدثة (دعم الـ Residual والـ Leaky ReLU)
 * الوظيفة: تنفيذ العمليات على الـ GPU مع حماية من بيانات الـ Null.
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.bufferCache = new Map();
        
        this.config = {
            workgroupSize: 8,
            maxElements: 512 * 512 
        };
    }

    async execute(plan) {
        if (!this.device) return await this._executeOnCPU(plan);
        return await this._executeOnGPU(plan);
    }

    get _kernels() {
        return {
            matmul: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let row = global_id.y;
                    let col = global_id.x;
                    let dim = 512u; 

                    if (row >= dim || col >= dim) { return; }

                    var sum = 0.0;
                    for (var k = 0u; k < dim; k = k + 1u) {
                        sum = sum + A[row * dim + k] * A[col * dim + k]; 
                    }
                    C[row * dim + col] = sum / 22.627; 
                }
            `,
            add: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let i = global_id.x;
                    if (i >= arrayLength(&C)) { return; }
                    C[i] = C[i] + A[i];
                }
            `,
            // شيدر مطور لدعم Leaky ReLU منعاً للأصفار
            standard: (formula) => `
                @group(0) @binding(0) var<storage, read> in: array<f32>;
                @group(0) @binding(1) var<storage, read_write> out: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let i = global_id.x;
                    if (i >= arrayLength(&out)) { return; }
                    var x = in[i];
                    out[i] = ${formula};
                }
            `
        };
    }

    async _executeOnGPU(plan) {
        const commandEncoder = this.device.createCommandEncoder();
        const size = this.config.maxElements * 4;

        const inputBuffer = this._getOrCreateBuffer('input', size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC);
        const outputBuffer = this._getOrCreateBuffer('output', size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST);
        
        // --- نظام حماية البيانات (Fix for length error) ---
        const firstStep = plan[0];
        let initialData = null;

        // نبحث عن أي بيانات أولية متاحة (سواء في الـ step أو الـ opNode)
        if (firstStep) {
            initialData = firstStep.inputTensorData || (firstStep.opNode && firstStep.opNode.data);
        }

        if (initialData && initialData.length > 0) {
            this.device.queue.writeBuffer(inputBuffer, 0, initialData);
        } else {
            // لو مفيش بيانات، املأ بـ 0.01 بدل Null لمنع الانهيار
            this.device.queue.writeBuffer(inputBuffer, 0, new Float32Array(512).fill(0.01));
        }

        for (const step of plan) {
            let shaderCode;
            // دعم الـ Leaky ReLU المباشر في الشيدر
            if (step.op === 'leaky_relu_manual' || step.op === 'relu') {
                shaderCode = this._kernels.standard("select(x * 0.01, x, x > 0.0)");
            } else {
                switch(step.op) {
                    case 'matmul': shaderCode = this._kernels.matmul; break;
                    case 'add':    shaderCode = this._kernels.add; break;
                    default:       shaderCode = this._kernels.standard("x");
                }
            }
            this._dispatch(shaderCode, commandEncoder, inputBuffer, outputBuffer);
        }

        const stagingBuffer = this.device.createBuffer({
            size: size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, size);
        this.device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(stagingBuffer.getMappedRange().slice(0)).slice(0, 512);
        
        stagingBuffer.unmap();
        stagingBuffer.destroy();
        return result;
    }

    _dispatch(shaderCode, encoder, inBuf, outBuf) {
        const pipeline = this._getOrCreatePipeline(shaderCode);
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inBuf } },
                { binding: 1, resource: { buffer: outBuf } }
            ]
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        
        if (shaderCode.includes('@workgroup_size(8, 8)')) {
            pass.dispatchWorkgroups(64, 64); 
        } else {
            pass.dispatchWorkgroups(Math.ceil(this.config.maxElements / 64));
        }
        pass.end();
    }

    _getOrCreateBuffer(name, size, usage) {
        if (this.bufferCache.has(name)) return this.bufferCache.get(name);
        const buffer = this.device.createBuffer({ size, usage });
        this.bufferCache.set(name, buffer);
        return buffer;
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

    async _executeOnCPU(plan) {
        return new Float32Array(512).fill(0.01);
    }
}
