"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  messageCount: number;
}

const mockChats: Chat[] = [
  {
    id: "1",
    title: "React Hooks best practices",
    createdAt: new Date(),
    messageCount: 12,
  },
  {
    id: "2",
    title: "Quantum computing explanation",
    createdAt: new Date(Date.now() - 86400000),
    messageCount: 8,
  },
  {
    id: "3",
    title: "TypeScript advanced types",
    createdAt: new Date(Date.now() - 172800000),
    messageCount: 15,
  },
];

export default function ChatsPage() {
  const [chats] = useState<Chat[]>(mockChats);

  const handleDeleteChat = (id: string) => {
    console.log("Deleting chat:", id);
  };

  return (
    <div className="flex size-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Chat History</h1>
        <p className="text-muted-foreground text-sm">
          View and manage your previous conversations
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {chats.length === 0 ? (
          <div className="flex size-full flex-col items-center justify-center gap-4 text-center">
            <MessageSquare className="text-muted-foreground size-16" />
            <div>
              <h3 className="font-medium text-lg">No chats yet</h3>
              <p className="text-muted-foreground text-sm">
                Start a conversation to see your chat history
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{chat.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {chat.messageCount} messages •{" "}
                      {chat.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteChat(chat.id)}
                  className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
