/**
 * @file src/engine/checkpointManager.ts
 * @description Saves and loads serialized model weights and training metadata checkpoints.
 */

import { GPTModel } from '../models/gptModel';
import { FileSystem } from '../utils/fileSystem';
import { Serializer } from '../core/serializer';

export interface CheckpointMetadata {
  epoch: number;
  loss: number;
  timestamp: string;
  config: any;
}

export class CheckpointManager {
  private model: GPTModel;
  private fs: FileSystem;

  constructor(model: GPTModel) {
    this.model = model;
    this.fs = new FileSystem();
  }

  /**
   * حفظ الحالة الحالية للأوزان في ملف ثنائي (.bin)
   */
  public async saveCheckpoint(path: string, metadata: Omit<CheckpointMetadata, 'timestamp'>): Promise<void> {
    const weightsBuffer = Serializer.serializeParams(this.model.getParameters());
    
    const checkpointData = {
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      weights: Array.from(new Float32Array(weightsBuffer)) // تحويل الـ Buffer لهيكل مرن للحفظ
    };

    await this.fs.writeJson(path, checkpointData);
  }

  /**
   * استعادة الأوزان المخزنة وحقنها داخل خلايا النموذج فوراً
   */
  public async loadCheckpoint(path: string): Promise<CheckpointMetadata> {
    const checkpointData = await this.fs.readJson(path);
    if (!checkpointData || !checkpointData.weights) {
      throw new Error(`ملف الـ Checkpoint تالف أو غير موجود في المسار: ${path}`);
    }

    const float32Data = new Float32Array(checkpointData.weights);
    Serializer.deserializeParams(this.model.getParameters(), float32Data.buffer);

    return checkpointData.metadata;
  }
}
