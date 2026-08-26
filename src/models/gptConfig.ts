/**
 * @file src/models/gptConfig.ts
 * @project rafiq-ai-core
 * @description Configuration interface and preset values for the Rafiq AI GPT Core Engine.
 */

export interface GPTConfig {
  vocabSize: number;       // حجم قاموس الكلمات (مثلاً 32000 كلمة)
  maxSeqLen: number;       // أقصى طول للسياق أو الجملة المسموح بها (Context Length)
  hiddenDim: number;       // الأبعاد الداخلية العميقة للموديل (Embedding Dimension)
  numLayers: number;       // عدد بلوكات الـ Transformer المكررة فوق بعضها (Depth)
  numHeads: number;        // عدد رؤوس الانتباه داخل كل طبقة انتباه (Attention Heads)
}

/**
 * إعدادات افتراضية مسبقة وموزونة للتشغيل الخفيف والسريع على الهواتف والمتصفحات (Rafiq-AI Nano Preset)
 */
export const RafiqNanoConfig: GPTConfig = {
  vocabSize: 50257,        // حجم قاموس قياسي متوافق مع GPT-2/LLaMA tokenizers
  maxSeqLen: 1024,         // طول سياق ممتاز ومناسب جداً للمحادثات السريعة
  hiddenDim: 256,          // أبعاد موازنة بدقة بين قوة الفهم وسرعة الأداء على الـ CPU
  numLayers: 4,            // أربعة بلوكات عميقة تضمن معالجة دلالية جيدة جداً
  numHeads: 8              // 8 رؤوس انتباه (كل رأس يأخذ 32 بعداً بدقة ممتازة: 256 / 8 = 32)
};
