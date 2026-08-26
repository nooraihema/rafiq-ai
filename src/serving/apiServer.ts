/**
 * @file src/serving/apiServer.ts
 * @project rafiq-ai-core
 * @description HTTP REST Server exposing endpoints for model inference and status health checks.
 */

import { InferenceEngine } from '../engine/inferenceEngine';
import { ModelRouter } from './modelRouter';

export class ApiServer {
  private inferenceEngine: InferenceEngine;
  private router: ModelRouter;
  private port: number;

  constructor(inferenceEngine: InferenceEngine, port: number = 3000) {
    this.inferenceEngine = inferenceEngine;
    this.router = new ModelRouter(this.inferenceEngine);
    this.port = port;
  }

  /**
   * محاكاة تشغيل السيرفر والاستماع للطلبات (يقوم المطور بربطها بـ Express أو الموديول الأصلي للنود)
   */
  public start(): void {
    console.log(`%c[API Server] 🚀 سيرفر الـ REST يعمل الآن ومستعد لاستقبال الطلبات على منفذ: http://localhost:${this.port}`, "color: #00d2ff");
  }

  /**
   * معالجة طلب استدلال قادم من الواجهة عبر بروتوكول HTTP
   * @param req { prompt: string, temperature?: number }
   */
  public async handleRequest(req: { prompt: string; temperature?: number }): Promise<any> {
    if (!req.prompt) {
      return { status: 400, error: "خطأ في البيانات: حقل الـ prompt مطلوب!" };
    }

    try {
      // توجيه الطلب عبر الراوتر لتحديد المسار الأفضل للموديل
      const result = await this.router.routeInference(req.prompt, req.temperature || 0.7);
      
      return {
        status: 200,
        success: true,
        data: result
      };
    } catch (error: any) {
      return { status: 500, error: `فشل داخلي في السيرفر: ${error.message}` };
    }
  }
}
