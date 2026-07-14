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

  useEffect(() => {
    if (!token) router.push("/auth/login");
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    getSessions().then((res) => setSessions(res.data));
  }, [token, setSessions]);

  useEffect(() => {
    if (!token) return;
    const ws = createTraceSocket(
      token,
      (trace) => appendLiveTrace(trace as TraceItem),
    );
    wsRef.current = ws;
    return () => ws.close();
  }, [token, appendLiveTrace]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectSession = async (sessionId: number) => {
    setActiveSession(sessionId);
    const res = await getMessages(sessionId);
    setMessages(res.data);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    await deleteSession(sessionId);
    const res = await getSessions();
    setSessions(res.data);
    if (activeSessionId === sessionId) setActiveSession(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    clearLiveTraces();
    setLoading(true);

    addMessage({
      id: Date.now(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    });

    try {
      const res = await sendMessage(userMessage, activeSessionId || undefined);
      const data = res.data;

      if (!activeSessionId) {
        setActiveSession(data.session_id);
        const sessRes = await getSessions();
        setSessions(sessRes.data);
      }

      addMessage({
        id: data.message_id + 1,
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      });

      // Fallback: if WebSocket missed traces, use HTTP response traces
      if (liveTraces.length === 0 && data.traces) {
        data.traces.forEach((t: TraceItem) => appendLiveTrace(t));
      }

      setLoading(false);
    } catch {
      addMessage({
        id: Date.now(),
        role: "assistant",
        content: "Something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      });
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
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: "#0a0f1e",
    }}>

      {/* Sidebar */}
      <div style={{
        width: "240px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "#0d1526",
        borderRight: "1px solid #1e3a5f",
      }}>
        {/* Logo */}
        <div style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderBottom: "1px solid #1e3a5f",
        }}>
          <div style={{
            width: "28px", height: "28px",
            borderRadius: "8px",
            background: "#2563eb",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: "700", fontSize: "12px",
            flexShrink: 0,
          }}>C</div>
          <span style={{ color: "#f0f4ff", fontWeight: "600", fontSize: "14px" }}>
            ContextOS
          </span>
        </div>

        {/* New chat */}
        <div style={{ padding: "12px" }}>
          <button
            onClick={() => { setActiveSession(null); clearLiveTraces(); }}
            style={{
              width: "100%",
              background: "#111d35",
              border: "1px solid #1e3a5f",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#f0f4ff",
              fontSize: "13px",
              fontWeight: "500",
              textAlign: "left",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e3a5f")}
          >
            + New conversation
          </button>
        </div>

        {/* Sessions */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                marginBottom: "2px",
                background: activeSessionId === session.id ? "#111d35" : "transparent",
                border: activeSessionId === session.id ? "1px solid #1e3a5f" : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                const del = e.currentTarget.querySelector(".del-btn") as HTMLElement;
                if (del) del.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const del = e.currentTarget.querySelector(".del-btn") as HTMLElement;
                if (del) del.style.opacity = "0";
              }}
            >
              <span style={{
                fontSize: "12px",
                color: activeSessionId === session.id ? "#f0f4ff" : "#6b8cba",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}>
                {session.title || "Untitled"}
              </span>
              <button
                className="del-btn"
                onClick={(e) => handleDeleteSession(e, session.id)}
                style={{
                  opacity: 0,
                  color: "#ef4444",
                  fontSize: "11px",
                  marginLeft: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              >✕</button>
            </div>
          ))}
        </div>

        {/* User */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid #1e3a5f",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{
            fontSize: "11px",
            color: "#6b8cba",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}>
            {user?.email}
          </span>
          <button
            onClick={() => { logout(); router.push("/auth/login"); }}
            style={{
              fontSize: "11px",
              color: "#ef4444",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginLeft: "8px",
            }}
          >Sign out</button>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1e3a5f",
        }}>
          <div>
            <h1 style={{ color: "#f0f4ff", fontSize: "14px", fontWeight: "600", margin: 0 }}>
              {activeSessionId ? "Conversation" : "New conversation"}
            </h1>
            <p style={{ color: "#6b8cba", fontSize: "12px", margin: "2px 0 0" }}>
              Powered by ContextOS middleware pipeline
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              fontSize: "12px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#111d35",
              border: "1px solid #1e3a5f",
              color: "#6b8cba",
              cursor: "pointer",
            }}
          >Dashboard →</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}>
          {messages.length === 0 && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "16px",
            }}>
              <div style={{
                width: "56px", height: "56px",
                borderRadius: "16px",
                background: "#0d1526",
                border: "1px solid #1e3a5f",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px",
              }}>⚡</div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#f0f4ff", fontSize: "14px", fontWeight: "500", margin: "0 0 4px" }}>
                  ContextOS is ready
                </p>
                <p style={{ color: "#6b8cba", fontSize: "12px", margin: 0 }}>
                  Send a message — watch the pipeline trace on the right
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {["PII Guard", "Semantic Memory", "Token Compression", "Model Routing", "Toxicity Validation"].map((f) => (
                  <span key={f} style={{
                    fontSize: "11px",
                    padding: "4px 12px",
                    borderRadius: "100px",
                    background: "#0d1526",
                    border: "1px solid #1e3a5f",
                    color: "#6b8cba",
                  }}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "520px",
                padding: "12px 16px",
                borderRadius: "16px",
                fontSize: "13px",
                lineHeight: "1.6",
                ...(msg.role === "user"
                  ? { background: "#2563eb", color: "#fff", borderBottomRightRadius: "4px" }
                  : { background: "#0d1526", border: "1px solid #1e3a5f", color: "#f0f4ff", borderBottomLeftRadius: "4px" }
                ),
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: "16px",
                borderBottomLeftRadius: "4px",
                background: "#0d1526",
                border: "1px solid #1e3a5f",
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: "6px", height: "6px",
                    borderRadius: "50%",
                    background: "#2563eb",
                    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #1e3a5f" }}>
          <div style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            background: "#0d1526",
            border: "1px solid #1e3a5f",
            borderRadius: "12px",
            padding: "12px 16px",
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message — Enter to send, Shift+Enter for new line"
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                outline: "none",
                background: "transparent",
                color: "#f0f4ff",
                fontSize: "13px",
                lineHeight: "1.5",
                border: "none",
                maxHeight: "120px",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                flexShrink: 0,
                width: "32px", height: "32px",
                borderRadius: "8px",
                background: "#2563eb",
                border: "none",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !input.trim() ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim())
                  e.currentTarget.style.background = "#1d4ed8";
              }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2563eb"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "11px", color: "#1e3a5f", margin: "8px 0 0" }}>
            All requests processed through 7-stage middleware pipeline
          </p>
        </div>
      </div>

      {/* Trace panel */}
      <div style={{
        width: "300px",
        flexShrink: 0,
        background: "#0d1526",
        borderLeft: "1px solid #1e3a5f",
      }}>
        <TracePanel traces={liveTraces} isLoading={isLoading} />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}