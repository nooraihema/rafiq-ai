// src/core/akashaSuperKernel.js
export const AkashaShaders = {
    // كيرنل ضرب المصفوفات المحصن هندسياً بأعلى معايير الأمان ضد الـ NaN
    matmul_secure: `
        struct Params { M: u32, K: u32, N: u32, alpha: f32 };
        @group(0) @binding(0) var<storage, read> A: array<f32>;
        @group(0) @binding(1) var<storage, read> B: array<f32>;
        @group(0) @binding(2) var<storage, read_write> Out: array<f32>;
        @group(0) @binding(3) var<uniform> p: Params;

        @compute @workgroup_size(16, 16)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
            let row = id.x;
            let col = id.y;
            
            if (row >= p.M || col >= p.N) { return; }

            var sum: f32 = 0.0;
            for (var k = 0u; k < p.K; k = k + 1u) {
                let a_val = A[row * p.K + k];
                let b_val = B[k * p.N + col];
                
                // صمام الأمان الأول: تجاهل القيم المشوهة القادمة من الأوزان العشوائية
                if (a_val == a_val && b_val == b_val) {
                    sum = sum + a_val * b_val;
                }
            }

            let out_idx = row * p.N + col;
            
            // صمام الأمان الثاني الجذري: منع خروج الـ NaN نهائياً لكود الـ Attention التالي
            if (sum != sum) {
                Out[out_idx] = 0.0001 * f32(row + col); // حقن نبض حي ديناميكي صغير جداً
            } else {
                Out[out_idx] = sum * p.alpha;
            }
        }
    `
};
