
#!/bin/bash
# trace_intents.sh
# Usage: ./trace_intents.sh

NODE_SCRIPT=$(cat <<'EOF'
import { handler } from './api/chat.js';
import { DEBUG } from './api/config.js';

// رسالة الاختبار عن المشاعر
const testMessage = "أنا حزين ومضايق النهاردة";

async function runTest(msg) {
    // Enable debug
    global.DEBUG = true;

    console.log("\n=== START TEST ===");
    console.log("Input message:", msg);

    // محاكاة طلب API
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



