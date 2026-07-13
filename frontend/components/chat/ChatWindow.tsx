"use client";

import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { useChat } from "@/hooks/useChat";

export default function ChatWindow() {
  const {
    messages,
    setMessages,
    loading,
  } = useChat();

async function sendMessage(text: string) {
  setMessages((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    },
  ]);

  try {
  const res = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: text,
    }),
  });

  console.log("Status:", res.status);

  const data = await res.json();

  console.log(data);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Unable to connect to AI backend.",
        timestamp: new Date().toISOString(),
      },
    ]);
  }
}

  return (
    <div className="flex h-[85vh] flex-col rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-32">
            <h2 className="text-2xl font-semibold">
              AI DevOps Assistant
            </h2>

            <p className="mt-2">
              Ask anything about Kubernetes,
              AWS, Terraform, Docker or your
              running cluster.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
          />
        ))}
      </div>

      <ChatInput
        onSend={sendMessage}
        loading={loading}
      />
    </div>
  );
}