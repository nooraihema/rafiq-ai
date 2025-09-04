// /api/chat.js - النسخة الكاملة والصحيحة والآمنة

const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// =================================================================
//                 ===> الطريقة الصحيحة والآمنة <===
// الكود يقرأ المفتاح من إعدادات Vercel، لا تضع أي مفتاح هنا.
const API_KEY = process.env.GEMINI_API_KEY;
// =================================================================

let intents = [];
let genAI;

// نقوم بالتحقق من المفتاح عند بدء التشغيل
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    // هذا السجل سيظهر في Vercel Logs إذا لم يتم العثور على المفتاح
    console.error("CRITICAL: GEMINI_API_KEY environment variable is not set or not found!");
}

try {
    const jsonFilePath = path.join(process.cwd(), 'intents.json');
    const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
    intents = JSON.parse(fileContent);
} catch (error)
 {
    console.error("Could not read intents.json on server startup:", error);
}

function findPredefinedIntent(message) {
    if (!Array.isArray(intents)) return null;
    const lowerCaseMessage = message.toLowerCase();
    return intents.find(intent =>
        intent.keywords.some(kw => lowerCaseMessage.includes(kw))
    ) || null;
}

async function getGenerativeResponse(message, userName) {
    // نتأكد من أن المكتبة تم تهيئتها بنجاح
    if (!genAI) {
        return "عذرًا، هناك مشكلة في إعدادات الخادم (لم يتم العثور على مفتاح API). يرجى التأكد من إضافته في إعدادات Vercel.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `أنت "رفيق"، رفيق ذكاء اصطناعي وشخصيتك دافئة وداعمة ومتعاطفة. 
        مهمتك هي تقديم رد قصير وداعم لشخص يشعر بالضيق. 
        لا تقدم نصائح طبية أو نفسية أبداً. 
        اسم المستخدم هو "${userName}". 
        قال المستخدم للتو: "${message}".
        يرجى تقديم رد لطيف ومتفهم باللغة العربية.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in getGenerativeResponse:", error);
        return "أنا آسف، يبدو أن هناك ضغطًا على عقلي الرقمي الآن. هل يمكننا المحاولة مرة أخرى؟";
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const { message, userName } = req.body;
        if (!message || !userName) {
            return res.status(400).json({ message: 'Message and userName are required.' });
        }
        const predefinedIntent = findPredefinedIntent(message);
        let botResponse;
        if (predefinedIntent) {
            const randomResponse = predefinedIntent.responses[Math.floor(Math.random() * predefinedIntent.responses.length)];
            botResponse = randomResponse.replace(/\[اسم المستخدم\]/g, userName);
            if (predefinedIntent.actionable_advice) {
                botResponse += `\n\n**نصيحة بسيطة:** ${predefinedIntent.actionable_advice}`;
            }
        } else {
            botResponse = await getGenerativeResponse(message, userName);
        }
        res.status(200).json({ response: botResponse });
    } catch (error) {
        console.error("Error in API handler:", error);
        res.status(500).json({ response: "حدث خطأ غير متوقع في الخادم." });
    }
}; // تأكد من أن هذا القوس والفاصلة المنقوطة موجودان في النهاية
