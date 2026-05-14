/**
 * src/core/opnode.js
 * الحالة: تطوير هندسي شامل (Compiler-Ready)
 * الوظيفة: تعريف منطق العمليات وتحويلها إلى صيغ رياضية قابلة للتنفيذ على الـ GPU.
 */

export class OpNode {
    /**
     * @param {string} type - نوع العملية (add, mul, matmul, relu, etc.)
     * @param {Array} inputs - الـ Tensors الداخلة في العملية
     * @param {Object} attrs - خصائص إضافية
     */
    constructor(type, inputs, attrs = {}) {
        this.type = type;
        this.inputs = inputs;
        this.attrs = attrs;
        this.id = `op_${Math.random().toString(36).substr(2, 5)}`;
    }

    /**
     * قاموس العمليات: يحتوي على "الكود المصدري" لكل عملية رياضية.
     * تم تصميمه ليدعم الـ Scalar Ops التي تُحقن مباشرة في الـ Shaders.
     */
    static get DEFINITIONS() {
        return {
            'add':  { symbol: '+', isElementWise: true,  identity: 0.0 },
            'sub':  { symbol: '-', isElementWise: true,  identity: 0.0 },
            'mul':  { symbol: '*', isElementWise: true,  identity: 1.0 },
            'div':  { symbol: '/', isElementWise: true,  identity: 1.0 },
            'relu': { 
                isElementWise: true, 
                customFormula: (a) => `max(0.0, ${a})` 
            },
            'matmul': { 
                isElementWise: false, 
                customKernel: true 
            }
        };
    }

    /**
     * توليد الصيغة الرياضية للعملية (التي ستوضع داخل الـ WGSL Shader)
     * @param {Array<string>} inputVars - أسماء المتغيرات البرمجية للمدخلات (مثل val1, val2)
     */
    generateFormula(inputVars) {
        const def = OpNode.DEFINITIONS[this.type];
        if (!def) throw new Error(`Unsupported operation: ${this.type}`);

        if (def.customFormula) {
            return def.customFormula(...inputVars);
        }

        if (def.symbol) {
            // دعم العمليات الثنائية مثل a + b
            return `(${inputVars[0]} ${def.symbol} ${inputVars[1]})`;
        }

        return inputVars[0]; // Fallback
    }

    /**
     * التحقق الهندسي من الأبعاد (Shape Validation)
     * يدعم الآن الـ Scalar Broadcasting (الجمع/الضرب في رقم واحد)
     */
    validateShapes() {
        if (this.inputs.length === 0) return false;
        
        const shapeA = this.inputs[0].shape;
        const def = OpNode.DEFINITIONS[this.type];

        if (def && def.isElementWise && this.inputs.length === 2) {
            const shapeB = this.inputs[1].shape;
            
            // قاعدة الـ Broadcasting البسيطة:
            // 1. الأبعاد متطابقة تماماً.
            // 2. أو أحدهما طوله 1 (Scalar).
            const isMatch = shapeA.every((val, i) => val === shapeB[i]);
            const isScalarB = shapeB.length === 1 && shapeB[0] === 1;
            const isScalarA = shapeA.length === 1 && shapeA[0] === 1;

            if (!isMatch && !isScalarB && !isScalarA) {
                throw new Error(`Shape Mismatch: ${this.type} requires compatible shapes. Got ${shapeA} and ${shapeB}`);
            }
            return true;
        }

        if (this.type === 'matmul') {
            const shapeB = this.inputs[1].shape;
            // قاعدة ضرب المصفوفات الكلاسيكية
            if (shapeA[1] !== shapeB[0]) {
                throw new Error(`MatMul Mismatch: Inner dimensions must match. Got ${shapeA[1]} and ${shapeB[0]}`);
            }
            return true;
        }

        return true;
    }

    /**
     * تحديد ما إذا كانت العملية قابلة للدمج (Fusion Eligible)
     * دمج العمليات يقلل من استهلاك الـ GPU للكهرباء والوقت بنسبة تصل لـ 40%
     */
    isFusable() {
        const def = OpNode.DEFINITIONS[this.type];
        return def ? def.isElementWise : false;
    }

    getOpDefinition() {
        return OpNode.DEFINITIONS[this.type] || null;
    }
}
