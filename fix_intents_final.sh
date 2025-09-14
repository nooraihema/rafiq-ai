
#!/bin/bash
# fix_intents_final.sh
# A script to automatically fix and diagnose all intents in intents_final

INTENTS_DIR="./intents_final"
SYN_FILE="./synonyms.json"
LOG_FILE="./intents_diagnostic.log"

echo "🛠️ Starting Intent Fix & Diagnostic..." > "$LOG_FILE"
echo "Loaded synonyms from $SYN_FILE" >> "$LOG_FILE"

# Load synonyms into a variable (simple JSON parse with jq)
SYNONYMS=$(jq '.' "$SYN_FILE")

for FILE in "$INTENTS_DIR"/*.json; do
    echo "📂 Processing $FILE..." >> "$LOG_FILE"
    # Read intents array
    INTENTS=$(jq '.intents' "$FILE")
    
    # Loop through intents
    COUNT=$(echo "$INTENTS" | jq 'length')
    for ((i=0;i<COUNT;i++)); do
        TAG=$(echo "$INTENTS" | jq -r ".[$i].tag")
        echo "🔹 Checking intent: $TAG" >> "$LOG_FILE"
        
        # Ensure responses exist
        RESP_COUNT=$(echo "$INTENTS" | jq ".[$i].responses | length")
        if [ "$RESP_COUNT" -eq 0 ]; then
            echo "⚠️ No responses found for $TAG, adding placeholder." >> "$LOG_FILE"
            jq ".intents[$i].responses += [\"[Placeholder response]\"]" "$FILE" > tmp.json && mv tmp.json "$FILE"
        fi

        # Check keywords/synonyms
        KW_COUNT=$(echo "$INTENTS" | jq ".[$i].keywords | length")
        if [ "$KW_COUNT" -eq 0 ]; then
            echo "⚠️ No keywords for $TAG, adding synonyms as keywords." >> "$LOG_FILE"
            # This is a simplified approach: add all synonyms as keywords (you can refine)
            jq ".intents[$i].keywords = $(echo "$SYNONYMS" | jq 'keys')" "$FILE" > tmp.json && mv tmp.json "$FILE"
        fi
    done
done

echo "✅ All intents processed. Diagnostic log saved to $LOG_FILE"


