// fix_intents_final_node.js
// Node.js script to fix and diagnose all intents_final JSON files

import fs from "fs";
import path from "path";

const INTENTS_DIR = "./intents_final";
const SYN_FILE = "./synonyms.json";
const LOG_FILE = "./intents_diagnostic.log";

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + "\n");
}

// Load synonyms
let synonyms = {};
if (fs.existsSync(SYN_FILE)) {
    synonyms = JSON.parse(fs.readFileSync(SYN_FILE, "utf-8"));
    log(`Loaded synonyms from ${SYN_FILE}`);
} else {
    log(`⚠️ Synonyms file not found: ${SYN_FILE}`);
}

// Clear previous log
fs.writeFileSync(LOG_FILE, "🛠️ Starting Intent Fix & Diagnostic...\n");

const files = fs.readdirSync(INTENTS_DIR).filter(f => f.endsWith(".json"));

for (const file of files) {
    const filePath = path.join(INTENTS_DIR, file);
    log(`📂 Processing ${filePath}...`);

    let data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(data)) {
        log(`⚠️ Skipping ${file}, not a JSON array`);
        continue;
    }

    let modified = false;

    data.forEach((intent, index) => {
        const tag = intent.tag || `intent_${index}`;
        log(`🔹 Checking intent: ${tag}`);

        // Ensure responses exist
        if (!Array.isArray(intent.responses) || intent.responses.length === 0) {
            log(`⚠️ No responses found for ${tag}, adding placeholder.`);
            intent.responses = ["[Placeholder response]"];
            modified = true;
        }

        // Ensure keywords exist
        if (!Array.isArray(intent.keywords) || intent.keywords.length === 0) {
            log(`⚠️ No keywords for ${tag}, adding synonyms as keywords.`);
            intent.keywords = Object.keys(synonyms);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
        log(`✅ Updated ${file}`);
    } else {
        log(`✅ No changes needed for ${file}`);
    }
}

log("✅ All intents processed. Diagnostic log saved to ./intents_diagnostic.log");


