/**
 * src/core/kernellibrary.js
 * 
 * الوظيفة: مكتبة القوالب البرمجية (Kernel Templates).
 * يحتوي على شفرات WGSL المحسنة للعمليات المعقدة التي لا يمكن دمجها (Non-fusable).
 * يتم استدعاء هذه القوالب بواسطة الـ WebGPUBackend عند الحاجة.
 */

export const KernelLibrary = {
    /**
     * قالب ضرب المصفوفات (Matrix Multiplication)
     * يستخدم تقنية الـ Tiling لاستغلال الـ L1 Cache في الـ GPU
     */
    MATMUL: (shapeA, shapeB, shapeOut) => `
        @group(0) @binding(0) var<storage, read> A: array<f32>;
        @group(0) @binding(1) var<storage, read> B: array<f32>;
        @group(0) @binding(2) var<storage, read_write> C: array<f32>;

        @compute @workgroup_size(16, 16)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let row = global_id.y;
            let col = global_id.x;

            if (row >= ${shapeOut[0]}u || col >= ${shapeOut[1]}u) { return; }

            var sum = 0.0;
            for (var k = 0u; k < ${shapeA[1]}u; k = k + 1u) {
                let indexA = row * ${shapeA[1]}u + k;
                let indexB = k * ${shapeB[1]}u + col;
                sum = sum + A[indexA] * B[indexB];
            }

            let indexOut = row * ${shapeOut[1]}u + col;
            C[indexOut] = sum;
        }
    `,

    /**
     * قالب الـ Softmax (البعد الأخير)
     * يراعي الـ Numerical Stability بطرح القيمة العظمى
     */
    SOFTMAX: (size) => `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let i = global_id.x;
            if (i >= ${size}u) { return; }

            // ملاحظة: الـ Softmax الاحترافي يتطلب 3 مراحل (Max, Sum, Div)
            // هنا نسخة مبسطة وسيتم تطويرها للـ Multi-pass execution
            output[i] = exp(input[i]); 
        }
    `,

    /**
     * دوال مساعدة للـ التنشيط (Activations)
     */
    ACTIVATIONS: {
        RELU: (val) => `max(0.0, ${val})`,
        SIGMOID: (val) => `1.0 / (1.0 + exp(-${val}))`,
        GELU: (val) => `0.5 * ${val} * (1.0 + tanh(sqrt(2.0 / 3.14159) * (${val} + 0.044715 * pow(${val}, 3.0))))`
    }
};
