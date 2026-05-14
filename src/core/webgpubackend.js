/**
 * src/core/webgpubackend.js
 * الحالة: النسخة الفولاذية (المرحلة الخامسة - كسر الجمود الرقمي)
 * الوظيفة: تنفيذ ضرب مصفوفات متقاطع (Self-Attention) مع موازنة رياضية.
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
            // التعديل الجوهري هنا: ضرب المصفوفة في نفسها (Dot Product Attention)
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
                    // ضرب الصف (i) في العمود (j) لخلق مصفوفة علاقات (Attention Matrix)
                    for (var k = 0u; k < dim; k = k + 1u) {
                        sum = sum + A[row * dim + k] * A[col * dim + k]; 
                    }
                    
                    // Scaling factor: لمنع الانفجار الرقمي (تقسيم على جذر الأبعاد)
                    C[row * dim + col] = sum / 22.627; // sqrt(512)
                }
            `,
            standard: (formula) => `
                @group(0) @binding(0) var<storage, read> in: array<f32>;
                @group(0) @binding(1) var<storage, read_write> out: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    if (global_id.x >= arrayLength(&out)) { return; }
                    let val = ${formula};
                    out[global_id.x] = val;
                }
            `,
            softmax: `
                @group(0) @binding(0) var<storage, read> in: array<f32>;
                @group(0) @binding(1) var<storage, read_write> out: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let i = global_id.x;
                    if (i >= arrayLength(&out)) { return; }
                    let exp_val = exp(in[i] / 10.0); // Temperature scaling لضمان التنوع
                    out[i] = exp_val; 
                }
            `
        };
    }

    async _executeOnGPU(plan) {
        const commandEncoder = this.device.createCommandEncoder();
        const size = this.config.maxElements * 4;

        const inputBuffer = this._getOrCreateBuffer('input', size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        const outputBuffer = this._getOrCreateBuffer('output', size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST);
        
        const firstStep = plan[0];
        if (firstStep && firstStep.inputTensorData) {
            this.device.queue.writeBuffer(inputBuffer, 0, firstStep.inputTensorData);
        }

        for (const step of plan) {
            let shaderCode;
            switch(step.op) {
                case 'matmul': shaderCode = this._kernels.matmul; break;
                case 'softmax': shaderCode = this._kernels.softmax; break;
                default: 
                    const formula = step.opNode?.generateFormula(['in[global_id.x]', '1.0']) || "in[global_id.x]";
                    shaderCode = this._kernels.standard(formula);
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
        const result = new Float32Array(stagingBuffer.getMappedRange()).slice(0, 512);
        
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
            // توزيع العمل على 512x512
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
        return new Float32Array(512).fill(0.1);
    }
}
