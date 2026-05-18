/**
 * @file src/index.ts
 * @project rafiq-ai-core
 * @description The central entry point exporting all core modules, layers, models, and types.
 */

// 1. تصدير المكونات الأساسية والمحرك الحسابي (Core Engine)
export { Tensor } from './core/tensor';
export { TensorBuffer } from './core/buffer';
export { Ops } from './core/ops';
export { ParameterManager } from './core/parameters';
export * from './core/types';

// 2. تصدير الطبقات الفردية والبلوكات التجميعية (Layers Baseline)
export { BaseLayer } from './layers/baseLayer';
export { Embedding } from './layers/embedding';
export { PositionalEncoding } from './layers/positionalEncoding';
export { LayerNorm } from './layers/layerNorm';
export { Softmax } from './layers/softmax';
export { Linear } from './layers/linear';
export { Residual } from './layers/residual';
export { Dropout } from './layers/dropout';
export { KVCache } from './layers/kvCache';
export { FeedForward } from './layers/ffn';
export { TransformerBlock } from './layers/transformerBlock';

// 3. تصدير النماذج الكبرى وخوارزميات توليد النصوص (Models & Pipelines)
export { BaseModel } from './models/baseModel';
export { GPTModel } from './models/gptModel';
export { TextGenerator, GenerationOptions } from './models/textGenerator';
export { GPTConfig, RafiqNanoConfig } from './models/gptConfig';

// 4. تصدير الأدوات الرياضية المساعدة (Utilities)
export { MathUtils } from './utils/math';
