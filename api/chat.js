// /api/chat.js

const path = require('path');
const fs = require('fs'); // سنستخدم النسخة العادية (المتزامنة) لتبسيط الأمر
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ======== التعديل الحاسم هنا ========
// نقوم بقراءة وتحليل الملف مرة واحدة عند بدء تشغيل الخادم
let intents = [];
try {
    const jsonFilePath = path.join(process.cwd(), 'intents.json');
    const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
    intents = JSON.parse(fileContent);
} catch (error) {
    console.error("Could not read intents.json:", error);
}
// ===================================


function findPredefinedIntent(message) {
    // نتأكد من أن intents هي مصفوفة قبل استخدامها
    if (!Array.isArray(intents)) {
        return null;
    }
    const lowerCaseMessage = message.toLowerCase();
    return intents.find(intent =>
        intent.keywords.some(kw => lowerCaseMessage.includes(kw.toLowerCase()))
    ) || null;
}

async function getGenerativeResponse(message, userName) {
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

        // الآن نستخدم المتغير intents الذي تم تحميله مسبقًا
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
};
