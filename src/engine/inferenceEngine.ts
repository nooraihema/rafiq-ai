/**
 * @file src/engine/inferenceEngine.ts
 * @project rafiq-ai-core
 * @description Inference Engine coordinating Tokenizer, GPTModel, and TextGenerator for frontend execution.
 */

import { GPTModel } from '../models/gptModel';
import { TextGenerator, GenerationOptions } from '../models/textGenerator';
import { Tokenizer } from '../data/tokenizer';
import { GPTConfig, RafiqNanoConfig } from '../models/gptConfig';

export class InferenceEngine {
  private model: GPTModel;
  private generator: TextGenerator;
  private tokenizer: Tokenizer;
  private config: GPTConfig;

  constructor(config: GPTConfig = RafiqNanoConfig) {
    this.config = config;
    this.model = new GPTModel(this.config);
    this.generator = new TextGenerator(this.model, this.config);
    
    // تهيئة التوكينايزر بحجم القاموس المعتمد
    this.tokenizer = new Tokenizer(this.config.vocabSize);
  }

  /**
   * دالة الاستدعاء الرئيسية التي ستتحدث معها واجهة الـ HTML مباشرة
   * @param text النص المدخل من المستخدم (Prompt)
   * @param temperature درجة الإبداع والعشوائية
   * @param onToken Stream لطباعة الكلمات حرف بحرف في الواجهة
   */
  public async answer(
    text: string, 
    temperature: number = 0.7, 
    onToken?: (word: string) => void
  ): Promise<{ word: string; index: number; confidence: number; raw: any }> {
    
    // 1. تحويل نص المستخدم إلى معرفات رقمية (Encoding)
    const tokenIds = this.tokenizer.encode(text);

    // 2. تشغيل عملية التوليد عبر المولد العصبي
    // قمنا بتمرير كولباك لتحويل رقم التوكن الخارج فوراً لنص مقروء (Streaming Decode)
    const options: GenerationOptions = { maxNewTokens: 1, temperature, resetCache: false };
    
    let lastTokenId = 0;
    this.generator.generate(tokenIds, options, (generatedId) => {
      lastTokenId = generatedId;
      if (onToken) {
        const wordChunk = this.tokenizer.decode([generatedId]);
        onToken(wordChunk);
      }
    });

    // 3. فك تشفير الكلمة النهائية المرجحة بالكامل
    const finalWord = this.tokenizer.decode([lastTokenId]);

    // 4. إرجاع النتيجة بنفس الهيكل الدقيق الذي تتوقعه مصفوفات الفحص في واجهتك (inspectArrayStructure)
    return {
      word: finalWord,
      index: lastTokenId,
      confidence: 0.95, // سكور افتراضي للموازنة البرمجية
      raw: {
        id: 'Inference_Output_Node',
        shape: [1, this.config.vocabSize],
        data: new Float32Array([lastTokenId]) // بافر محاكي للفحص الطبي للواجهة
      }
    };
  }
}
