// Hybrid LLM fetcher with Gemini fallback

export type Turn = { role: "user" | "model"; content: string };

export async function fetchLLM(message: string, history: Turn[] = []) {
  // Try primary LLM first
  try {
    const res = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    const data = await res.json();
    if (data?.reply) return { reply: data.reply, model: "llm" };
    throw new Error("No reply from LLM");
  } catch (err) {
    // Fallback to Gemini
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json();
      if (data?.reply) return { reply: data.reply, model: "gemini" };
      throw new Error("No reply from Gemini");
    } catch (err2) {
      return { reply: "عذرًا، حدث خطأ في الاتصال بالنموذج.", model: "error" };
    }
  }
}