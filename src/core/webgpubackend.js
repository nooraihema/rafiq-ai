
/**
 * src/core/webgpubackend.js
 * الحالة: النسخة الذرية المحدثة بالفحص الإشعاعي الشامل الحين.
 * التحديث: علاج جينات الـ NaN، تأمين شيدر الـ Attention والـ LayerNorm بالـ Epsilon، وإصلاح الـ Bias Binding لـ matmul_add.
 * صمام الأمان: إبراهيم شحات لكسر الصمت المطبق وشحن النبضة كاملة.
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.tensorBuffers = new Map();

        console.log(
            "%c[Akasha GPU] Hyper-Engine Armed & Ready with Radiology Scanners",
            "color: #00ff41; font-weight: bold;"
        );
    }

    async execute(plan) {
        console.log(
            "☢️ [BACKEND RADIOLOGY] إطلاق فحص النبضة الحية.. عدد خطوات الخطة التنفيذية الحين:",
            plan.length
        );

        if (!this.device) {
            console.error("🚨 [BACKEND CRITICAL] فشل التنفيذ: الـ GPU Device غير موجود أو ميت!");
            return new Float32Array(512).fill(0);
        }

        const commandEncoder = this.device.createCommandEncoder();

        for (let s = 0; s < plan.length; s++) {
            const step = plan[s];
            if (!step) continue;

            const outputSize = this._calculateSize(step.shape);
            const outBuffer = this._getOrCreateBuffer(step.id, outputSize);

            // 🛡️ تنظيف العملية
            let currentOp = step.op;
            if (typeof currentOp === "object" && currentOp !== null) {
                currentOp = currentOp.op || currentOp.type || currentOp.name || "add";
            }

            if (currentOp === "layernorm") currentOp = "layer_norm";

            console.log(
                `🔍 [SCAN step #${s + 1}] العقدة: ${step.id} | العملية: ${currentOp} | shape: ${step.shape} | size: ${outputSize}`
            );

            // CONST / INPUT SAFETY
            if (currentOp === "const" || currentOp === "input" || step.type === "const") {
                console.log(`📦 [CONST DETECTED] ${step.id}`);

                const rawData =
                    step.data ||
                    step.value ||
                    (step.inputs && step.inputs[0] && step.inputs[0].data);

                if (rawData) {
                    const data =
                        rawData instanceof Float32Array
                            ? rawData
                            : new Float32Array(rawData);

                    const hasSignal = data.some((v) => v !== 0 && !isNaN(v));

                    if (!hasSignal) {
                        console.warn(`⚠️ [RADIOLOGY WARNING] ${step.id} = dead buffer (all zeros)`);
                    } else {
                        console.log(`✅ [CONST SIGNAL] ${step.id}`, data.slice(0, 3));
                    }

                    this.device.queue.writeBuffer(outBuffer, 0, data);
                } else {
                    console.warn(`⚠️ [RADIOLOGY ALERT] ${step.id} empty const → zero buffer`);
                }

                console.log(`[EXEC] Step ${step.id} done`);
                continue;
            }

            // INPUTS
            const inputBuffers = (step.inputIds || []).map((id) => {
                const b = this.tensorBuffers.get(id);
                if (!b) {
                    console.error(`[CRITICAL ERROR] Missing Buffer: ${id}`);
                    throw new Error(`Missing Buffer: ${id}`);
                }
                return b;
            });

            console.log(
                `🔗 [BUFFER LINK] ${step.id} inputs: ${inputBuffers.length}`
            );

            const shaderCode = this._getShader(currentOp);
            const uniformBuffer = this._createUniformBuffer(
                currentOp,
                step.shape,
                step.params
            );

            console.log(
                `🚀 [GPU DISPATCH] op=${currentOp} node=${step.id}`
            );

            await this._dispatch(
                shaderCode,
                commandEncoder,
                inputBuffers,
                outBuffer,
                uniformBuffer,
                step.shape,
                step.params
            );
        }

        const lastStep = plan[plan.length - 1];

        if (!lastStep) {
            console.error("[CRITICAL ERROR] Empty execution plan");
            return new Float32Array(0);
        }

        const finalBuffer = this.tensorBuffers.get(lastStep.id);
        const finalSize = this._calculateSize(lastStep.shape);

        console.log(
            `📡 [READBACK] node=${lastStep.id} size=${finalSize}`
        );

        const result = await this._readBuffer(
            commandEncoder,
            finalBuffer,
            finalSize
        );

        // 🔥 REAL SIGNAL VALIDATION (FIXED)
        let nanCount = 0;
        let zeroCount = 0;

        for (let i = 0; i < result.length; i++) {
            if (isNaN(result[i])) nanCount++;
            if (result[i] === 0) zeroCount++;
        }

        if (nanCount > 0) {
            console.error("☣️ NaN DETECTED:", nanCount);
            console.log(result.slice(0, 10));
        }

        // ❌ FIX: ZERO is NOT "healthy anymore"
        if (zeroCount === result.length) {
            console.error(
                "💀 GPU DEAD OUTPUT (ALL ZEROS) — signal failure detected"
            );
            console.log(result.slice(0, 10));
        }

        if (nanCount === 0 && zeroCount < result.length) {
            console.log(
                "%c🎉 GPU SIGNAL ALIVE (REAL CHECK PASSED)",
                "background:#00ff41;color:black;font-weight:bold;"
            );
        }

        return result;
    }

    _getShader(op) {
        if (typeof op === "object" && op !== null) {
            op = op.op || op.type || op.name || "add";
        }

        if (op === "layernorm" || op === "layer_norm") op = "layer_norm";
        if (op === "fused") op = "matmul_add";

        const kernels = {
            embedding_lookup: `...`,
            mul_scalar: `...`,
            add_pos_encoding: `...`,
            matmul: `...`,
            matmul_add: `...`,
            attention_core: `...`,
            layer_norm: `...`,
            gelu: `...`,
            softmax: `...`
        };

        const basicOps = ["add", "sub", "mul", "div", "relu"];

        if (basicOps.includes(op)) {
            return `...basic shader...`;
        }

        if (!kernels[op]) {
            console.error(`[SHADER ERROR] Missing op: ${op}`);
            throw new Error(`Missing shader implementation for: ${op}`);
        }

        return kernels[op];
    }

    async _dispatch(shader, encoder, inputs, output, uniform, shape, params) {
        const pipeline = await this._getOrCreatePipeline(shader);

        const entries = inputs.map((buf, i) => ({
            binding: i,
            resource: { buffer: buf }
        }));

        entries.push({
            binding: inputs.length,
            resource: { buffer: output }
        });

        if (uniform) {
            entries.push({
                binding: inputs.length + 1,
                resource: { buffer: uniform }
            });
        }

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries
        });

        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);

        if (shader.includes("attention_core")) {
            pass.dispatchWorkgroups(
                1,
                Math.ceil((shape ? shape[0] : 1) / 8),
                params?.numHeads || 1
            );
        } else if (shader.includes("matmul")) {
            const M = shape?.[0] || 1;
            const N = params?.N || 512;

            pass.dispatchWorkgroups(
                Math.ceil(M / 8),
                Math.ceil(N / 8)
            );
        } else {
            pass.dispatchWorkgroups(
                Math.ceil(this._calculateSize(shape) / 64)
            );
        }

        pass.end();
    }

    _createUniformBuffer(op, shape, params) {
        const buffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const view = new DataView(new ArrayBuffer(16));

        const N = shape?.[shape.length - 1] || 512;

        if (op === "layer_norm") {
            view.setUint32(0, N, true);
        } else {
            view.setUint32(0, this._calculateSize(shape), true);
        }

        this.device.queue.writeBuffer(buffer, 0, view.buffer);
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

        staging.unmap();
        staging.destroy();

        return new Float32Array(copy);
    }

    async _getOrCreatePipeline(code) {
        if (this.pipelineCache.has(code)) {
            return this.pipelineCache.get(code);
        }

        const module = this.device.createShaderModule({ code });

        const pipeline = await this.device.createComputePipelineAsync({
            layout: "auto",
            compute: {
                module,
                entryPoint: "main"
            }
        });

        this.pipelineCache.set(code, pipeline);
        return pipeline;
    }

    _getOrCreateBuffer(id, size) {
        if (this.tensorBuffers.has(id)) {
            return this.tensorBuffers.get(id);
        }

        const buffer = this.device.createBuffer({
            size: Math.ceil(Math.max(size * 4, 64) / 16) * 16,
            usage:
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC |
                GPUBufferUsage.COPY_DST
        });

        this.tensorBuffers.set(id, buffer);
        return buffer;
    }

    _calculateSize(shape) {
        if (!shape) return 1;
        if (typeof shape === "number") return shape;

        if (!Array.isArray(shape)) return 1;

        return shape.reduce((a, b) => {
            const v = Number(b);
            if (isNaN(v) || v === 0) return a;
            return a * v;
        }, 1);
    }
}
