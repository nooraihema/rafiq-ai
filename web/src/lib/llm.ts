
// Hybrid LLM fetcher using Gemini directly, now uses the last 3 exchanges as context

export type Turn = { role: "user" | "model"; content: string };

export async function fetchLLM(message: string, history: Turn[] = []) {
  // Use only the last 3 exchanges (user+model pairs) as context
  const lastExchanges: Turn[] = getLastExchanges(history, 3);

  try {
    // Direct call to Gemini API
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: lastExchanges }),
    });

    const data = await res.json();
    if (data?.reply) return { reply: data.reply, model: "gemini" };
    throw new Error("No reply from Gemini");
  } catch (err) {
    return { reply: "عذرًا، حدث خطأ في الاتصال بـ Gemini.", model: "error" };
  }
}

// Helper: get last N exchanges (user+model pairs)
function getLastExchanges(history: Turn[], numPairs: number): Turn[] {
  const pairs: Turn[][] = [];
  for (let i = 0; i < history.length - 1; i += 2) {
    if (history[i].role === "user" && history[i + 1]?.role === "model") {
      pairs.push([history[i], history[i + 1]]);
    }
  }
  // Take last N pairs and flatten
  return pairs.slice(-numPairs).flat();
}
