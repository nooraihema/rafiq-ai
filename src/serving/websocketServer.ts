/**
 * @file src/serving/websocketServer.ts
 * @project rafiq-ai-core
 * @description WebSocket Server enabling bidirectional, low-latency token streaming for real-time chat UI.
 */

import { InferenceEngine } from '../engine/inferenceEngine';

export class WebsocketServer {
  private inferenceEngine: InferenceEngine;
  private port: number;

  constructor(inferenceEngine: InferenceEngine, port: number = 3001) {
    this.inferenceEngine = inferenceEngine;
    this.port = port;
  }

  public start(): void {
    console.log(`%c[WebSocket Server] ⚡ سيرفر البث المباشر يعمل الآن على البورت: ws://localhost:${this.port}`, "color: #ff79c6");
  }

  /**
   * محاكاة ربط اتصال عميل (المتصفح) وبدء ضخ الإشارات الحية له
   */
  public handleConnection(clientSocket: { send: (msg: string) => void; onMessage: (cb: (msg: string) => void) => void }): void {
    clientSocket.onMessage(async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // استدعاء دالة الـ answer من الـ Engine مع تمرير كولباك للبث الحي
        await this.inferenceEngine.answer(data.prompt, data.temperature, (tokenChunk) => {
          // بث التوكن فوراً للواجهة بدون انتظار نهاية الجملة الكاملة
          clientSocket.send(JSON.stringify({ event: 'token', data: tokenChunk }));
        });

        // إرسال إشارة اكتمال التوليد بنجاح
        clientSocket.send(JSON.stringify({ event: 'done' }));

      } catch (err: any) {
        clientSocket.send(JSON.stringify({ event: 'error', message: err.message }));
      }
    });
  }
}
