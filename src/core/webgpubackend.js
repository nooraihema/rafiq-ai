/**
 * src/core/webgpubackend.js
 * 
 * الوظيفة: المترجم المباشر لـ WebGPU (The Backend).
 * يأخذ خطة الـ IR المحسنة ويقوم بتوليد شفرات الـ WGSL المناسبة،
 * كما يدير عمليات الـ GPU Buffers والـ Pipeline Execution.
 */

export class WebGPUBackend {
    /**
     * @param {GPUDevice} device - مرجع لكرت الشاشة المتاح في المتصفح
     */
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map(); // لتجنب إعادة بناء الـ Pipelines
        this.bufferCache = new Map();   // لإعادة استخدام الـ Buffers
    }

    /**
     * تنفيذ خطة كاملة (Execution Plan)
     * @param {Array} plan - الناتج من IROptimizer.optimize()
     */
    async execute(plan) {
        const commandEncoder = this.device.createCommandEncoder();

        for (const step of plan) {
            if (step.type === 'fused') {
                await this._runFusedKernel(step, commandEncoder);
            } else {
                await this._runStandaloneKernel(step, commandEncoder);
            }
        }

        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();
    }

    /**
     * توليد وتشغيل Kernel مدمج (Fused)
     */
    async _runFusedKernel(step, commandEncoder) {
        const kernelSource = this._generateWGSL(step);
        const pipeline = this._getOrCreatePipeline(kernelSource);
        
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        
        // ربط البيانات (Bind Groups)
        // ملاحظة: هنا يتم ربط الـ externalInputs والـ finalOutputId بالـ GPU Buffers
        // سيتم ربط منطق الـ Buffer Management هنا في المرحلة القادمة
        
        const workgroupCount = Math.ceil(1024 / 64); // مثال، سيتم حسابه ديناميكياً
        passEncoder.dispatchWorkgroups(workgroupCount);
        passEncoder.end();
    }

    /**
     * محرك توليد كود WGSL ديناميكياً
     * هذا هو السحر الحقيقي؛ الكود يكتب نفسه بناءً على المعادلة!
     */
    _generateWGSL(step) {
        let opsCode = "";
        
        // بناء سلسلة الحسابات داخل الـ Kernel
        step.operations.forEach(op => {
            if (op.scalarOp) {
                // تحويل المنطق من JS إلى WGSL syntax
                // مثال: var t_out = t_in1 + t_in2;
                const formula = op.scalarOp('val1', 'val2'); // تبسيط، سيتم ربط المعرفات بدقة
                opsCode += `  let res_${op.outputId} = ${formula};\n`;
            }
        });

        return `
            @group(0) @binding(0) var<storage, read_write> output: array<f32>;
            @group(0) @binding(1) var<storage, read> input: array<f32>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let i = global_id.x;
                // منطق الحساب المدمج المحسن
                ${opsCode}
                output[i] = res_${step.finalOutputId};
            }
        `;
    }

    _getOrCreatePipeline(source) {
        if (this.pipelineCache.has(source)) return this.pipelineCache.get(source);

        const shaderModule = this.device.createShaderModule({ code: source });
        const pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' }
        });

        this.pipelineCache.set(source, pipeline);
        return pipeline;
    }
}
