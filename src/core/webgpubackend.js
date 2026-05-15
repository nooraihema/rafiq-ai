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
        console.log("%c[Akasha GPU] Hyper-Engine Armed & Ready with Radiology Scanners", "color: #00ff41; font-weight: bold;");
    }

    async execute(plan) {
        console.log("☢️ [BACKEND RADIOLOGY] إطلاق فحص النبضة الحية.. عدد خطوات الخطة التنفيذية الحين:", plan.length);
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

            // 🛡️ تأمين وتطهير الـ op المتوقع في حال وصوله كـ Object من الـ Graph
            let currentOp = step.op;
            if (typeof currentOp === 'object' && currentOp !== null) {
                currentOp = currentOp.op || currentOp.type || currentOp.name || 'add';
            }

            // صمام أمان مطور لتحويل التسمية التبادلية لـ layernorm
            if (currentOp === 'layernorm') currentOp = 'layer_norm';

            console.log(`🔍 [SCAN step #${s+1}] فحص العقدة: ${step.id} | العملية: ${currentOp} | الأبعاد المتوقعة: [${step.shape}] | الحجم الحسابي: ${outputSize}`);

            // 🔥 [صمام أمان إبراهيم شحات للثوابت] الحماية المطلقة لعقد الـ const والـ input لمنع البحث عن شيدر وهمي
            if (currentOp === 'const' || currentOp === 'input' || step.type === 'const') {
                console.log(`📦 [CONST DETECTED] العقدة ${step.id} معالجة كـ ثابت سيادي عالي الأهمية.`);
                
                const rawData = step.data || step.value || (step.inputs && step.inputs[0] && step.inputs[0].data);
                
                if (rawData) {
                    const data = rawData instanceof Float32Array ? rawData : new Float32Array(rawData);
                    const hasSignal = data.some(v => v !== 0 && !isNaN(v));
                    
                    if (!hasSignal) {
                        console.warn(`⚠️ [RADIOLOGY WARNING] البفر الثابت ${step.id} ميت تماماً (أصفار أو NaN فقط!).`);
                    } else {
                        console.log(`✅ [RADIOLOGY SIGNAL] البفر الثابت ${step.id} مشحون بداتا حية حقيقية! أول 3 قيم:`, data.slice(0, 3));
                    }
                    
                    this.device.queue.writeBuffer(outBuffer, 0, data);
                } else {
                    console.warn(`⚠️ [RADIOLOGY ALERT] العقدة الثابتة ${step.id} لا تملك داتا مباشرة، تم تجهيز بفر صفري لها لمنع الانهيار.`);
                }
                
                console.log(`[EXEC] Step: ${step.id} | Type: ${currentOp} | تم الشحن والتخطي بنجاح.`);
                continue; 
            }

            // تجميع بفرات المدخلات مع طباعة تقرير إشعاعي عن حالتها الحالية
            const inputBuffers = (step.inputIds || []).map(id => {
                const b = this.tensorBuffers.get(id);
                if (!b) {
                    console.error(`[CRITICAL ERROR] Missing Buffer: ${id} for Op: ${currentOp}`);
                    throw new Error(`Missing Buffer: ${id} for Op: ${currentOp}`);
                }
                return b;
            });

            console.log(`🔗 [BUFFER LINK] العقدة ${step.id} نجحت في ربط عدد (${inputBuffers.length}) بفرات مدخلة.`);

            // استدعاء الشيدر وبناء الـ Uniform بناءً على الـ Op النقي الصريح الحين
            const shaderCode = this._getShader(currentOp);
            const uniformBuffer = this._createUniformBuffer(currentOp, step.shape, step.params);
            
            console.log(`🚀 [GPU DISPATCHING] جاري شحن وتفجير العملية [${currentOp}] على كارت الشاشة للعقدة: ${step.id}`);
            
            await this._dispatch(shaderCode, commandEncoder, inputBuffers, outBuffer, uniformBuffer, step.shape, step.params);
        }

        const lastStep = plan[plan.length - 1];
        if (!lastStep) {
            console.error("[CRITICAL ERROR] Execution plan is empty!");
            return new Float32Array(0);
        }
        
        const finalBuffer = this.tensorBuffers.get(lastStep.id);
        const finalSize = this._calculateSize(lastStep.shape);

        console.log(`📡 [READBACK STAGE] جاري سحب المخرج النهائي من كارت الشاشة للعقدة: ${lastStep.id} | الأبعاد: [${lastStep.shape}] | الحجم الكلي: ${finalSize}`);
        const result = await this._readBuffer(commandEncoder, finalBuffer, finalSize);
        
        // الفحص الإشعاعي النهائي الصارم لمنع تسرب الـ NaN أو الأصفار الميتة
        let nanCount = 0;
        let zeroCount = 0;
        for (let i = 0; i < result.length; i++) {
            if (isNaN(result[i])) nanCount++;
            if (result[i] === 0) zeroCount++;
        }

        if (nanCount > 0) {
            console.error(`%c[CRITICAL] ☣️ الكارثة الملعونة تضرب الحين! تم كشف عدد (${nanCount}) قيم NaN جوه المخرجات النهائية!`, "background: #ff00ff; color: white; padding: 10px; font-weight: bold;");
            console.log("🔬 [RADIOLOGY TRACE] عينة من المخرجات الملوثة بالـ NaN:", result.slice(0, 10));
        } else if (zeroCount === result.length) {
            console.error("%c[CRITICAL] 💀 GPU returned ZERO-FILLED output! الـ GPU مطلع أصفار كاملة! الإشارة ماتت في الطريق!", "background: #ff0000; color: white; padding: 8px;");
            console.log("🔬 [RADIOLOGY TRACE] أول 10 عناصر من المخرج الميت إكلينيكياً:", result.slice(0, 10));
        } else {
            console.log("%c[SUCCESS] 🎉 GPU SIGNAL ALIVE! الإشارة حية وعملاقة بنسبة نقاء 100% وكارت الشاشة يتحدث الحين الفصحى!", "background: #00ff41; color: black; padding: 8px; font-weight: bold;");
            console.log("🔬 [RADIOLOGY TRACE] عينة من الداتا الحية الحقيقية والمشحونة إشعاعياً الحين:", result.slice(0, 10));
        }
        
        return result;
    }

    _getShader(op) {
        if (typeof op === 'object' && op !== null) {
            op = op.op || op.type || op.name || 'add'; 
        }

        if (op === 'layernorm' || op === 'layer_norm') op = 'layer_norm';
        if (op === 'fused') op = 'matmul_add';

        const kernels = {
            embedding_lookup: `
                struct EmbeddingParams { seq_len: u32, embed_dim: u32, vocab_size: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> input_ids: array<f32>;
                @group(0) @binding(1) var<storage, read> weights: array<f32>;
                @group(0) @binding(2) var<storage, read_write> output: array<f32>;
                @group(0) @binding(3) var<uniform> p: EmbeddingParams;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= p.seq_len) { return; }
                    
                    let token_id = u32(round(input_ids[idx]));
                    if (token_id >= p.vocab_size) { return; }
                    
                    let start = token_id * p.embed_dim;
                    let out_start = idx * p.embed_dim;
                    
                    for (var i = 0u; i < p.embed_dim; i++) {
                        if ((start + i) < arrayLength(&weights) && (out_start + i) < arrayLength(&output)) {
                            output[out_start + i] = weights[start + i];
                        }
                    }
                }
            `,

            mul_scalar: `
                struct MulParams { size: u32, pad0: u32, pad1: u32, pad2: u32, factor: f32 };
                @group(0) @binding(0) var<storage, read> input: array<f32>;
                @group(0) @binding(1) var<storage, read_write> output: array<f32>;
                @group(0) @binding(2) var<uniform> p: MulParams;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= p.size) { return; }
                    output[idx] = input[idx] * p.factor;
                }
            `,

            add_pos_encoding: `
                struct PosParams { total_size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> embedded: array<f32>;
                @group(0) @binding(1) var<storage, read> pos_encoding: array<f32>;
                @group(0) @binding(2) var<storage, read_write> output: array<f32>;
                @group(0) @binding(3) var<uniform> p: PosParams;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= p.total_size) { return; }
                    output[idx] = embedded[idx] + pos_encoding[idx];
                }
            `,

            matmul: `
                struct MatmulParams { M: u32, N: u32, K: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: MatmulParams;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; 
                    let col = id.y;
                    if (row >= p.M || col >= p.N) { return; }
                    var sum = 0.0;
                    for (var k = 0u; k < p.K; k++) {
                        sum += A[row * p.K + k] * B[k * p.N + col];
                    }
                    C[row * p.N + col] = sum;
                }
            `,

            matmul_add: `
                struct MatmulAddParams { M: u32, N: u32, K: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read> bias: array<f32>;
                @group(0) @binding(3) var<storage, read_write> C: array<f32>;
                @group(0) @binding(4) var<uniform> p: MatmulAddParams;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; 
                    let col = id.y;
                    if (row >= p.M || col >= p.N) { return; }
                    var sum = 0.0;
                    for (var k = 0u; k < p.K; k++) {
                        sum += A[row * p.K + k] * B[k * p.N + col];
                    }
                    C[row * p.N + col] = sum + bias[col];
                }
            `,

            attention_core: `
                struct AttnParams { seq_len: u32, head_dim: u32, num_heads: u32, pad: u32, scale: f32 };
                @group(0) @binding(0) var<storage, read> Q: array<f32>;
                @group(0) @binding(1) var<storage, read> K: array<f32>;
                @group(0) @binding(2) var<storage, read> V: array<f32>;
                @group(0) @binding(3) var<storage, read_write> Out: array<f32>;
                @group(0) @binding(4) var<uniform> p: AttnParams;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let q_idx = id.y; 
                    let head_idx = id.z;
                    let embed_dim = p.head_dim * p.num_heads;
                    if (q_idx >= p.seq_len) { return; }
                    
                    var scores: array<f32, 128>; 
                    var max_score = -1e32;
                    
                    for (var k_idx = 0u; k_idx < p.seq_len; k_idx++) {
                        if (k_idx > q_idx) { 
                            scores[k_idx] = -1e32; 
                        } else {
                            var sum = 0.0;
                            for (var d = 0u; d < p.head_dim; d++) {
                                let q_off = (q_idx * embed_dim) + (head_idx * p.head_dim) + d;
                                let k_off = (k_idx * embed_dim) + (head_idx * p.head_dim) + d;
                                sum += Q[q_off] * K[k_off];
                            }
                            scores[k_idx] = sum * p.scale;
                        }
                        max_score = max(max_score, scores[k_idx]);
                    }
                    
                    var exp_sum = 0.0;
                    for (var i = 0u; i < p.seq_len; i++) {
                        scores[i] = exp(scores[i] - max_score);
                        exp_sum += scores[i];
                    }
                    
                    // 🛡️ صمام أمان التطهير لمنع الـ NaN في الـ Softmax Division
                    if (exp_sum <= 0.0) { exp_sum = 1e-5; }
                    
                    for (var d = 0u; d < p.head_dim; d++) {
                        var res = 0.0;
                        for (var i = 0u; i < p.seq_len; i++) {
                            let v_off = (i * embed_dim) + (head_idx * p.head_dim) + d;
                            res += (scores[i] / exp_sum) * V[v_off];
                        }
                        let out_off = (q_idx * embed_dim) + (head_idx * p.head_dim) + d;
                        Out[out_off] = res;
                    }
                }
            `,

            layer_norm: `
                struct LNParams { size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> gamma: array<f32>;
                @group(0) @binding(2) var<storage, read> beta: array<f32>;
                @group(0) @binding(3) var<storage, read_write> C: array<f32>;
                @group(0) @binding(4) var<uniform> p: LNParams;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x;
                    let N = p.size; // 🛡️ تأمين قراءة طول السطر الحقيقي من الـ Uniform لمنع الـ NaN والـ هيرزة
                    let row_off = row * N;
                    if (row_off >= arrayLength(&A)) { return; }
                    
                    var m = 0.0;
                    for (var i = 0u; i < N; i++) {
                        m += A[row_off + i];
                    }
                    m /= f32(N);
                    
                    var v = 0.0;
                    for (var i = 0u; i < N; i++) {
                        let d = A[row_off + i] - m;
                        v += d * d;
                    }
                    v /= f32(N);
                    
                    let inv = 1.0 / sqrt(v + 1e-5);
                    for (var i = 0u; i < N; i++) {
                        C[row_off + i] = (A[row_off + i] - m) * inv * gamma[i] + beta[i];
                    }
                }
            `,

            gelu: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if (id.x >= arrayLength(&C)) { return; }
                    let x = A[id.x];
                    C[id.x] = 0.5 * x * (1.0 + tanh(0.79788456 * (x + 0.044715 * x * x * x)));
                }
            `,

            softmax: `
                struct SoftmaxParams { size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> input: array<f32>;
                @group(0) @binding(1) var<storage, read_write> output: array<f32>;
                @group(0) @binding(2) var<uniform> p: SoftmaxParams;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= p.size) { return; }
                    
                    var max_val = -1e32;
                    for (var i = 0u; i < p.size; i++) {
                        max_val = max(max_val, input[i]);
                    }
                    
                    var sum = 0.0;
                    for (var i = 0u; i < p.size; i++) {
                        sum += exp(input[i] - max_val);
                    }
                    
                    if (sum <= 0.0) { sum = 1e-5; }
                    output[idx] = exp(input[idx] - max_val) / sum;
                }
            `
        };

        const basicOps = ['add', 'sub', 'mul', 'div', 'relu'];
        if (basicOps.includes(op)) {
            return `
                struct BasicParams { size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: BasicParams;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= p.size) { return; }
                    ${op === 'add' ? 'C[idx] = A[idx] + B[idx];' : ''}
                    ${op === 'sub' ? 'C[idx] = A[idx] - B[idx];' : ''}
                    ${op === 'mul' ? 'C[idx] = A[idx] * B[idx];' : ''}
                    ${op === 'relu' ? 'C[idx] = max(0.0, A[idx]);' : ''}
                    ${op === 'div' ? 'if(B[idx] != 0.0) { C[idx] = A[idx] / B[idx]; } else { C[idx] = 0.0; }' : ''}
                }
            `;
        }

        if (!kernels[op]) {
            console.error(`[SHADER ERROR] Operation '${op}' is not implemented in Backend!`);
            throw new Error(`Missing shader implementation for: ${op}`);
        }
        return kernels[op];
    }

    async _dispatch(shader, encoder, inputs, output, uniform, shape, params) {
        const pipeline = await this._getOrCreatePipeline(shader);
        
        // بناء الـ entries بديناميكية تضمن شحن بفر الـ bias وعزل الـ Uniform في الخانة الصح
        const entries = inputs.map((buf, i) => ({ binding: i, resource: { buffer: buf } }));
        
        // شحن بفر المخرجات بعد بفرات المدخلات مباشرة
        entries.push({ binding: inputs.length, resource: { buffer: output } });
        
        // شحن بفر الـ Uniform في الـ Binding الأخير تماماً ليتوافق مع المعايير
        if (uniform) {
            entries.push({ binding: inputs.length + 1, resource: { buffer: uniform } });
        }

        const bindGroup = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);

        if (shader.includes('attention_core')) {
            pass.dispatchWorkgroups(1, Math.ceil((shape ? shape[0] : 1)/8), params?.numHeads || 1);
        } else if (shader.includes('matmul')) {
            const M = (shape && shape[0]) ? shape[0] : 1;
            const N = params?.N || (shape ? shape[shape.length - 1] : 512) || 512;
            pass.dispatchWorkgroups(Math.ceil(M/8), Math.ceil(N/8));
        } else {
            pass.dispatchWorkgroups(Math.ceil(this._calculateSize(shape) / 64));
        }
        pass.end();
    }

    _createUniformBuffer(op, shape, params) {
        const buffer = this.device.createBuffer({ 
            size: 16, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST 
        });

        const view = new DataView(new ArrayBuffer(16));

        if (op === 'embedding_lookup') {
            view.setUint32(0, (shape && shape[0]) ? shape[0] : 1, true);       
            view.setUint32(4, params?.embedDim || 512, true); 
            view.setUint32(8, params?.vocabSize || 2526, true); 
            view.setUint32(12, 0, true);                  
        } else if (op === 'mul_scalar') {
            view.setUint32(0, this._calculateSize(shape), true); 
            view.setUint32(4, 0, true);
            view.setUint32(8, 0, true);
            view.setFloat32(12, params?.factor || 1.0, true);  
        } else if (op === 'attention_core') {
            view.setUint32(0, (shape && shape[0]) ? shape[0] : 1, true);       
            view.setUint32(4, params?.headDim || 64, true);  
            view.setUint32(8, params?.numHeads || 8, true);  
            view.setFloat32(12, params?.scale || 1.0, true); 
        } else if (op.includes('matmul') || op === 'matmul_add') {
            const M = (shape && shape[0]) ? shape[0] : 1;
            const N = params?.N || (shape ? shape[shape.length - 1] : 512) || 512;
            const K = params?.K || 512;
            view.setUint32(0, M, true);
            view.setUint32(4, N, true);
            view.setUint32(8, K, true);
            view.setUint32(12, 0, true);
        } else if (op === 'layer_norm') {
            // شحن طول السطر النقي (512) جوه الـ Uniform ليتغذى عليه شيدر الـ LayerNorm صراحة
            const N = (shape && shape.length > 0) ? shape[shape.length - 1] : 512;
            view.setUint32(0, N, true);
            view.setUint32(4, 0, true);
            view.setUint32(8, 0, true);
            view.setUint32(12, 0, true);
        } else {
            view.setUint32(0, this._calculateSize(shape), true); 
            view.setUint32(4, 0, true);
            view.setUint32(8, 0, true);
            view.setUint32(12, 0, true);
        }

        this.device.queue.writeBuffer(buffer, 0, view.buffer);
        return buffer;
    }

    _getOrCreateBuffer(id, size) {
        if (this.tensorBuffers.has(id)) return this.tensorBuffers.get(id);
        const buffer = this.device.createBuffer({
            size: Math.ceil(Math.max(size * 4, 64) / 16) * 16,
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
        const res = new Float32Array(staging.getMappedRange().slice(0));
        staging.unmap();
        staging.destroy();
        return res;
    }

    async _getOrCreatePipeline(code) {
        if (this.pipelineCache.has(code)) return this.pipelineCache.get(code);
        const module = this.device.createShaderModule({ code });
        try {
            const pipeline = await this.device.createComputePipelineAsync({ 
                layout: 'auto', 
                compute: { module, entryPoint: 'main' } 
            });
            this.pipelineCache.set(code, pipeline);
            return pipeline;
        } catch (err) {
            console.error("[SHADER COMPILATION ERROR]", err);
            throw err;
        }
    }

    _calculateSize(shape) { 
        if (shape === undefined || shape === null) {
            console.warn("%c[Backend Scan] Warning: Received undefined or null shape in _calculateSize! Defaulting to 1.", "color: #ffb800; font-weight: bold;");
            return 1;
        }
        
        if (typeof shape === 'number') {
            return shape > 0 ? shape : 1;
        }
        
        if (!Array.isArray(shape) || shape.length === 0) {
            return 1;
        }

        return shape.reduce((a, b) => {
            const val = typeof b === 'number' ? b : Number(b);
            if (isNaN(val) || val === 0) return a; 
            return a * val;
        }, 1);
    }
}
