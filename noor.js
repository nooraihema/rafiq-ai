
// ChatPageLocal.tsx
import React, { useState, useRef, useEffect } from "react";

type Turn = { role: "user" | "model"; content: string };
type KnowledgeItem = { keywords: string[]; replies: string[] };

export const ChatPageLocal: React.FC = () => {
  const [history, setHistory] = useState<Turn[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // تحميل قاعدة المعرفة من ملف JSON
  useEffect(() => {
    fetch("/knowledge.json")
      .then((res) => res.json())
      .then((data) => setKnowledge(data))
      .catch((err) => console.error("خطأ في تحميل knowledge:", err));
  }, []);

  const getLocalReply = (msg: string): string => {
    msg = msg.toLowerCase();
    for (let item of knowledge) {
      if (item.keywords.some((k) => msg.includes(k))) {
        return item.replies[Math.floor(Math.random() * item.replies.length)];
      }
    }
    return "مش فاهم قصدك، ممكن توضح أكتر؟ 🤔";
  };

  const send = async () => {
    if (!message.trim()) return;
    const userTurn: Turn = { role: "user", content: message };
    setHistory((h) => [...h, userTurn]);
    setLoading(true);

    const resReply = getLocalReply(message);

    setTimeout(() => {
      setHistory((h) => [...h, { role: "model", content: resReply }]);
      setMessage("");
      setLoading(false);
      inputRef.current?.focus();
    }, 500);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem" }}>
      <h2 style={{ textAlign: "center" }}>الدردشة مع نور (قاعدة معرفة)</h2>
      <div
        id="chat-box"
        style={{
          minHeight: 300,
          marginBottom: "1rem",
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        {history.map((turn, i) => (
          <div
            key={i}
            style={{
              textAlign: turn.role === "user" ? "right" : "left",
              margin: "0.5rem 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                borderRadius: "12px",
                background: turn.role === "user" ? "#4285F4" : "#E0E0E0",
                color: turn.role === "user" ? "#fff" : "#000",
              }}
            >
              {turn.content}
            </span>
          </div>
        ))}
        {loading && <div>…نور تكتب</div>}
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
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب رسالتك هنا..."
          style={{
            flex: 1,
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          style={{
            padding: "0 1.5rem",
            borderRadius: 8,
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
    </div>
  );
};

