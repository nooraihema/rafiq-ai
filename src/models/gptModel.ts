/**
 * @file src/models/gptModel.ts
 * @project rafiq-ai-core
 * @description Main GPT Model class weaving Embedding, Positional Encoding, and multiple Transformer Blocks into a unified architecture.
 */

import { BaseModel } from './baseModel';
import { GPTConfig } from './gptConfig';
import { Tensor } from '../core/tensor';
import { Embedding } from '../layers/embedding';
import { PositionalEncoding } from '../layers/positionalEncoding';
import { TransformerBlock } from '../layers/transformerBlock';
import { LayerNorm } from '../layers/layerNorm';
import { Linear } from '../layers/linear';
import { KVCache } from '../layers/kvCache';

export class GPTModel extends BaseModel {
  private config: GPTConfig;
  
  // مكونات المعمارية الأساسية
  private tokenEmbedding: Embedding;
  private positionEncoding: PositionalEncoding;
  private blocks: TransformerBlock[] = [];
  private finalLayerNorm: LayerNorm;
  private lmHead: Linear; // الطبقة الخطية النهائية لإنتاج الـ Logits (أوزان القاموس)

  // مصفوفة لإدارة الـ KVCache لكل بلوك على حدة
  private caches: KVCache[] = [];

  constructor(config: GPTConfig, modelName: string = 'rafiq_gpt') {
    super(modelName);
    this.config = config;

    // 1. بناء طبقة الـ Embedding لتحويل التوكنز لمتجهات رقمية
    this.tokenEmbedding = new Embedding(config.vocabSize, config.hiddenDim, this.paramManager, `${modelName}.wte`);

    // 2. بناء طبقة الـ Positional Encoding لإضافة معلومات المواقع الترتيبية
    this.positionEncoding = new PositionalEncoding(config.maxSeqLen, config.hiddenDim, `${modelName}.wpe`);

    // 3. بناء بلوكات الـ Transformer العميقة بناء على العدد المحدد في الـ Config
    for (let i = 0; i < config.numLayers; i++) {
      this.blocks.push(new TransformerBlock(config.hiddenDim, config.numHeads, this.paramManager, i));
      // تخصيص ذاكرة مخبئية مستقرة لكل بلوك لحفظ سياقه الخاص
      this.caches.push(new KVCache(config.maxSeqLen, config.hiddenDim));
    }

    // 4. بناء طبقة المعايرة النهائية قبل خروج البيانات (Final LayerNorm)
    this.finalLayerNorm = new LayerNorm(config.hiddenDim, this.paramManager, `${modelName}.ln_f`);

    // 5. بناء رأس اللغة (Language Model Head) لإنتاج احتمالات الكلمة التالية [HiddenDim x VocabSize]
    this.lmHead = new Linear(config.hiddenDim, config.vocabSize, this.paramManager, `${modelName}.lm_head`);
  }

  /**
   * التمرير الأمامي للموديل بالكامل لإنتاج الـ Logits للتوكن القادم
   * @param tokenIds مصفوفة التوكنز الحالية [SeqLen]
   * @param outLogits مصفوفة المخرجات النهائية المحجوزة مسبقاً للاحتمالات الخام بأبعاد [1, VocabSize]
   */
  public forward(tokenIds: Int8Array, outLogits: Tensor): Tensor {
    const seqLen = tokenIds.length;

    // بافرات وسيطة ثابتة الحجم ومحجوزة مسبقاً لتمرير البيانات عبر خط الإنتاج
    const embedOut = new Tensor([seqLen, this.config.hiddenDim], new Float32Array(seqLen * this.config.hiddenDim));
    const posOut = new Tensor([seqLen, this.config.hiddenDim], new Float32Array(seqLen * this.config.hiddenDim));

    // أ) سحب متجهات الكلمات من القاموس
    this.tokenEmbedding.forward(tokenIds, embedOut);

    // ب) دمج مصفوفة المواقع مع متجهات الكلمات
    this.positionEncoding.forward(embedOut, posOut);

    // ج) سحب آخر توكن فقط لمعالجته بطريقة Autoregressive الحية الموفرة للطاقة
    // بما أننا نستخدم الـ KVCache، البلوكات تحتاج فقط متجهة التوكن الحالي [1, HiddenDim]
    const currentTokenData = new Float32Array(this.config.hiddenDim);
    const posData = posOut.buffer.data as Float32Array;
    const lastTokenOffset = (seqLen - 1) * this.config.hiddenDim;
    
    // نسخ بيانات التوكن الأخير في بافر المعالجة الحية
    for (let d = 0; d < this.config.hiddenDim; d++) {
      currentTokenData[d] = posData[lastTokenOffset + d];
    }
    
    let currentTensor = new Tensor([1, this.config.hiddenDim], currentTokenData);

    // د) تمرير التوكن عبر سلسلة بلوكات الـ Transformer Block تلو الآخر
    for (let i = 0; i < this.config.numLayers; i++) {
      const blockOut = new Tensor([1, this.config.hiddenDim], new Float32Array(this.config.hiddenDim));
      this.blocks[i].forward(currentTensor, this.caches[i], blockOut);
      currentTensor = blockOut; // المخرجات الحالية تصبح مدخلات البلوك القادم
    }

    // هـ) تطبيق المعايرة النهائية على مخرجات آخر بلوك
    const normOut = new Tensor([1, this.config.hiddenDim], new Float32Array(this.config.hiddenDim));
    this.finalLayerNorm.forward(currentTensor, normOut);

    // و) حساب الـ Logits النهائية عبر ضرب الناتج في أوزان رأس اللغة (LM Head)
    // نستخدم بافر وسيط لعملية الضرب ثم نسلم النتيجة النهائية للبافر الممرر
    const matmulOut = new Tensor([1, this.config.vocabSize], new Float32Array(this.config.vocabSize));
    this.lmHead.forward(normOut, matmulOut, outLogits);

    return outLogits;
  }

  /**
   * تصفير كامل الكاشات للنموذج للاستعداد لبدء جلسة محادثة جديدة تماماً من الصفر
   */
  public resetCache(): void {
    for (const cache of this.caches) {
      cache.reset();
    }
  }
}
