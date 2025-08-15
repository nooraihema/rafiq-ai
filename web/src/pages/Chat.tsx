
import React, { useState, useRef } from "react";
import { fetchLLM, Turn } from "../lib/llm";
import { ChatBubble } from "../components/ChatBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import { VoiceInput } from "../components/VoiceInput";

export const ChatPage: React.FC = () => {
  const [history, setHistory] = useState<Turn[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastModel, setLastModel] = useState<"llm" | "gemini" | "error" | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if (!message.trim()) return;
    setHistory((h) => [...h, { role: "user", content: message }]);
    setLoading(true);
    setLastModel(undefined);

    const res = await fetchLLM(message, history);
    setHistory((h) => [...h, { role: "model", content: res.reply }]);
    setLoading(false);
    setLastModel(res.model);
    setMessage("");
    inputRef.current?.focus();
  };

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem" }}>
      <h2 style={{ textAlign: "center" }}>الدردشة مع نور</h2>
      <div style={{ minHeight: 300, marginBottom: "1rem" }}>
        {history.map((turn, i) => (
          <ChatBubble
            key={i}
            content={turn.content}
            from={turn.role}
            modelType={turn.role === "model" ? lastModel : undefined}
          />
        ))}
        {loading && <TypingIndicator />}
      </div>
      <form
        style={{ display: "flex", gap: "0.5rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          ref={inputRef}
          value={message}
          disabled={loading}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب رسالتك هنا..."
          style={{
            flex: 1,
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />
        <VoiceInput
          onResult={(text) => {
            setMessage(text);
            inputRef.current?.focus();
          }}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          style={{
            padding: "0 1.5rem",
            borderRadius: "8px",
            background: "#4285F4",
            color: "#fff",
            border: "none",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          إرسال
        </button>
      </form>
    </main>
  );
};
