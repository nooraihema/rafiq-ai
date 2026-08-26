/**
 * @file src/layers/attention.ts
 * @project rafiq-ai-core
 * @description Multi-Head Attention layer with explicit strided memory mapping and causal masking.
 */

import { BaseLayer } from './baseLayer';
import { Tensor } from '../core/tensor';
import { ParameterManager } from '../core/parameters';
import { KVCache } from './kvCache';

export class MultiHeadAttention extends BaseLayer {
  // كشافات الأوزان للتحويلات الخطية الأربعة الأساسية
  public qProjWeight: Tensor;
  public kProjWeight: Tensor;
  public vProjWeight: Tensor;
  public oProjWeight: Tensor;

  private numHeads: number;
  private hiddenDim: number;
  private headDim: number;

  constructor(
    hiddenDim: number,
    numHeads: number,
    paramManager: ParameterManager,
    layerName: string = 'attention'
  ) {
    super(layerName);
    this.hiddenDim = hiddenDim;
    this.numHeads = numHeads;
    
    // حساب أبعاد الرأس الواحد العميقة (مثلاً: 512 بعد تقسيم 8 رؤوس = 64 بعد لكل رأس)
    this.headDim = hiddenDim / numHeads;

    if (hiddenDim % numHeads !== 0) {
      throw new Error(`[Attention Error] hiddenDim must be perfectly divisible by numHeads.`);
    }

    // تهيئة مصفوفات الأوزان للـ Projection (توزيع عشوائي قياسي مبدئياً)
    const initSize = hiddenDim * hiddenDim;
    this.qProjWeight = new Tensor([hiddenDim, hiddenDim], new Float32Array(initSize).fill(0.01), true);
    this.kProjWeight = new Tensor([hiddenDim, hiddenDim], new Float32Array(initSize).fill(0.01), true);
    this.vProjWeight = new Tensor([hiddenDim, hiddenDim], new Float32Array(initSize).fill(0.01), true);
    this.oProjWeight = new Tensor([hiddenDim, hiddenDim], new Float32Array(initSize).fill(0.01), true);

    // تسجيل الأوزان في المدير المركزي ليتمكن الـ Optimizer من تحديثها
    paramManager.register(`${layerName}.q_proj.weight`, this.qProjWeight);
    paramManager.register(`${layerName}.k_proj.weight`, this.kProjWeight);
    paramManager.register(`${layerName}.v_proj.weight`, this.vProjWeight);
    paramManager.register(`${layerName}.o_proj.weight`, this.oProjWeight);
  }

