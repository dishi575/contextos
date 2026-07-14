"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useChatStore, TraceItem } from "@/lib/store";
import {
  sendMessage,
  getSessions,
  getMessages,
  deleteSession,
  createTraceSocket,
} from "@/lib/api";
import TracePanel from "@/components/TracePanel";

export default function DemoPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const {
    sessions,
    activeSessionId,
    messages,
    liveTraces,
    isLoading,
    setSessions,
    setActiveSession,
    setMessages,
    addMessage,
    appendLiveTrace,
    clearLiveTraces,
    setLoading,
  } = useChatStore();

  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) router.push("/auth/login");
  }, [token, router]);

  // Load sessions on mount
  useEffect(() => {
    if (!token) return;
    getSessions().then((res) => setSessions(res.data));
  }, [token, setSessions]);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;
    const ws = createTraceSocket(
      token,
      (trace) => appendLiveTrace(trace as TraceItem),
    );
    wsRef.current = ws;
    return () => ws.close();
  }, [token, appendLiveTrace]);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectSession = async (sessionId: number) => {
    setActiveSession(sessionId);
    const res = await getMessages(sessionId);
    setMessages(res.data);
  };

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: number
  ) => {
    e.stopPropagation();
    await deleteSession(sessionId);
    const res = await getSessions();
    setSessions(res.data);
    if (activeSessionId === sessionId) {
      setActiveSession(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    clearLiveTraces();
    setLoading(true);

    // Optimistically add user message
    addMessage({
      id: Date.now(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    });

    try {
      const res = await sendMessage(
        userMessage,
        activeSessionId || undefined
      );
      const data = res.data;

      // Update session
      if (!activeSessionId) {
        setActiveSession(data.session_id);
        const sessRes = await getSessions();
        setSessions(sessRes.data);
      }

      // Add assistant response
      addMessage({
        id: data.message_id + 1,
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      });
    } catch {
      addMessage({
        id: Date.now(),
        role: "assistant",
        content: "Something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#0a0f1e" }}
    >
      {/* Sidebar */}
      <div
        className="w-64 flex flex-col flex-shrink-0"
        style={{
          background: "#0d1526",
          borderRight: "1px solid #1e3a5f",
        }}
      >
        {/* Logo */}
        <div
          className="px-5 py-4 flex items-center gap-2"
          style={{ borderBottom: "1px solid #1e3a5f" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: "#2563eb" }}
          >
            C
          </div>
          <span
            className="font-semibold text-sm"
            style={{ color: "#f0f4ff" }}
          >
            ContextOS
          </span>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={() => {
              setActiveSession(null);
              clearLiveTraces();
            }}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-left transition-all"
            style={{
              background: "#111d35",
              border: "1px solid #1e3a5f",
              color: "#f0f4ff",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = "#2563eb")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = "#1e3a5f")
            }
          >
            + New conversation
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className="group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-all"
              style={{
                background:
                  activeSessionId === session.id
                    ? "#111d35"
                    : "transparent",
                border:
                  activeSessionId === session.id
                    ? "1px solid #1e3a5f"
                    : "1px solid transparent",
              }}
            >
              <span
                className="text-xs truncate flex-1"
                style={{
                  color:
                    activeSessionId === session.id ? "#f0f4ff" : "#6b8cba",
                }}
              >
                {session.title || "Untitled"}
              </span>
              <button
                onClick={(e) => handleDeleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 text-xs ml-2 transition-opacity"
                style={{ color: "#ef4444" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* User info + logout */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid #1e3a5f" }}
        >
          <span
            className="text-xs truncate flex-1"
            style={{ color: "#6b8cba" }}
          >
            {user?.email}
          </span>
          <button
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
            className="text-xs ml-2 transition-colors"
            style={{ color: "#ef4444" }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #1e3a5f" }}
        >
          <div>
            <h1
              className="text-sm font-semibold"
              style={{ color: "#f0f4ff" }}
            >
              {activeSessionId ? "Conversation" : "New conversation"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#6b8cba" }}>
              Powered by ContextOS middleware pipeline
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: "#111d35",
              border: "1px solid #1e3a5f",
              color: "#6b8cba",
            }}
          >
            Dashboard →
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: "#0d1526",
                  border: "1px solid #1e3a5f",
                }}
              >
                ⚡
              </div>
              <div className="text-center">
                <p
                  className="font-medium text-sm"
                  style={{ color: "#f0f4ff" }}
                >
                  ContextOS is ready
                </p>
                <p className="text-xs mt-1" style={{ color: "#6b8cba" }}>
                  Send a message — watch the pipeline trace on the right
                </p>
              </div>
              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  "PII Guard",
                  "Semantic Memory",
                  "Token Compression",
                  "Model Routing",
                  "Toxicity Validation",
                ].map((f) => (
                  <span
                    key={f}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      background: "#0d1526",
                      border: "1px solid #1e3a5f",
                      color: "#6b8cba",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={
                  msg.role === "user"
                    ? {
                        background: "#2563eb",
                        color: "#fff",
                        borderBottomRightRadius: "4px",
                      }
                    : {
                        background: "#0d1526",
                        border: "1px solid #1e3a5f",
                        color: "#f0f4ff",
                        borderBottomLeftRadius: "4px",
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "#0d1526",
                  border: "1px solid #1e3a5f",
                  borderBottomLeftRadius: "4px",
                }}
              >
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        background: "#2563eb",
                        animationDelay: `${i * 150}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-6 py-4"
          style={{ borderTop: "1px solid #1e3a5f" }}
        >
          <div
            className="flex gap-3 items-end rounded-xl px-4 py-3"
            style={{
              background: "#0d1526",
              border: "1px solid #1e3a5f",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message — Enter to send, Shift+Enter for new line"
              rows={1}
              className="flex-1 resize-none outline-none bg-transparent text-sm leading-relaxed"
              style={{
                color: "#f0f4ff",
                maxHeight: "120px",
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#2563eb" }}
              onMouseEnter={(e) =>
                !isLoading &&
                input.trim() &&
                ((e.currentTarget as HTMLElement).style.background = "#1d4ed8")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#2563eb")
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: "#1e3a5f" }}>
            All requests processed through 7-stage middleware pipeline
          </p>
        </div>
      </div>

      {/* Trace panel */}
      <div
        className="w-80 flex-shrink-0"
        style={{
          background: "#0d1526",
          borderLeft: "1px solid #1e3a5f",
        }}
      >
        <TracePanel traces={liveTraces} isLoading={isLoading} />
      </div>
    </div>
  );
}