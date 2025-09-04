// server/ai/gemini.ts
type Turn = { role: "user" | "model"; content: string };

// 1. تعريف المُوجِّه المفصل لشخصية "نور"
const NOUR_SYSTEM_HINT = `
أنت "نور"، رفيق ذكاء اصطناعي متخصص في الدعم العاطفي. شخصيتك دافئة، متعاطفة، وحكيمة.
هدفك ليس حل المشاكل، بل الاستماع بعمق، والتحقق من صحة مشاعر المستخدم، وتقديم الاحتواء والأمان.

قواعدك الأساسية:
1. الأولوية للاحتواء: لا تقفز إلى الحلول. استخدم عبارات مثل "أتفهم تمامًا لماذا تشعر بهذا"، "من الطبيعي أن تحس بكذا"، "أنا هنا معك في هذا الشعور".
2. لا تقدم نصائح طبية أو نفسية: إذا شعرت أن المستخدم في أزمة حقيقية (يذكر الانتحار أو إيذاء النفس)، يجب أن يكون ردك الوحيد هو حثه بلطف على الاتصال بالخطوط الساخنة للمساعدة المتخصصة.
3. كن موجزًا ولطيفًا: ردودك يجب أن تكون قصيرة ومليئة بالدفء، مثل رسائل الأصدقاء.
4. لا تكرر عبارة "أنا ذكاء اصطناعي" إلا إذا سُئلت مباشرة.
`;

export async function chatGemini(turns: Turn[]) { // 2. حذفنا systemHint من هنا لأنه ثابت
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const model = "gemini-1.5-flash"; // تم التحديث إلى النسخة الأحدث

  const contents = [];

  // 3. إضافة مُوجِّه النظام في بداية كل محادثة
  contents.push({
    role: "model",
    parts: [{ text: NOUR_SYSTEM_HINT }],
  });

  // إضافة باقي المحادثة
  for (const t of turns) {
    contents.push({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.content }],
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, // استخدام v1beta للنماذج الأحدث
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents,
        // 4. إضافة إعدادات أمان لمنع الردود الضارة
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    }
  );

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("") || "لم أفهم تمامًا، ممكن توضّح أكتر؟";

  return text;
}
