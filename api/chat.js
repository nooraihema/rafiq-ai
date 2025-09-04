// /api/chat.js - نسخة التشخيص

const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
    console.log("--- [1] API Function Started ---");

    // الخطوة أ: التحقق من مفتاح API
    console.log("--- [2] Checking Environment Variable ---");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("FATAL ERROR: The GEMINI_API_KEY environment variable is NOT DEFINED.");
        // إذا رأيت هذا الخطأ في السجلات، فالمشكلة في ربط المفتاح
        return res.status(500).json({ 
            error_code: "ENV_VAR_MISSING",
            message: "خطأ في إعدادات الخادم: مفتاح API غير موجود." 
        });
    }
    console.log("SUCCESS: API Key was found. Length: " + apiKey.length);


    // الخطوة ب: التحقق من قراءة ملف intents.json
    console.log("--- [3] Reading intents.json file ---");
    let intents;
    try {
        const jsonFilePath = path.join(process.cwd(), 'intents.json');
        const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
        intents = JSON.parse(fileContent);
        console.log(`SUCCESS: intents.json was read successfully. Found ${intents.length} intents.`);
    } catch (error) {
        console.error("FATAL ERROR: Failed to read or parse intents.json.", error);
        // إذا رأيت هذا الخطأ، فالمشكلة في مكان ملف intents.json
        return res.status(500).json({ 
            error_code: "INTENTS_FILE_ERROR",
            message: "خطأ في إعدادات الخادم: لا يمكن قراءة قاعدة المعرفة." 
        });
    }

    // الخطوة ج: محاولة تهيئة مكتبة Google AI
    console.log("--- [4] Initializing GoogleGenerativeAI ---");
    let genAI;
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        console.log("SUCCESS: GoogleGenerativeAI initialized.");
    } catch(error) {
        console.error("FATAL ERROR: Failed to initialize GoogleGenerativeAI.", error);
        // إذا رأيت هذا الخطأ، فالمشكلة في المكتبة نفسها
        return res.status(500).json({ 
            error_code: "LIBRARY_INIT_FAILED",
            message: "خطأ في إعدادات الخادم: فشل في تهيئة مكتبة الذكاء الاصطناعي."
        });
    }


    // إذا وصلنا إلى هنا، فهذا يعني أن كل الإعدادات سليمة
    console.log("--- [5] All configurations seem OK. Sending test response. ---");
    return res.status(200).json({ 
        response: "مرحباً! وضع التشخيص يعمل بنجاح. كل الإعدادات سليمة. المشكلة كانت غالباً في ذاكرة التخزين المؤقت وتحتاج لإعادة نشر أخيرة بالكود الصحيح." 
    });
};
