import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Ẹ káàbọ̀! Sannu da zuwa! Nnọọ! I am your N-ATLaS Multilingual AI assistant. Ask me anything in Yorùbá, Hausa, Igbo, or English.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-app">
      <header className="chat-header">
        <span>🇳🇬 N-ATLaS Multilingual AI</span>
        <span style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: "normal", marginLeft: "8px" }}>
          Yorùbá • Hausa • Igbo • English
        </span>
      </header>

      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            <div className={`bubble ${m.role}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="bubble-row assistant">
            <div className="bubble assistant typing">...</div>
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <div ref={bottomRef} />
        <form className="chat-input-row" onSubmit={sendMessage}>
          <div className="chat-input-shell">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
            />
            <button
              type="submit"
              className="send-button"
              aria-label="Send message"
              disabled={loading || !input.trim()}
            >
              →
            </button>
          </div>
        </form>
      </div>

      
    </div>
  );
}
