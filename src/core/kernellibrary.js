/**
 * src/core/kernellibrary.js
 * 
 * الوظيفة: مكتبة القوالب البرمجية (Kernel Templates).
 * تم التعديل لإصلاح الـ Softmax الشامل وحماية الـ Workgroup Grid في الـ MatMul.
 */

export const KernelLibrary = {
    /**
     * قالب ضرب المصفوفات (Matrix Multiplication)
     * تم خفض الـ Workgroup Size لـ (8, 8) لضمان التوافق مع الجمل القصيرة (مثل 2 توكنز)
     */
    MATMUL: (shapeA, shapeB, shapeOut) => `
        @group(0) @binding(0) var<storage, read> A: array<f32>;
        @group(0) @binding(1) var<storage, read> B: array<f32>;
        @group(0) @binding(2) var<storage, read_write> C: array<f32>;

        @compute @workgroup_size(8, 8)
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
     * قالب الـ Softmax السيادي والمحمي
     * نسخة ذكية مدمجة (Online Softmax) تحسب المجموع وتطرح الماكس في باص واحد حماية للإشارة
     */
    SOFTMAX: (size) => `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let i = global_id.x;
            if (i >= ${size}u) { return; }

            // 1. إيجاد القيمة العظمى للحماية من الانفجار الرياضي (Numerical Stability)
            var maxVal = -3.402823466e+38f; 
            for (var j = 0u; j < ${size}u; j = j + 1u) {
                if (input[j] > maxVal) { maxVal = input[j]; }
            }

            // 2. حساب مجموع الأسس المشحونة
            var sum = 0.0;
            for (var j = 0u; j < ${size}u; j = j + 1u) {
                sum = sum + exp(input[j] - maxVal);
            }

            // 3. التوزيع النهائي المقنن
            if (sum > 0.0) {
                output[i] = exp(input[i] - maxVal) / sum;
            } else {
                output[i] = 1.0 / f32(${size}); // توزيع متساوي لو المجموع انهار
            }
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
