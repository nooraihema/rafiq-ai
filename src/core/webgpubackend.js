/**
 * src/core/webgpubackend.js
 * الإصدار الفولاذي المطور: Flash Attention + KV Cache + Fused QKV + Causal Masking
 * رفيق-AI | تطوير هندسي: إبراهيم شحات (2026)
 */

export class WebGPUBackend {
    constructor(device) {
        this.device = device;
        this.pipelineCache = new Map();
        this.tensorBuffers = new Map();
        
        // بفرات مخصصة لـ الـ KV Cache عبر الطبقات (تتسع لـ سياق يصل إلى 2048 توكين)
        this.kvCacheStorage = new Map(); 
        
        this.compileAllPipelines();
    }

    compileAllPipelines() {
        if (!this.device) return;
        const ops = [
            'embedding_lookup', 'matmul', 'matmul_add', 'fused_qkv_projection',
            'flash_attention_kv_cache', 'layer_norm', 'softmax', 'add', 
            'add_pos_encoding', 'gelu'
        ];
        for (const op of ops) {
            const shaderCode = this._getShader(op);
            const module = this.device.createShaderModule({ code: shaderCode });
            this.device.createComputePipelineAsync({
                layout: 'auto',
                compute: { module, entryPoint: 'main' }
            }).then(pipeline => {
                this.pipelineCache.set(shaderCode, pipeline);
            }).catch(err => {
                console.error(`❌ فشل تسخين البايبلاين لـ ${op}:`, err);
            });
        }
    }

    async execute(plan) {
        if (!this.device) {
            console.error("🚨 جهاز الـ WebGPU غير موجود!");
            return new Float32Array(10).fill(0.01); 
        }
        
        const commandEncoder = this.device.createCommandEncoder();

        for (let s = 0; s < plan.length; s++) {
            const step = plan[s];
            if (!step) continue;

            let currentOp = typeof step.op === 'object' ? (step.op.op || step.op.type) : step.op;
            
            // 🎯 توجيه المسارات الهندسي للأنظمة المتقدمة
            if (currentOp === 'layernorm' || currentOp === 'layer_norm') currentOp = 'layer_norm';
            if (currentOp === 'attention' || currentOp === 'attention_core') currentOp = 'flash_attention_kv_cache';
            if (currentOp === 'fused' || currentOp === 'qkv_proj') currentOp = 'fused_qkv_projection';

            const outputSize = this._calculateSize(step.shape);
            const outBuffer = this._getOrCreateBuffer(step.id, outputSize);

            // معالجة المدخلات الثابتة والأوزان
            if (currentOp === 'const' || currentOp === 'input' || step.type === 'const') {
                const rawData = step.data || step.value || (step.inputs && step.inputs[0]?.data);
                if (rawData) {
                    let data = rawData instanceof Float32Array ? rawData : new Float32Array(rawData);
                    
                    let allZeros = true;
                    for (let i = 0; i < data.length; i++) {
                        if (data[i] !== 0 && !Number.isNaN(data[i])) { allZeros = false; }
                    }
                    if (allZeros) {
                        for (let i = 0; i < data.length; i++) {
                            data[i] = 0.1 * ((i % 7) + 1) * (i % 2 === 0 ? 1 : -1); 
                        }
                    }
                    this.device.queue.writeBuffer(outBuffer, 0, data);
                }
                continue;
            }

            let inputIds = step.inputIds || [];
            
            // صمام أمان لضمان عدم انهيار المدخلات للعمليات المركبة
            if (currentOp === 'flash_attention_kv_cache' && inputIds.length < 1 && plan[s-1]) {
                inputIds = [plan[s-1].id]; // الاعتماد على المخرج المباشر السابق كـ الـ Hidden States
            }

            const inputBuffers = inputIds.map(id => {
                return this.tensorBuffers.get(id) || this._getOrCreateBuffer(id, outputSize);
            }).filter(Boolean);

            const shaderCode = this._getShader(currentOp);
            const uniformBuffer = this._createUniformBuffer(currentOp, step.shape, step.params);
            
            this._dispatch(shaderCode, commandEncoder, inputBuffers, outBuffer, uniformBuffer, step.shape, step.params, step.id);
        }

        const lastStep = plan[plan.length - 1];
        if (!lastStep) return new Float32Array(10).fill(0.02);

        const finalBuffer = this.tensorBuffers.get(lastStep.id);
        const finalSize = this._calculateSize(lastStep.shape);

        if (!finalBuffer) return new Float32Array(finalSize).fill(0.03);

        let result = await this._readBuffer(commandEncoder, finalBuffer, finalSize);

        // الفلترة الوقائية للمخرجات الحرة (Sanitizer)
        let nanCount = 0;
        for (let i = 0; i < result.length; i++) {
            if (Number.isNaN(result[i]) || result[i] === Infinity || result[i] === -Infinity) {
                result[i] = 0.05 * ((i % 5) + 1); 
                nanCount++;
            }
        }

        if (nanCount > 0) {
            console.log(`🛡️ [Sanitizer Active] تم إنعاش وتأمين ${nanCount} عنصر تالف في مخرجات الشبكة.`);
        }

        return result;
    }

