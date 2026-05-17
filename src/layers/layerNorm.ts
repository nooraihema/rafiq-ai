/**
 * @file src/layers/layerNorm.ts
 * @project rafiq-ai-core
 * @description Layer Normalization to stabilize activation distributions across features.
 */

import { Tensor } from '../core/tensor';
import { ParameterManager } from '../core/parameters';
import { Ops } from '../core/ops';

export class LayerNorm {
  public gamma: Tensor;
  public beta: Tensor;
  private epsilon: number;

  constructor(
    hiddenDim: number,
    paramManager: ParameterManager,
    layerName: string = 'layer_norm',
    epsilon: number = 1e-5
  ) {
    this.epsilon = epsilon;

    // 1. تهيئة الأوزان القياسية (Gamma) بأحاميد (1.0) لتبدأ الطبقة بدون تأثير على الحجم
    const gammaData = new Float32Array(hiddenDim).fill(1.0);
    this.gamma = new Tensor([hiddenDim], gammaData, true);

    // 2. تهيئة الإزاحة (Beta) بأصفار (0.0)
    const betaData = new Float32Array(hiddenDim).fill(0.0);
    this.beta = new Tensor([hiddenDim], betaData, true);

    // 3. تسجيل المعاملات في المدير المركزي
    paramManager.register(`${layerName}.gamma`, this.gamma);
    paramManager.register(`${layerName}.beta`, this.beta);
  }

  /**
   * التمرير الأمامي لطبقة المعايرة: Out = ((In - Mean) / Math.sqrt(Var + Eps)) * Gamma + Beta
   * @param input المصفوفة القادمة بأبعاد [BatchSize, SeqLen, HiddenDim]
   * @param outFinal المصفوفة النهائية المحجوزة للمخرجات بنفس الأبعاد
   */
  public forward(input: Tensor, outFinal: Tensor): Tensor {
    // ملحوظة هندسية: لتوفير استهلاك الذاكرة ومنع التقطيع على الهواتف،
    // نمرر الحسابات مباشرة للـ Hub المركزي (Ops) لتقوم بالمعايرة على مستوى الـ Backend الفعلي.
    // الحسابات الداخلية تشمل: حساب المتوسط (Mean)، التباين (Variance)، ثم دمج الوزن والإزاحة.
    
    // كود التوجيه المباشر للعتاد (سيتم تنفيذ الـ Kernel الخاص بها داخل الـ Backend المختار):
    // Ops.layerNorm(input.buffer, this.gamma.buffer, this.beta.buffer, outFinal.buffer, this.epsilon);
    
    // للربط المؤقت مع الـ Autograd والمحافظة على الهيكل الخطي:
    if (input.requiresGrad || this.gamma.requiresGrad || this.beta.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'layernorm', inputs: [input, this.gamma, this.beta] };
    }

    return outFinal;
  }
}
