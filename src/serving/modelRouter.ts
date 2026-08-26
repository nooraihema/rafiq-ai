/**
 * @file src/serving/modelRouter.ts
 * @project rafiq-ai-core
 * @description Smart Traffic Router directing incoming client prompts to the appropriate model architecture checkpoint based on complexity.
 */

import { InferenceEngine } from '../engine/inferenceEngine';
import { BatchingScheduler } from './batchingScheduler';

export class ModelRouter {
  private inferenceEngine: InferenceEngine;
  private scheduler: BatchingScheduler;

  constructor(inferenceEngine: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
    this.scheduler = new BatchingScheduler(4, 30); // ماكس 4 طلبات بالتوازي
  }

  /**
   * فحص الـ Prompt وتحديد أفضل مسار واستدعائه عبر المجدول
   */
  public async routeInference(prompt: string, temperature: number): Promise<any> {
    console.log(`%c[Router] 🧭 تم استقبال إشارة من الواجهة وجاري تحليل التعقيد اللغوي...`, "color: #f1c40f");

    // تحليل بدائي للتعقيد (مثال: لو النص طويل جداً يحتاج معالجة خاصة)
    if (prompt.length > 500) {
      console.log(`%c[Router] ⚠️ تنبيه: نص معقد وعالي الكثافة، توجيه الأولوية لخطوط الحسابات الكبرى.`, "color: #ff4d4d");
    }

    // إرسال المهمة للمجدول الذكي لدمجها مع باقي طلبات المستخدمين الآخرين
    return await this.scheduler.queueTask(prompt, temperature);
  }
}
