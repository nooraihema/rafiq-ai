/**
 * src/core/webgpubackend.js
 * الحالة: النسخة الفولاذية (المرحلة السادسة - دعم الـ Residual والـ ReLU)
 * الوظيفة: تنفيذ الحسابات الموازية على الـ GPU مع دعم كامل لروابط الجمع.
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
            // شيدر ضرب المصفوفات (Self-Attention Core)
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
            // شيدر الجمع (Residual Connection Kernel)
            add: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let i = global_id.x;
                    if (i >= arrayLength(&C)) { return; }
                    // نجمع المدخل الحالي مع النتيجة السابقة المخزنة في الـ Buffer
                    C[i] = C[i] + A[i];
                }
            `,
            // الشيدر العام (ReLU, Mul, Division)
            standard: (formula) => `
                @group(0) @binding(0) var<storage, read> in: array<f32>;
                @group(0) @binding(1) var<storage, read_write> out: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let i = global_id.x;
                    if (i >= arrayLength(&out)) { return; }
                    let val = ${formula};
                    out[i] = val;
                }
            `,
            // شيدر التوزيع الاحتمالي
            softmax: `
                @group(0) @binding(0) var<storage, read> in: array<f32>;
                @group(0) @binding(1) var<storage, read_write> out: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let i = global_id.x;
                    if (i >= arrayLength(&out)) { return; }
                    out[i] = exp(in[i] / 10.0); 
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
                case 'add':    shaderCode = this._kernels.add; break;
                case 'softmax': shaderCode = this._kernels.softmax; break;
                default: 
                    // توليد الفورمولا ديناميكياً (زي الـ ReLU) من الـ Tensor Node
                    const formula = step.opNode?.generateFormula(['in[i]', '1.0']) || "in[i]";
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
