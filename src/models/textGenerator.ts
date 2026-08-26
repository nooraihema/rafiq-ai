/**
 * @file src/models/textGenerator.ts
 * @project rafiq-ai-core
 * @description Text generation pipeline controlling inference loops, temperature scaling, and sampling.
 */

import { GPTModel } from './gptModel';
import { GPTConfig } from './gptConfig';
import { Tensor } from '../core/tensor';
import { Softmax } from '../layers/softmax';

export interface GenerationOptions {
  maxNewTokens: number;    // أقصى عدد من الكلمات الجديدة المراد توليدها
  temperature?: number;    // درجة العشوائية والإبداع (من 0.1 إلى 1.5 وعادة 0.7)
  resetCache?: boolean;    // هل يتم تصفير الذاكرة المخبئية قبل بدء التوليد؟
}

export class TextGenerator {
  private model: GPTModel;
  private config: GPTConfig;
  private softmax: Softmax;

  constructor(model: GPTModel, config: GPTConfig) {
    this.model = model;
    this.config = config;
    this.softmax = new Softmax();
  }

  /**
   * توليد نص مستمر بناءً على التوكنز البدائية المدخلة (Prompt Tokens)
   * @param promptIds مصفوفة التوكنز الابتدائية القادمة من التوكينايزر
   * @param options إعدادات التحكم في عملية التوليد
   * @param onTokenGenerated Callback اختياري لبث الكلمات للمستخدم فور توليدها (Streaming)
   */
  public generate(
    promptIds: number[],
    options: GenerationOptions,
    onTokenGenerated?: (tokenId: number) => void
  ): number[] {
    const maxNewTokens = options.maxNewTokens;
    const temp = options.temperature ?? 0.7;

    if (options.resetCache) {
      this.model.resetCache();
    }

    // نسخ التوكنز الابتدائية في مصفوفة ديناميكية ممتدة لتجميع المخرجات بالكامل
    const generatedTokens = [...promptIds];

    // بافرات ثابتة ومحجوزة مسبقاً في الذاكرة لحساب الـ Logits والـ Probabilities
    const logitsTensor = new Tensor([1, this.config.vocabSize], new Float32Array(this.config.vocabSize));
    const probsTensor = new Tensor([1, this.config.vocabSize], new Float32Array(this.config.vocabSize));

    // حلقة التوليد التكرارية (Autoregressive Loop) - كلمة تلو الأخرى
    for (let step = 0; step < maxNewTokens; step++) {
      const currentContextLen = generatedTokens.length;

      // حماية لمنع تخطي الحدود القصوى لسياق المحرك
      if (currentContextLen >= this.config.maxSeqLen) {
        break;
      }

      // تحويل قائمة التوكنز الحالية إلى Int8Array جاهز للمعالجة داخل الموديل
      const inputIds = new Int8Array(generatedTokens);

      // 1. التمرير الأمامي عبر الـ GPT Model لإنتاج قيم الـ Logits الخام لآخر توكن
      this.model.forward(inputIds, logitsTensor);

      const logitsData = logitsTensor.buffer.data as Float32Array;

      // 2. تطبيق الـ Temperature Scaling لتعديل توزيع الاحتمالات
      // قيم Temperature أقل من 1 تجعل الموديل واثقاً ومحدداً، وقيم أعلى تجعله مبدعاً ومتنوعاً
      if (temp !== 1.0 && temp > 0) {
        for (let i = 0; i < logitsData.length; i++) {
          logitsData[i] /= temp;
        }
      }

      // 3. تحويل الـ Logits إلى توزيع احتمالي حقيقي مجموع عناصره (1.0) باستخدام الـ Softmax الآمن
      this.softmax.forward(logitsTensor, probsTensor);

      const probsData = probsTensor.buffer.data as Float32Array;

      // 4. سحب الكلمة القادمة بناءً على التوزيع الاحتمالي (Weighted Random Sampling)
      const nextTokenId = this.sampleNextToken(probsData);

      // 5. حقن الكلمة الجديدة في قائمة الكلمات المخزنة لتصبح جزءاً من الماضي في الخطوة القادمة
      generatedTokens.push(nextTokenId);

      // بث الكلمة فوراً للـ UI أو سياق التشغيل الفعلي (Streaming UI feature)
      if (onTokenGenerated) {
        onTokenGenerated(nextTokenId);
      }
    }

    return generatedTokens;
  }

  /**
   * اختيار التوكن القادم عشوائياً بناء على ثقل ونسبة كل توكن في مصفوفة الاحتمالات
   */
  private sampleNextToken(probs: Float32Array): number {
    const randomPtr = Math.random();
    let cumulativeProbability = 0;

    for (let id = 0; id < probs.length; id++) {
      cumulativeProbability += probs[id];
      if (randomPtr <= cumulativeProbability) {
        return id;
      }
    }

    // حالة طوارئ نادرة (Fallback) لو حدث أي تقريب رياضي طفيف: نرجع الكلمة الأخيرة في القاموس
    return probs.length - 1;
  }
}
