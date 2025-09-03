// /api/chat.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const intents = require('../intents.json'); // Vercel can handle this import

// الوصول إلى المفتاح السري من متغيرات البيئة على Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function findPredefinedIntent(message) {
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

// هذه هي الدالة الرئيسية التي ستتعامل مع الطلبات
module.exports = async (req, res) => {
    // التأكد من أن الطلب هو POST
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
        
        // إرسال الرد بنجاح
        res.status(200).json({ response: botResponse });

    } catch (error) {
        console.error("Error in API handler:", error);
        res.status(500).json({ response: "حدث خطأ غير متوقع في الخادم." });
    }
};
