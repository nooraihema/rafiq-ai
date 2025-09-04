// /api/chat.js - النسخة النهائية والبسيطة جدًا للتأكد من صحة المفتاح

const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// =================================================================
//                 ===> التعديل الوحيد المطلوب هنا <===
// 
// 1. احذف هذا السطر بأكمله.
// 2. اكتب مكانه: const API_KEY = "ثم الصق مفتاحك السري الجديد هنا بين علامتي الاقتباس";
//
const API_KEY = "
AIzaSyAUN8Bepd6DNNnQyVVy2-ZlWU86et7eJPQ"; 
//
// =================================================================

const genAI = new GoogleGenerativeAI(API_KEY);

// بقية الكود لا تحتاج إلى أي تعديل
let intents = [];
try {
    const jsonFilePath = path.join(process.cwd(), 'intents.json');
    const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
    intents = JSON.parse(fileContent);
} catch (error) {
    console.error("Could not read intents.json on server startup:", error);
}

function findPredefinedIntent(message) {
    if (!Array.isArray(intents)) return null;
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
