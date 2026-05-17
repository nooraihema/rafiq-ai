// src/core/akashaHybridRunner.js
import { AkashaShaders } from './akashaSuperKernel.js';

export class AkashaHybridRunner {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
    }

    // دالة المعالجة على الـ GPU مع نظام الاستشعار عن بعد
    async computeOnGPU(matrixA, matrixB, M, K, N) {
        const commandEncoder = this.device.createCommandEncoder();
        
        // 1. حجز الـ Buffers بمحاذاة 16 بايت (التوافق العالمي للأجهزة)
        const sizeA = Math.ceil((M * K * 4) / 16) * 16;
        const sizeB = Math.ceil((K * N * 4) / 16) * 16;
        const sizeOut = Math.ceil((M * N * 4) / 16) * 16;

        const gpuBufferA = this.device.createBuffer({ size: sizeA, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        const gpuBufferB = this.device.createBuffer({ size: sizeB, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        const gpuBufferOut = this.device.createBuffer({ size: sizeOut, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });

        // كتابة البيانات
        this.device.queue.writeBuffer(gpuBufferA, 0, matrixA);
        this.device.queue.writeBuffer(gpuBufferB, 0, matrixB);

        // إعداد اليونيفورم (الأبعاد)
        const uniformData = new Uint32Array([M, K, N, 1]); // 1 هي الـ alpha الافتراضية
        const gpuUniform = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(gpuUniform, 0, uniformData);

        // بناء الـ Pipeline الحمي من الـ Cache لسرعة خارقة
        let pipeline = this.pipelineCache.get('matmul');
        if (!pipeline) {
            const shaderModule = this.device.createShaderModule({ code: AkashaShaders.matmul_secure });
            pipeline = this.device.createComputePipeline({
                layout: 'auto',
                compute: { module: shaderModule, entryPoint: 'main' }
            });
            this.pipelineCache.set('matmul', pipeline);
        }

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: gpuBufferA } },
                { binding: 1, resource: { buffer: gpuBufferB } },
                { binding: 2, resource: { buffer: gpuBufferOut } },
                { binding: 3, resource: { buffer: gpuUniform } }
            ]
        });

        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(M / 16), Math.ceil(N / 16));
        pass.end();

        // بفر القراءة العكسية المؤمن
        const gpuReadBuffer = this.device.createBuffer({ size: sizeOut, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        commandEncoder.copyBufferToBuffer(gpuBufferOut, 0, gpuReadBuffer, 0, sizeOut);

        this.device.queue.submit([commandEncoder.finish()]);

        // القراءة والتحقق من النبض الحرج
        await gpuReadBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = gpuReadBuffer.getMappedRange();
        const outputResult = new Float32Array(arrayBuffer.slice(0));
        gpuReadBuffer.unmap();

        // 🚨 استشعار الـ DEAD_EMPTY_BUFFER: لو كارت الشاشة طلع أصفار كاملة أو تهنيج
        let isDead = true;
        for(let i = 0; i < Math.min(outputResult.length, 50); i++) {
            if(outputResult[i] !== 0) { isDead = false; break; }
        }

        if (isDead) {
            console.warn("🔮 [أكاشا - نظام الإنقاذ الطارئ]: كارت الشاشة أصيب بالصمت! تفعيل الارتداد للـ CPU فوراً...");
            return this.computeOnCPU(matrixA, matrixB, M, K, N);
        }

        return outputResult;
    }

    // المفرمة الاحتياطية على الـ CPU في حال انهيار الـ VRAM
    computeOnCPU(A, B, M, K, N) {
        const out = new Float32Array(M * N);
        for (let i = 0; i < M; i++) {
            for (let j = 0; j < N; j++) {
                let sum = 0;
                for (let k = 0; k < K; k++) {
                    sum += A[i * K + k] * B[k * N + j];
                }
                out[i * N + j] = sum;
            }
        }
        return out;
    }
}
