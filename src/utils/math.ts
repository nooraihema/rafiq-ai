/**
 * @file src/utils/math.ts
 * @project rafiq-ai-core
 * @description Core mathematical helper utilities and scalar activation primitives.
 */

export class MathUtils {
  
  /**
   * دالة التنشيط السيجمويد القياسية على مستوى القيم المفردة (Scalar Sigmoid)
   */
  public static sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * دالة التنشيط ReLU القياسية لحساب القيم المفردة (Scalar ReLU)
   */
  public static relu(x: number): number {
    return Math.max(0, x);
  }

  /**
   * حساب الجير الفراغي (Softplus) المفيد في حسابات بعض المحسنات ودوال التكلفة
   */
  public static softplus(x: number): number {
    return Math.log(1 + Math.exp(x));
  }

  /**
   * توليد أرقام عشوائية تتبع التوزيع الطبيعي (Gaussian/Normal Distribution) عبر تحويل Box-Muller.
   * دالة حاسمة جداً لتهيئة أوزان النموذج (Weight Initialization) قبل التدريب لمنع انفجار أو تلاشي التدرجات.
   */
  public static randomNormal(mean: number = 0, stdDev: number = 1): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); 
    while(v === 0) v = Math.random();
    
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + num * stdDev;
  }
}
