/**
 * @file src/utils/logger.ts
 * @project rafiq-ai-core
 * @description Centralized, level-based logging utility for engine debugging and execution tracing.
 */

import { LogContext } from '../core/types';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class Logger {
  private static currentLevel: LogLevel = 'INFO';

  public static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * طباعة السجلات العادية لتتبع سير العمليات (Info)
   */
  public static info(message: string, context: LogContext): void {
    if (this.shouldLog('INFO')) {
      console.log(`ℹ️ [INFO] [${context.component}] [${context.file} -> ${context.action}]: ${message}`);
    }
  }

  /**
   * طباعة التحذيرات التي لا توقف المحرك ولكن يجب الانتباه لها (Warning)
   */
  public static warn(message: string, context: LogContext): void {
    if (this.shouldLog('WARN')) {
      console.warn(`⚠️ [WARN] [${context.component}] [${context.file} -> ${context.action}]: ${message}`);
    }
  }

  /**
   * طباعة الأخطاء الحرجة التي تسبب توقف العمليات (Error)
   */
  public static error(message: string, context: LogContext): void {
    if (this.shouldLog('ERROR')) {
      console.error(`🚨 [ERROR] [${context.component}] [${context.file} -> ${context.action}]: ${message}`);
    }
  }

  /**
   * طباعة تفاصيل التشخيص العميقة جداً الخاصة بالمطور (Debug)
   */
  public static debug(message: string, context: LogContext): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(`🔍 [DEBUG] [${context.component}] [${context.file} -> ${context.action}]: ${message}`);
    }
  }

  /**
   * فحص أولويات طباعة السجلات بناءً على المستوى الحالي للمحرك
   */
  private static shouldLog(level: LogLevel): boolean {
    const priorities: Record<LogLevel, number> = {
      'DEBUG': 0,
      'INFO': 1,
      'WARN': 2,
      'ERROR': 3
    };
    return priorities[level] >= priorities[this.currentLevel];
  }
}
