// server/routes/ai.ts

import express from "express";
import { chatGemini } from "../ai/gemini";
import intents from "../../intents.json"; // 1. استيراد قاعدة المعرفة

export const aiRouter = express.Router();

// 2. دالة بسيطة لمطابقة النوايا
function findPredefinedIntent(message: string) {
    const lowerCaseMessage = message.toLowerCase();
    return intents.find(intent =>
        intent.keywords.some(kw => lowerCaseMessage.includes(kw))
    ) || null;
}

aiRouter.post("/chat", async (req, res) => {
  try {
    // لاحظ أننا نستخدم "message" هنا بدلاً من "history" لأننا نقيم الرسالة الأخيرة
    const { message, history } = req.body;

    // 3. المنطق الهجين يبدأ هنا
    const predefinedIntent = findPredefinedIntent(message);

    // 3.1: التحقق من الحالات الحرجة أولاً
    if (predefinedIntent?.safety_protocol === "CRITICAL") {
      console.log("CRITICAL INTENT DETECTED:", predefinedIntent.intent);
      // أضف أرقام الطوارئ المحلية هنا
      const criticalResponse = predefinedIntent.responses[0] + "\n- الخط الساخن: [الرقم هنا]\n- الطوارئ: [الرقم هنا]";
      return res.json({ reply: criticalResponse });
    }

    // 3.2: التحقق من الحالات الشائعة
    if (predefinedIntent) {
      console.log("Predefined intent found:", predefinedIntent.intent);
      // اختر ردًا عشوائيًا من الردود الموثوقة
      const randomResponse = predefinedIntent.responses[Math.floor(Math.random() * predefinedIntent.responses.length)];
      return res.json({ reply: randomResponse });
    }

    // 3.3: إذا لم يوجد تطابق، نذهب إلى Gemini
    console.log("No predefined intent found, calling Gemini.");
    const reply = await chatGemini(history || []); // لا نرسل المُوجِّه البسيط الآن، سنطوره في الخطوة التالية
    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "حصل خطأ أثناء الاتصال بالذكاء الاصطناعي." });
  }
});
