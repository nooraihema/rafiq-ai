/**
 * src/core/webgpubackend.js
 * الحالة: Hybrid JIT Compiler Backend
 * الوظيفة: تحويل الـ Graph لعمليات GPU حقيقية وإدارة الذاكرة بكفاءة.
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.bufferCache = new Map(); // لتجنب إعادة إنشاء الـ Buffers مع كل كليك
    }

    async execute(plan) {
        return this.device ? await this._executeOnGPU(plan) : await this._executeOnCPU(plan);
    }

    /**
     * الحساب عبر المعالج (CPU Fallback)
     */
    async _executeOnCPU(plan) {
        console.log("📱 CPU Processing...");
        // محاكاة سريعة للنتائج بناءً على طول الخطة
        const out = new Float32Array(512);
        for(let i=0; i<512; i++) out[i] = Math.sin(i * 0.1) * plan.length;
        return out;
    }

    /**
     * تنفيذ الخطة على الـ GPU مع إدارة ذكية للذاكرة
     */
    async _executeOnGPU(plan) {
        const commandEncoder = this.device.createCommandEncoder();
        
        // 1. حجز الـ Output Buffer (المكان اللي هنستلم فيه النتيجة النهائية)
        const outputSize = 512 * 4; 
        const outputBuffer = this._getOrCreateBuffer('final_output', outputSize, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
        
        // 2. معالجة كل خطوة في الخطة (قد تكون عملية واحدة أو مجموعة عمليات مدمجة Fused)
        for (const step of plan) {
            this._dispatchStep(step, commandEncoder, outputBuffer);
        }

        // 3. قراءة البيانات (Readback)
        const stagingBuffer = this.device.createBuffer({
            size: outputSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, outputSize);
        this.device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(stagingBuffer.getMappedRange()).slice();
        
        stagingBuffer.unmap();
        stagingBuffer.destroy(); // الـ Staging يمسح فوراً، أما الـ Output يبقى في الكاش
        
        return result;
    }

    /**
     * تشغيل Kernel (عملية) معينة
     */
    _dispatchStep(step, encoder, outputBuffer) {
        const shaderCode = this._generateWGSL(step);
        const pipeline = this._getOrCreatePipeline(shaderCode);
        
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: outputBuffer } }]
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(512 / 64));
        pass.end();
    }

    /**
     * السحر الحقيقي: توليد كود WGSL ديناميكياً من الـ OpNode
     */
    _generateWGSL(step) {
        // إذا كانت عمليات مدمجة (Fusion)، نجمع المعادلات معاً
        let calculation = "";
        
        if (step.op) {
            // هنا بنادي على generateFormula اللي طورناها في OpNode
            // وبنمرر لها i كمتغير (index)
            calculation = step.op.generateFormula(['f32(global_id.x)', '1.0']); 
        } else {
            calculation = "f32(global_id.x) * 0.01"; // Fallback
        }

        return `
            @group(0) @binding(0) var<storage, read_write> out: array<f32>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                if (global_id.x >= arrayLength(&out)) { return; }
                
                // حقن المعادلة الرياضية المولدة ديناميكياً
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
