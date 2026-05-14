/**
 * src/core/opnode.js
 * 
 * الوظيفة: تعريف وحدات العمليات (Operation Nodes).
 * يمثل هذا الملف المنطق الرياضي لكل عملية في الـ Graph. 
 * بدلاً من حساب النتيجة، يقوم بتخزين "كيفية" الحساب لكي يتمكن الـ Compiler 
 * من دمجها (Fusion) أو توزيعها على الـ GPU لاحقاً.
 */

export class OpNode {
    /**
     * @param {string} type - نوع العملية (add, mul, matmul, etc.)
     * @param {Array} inputs - الـ Tensors الداخلة في العملية
     * @param {Object} attrs - خصائص إضافية (مثل الـ axis في الـ reduction)
     */
    constructor(type, inputs, attrs = {}) {
        this.type = type;
        this.inputs = inputs; // مراجع للـ Tensors الأصلية
        this.attrs = attrs;
        
        // تسجيل وقت الإنشاء لتتبع ترتيب العمليات في الـ Graph
        this.timestamp = Date.now();
        
        // سيتم ملء هذا الحقل بواسطة الـ Compiler عند توليد الكود
        this.kernelSource = null;
    }

    /**
     * الحصول على تعريف العملية للـ Compiler
     * يحدد هذا الجزء الصيغة الرياضية التي سيتم تحويلها لـ WGSL
     */
    getOpDefinition() {
        const definitions = {
            'add': {
                scalarOp: (a, b) => `${a} + ${b}`,
                isElementWise: true
            },
            'sub': {
                scalarOp: (a, b) => `${a} - ${b}`,
                isElementWise: true
            },
            'mul': {
                scalarOp: (a, b) => `${a} * ${b}`,
                isElementWise: true
            },
            'matmul': {
                isElementWise: false,
                customKernel: true // تحتاج لمعالجة خاصة في الـ GPU
            }
        };

        return definitions[this.type] || null;
    }

    /**
     * التحقق من توافق أبعاد المدخلات قبل بناء الـ Graph
     */
    validateShapes() {
        if (this.inputs.length < 1) return false;
        
        const shapeA = this.inputs[0].shape;
        
        if (this.type === 'add' || this.type === 'sub' || this.type === 'mul') {
            const shapeB = this.inputs[1].shape;
            // التحقق من التوافق (بسيط حالياً، سيتم تطويره لدعم الـ Broadcasting)
            return shapeA.every((val, index) => val === shapeB[index]);
        }
        
        if (this.type === 'matmul') {
            const shapeB = this.inputs[1].shape;
            // قاعدة ضرب المصفوفات: أعمدة الأولى تساوي صفوف الثانية
            return shapeA[shapeA.length - 1] === shapeB[0];
        }

        return true;
    }

    /**
     * تتبع المسار الخلفي (Backtrace)
     * يساعد الـ Compiler في بناء شجرة الاعتمادات (Dependency Tree)
     */
    getDependencies() {
        return this.inputs.map(tensor => ({
            tensorId: tensor.id,
            sourceOp: tensor.op
        }));
    }
}
