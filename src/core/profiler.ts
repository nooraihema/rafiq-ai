/**
 * @file src/core/profiler.ts
 * @project rafiq-ai-core
 * @description High-precision performance profiler to measure execution time and memory load.
 */

import { DeviceManager } from './deviceManager';
import { LogContext } from './types';

interface ProfileRecord {
  name: string;
  device: string;
  startTime: number;
  duration?: number;
  memoryBefore?: number;
  memoryAfter?: number;
}

export class Profiler {
  private static instance: Profiler;
  private records: Map<string, ProfileRecord> = new Map();
  private isEnabled: boolean = true;

  private constructor() {}

  public static getInstance(): Profiler {
    if (!Profiler.instance) {
      Profiler.instance = new Profiler();
    }
    return Profiler.instance;
  }

  /**
   * بدء تسجيل عملية برمجية/رياضية معينة
   */
  public start(name: string, context: LogContext): void {
    if (!this.isEnabled) return;

    const device = DeviceManager.getInstance().getCurrentDeviceType();
    const recordKey = `${context.component}_${context.action}_${name}`;

    // حساب استهلاك الذاكرة الحالية إذا كان المتصفح يدعم ذلك (مفيدة جداً للهواتف)
    const memInfo = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;

    this.records.set(recordKey, {
      name,
      device,
      startTime: performance.now(),
      memoryBefore: memInfo
    });
  }

  /**
   * إنهاء التسجيل وحساب الوقت المستغرق وفارق الذاكرة فوراً
   */
  public end(name: string, context: LogContext): void {
    if (!this.isEnabled) return;

    const recordKey = `${context.component}_${context.action}_${name}`;
    const record = this.records.get(recordKey);

    if (!record) return;

    record.duration = performance.now() - record.startTime;
    
    const memInfo = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    record.memoryAfter = memInfo;

    // طباعة النتيجة فوراً بصيغة مهيكلة للـ Logs
    this.flush(record, context);
  }

  /**
   * طباعة تقرير الأداء على الشاشة بصيغة واضحة وسريعة القراءة
   */
  private flush(record: ProfileRecord, context: LogContext): void {
    const timeStr = record.duration!.toFixed(3);
    let memStr = 'N/A';

    if (record.memoryBefore && record.memoryAfter) {
      const diffMB = (record.memoryAfter - record.memoryBefore) / (1024 * 1024);
      memStr = `${diffMB > 0 ? '+' : ''}${diffMB.toFixed(2)} MB`;
    }

    console.log(
      `⏱️ [PROFILE] [${context.component}] [${record.device.toUpperCase()}] ` +
      `Action: ${context.action} | Name: ${record.name} | Time: ${timeStr}ms | Mem: ${memStr}`
    );
  }

  public setEnable(status: boolean): void {
    this.isEnabled = status;
  }
}
