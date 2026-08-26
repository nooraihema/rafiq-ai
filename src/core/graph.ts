/**
 * @file src/core/graph.ts
 * @project rafiq-ai-core
 * @description Computational Graph & Autograd Engine for Tracking and Backward Propagation.
 */

import { Tensor } from './tensor';

export class ComputationGraph {
  
  /**
   * ترتيب المصفوفات توبولوجياً (Topological Sort)
   * يقوم بترتيب العقد في الرسم البياني بحيث تأتي العقد المنتجة قبل العقد المستهلكة
   */
  public static topologicalSort(root: Tensor): Tensor[] {
    const order: Tensor[] = [];
    const visited = new Set<string>();

    function visit(node: Tensor) {
      if (visited.has(node.id)) return;
      visited.add(node.id);

      // إذا كانت العقدة ناتجة عن عملية رياضية، قم بزيارة مدخلاتها أولاً
      if (node.creator && node.creator.inputs) {
        for (const input of node.creator.inputs) {
          visit(input);
        }
      }
      order.push(node);
    }

    visit(root);
    return order;
  }

  /**
   * التمرير الخلفي (Backward Pass)
   * محرك التفاضل التلقائي الديناميكي الذي يقوم بحساب وتوزيع التدرجات على الأوزان
   */
  public static backward(lossTensor: Tensor): void {
    if (!lossTensor.grad) {
      throw new Error('Cannot call backward on a tensor without gradients initialized.');
    }

    // تصفير تدرج دالة الفقد كبداية (عادة ما يكون 1.0)
    lossTensor.grad.buffer.data.fill(1.0);

    // فرز الرسم البياني توبولوجياً ثم عكسه لنبدأ من النهاية إلى البداية
    const sortedNodes = this.topologicalSort(lossTensor).reverse();

    for (const node of sortedNodes) {
      if (!node.creator || !node.grad) continue;

      const { op, inputs } = node.creator;
      const outGrad = node.grad;

      // حساب التدرجات بناءً على نوع العملية الرياضية (Backward Kernels)
      if (op === 'add') {
        const [a, b] = inputs;
        // مشتقة الجمع هي 1، لذا ينتقل التدرج كما هو للمدخلات
        if (a.grad) this.accumulateGrad(a.grad, outGrad);
        if (b.grad) this.accumulateGrad(b.grad, outGrad);
      } 
      else if (op === 'matmul') {
        const [a, b] = inputs;
        // مشتقة ضرب المصفوفات تعتمد على ضرب التدرج الخارجي في مقلوب المصفوفة الأخرى
        // dL/dA = dL/dOut x B^T  |  dL/dB = A^T x dL/dOut
        // ملاحظة: سيتم استدعاء الحساب الفعلي للـ Backward MatMul عبر Ops لاحقاً عند دمج الـ Strides بالكامل
        if (a.grad) {
          // كود هيكلي مؤقت لحين تفعيل مشتقات المصفوفات بالكامل
        }
        if (b.grad) {
          // كود هيكلي مؤقت لحين تفعيل مشتقات المصفوفات بالكامل
        }
      }
    }
  }

  /**
   * تجميع التدرجات (Gradient Accumulation)
   * يمنع مسح التدرجات القديمة إذا كانت المصفوفة مستخدمة في أكثر من عملية داخل الرسم البياني
   */
  private static accumulateGrad(targetGrad: Tensor, sourceGrad: Tensor): void {
    const targetData = targetGrad.buffer.data as Float32Array;
    const sourceData = sourceGrad.buffer.data as Float32Array;

    for (let i = 0; i < targetData.length; i++) {
      targetData[i] += sourceData[i];
    }
  }
}
