
export type Turn = { role: "user" | "model"; content: string };

export async function fetchLLM(message: string, history: Turn[] = []) {
  const lastExchanges: Turn[] = getLastExchanges(history, 3);

  // نروح مباشرة على Gemini
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: lastExchanges }),
  });

  const data = await res.json();

  // لو Gemini مش بيرد، التطبيق ميبعتش أي رد
  if (!data?.reply) {
    console.error("Gemini لم يرد، التطبيق توقف");
    return null; // هنا مفيش أي reply
  }

  return { reply: data.reply, model: "gemini" };
}

// Helper: get last N exchanges
function getLastExchanges(history: Turn[], numPairs: number): Turn[] {
  const pairs: Turn[][] = [];
  for (let i = 0; i < history.length - 1; i += 2) {
    if (history[i].role === "user" && history[i + 1]?.role === "model") {
      pairs.push([history[i], history[i + 1]]);
    }
  }
  return pairs.slice(-numPairs).flat();
}
