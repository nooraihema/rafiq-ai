/**
 * @file src/utils/configLoader.ts
 * @project rafiq-ai-core
 * @description Safe configuration loader and validator for the Transformer hyper-parameters.
 */

export interface ModelConfig {
  vocabSize: number;
  hiddenDim: number;
  numHeads: number;
  numLayers: number;
  maxSeqLen: number;
}

export class ConfigLoader {
  
  /**
   * قراءة والتحقق من سلامة ملف إعدادات النموذج (JSON)
   */
  public static parseAndValidate(rawJson: string): ModelConfig {
    const config = JSON.parse(rawJson);

    // فحص الحقول الإجبارية لمنع انهيار المحرك أثناء التشغيل
    const requiredKeys: (keyof ModelConfig)[] = ['vocabSize', 'hiddenDim', 'numHeads', 'numLayers', 'maxSeqLen'];
    
    for (const key of requiredKeys) {
      if (config[key] === undefined || typeof config[key] !== 'number') {
        throw new Error(`[Config Error] Missing or invalid type for required key: "${key}"`);
      }
    }

    // فحص رياضي نقدي: يجب أن تقبل الأبعاد الخفية القسمة على عدد الرؤوس بدون باقٍ
    if (config.hiddenDim % config.numHeads !== 0) {
      throw new Error(
        `[Config Mismatch] hiddenDim (${config.hiddenDim}) must be perfectly divisible by numHeads (${config.numHeads})`
      );
    }

    return config as ModelConfig;
  }
}
