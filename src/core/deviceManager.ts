/**
 * @file src/core/deviceManager.ts
 * @project rafiq-ai-core
 * @description Central manager to detect, initialize, and switch between active hardware backends.
 */

import { IHardwareBackend } from './backend.interface';
import { CpuBackend } from './cpuBackend';
import { WebgpuBackend } from './webgpuBackend';
import { DeviceType } from './types';

export class DeviceManager {
  private static instance: DeviceManager;
  private backends: Map<DeviceType, IHardwareBackend> = new Map();
  private currentDevice: DeviceType = 'cpu';

  private constructor() {
    // تسجيل الأجهزة المتاحة في النظام عند الإقلاع
    this.backends.set('cpu', new CpuBackend());
    this.backends.set('webgpu', new WebgpuBackend());
  }

  // تطبيق نمط الـ Singleton لضمان وجود مدير واحد فقط للعتاد في كامل المحرك
  public static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  // تحديد الجهاز النشط حالياً (مثلاً للتحويل إلى CPU عند ضعف الموارد)
  public setDevice(device: DeviceType): void {
    if (!this.backends.has(device)) {
      throw new Error(`Device [${device}] is not registered or supported.`);
    }
    this.currentDevice = device;
  }

  // جلب اسم الجهاز النشط
  public getCurrentDeviceType(): DeviceType {
    return this.currentDevice;
  }

  // جلب المحرك الرياضي الفعلي للجهاز النشط (يستدعيه الموجه المركزي ops.ts)
  public getActiveBackend(): IHardwareBackend {
    const backend = this.backends.get(this.currentDevice);
    if (!backend) {
      throw new Error(`No backend found for active device: ${this.currentDevice}`);
    }
    return backend;
  }
}
