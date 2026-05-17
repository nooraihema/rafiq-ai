/**
 * @file src/layers/transformerBlock.ts
 * @project rafiq-ai-core
 * @description Transformer Block grouping Multi-Head Attention, FFN, LayerNorm, and Residual Connections.
 */

import { BaseLayer } from './baseLayer';
import { Tensor } from '../core/tensor';
import { ParameterManager } from '../core/parameters';
import { MultiHeadAttention } from './attention';
import { FeedForward } from './ffn';
import { LayerNorm } from './layerNorm';
import { Residual } from './residual';
import { KVCache } from './kvCache';

export class TransformerBlock extends BaseLayer {
  private attention: MultiHeadAttention;
  private ffn: FeedForward;
  private ln1: LayerNorm;
  private ln2: LayerNorm;
  private residual: Residual;

  private hiddenDim: number;

  constructor(
    hiddenDim: number,
    numHeads: number,
    paramManager: ParameterManager,
    blockId: number
  ) {
    const blockName = `transformer.block.${blockId}`;
    super(blockName);
    this.hiddenDim = hiddenDim;

    // 1. تهيئة المكونات الداخلية للبلوك بالكامل وتسميتها تبعا لمعرف البلوك الحالي
    this.attention = new MultiHeadAttention(hiddenDim, numHeads, paramManager, `${blockName}.attention`);
    this.ffn = new FeedForward(hiddenDim, paramManager, `${blockName}.ffn`);
    this.ln1 = new LayerNorm(hiddenDim, paramManager, `${blockName}.ln1`);
    this.ln2 = new LayerNorm(hiddenDim, paramManager, `${blockName}.ln2`);
    this.residual = new Residual(`${blockName}.residual`);
  }

  /**
   * التمرير الأمامي للبلوك الكامل (محاكاة دقيقة لمعمارية GPT / Decoder-only)
   * المخطط: 
   * 1. X_Norm = LayerNorm1(X)
   * 2. Attn_Out = Attention(X_Norm)
   * 3. X_Attn = Residual1(X, Attn_Out)
   * 4. X_Attn_Norm = LayerNorm2(X_Attn)
   * 5. FFN_Out = FFN(X_Attn_Norm)
   * 6. Final_Out = Residual2(X_Attn, FFN_Out)
   * 
   * @param x المصفوفة المدخلة الحالية بأبعاد [1, HiddenDim]
   * @param cache الذاكرة المخبئية الخاصة بهذا البلوك بالتحديد
   * @param outFinal بافر المخرجات النهائي المحجوز مسبقا لتسليم النتيجة للبلوك التالي بنفس الأبعاد [1, HiddenDim]
   */
  public forward(x: Tensor, cache: KVCache, outFinal: Tensor): Tensor {
    
    // حجز بافرات وسيطة مؤقتة وموضعية لإدارة تدفق البيانات داخل البلوك بدون تدمير المدخلات الأصلية
    const ln1Out = new Tensor([1, this.hiddenDim], new Float32Array(this.hiddenDim));
    const attnOut = new Tensor([1, this.hiddenDim], new Float32Array(this.hiddenDim));
    const res1Out = new Tensor([1, this.hiddenDim], new Float32Array(this.hiddenDim));
    const ln2Out = new Tensor([1, this.hiddenDim], new Float32Array(this.hiddenDim));
    const ffnOut = new Tensor([1, this.hiddenDim], new Float32Array(this.hiddenDim));

    // --- الجزء الأول: محرك الانتباه الموزع ---
    // 1. معايرة المدخلات (Pre-LayerNorm)
    this.ln1.forward(x, ln1Out);
    
    // 2. حساب تفاعل الكلمات الحالي مع الماضي المسترجع من الكاش
    this.attention.forward(ln1Out, cache, attnOut);
    
    // 3. دمج المخرجات عبر خط الاتصال السريع الأول مع المدخل الأصلي
    this.residual.forward(x, attnOut, res1Out);

    // --- الجزء الثاني: التمييز والمعالجة الفردية للخصائص ---
    // 4. معايرة ثانية قبل الدخول لشبكة الـ FFN
    this.ln2.forward(res1Out, ln2Out);
    
    // 5. تمرير البيانات داخل الـ Feed-Forward لتعميق الفهم الدلالي
    this.ffn.forward(ln2Out, ffnOut);
    
    // 6. دمج أخير عبر خط الاتصال السريع الثاني لإنتاج الحالة النهائية للبلوك الحالي
    this.residual.forward(res1Out, ffnOut, outFinal);

    return outFinal;
  }
}
