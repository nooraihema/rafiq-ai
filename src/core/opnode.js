/**
 * src/core/opnode.js
 * الحالة: تطوير هندسي شامل (Compiler-Ready)
 * الوظيفة: تعريف منطق العمليات وتحويلها إلى صيغ رياضية قابلة للتنفيذ على الـ GPU.
 * تم التعديل لحقن العمليات السيادية (Softmax, LayerNorm, GELU) وتأمين الـ 3D Shapes.
 * التحديث الأخير: إصلاح نظام الـ Broadcasting الشامل ليدعم جمع الـ Vectors [2048] على المصفوفات [2, 2048].
 */

export class OpNode {
    /**
     * @param {string} type - نوع العملية (add, mul, matmul, relu, softmax, layernorm, etc.)
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
     * قاموس العمليات الشامل والمحمي لمحرك أكاشا البنائي
     */
    static get DEFINITIONS() {
        return {
            'const': { isElementWise: false, customKernel: false }, // صمام أمان لعقد الثوابت
            'add':   { symbol: '+', isElementWise: true,  identity: 0.0 },
            'sub':   { symbol: '-', isElementWise: true,  identity: 0.0 },
            'mul':   { symbol: '*', isElementWise: true,  identity: 1.0 },
            'div':   { symbol: '/', isElementWise: true,  identity: 1.0 },
            'relu':  { 
                isElementWise: true, 
                customFormula: (a) => `max(0.0, ${a})` 
            },
            'gelu':  {
                isElementWise: true,
                customFormula: (a) => `0.5 * ${a} * (1.0 + tanh(sqrt(2.0 / 3.14159) * (${a} + 0.044715 * pow(${a}, 3.0))))`
            },
            'softmax': { 
                isElementWise: false, 
                customKernel: true 
            },
            'layernorm': { 
                isElementWise: false, 
                customKernel: true 
            },
            'layer_norm': { 
                isElementWise: false, 
                customKernel: true 
            },
            'matmul': { 
                isElementWise: false, 
                customKernel: true 
            }
        };
    }

    /**
     * توليد الصيغة الرياضية للعملية (داخل الـ WGSL Shader للعمليات المدمجة)
     */
    generateFormula(inputVars) {
        const def = OpNode.DEFINITIONS[this.type];
        if (!def) throw new Error(`Unsupported operation: ${this.type}`);

        if (def.customFormula) {
            return def.customFormula(...inputVars);
        }

        if (def.symbol) {
            return `(${inputVars[0]} ${def.symbol} ${inputVars[1]})`;
        }

        return inputVars[0]; 
    }

    /**
     * التحقق الهندسي الشامل من الأبعاد وسلامة التدفق الرياضي
     */
    validateShapes() {
        if (this.inputs.length === 0) return true; // لعقد الثوابت
        
        const shapeA = this.inputs[0].shape;
        const def = OpNode.DEFINITIONS[this.type];

        if (!def) {
            throw new Error(`Validation Error: Operation '${this.type}' is not defined in Akasha System.`);
        }

        if (def.isElementWise && this.inputs.length === 2) {
            const shapeB = this.inputs[1].shape;
            
            // 1. تطابق كامل في الأبعاد
            const isMatch = shapeA.length === shapeB.length && shapeA.every((val, i) => val === shapeB[i]);
            // 2. أحد الطرفين سكيب صريح (رقم واحد)
            const isScalarB = shapeB.length === 1 && shapeB[0] === 1;
            const isScalarA = shapeA.length === 1 && shapeA[0] === 1;
            
            // 3. ذكاء الـ الـ Vector Broadcasting (مثل مصفوفة [2, 2048] مع فيكتور [2048])
            let isVectorBroadcast = false;
            if (!isMatch && !isScalarA && !isScalarB) {
                const longShape = shapeA.length >= shapeB.length ? shapeA : shapeB;
                const shortShape = shapeA.length < shapeB.length ? shapeA : shapeB;
                
                // لو القصير عبارة عن بُعد واحد وبيطابق البُعد الأخير في المصفوفة الكبيرة (Row-level broadcast)
                if (shortShape.length === 1 && longShape[longShape.length - 1] === shortShape[0]) {
                    isVectorBroadcast = true;
                }
            }

            if (!isMatch && !isScalarB && !isScalarA && !isVectorBroadcast) {
                throw new Error(`Shape Mismatch: ${this.type} requires compatible shapes. Got ${shapeA} and ${shapeB}`);
            }
            return true;
        }

        if (this.type === 'matmul') {
            const shapeB = this.inputs[1].shape;
            
            // استخراج الأبعاد الداخلية بغض النظر عن الـ Batch (دعم الأبعاد الثنائية والثلاثية)
            const dimA = shapeA.length >= 2 ? shapeA[shapeA.length - 1] : shapeA[0];
            const dimB = shapeB.length >= 2 ? shapeB[shapeB.length - 2] : shapeB[0];

            if (dimA !== dimB) {
                throw new Error(`MatMul Mismatch: Inner dimensions must match. Got trailing dim ${dimA} and leading dim ${dimB} from shapes ${shapeA} and ${shapeB}`);
            }
            return true;
        }

        return true;
    }

    /**
     * تحديد ما إذا كانت العملية قابلة للدمج (Fusion Eligible)
     */
    isFusable() {
        const def = OpNode.DEFINITIONS[this.type];
        return def ? def.isElementWise : false;
    }

    getOpDefinition() {
        return OpNode.DEFINITIONS[this.type] || null;
    }
}
