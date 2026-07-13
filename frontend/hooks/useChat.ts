"use client";

import { useState } from "react";
import { ChatMessage } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  return {
    messages,
    setMessages,
    loading,
    setLoading,
  };
}