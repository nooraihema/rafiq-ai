
#!/bin/bash
# trace_intents_final_post.sh
# Usage: ./trace_intents_final_post.sh

NODE_SCRIPT=$(cat <<'EOF'
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// رسالة الاختبار عن المشاعر
const testMessage = "أنا حزين ومضايق النهاردة";

// محاولة استيراد chat.js مع دعم export default أو CommonJS
let handler;
try {
    const chatModule = await import(path.join(__dirname, 'api', 'chat.js'));
    handler = chatModule.handler || chatModule.default;
    if (!handler) throw new Error("handler not found in chat.js");
} catch (err) {
    console.error("Failed to import chat.js:", err.message);
    process.exit(1);
}

// استيراد DEBUG من config.js
let DEBUG = true;
try {
    const configModule = await import(path.join(__dirname, 'api', 'config.js'));
    DEBUG = configModule.DEBUG ?? true;
} catch (err) {
    console.warn("Could not import config.js, using DEBUG=true");
}

// Mock res object لدعم res.status().json()
const mockRes = {
    status: (code) => {
        console.log("HTTP status:", code);
        return {
            json: (output) => console.log("\nHandler output:", JSON.stringify(output, null, 2))
        };
    },
    json: (output) => console.log("\nHandler output:", JSON.stringify(output, null, 2))
};

// تشغيل الاختبار
async function runTest(msg) {
    global.DEBUG = DEBUG;

    console.log("\n=== START TEST ===");
    console.log("Input message:", msg);

    // ضبط method: "POST" لتجنب خطأ 405
    const req = { body: { message: msg, userId: "test_user" }, method: "POST" };
    await handler(req, mockRes);

    console.log("\n=== END TEST ===\n");
}

runTest(testMessage);
EOF
)

echo "$NODE_SCRIPT" | node -

