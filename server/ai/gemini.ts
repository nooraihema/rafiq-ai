// server/ai/gemini.ts
type Turn = { role: "user" | "model"; content: string };

export async function chatGemini(turns: Turn[], systemHint?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const model = "gemini-1.5-flash-002"; // stable as of now

  const contents = [];

  if (systemHint) {
    // Optional: prime the conversation by sending a model "assistant" hint first
    contents.push({
      role: "model",
      parts: [{ text: systemHint }],
    });
  }

  for (const t of turns) {
    contents.push({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.content }],
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("") || "لم أفهم تمامًا، ممكن توضّح أكتر؟";

  return text;
}