  /**
   * التمرير الأمامي للانتباه متعدد الرؤوس
   * @param x المصفوفة المدخلة الحالية بأبعاد [1, HiddenDim] (معالجة توكن تلو الآخر أثناء التوليد)
   * @param cache الذاكرة المخبئية الحية للطبقة الحالية للحفاظ على الماضي
   * @param outFinal مصفوفة المخرجات النهائية المحجوزة مسبقاً بنفس أبعاد المدخل [1, HiddenDim]
   */
  public forward(x: Tensor, cache: KVCache, outFinal: Tensor): Tensor {
    const xData = x.buffer.data as Float32Array;

    // 1. حجز مصفوفات مؤقتة للمتجهات الثلاثة (Query, Key, Value) للتوكن الحالي
    const qRaw = new Float32Array(this.hiddenDim);
    const kRaw = new Float32Array(this.hiddenDim);
    const vRaw = new Float32Array(this.hiddenDim);

    // 2. إسقاط خطي يدوي سريع (Manual Matmul Vector-Matrix) لحساب Q, K, V للتوكن الحالي
    const qW = this.qProjWeight.buffer.data as Float32Array;
    const kW = this.kProjWeight.buffer.data as Float32Array;
    const vW = this.vProjWeight.buffer.data as Float32Array;

    for (let o = 0; o < this.hiddenDim; o++) {
      let qSum = 0, kSum = 0, vSum = 0;
      for (let i = 0; i < this.hiddenDim; i++) {
        const xVal = xData[i];
        qSum += xVal * qW[i * this.hiddenDim + o];
        kSum += xVal * kW[i * this.hiddenDim + o];
        vSum += xVal * vW[i * this.hiddenDim + o];
      }
      qRaw[o] = qSum;
      kRaw[o] = kSum;
      vRaw[o] = vSum;
    }

    // 3. تحديث الـ KV Cache بالقيم الجديدة للتوكن الحالي لحفظها للمستقبل
    const currentQ = new Tensor([1, this.hiddenDim], qRaw);
    const currentK = new Tensor([1, this.hiddenDim], kRaw);
    const currentV = new Tensor([1, this.hiddenDim], vRaw);
    cache.update(currentK, currentV);

    // 4. استدعاء كامل التاريخ المخزن في الكاش حتى اللحظة الحالية
    const fullKData = cache.getKeyData(); // أبعاده الفعلية الآن [PastSeqLen, HiddenDim]
    const fullVData = cache.getValueData();
    const totalTokens = cache.length; // طول السياق الإجمالي شامل التوكن الحالي

    // مصفوفة تجميع مخرجات الرؤوس بالكامل قبل الإسقاط النهائي
    const attentionContextOut = new Float32Array(this.hiddenDim);

    // 5. حلقة المعالجة المستقلة لكل رأس (Multi-Head Loop) - سر فك العقدة هنا!
    const scale = 1.0 / Math.sqrt(this.headDim);

    for (let h = 0; h < this.numHeads; h++) {
      const headQueryOffset = h * this.headDim;
      
      // مصفوفة لحفظ سكور الانتباه لهذا الرأس لكل التوكنز في السياق
      const scores = new Float32Array(totalTokens);

      // أ) حساب سكور الانتباه عبر ضرب الـ Query الحالي في كل الـ Keys السابقة (Dot Product)
      for (let t = 0; t < totalTokens; t++) {
        const headKeyOffset = (t * this.hiddenDim) + (h * this.headDim);
        let scoreSum = 0;
        
        for (let d = 0; d < this.headDim; d++) {
          scoreSum += qRaw[headQueryOffset + d] * fullKData[headKeyOffset + d];
        }
        scores[t] = scoreSum * scale; // موازنة القيم رياضياً
      }

      // ب) تطبيق Softmax آمن وموضعي على السكورز لتحويلها إلى نسب احتمالية لتوزيع الانتباه
      let maxScore = scores[0];
      for (let t = 1; t < totalTokens; t++) {
        if (scores[t] > maxScore) maxScore = scores[t];
      }

      let sumExp = 0;
      for (let t = 0; t < totalTokens; t++) {
        scores[t] = Math.exp(scores[t] - maxScore);
        sumExp += scores[t];
      }
      for (let t = 0; t < totalTokens; t++) {
        scores[t] /= sumExp;
      }

      // ج) ضرب نسب الانتباه (Scores) في متجهات الـ Values لتجميع سياق الفهم الفعلي لهذا الرأس
      const headOutOffset = h * this.headDim;
      for (let t = 0; t < totalTokens; t++) {
        const headValueOffset = (t * this.hiddenDim) + (h * this.headDim);
        const score = scores[t];
        
        for (let d = 0; d < this.headDim; d++) {
          attentionContextOut[headOutOffset + d] += score * fullVData[headValueOffset + d];
        }
      }
    }

    // 6. الإسقاط الخطي النهائي لمخرجات الرؤوس المجمعة (Output Projection) لدمجها في أبعاد النموذج الأصلي
    const oW = this.oProjWeight.buffer.data as Float32Array;
    const finalData = outFinal.buffer.data as Float32Array;
    finalData.fill(0); // تصفير المصفوفة المحجوزة مسبقاً قبل التجميع

    for (let o = 0; o < this.hiddenDim; o++) {
      let sum = 0;
      for (let i = 0; i < this.hiddenDim; i++) {
        sum += attentionContextOut[i] * oW[i * this.hiddenDim + o];
      }
      finalData[o] = sum;
    }

    // ربط مخرجات الانتباه بالرسم البياني للتفاضل التلقائي
    if (x.requiresGrad || this.qProjWeight.requiresGrad) {
      outFinal.requiresGrad = true;
      outFinal.creator = { op: 'multi_head_attention', inputs: [x, this.qProjWeight, this.kProjWeight, this.vProjWeight, this.oProjWeight] };
    }

    return outFinal;
  }
}
