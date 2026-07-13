"use client";

import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-black p-8">
      <h1 className="mb-6 text-3xl font-bold text-white">
        AI DevOps Assistant
      </h1>

      <ChatWindow />
    </main>
  );
}