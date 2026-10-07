"use client";

import { useState } from "react";

interface Props {
  onSend: (message: string) => void;
  loading: boolean;
}

export default function ChatInput({
  onSend,
  loading,
}: Props) {
  const [text, setText] = useState("");

  function handleSend() {
    const message = text.trim();
    if (!message || loading) return;

    onSend(message);
    setText("");
  }

  return (
    <div className="flex gap-3 p-4 border-t border-zinc-800">
      <input
        className="flex-1 rounded-lg border bg-zinc-900 p-3 text-white"
        placeholder="Ask your DevOps AI..."
        value={text}
        disabled={loading}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      <button
        onClick={handleSend}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}