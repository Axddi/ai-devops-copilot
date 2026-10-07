"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import { sendChatMessage } from "@/lib/api";

export default function ChatWindow() {
  const {
    messages,
    setMessages,
    loading,
    setLoading,
  } = useChat();
  const [error, setError] = useState<string | null>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollContainer.current?.scrollTo({
      top: scrollContainer.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, error]);

  async function sendMessage(text: string) {
    if (loading) return;

    const history = messages.slice(-20).map(({ role, content }) => ({ role, content }));
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      },
    ]);
    setError(null);
    setLoading(true);
    try {
      const data = await sendChatMessage({ message: text, history });
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the AI backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[85vh] flex-col rounded-xl border border-zinc-800 bg-zinc-950">
      <div
        ref={scrollContainer}
        className="flex-1 overflow-y-auto p-6"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
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
        {loading && (
          <p className="mb-4 text-sm text-zinc-400" role="status">
            Assistant is thinking…
          </p>
        )}
      </div>

      <ChatInput
        onSend={sendMessage}
        loading={loading}
      />
    </div>
  );
}