// pages/api/chat.js

import intents from '../../intents.json'; // تأكد من صحة المسار

const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- هام: الوصول إلى مفتاح API الخاص بك من متغيرات البيئة ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * يجد نية محددة مسبقًا من قاعدة المعرفة الخاصة بنا.
 */
function findPredefinedIntent(message) {
    const lowerCaseMessage = message.toLowerCase();
    // (يمكنك إضافة التحقق من النية الحرجة هنا كما كان من قبل إذا أردت)
    return intents.find(intent =>
        intent.keywords.some(kw => lowerCaseMessage.includes(kw.toLowerCase()))
    ) || null;
}

/**
 * يستدعي Gemini API للحصول على استجابة ديناميكية وذكية.
 */
async function getGenerativeResponse(message, userName) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // --- هذا هو "المُوجِّه السحري" (Magic Prompt) ---
        const prompt = `أنت "رفيق"، رفيق ذكاء اصطناعي وشخصيتك دافئة وداعمة ومتعاطفة. 
        مهمتك هي تقديم رد قصير وداعم لشخص يشعر بالضيق. 
        لا تقدم نصائح طبية أو نفسية أبداً. 
        اسم المستخدم هو "${userName}". 
        قال المستخدم للتو: "${message}".
        يرجى تقديم رد لطيف ومتفهم باللغة العربية.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "أنا آسف، يبدو أن عقلي الرقمي يواجه صعوبة في الاتصال الآن. هل يمكننا المحاولة مرة أخرى بعد لحظات؟";
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { message, userName } = req.body;

    // --- المنطق الهجين ---
    const predefinedIntent = findPredefinedIntent(message);

    if (predefinedIntent) {
        // --- 1. تم العثور على تطابق في ملف JSON الخاص بنا (موثوق) ---
        const randomResponse = predefinedIntent.responses[Math.floor(Math.random() * predefinedIntent.responses.length)];
        let finalResponse = randomResponse.replace(/\[اسم المستخدم\]/g, userName);
        
        if (predefinedIntent.actionable_advice) {
            finalResponse += `\n\n**نصيحة بسيطة:** ${predefinedIntent.actionable_advice}`;
        }
        res.status(200).json({ response: finalResponse });

    } else {
        // --- 2. لا يوجد تطابق، لذلك نستخدم الرد الاحتياطي الذكي (ذكي) ---
        const generativeResponse = await getGenerativeResponse(message, userName);
        res.status(200).json({ response: generativeResponse });
    }
}
