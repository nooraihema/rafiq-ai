
#!/bin/bash
# trace_intents_final.sh
# Usage: ./trace_intents_final.sh

NODE_SCRIPT=$(cat <<'EOF'
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Path helpers
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

// الدالة لتشغيل الاختبار
async function runTest(msg) {
    global.DEBUG = DEBUG;

    console.log("\n=== START TEST ===");
    console.log("Input message:", msg);

    const req = { body: { message: msg, userId: "test_user" } };
    const res = {
        json: (output) => console.log("\nHandler output:", JSON.stringify(output, null, 2)),
    };

    await handler(req, res);

    console.log("\n=== END TEST ===\n");
}

runTest(testMessage);
EOF
)

echo "$NODE_SCRIPT" | node -