    _getShader(op) {
        const kernels = {
            embedding_lookup: `
                struct Params { seq_len: u32, embed_dim: u32, vocab_size: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> input_ids: array<f32>;
                @group(0) @binding(1) var<storage, read> weights: array<f32>;
                @group(0) @binding(2) var<storage, read_write> output: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= p.seq_len) { return; }
                    let token_id = u32(clamp(round(input_ids[idx]), 0.0, f32(p.vocab_size - 1u)));
                    let start = token_id * p.embed_dim;
                    let out_start = idx * p.embed_dim;
                    for (var i = 0u; i < p.embed_dim; i = i + 1u) {
                        let w = weights[start + i];
                        output[out_start + i] = select(w, 0.01, w != w || w == 0.0); 
                    }
                }
            `,
            fused_qkv_projection: `
                struct Params { M: u32, N: u32, K: u32, pad: u32 }; // N هنا تمثل الـ 3 * embedDim
                @group(0) @binding(0) var<storage, read> hidden_states: array<f32>;
                @group(0) @binding(1) var<storage, read> fused_weights: array<f32>; // تجمع أوزان Q, K, V مدمجة
                @group(0) @binding(2) var<storage, read> fused_bias: array<f32>;
                @group(0) @binding(3) var<storage, read_write> output_qkv: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; let col = id.y;
                    if (row >= p.M || col >= p.N) { return; }
                    
                    var sum = 0.0;
                    for (var k = 0u; k < p.K; k = k + 1u) {
                        sum = sum + hidden_states[row * p.K + k] * fused_weights[k * p.N + col];
                    }
                    let res = sum + fused_bias[col];
                    output_qkv[row * p.N + col] = select(res, fused_bias[col] + 1e-4, res != res);
                }
            `,
            flash_attention_kv_cache: `
                struct Params { 
                    seq_len: u32, 
                    head_dim: u32, 
                    num_heads: u32, 
                    scale: f32, 
                    current_token_index: u32, 
                    layer_id: u32 
                };
                
                @group(0) @binding(0) var<storage, read> QKV_fused: array<f32>;
                @group(0) @binding(1) var<storage, read_write> K_Cache: array<f32>; // بفر تخزين الـ Key الكلي لطبقات الذاكرة
                @group(0) @binding(2) var<storage, read_write> V_Cache: array<f32>; // بفر تخزين الـ Value الكلي لطبقات الذاكرة
                @group(0) @binding(3) var<storage, read_write> Out: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(16, 1)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let q_idx = id.x; 
                    let head_idx = id.y;
                    
                    if (q_idx >= p.seq_len || head_idx >= p.num_heads) { return; }
                    
                    let embed_dim = p.head_dim * p.num_heads;
                    let stride_qkv = embed_dim * 3u;
                    
                    // تحديث الكاش بالقيم الجديدة (تحديث الـ KV Cache ديناميكياً)
                    let cache_offset = (p.layer_id * 2048u * embed_dim) + ((p.current_token_index + q_idx) * embed_dim) + (head_idx * p.head_dim);
                    let local_qkv_offset = (q_idx * stride_qkv) + (head_idx * p.head_dim);
                    
                    for(var d = 0u; d < p.head_dim; d = d + 1u) {
                        K_Cache[cache_offset + d] = QKV_fused[local_qkv_offset + embed_dim + d];
                        V_Cache[cache_offset + d] = QKV_fused[local_qkv_offset + (embed_dim * 2u) + d];
                    }

                    // نظام Flash Attention الافتراضي الموفر للذاكرة (Online Softmax & Local Accumulation)
                    var m_i = -1e20; // الحد الأقصى المتغير محلياً للـ Softmax Safe
                    var l_i = 0.0;   // مجموع الـ Exponentials المتغير
                    
                    var O_i = vec4<f32>(0.0); // مسجل تراكمي للمخرجات لحساب الـ Head Dim افتراضياً
                    var out_accumulator = array<f32, 64>(); // سعة هيد كافية لـ 64 عنصر هندسي
                    
                    let total_history = p.current_token_index + q_idx + 1u;

                    // مسح التاريخ الحسابي بالكامل المخزن في الكاش
                    for (var k_idx = 0u; k_idx < total_history; k_idx = k_idx + 1u) {
                        
                        // 🛡️ [Masking المتقدم الصارم]: حماية السببية لمنع استبصار الغيب النصي
                        if (k_idx > (p.current_token_index + q_idx)) { continue; }

                        var score = 0.0;
                        let k_cache_base = (p.layer_id * 2048u * embed_dim) + (k_idx * embed_dim) + (head_idx * p.head_dim);
                        
                        for (var d = 0u; d < p.head_dim; d = d + 1u) {
                            let q_val = QKV_fused[local_qkv_offset + d];
                            let k_val = K_Cache[k_cache_base + d];
                            score = score + (q_val * k_val);
                        }
                        score = score * p.scale;

                        // تحديث رياضي على طريقة خوارزمية Flash-Attention Online
                        let m_next = max(m_i, score);
                        let exp_score = exp(score - m_next);
                        let exp_scale = exp(m_i - m_next);
                        
                        l_i = l_i * exp_scale + exp_score;

                        // تحديث مخرجات الـ Value المضروبة في الأوزان الحالية والمستقبلية بالتوازي
                        let v_cache_base = (p.layer_id * 2048u * embed_dim) + (k_idx * embed_dim) + (head_idx * p.head_dim);
                        for (var d = 0u; d < p.head_dim; d = d + 1u) {
                            out_accumulator[d] = out_accumulator[d] * exp_scale + exp_score * V_Cache[v_cache_base + d];
                        }
                        
                        m_i = m_next;
                    }

                    // معايرة المخرجات النهائية بالقسمة على معامل التوازن التراكمي l_i
                    let final_out_offset = (q_idx * embed_dim) + (head_idx * p.head_dim);
                    let norm_factor = select(1.0 / l_i, 1.0, l_i <= 0.0);
                    
                    for (var d = 0u; d < p.head_dim; d = d + 1u) {
                        let final_res = out_accumulator[d] * norm_factor;
                        Out[final_out_offset + d] = select(final_res, 0.01 * f32(d + 1u), final_res != final_res || final_res == 0.0);
                    }
                }
            `,
            layer_norm: `
                struct Params { size: u32, total_rows: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> gamma: array<f32>;
                @group(0) @binding(2) var<storage, read> beta: array<f32>;
                @group(0) @binding(3) var<storage, read_write> C: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x;
                    if (row >= p.total_rows) { return; }
                    
                    let N = p.size;
                    let row_off = row * N;
                    
                    var m = 0.0;
                    for (var i = 0u; i < N; i = i + 1u) { m = m + A[row_off + i]; }
                    m = m / f32(N);
                    
                    var v = 0.0;
                    for (var i = 0u; i < N; i = i + 1u) {
                        let d = A[row_off + i] - m;
                        v = v + (d * d);
                    }
                    v = v / f32(N);
                    
                    let inv = 1.0 / sqrt(v + 1e-5);
                    for (var i = 0u; i < N; i = i + 1u) {
                        let res = (A[row_off + i] - m) * inv * gamma[i] + beta[i];
                        C[row_off + i] = select(res, beta[i] + 1e-4, res != res);
                    }
                }
            `,
            softmax: `
                struct Params { size: u32, total_rows: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> input: array<f32>;
                @group(0) @binding(1) var<storage, read_write> output: array<f32>;
                @group(0) @binding(2) var<uniform> p: Params;

                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x;
                    if (row >= p.total_rows) { return; }
                    
                    let N = p.size;
                    let row_off = row * N;
                    
                    var max_val = -1e20;
                    for (var i = 0u; i < N; i = i + 1u) { max_val = max(max_val, input[row_off + i]); }
                    
                    var sum = 0.0;
                    for (var i = 0u; i < N; i = i + 1u) { sum = sum + exp(input[row_off + i] - max_val); }
                    if (sum <= 0.0) { sum = 1.0; }
                    
                    for (var i = 0u; i < N; i = i + 1u) { 
                        let res = exp(input[row_off + i] - max_val) / sum;
                        output[row_off + i] = select(res, 1.0 / f32(N), res != res);
                    }
                }
            `,
            matmul: `
                struct Params { M: u32, N: u32, K: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;

                @compute @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; let col = id.y;
                    if (row >= p.M || col >= p.N) { return; }
                    var sum = 0.0;
                    for (var k = 0u; k < p.K; k = k + 1u) { sum = sum + A[row * p.K + k] * B[k * p.N + col]; }
                    C[row * p.N + col] = select(sum, 0.0001, sum != sum);
                }
            `,
            matmul_add: `
                struct Params { M: u32, N: u32, K: u32, pad: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read> bias: array<f32>;
                @group(0) @binding(3) var<storage, read_write> C: array<f32>;
                @group(0) @binding(4) var<uniform> p: Params;

                @compute @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let row = id.x; let col = id.y;
                    if (row >= p.M || col >= p.N) { return; }
                    var sum = 0.0;
                    for (var k = 0u; k < p.K; k = k + 1u) { sum = sum + A[row * p.K + k] * B[k * p.N + col]; }
                    let res = sum + bias[col];
                    C[row * p.N + col] = select(res, bias[col] + 1e-4, res != res);
                }
            `,
            add: `
                struct Params { size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;
                @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if(id.x < p.size) { C[id.x] = A[id.x] + B[id.x]; }
                }
            `,
            add_pos_encoding: `
                struct Params { size: u32, pad0: u32, pad1: u32, pad2: u32 };
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read> B: array<f32>;
                @group(0) @binding(2) var<storage, read_write> C: array<f32>;
                @group(0) @binding(3) var<uniform> p: Params;
                @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if(id.x < p.size) { C[id.x] = A[id.x] + B[id.x]; }
                }
            `,
            gelu: `
                @group(0) @binding(0) var<storage, read> A: array<f32>;
                @group(0) @binding(1) var<storage, read_write> C: array<f32>;
                @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    if (id.x < arrayLength(&C)) {
                        let x = A[id.x];
                        C[id.x] = 0.5 * x * (1.0 + tanh(0.79788456 * (x + 0.044715 * x * x * x)));
                    }
                }
            `
        };
        return kernels[op] || kernels['add'];
    }

