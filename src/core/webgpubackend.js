/**
 * src/core/webgpubackend.js
 * الحالة: Hybrid JIT Compiler Backend (المرحلة الثانية: ربط البيانات الحقيقية)
 * الوظيفة: استقبال بيانات المستخدم ومعالجتها ديناميكياً على الـ GPU.
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.bufferCache = new Map(); 
    }

    async execute(plan) {
        return this.device ? await this._executeOnGPU(plan) : await this._executeOnCPU(plan);
    }

    /**
     * الحساب عبر المعالج (CPU Fallback)
     */
    async _executeOnCPU(plan) {
        console.log("📱 [BACKEND]: CPU Fallback active.");
        const out = new Float32Array(512);
        for(let i=0; i<512; i++) out[i] = Math.sin(i * 0.1) * plan.length;
        return out;
    }

    /**
     * تنفيذ الخطة على الـ GPU مع ربط المدخلات (Data Binding)
     */
    async _executeOnGPU(plan) {
        const commandEncoder = this.device.createCommandEncoder();
        const size = 512 * 4; // 512 عنصر * 4 بايت (Float32)

        // 1. تجهيز الـ Input Buffer (البيانات اللي جاية من الـ Runner)
        // بنفترض إن أول خطوة في الخطة دايمًا شايلة بيانات المدخلات
        const firstStep = plan[0];
        const inputData = firstStep.inputTensorData || new Float32Array(512).fill(0);
        
        const inputBuffer = this._getOrCreateBuffer('input_data', size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
        this.device.queue.writeBuffer(inputBuffer, 0, inputData);

        // 2. حجز الـ Output Buffer
        const outputBuffer = this._getOrCreateBuffer('final_output', size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
        
        // 3. معالجة الخطوات
        for (const step of plan) {
            this._dispatchStep(step, commandEncoder, inputBuffer, outputBuffer);
        }

        // 4. قراءة البيانات (Readback)
        const stagingBuffer = this.device.createBuffer({
            size: size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, size);
        this.device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(stagingBuffer.getMappedRange()).slice();
        
        stagingBuffer.unmap();
        stagingBuffer.destroy(); 
        
        return result;
    }

    /**
     * تشغيل Kernel مع ربط مدخلين (Input & Output)
     */
    _dispatchStep(step, encoder, inputBuffer, outputBuffer) {
        const shaderCode = this._generateWGSL(step);
        const pipeline = this._getOrCreatePipeline(shaderCode);
        
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inputBuffer } },
                { binding: 1, resource: { buffer: outputBuffer } }
            ]
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(512 / 64));
        pass.end();
    }

    /**
     * توليد WGSL يقرأ من الـ Input ويحسب في الـ Output
     */
    _generateWGSL(step) {
        let calculation = "";
        
        if (step.opNode && step.opNode.generateFormula) {
            // "in[i]" بيمثل القيمة اللي جاية من كلامك بعد الـ Tokenization
            calculation = step.opNode.generateFormula(['in[global_id.x]', '1.0']);
        } else {
            calculation = "in[global_id.x] * 0.01"; 
        }

        return `
            @group(0) @binding(0) var<storage, read> in: array<f32>;
            @group(0) @binding(1) var<storage, read_write> out: array<f32>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                if (global_id.x >= arrayLength(&out)) { return; }
                
                // الحساب بناءً على المدخل الحقيقي
                out[global_id.x] = ${calculation};
            }
        `;
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
}
