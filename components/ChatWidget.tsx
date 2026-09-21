"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "bot"; text: string };

export default function ChatWidget({ productSlug, productName }: { productSlug: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: `Chào bạn! Mình có thể tư vấn về ${productName} — hỏi mình về chất liệu, size, giao hàng... nhé.` }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, text }];
    setMsgs(next);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          history: next.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }))
        })
      });
      const data = await res.json();
      setMsgs((cur) => [...cur, { role: "bot", text: data.reply || "Xin lỗi, mình chưa trả lời được, bạn thử lại nhé." }]);
    } catch {
      setMsgs((cur) => [...cur, { role: "bot", text: "Kết nối lỗi, bạn thử lại hoặc gọi hotline giúp shop nhé." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="chat-window">
          <div className="chat-head">Tư vấn viên AI</div>
          <div className="chat-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role === "user" ? "user" : "bot"}`}>
                {m.text}
              </div>
            ))}
            {sending && <div className="chat-msg bot">Đang trả lời...</div>}
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Nhập câu hỏi..."
            />
            <button onClick={send}>Gửi</button>
          </div>
        </div>
      )}
      <button className="chat-bubble" onClick={() => setOpen((v) => !v)} aria-label="Chat tư vấn">
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