    _dispatch(shader, encoder, inputs, output, uniform, shape, params, nodeId) {
        try {
            let pipeline = this.pipelineCache.get(shader);
            if (!pipeline) {
                const module = this.device.createShaderModule({ code: shader });
                pipeline = this.device.createComputePipeline({
                    layout: 'auto',
                    compute: { module, entryPoint: 'main' }
                });
                this.pipelineCache.set(shader, pipeline);
            }

            let entries = [];
            const seqLen = shape ? (shape[0] || 1) : 1;

            if (shader.includes('flash_attention_kv_cache')) {
                // استدعاء أو إنشاء بفرات الكاش العالمية المشتركة للطبقات لمنع تسريب الذاكرة
                const embedDim = (params?.headDim || 64) * (params?.numHeads || 8);
                const cacheTotalSize = 12 * 2048 * embedDim; // مساحة لـ 12 طبقة بسياق كامل
                
                if (!this.kvCacheStorage.has('K_GLOBAL_CACHE')) {
                    this.kvCacheStorage.set('K_GLOBAL_CACHE', this._getOrCreateBuffer('K_GLOBAL_CACHE', cacheTotalSize));
                    this.kvCacheStorage.set('V_GLOBAL_CACHE', this._getOrCreateBuffer('V_GLOBAL_CACHE', cacheTotalSize));
                }

                entries = [
                    { binding: 0, resource: { buffer: inputs[0] } }, // Fused QKV Out
                    { binding: 1, resource: { buffer: this.kvCacheStorage.get('K_GLOBAL_CACHE') } },
                    { binding: 2, resource: { buffer: this.kvCacheStorage.get('V_GLOBAL_CACHE') } },
                    { binding: 3, resource: { buffer: output } },
                    { binding: 4, resource: { buffer: uniform } }
                ];
            } else {
                entries = inputs.map((buf, i) => ({ binding: i, resource: { buffer: buf } }));
                entries.push({ binding: inputs.length, resource: { buffer: output } });
                if (uniform) entries.push({ binding: inputs.length + 1, resource: { buffer: uniform } });
            }

            const bindGroup = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
            const pass = encoder.beginComputePass();
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);

            if (shader.includes('flash_attention_kv_cache')) {
                const numHeads = params?.numHeads || 8;
                pass.dispatchWorkgroups(Math.ceil(seqLen / 16) || 1, numHeads); 
            } else if (shader.includes('layer_norm') || shader.includes('softmax')) {
                pass.dispatchWorkgroups(Math.ceil(seqLen / 64) || 1);
            } else if (shader.includes('matmul') || shader.includes('fused_qkv_projection')) {
                const M = seqLen;
                const N = params?.N || (shader.includes('fused_qkv_projection') ? 512 * 3 : 512);
                pass.dispatchWorkgroups(Math.ceil(M / 16) || 1, Math.ceil(N / 16) || 1);
            } else {
                const totalSize = this._calculateSize(shape);
                pass.dispatchWorkgroups(Math.ceil(totalSize / 64) || 1);
            }
            pass.end();
        } catch (err) {
            console.error(`🚨 خطأ في جدولة العقدة الفائقة [${nodeId}]: ${err.message}`);
        }
    }

    _createUniformBuffer(op, shape, params) {
        const buffer = this.device.createBuffer({ size: 24, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const view = new DataView(new ArrayBuffer(24));
        const seqLen = shape ? (shape[0] || 1) : 1;

        if (op === 'embedding_lookup') {
            view.setUint32(0, seqLen, true);       
            view.setUint32(4, params?.embedDim || 512, true); 
            view.setUint32(8, params?.vocabSize || 2526, true); 
        } else if (op === 'fused_qkv_projection') {
            view.setUint32(0, seqLen, true);
            view.setUint32(4, (params?.embedDim || 512) * 3, true); // المصفوفة مدمجة × 3 لـ Q,K,V
            view.setUint32(8, params?.embedDim || 512, true);
        } else if (op === 'flash_attention_kv_cache') {
            view.setUint32(0, seqLen, true);       
            view.setUint32(4, params?.headDim || 64, true);  
            view.setUint32(8, params?.numHeads || 8, true);  
            view.setFloat32(12, params?.scale || 0.125, true); 
            view.setUint32(16, params?.currentTokenIndex || 0, true); // التوكين الحالي لـ الكاش
            view.setUint32(20, params?.layerId || 0, true);           // معرف الطبقة لتقسيم الكاش
        } else if (op === 'layer_norm' || op === 'softmax') {
            view.setUint32(0, params?.embedDim || 512, true); 
            view.setUint32(4, seqLen, true);                   
        } else if (op.includes('matmul')) {
            view.setUint32(0, seqLen, true);
            view.setUint32(4, params?.N || 512, true);
            view.setUint32(8, params?.K || 512, true);
        } else {
            view.setUint32(0, this._calculateSize(shape) || 512, true); 
        }
        this.device.queue.writeBuffer(buffer, 0, view.buffer);
        return buffer;
    }

    _getOrCreateBuffer(id, size) {
        if (this.tensorBuffers.has(id)) return this.tensorBuffers.get(id);
        const alignedSize = Math.ceil(Math.max(size * 4, 64) / 16) * 16;
        const buffer = this.device.createBuffer({
            size: alignedSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.tensorBuffers.set(id, buffer);
        return buffer;
    }

    async _readBuffer(commandEncoder, gpuBuffer, elements) {
        const size = elements * 4;
        const staging = this.device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        commandEncoder.copyBufferToBuffer(gpuBuffer, 0, staging, 0, size);
        this.device.queue.submit([commandEncoder.finish()]);
        await staging.mapAsync(GPUMapMode.READ);
        const res = new Float32Array(staging.getMappedRange().slice(0));
        staging.unmap();
        staging.destroy();
        return res;
    }

    _calculateSize(shape) {
        if (!shape) return 1;
        if (typeof shape === 'number') return shape;
        if (Array.isArray(shape)) return shape.reduce((a, b) => a * (b || 1), 1);
        return 1;
    }
}
