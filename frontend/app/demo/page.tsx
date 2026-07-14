"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useChatStore, TraceItem } from "@/lib/store";
import {
  sendMessage,
  getSessions,
  getMessages,
  deleteSession,
  getTraces,
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
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [provider, setProvider] = useState<string>("auto");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-redirect if not logged in
  useEffect(() => {
    if (!token) router.push("/auth/login");
  }, [token, router]);

  // Load request logs on start
  useEffect(() => {
    if (!token) return;
    getSessions().then((res) => setSessions(res.data));
  }, [token, setSessions]);

  // Establish trace telemetry socket
  useEffect(() => {
    if (!token) return;
    const ws = createTraceSocket(token, (trace) => {
      appendLiveTrace(trace as TraceItem);
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [token, appendLiveTrace]);

  // Auto-scroll request logs
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle click on past request logs (sessions)
  const handleSelectSession = async (sessionId: number) => {
    setActiveSession(sessionId);
    clearLiveTraces();
    const res = await getMessages(sessionId);
    setMessages(res.data);
    
    // Auto-select the last message response to show its traces
    const assistantMsgs = res.data.filter((m: { role: string }) => m.role === "assistant");
    if (assistantMsgs.length > 0) {
      const lastMsg = assistantMsgs[assistantMsgs.length - 1];
      setSelectedMessageId(lastMsg.id);
      loadHistoricalTraces(lastMsg.id);
    }
  };

  // Load past pipeline trace data
  const loadHistoricalTraces = async (msgId: number) => {
    clearLiveTraces();
    try {
      const res = await getTraces(msgId);
      if (res.data) {
        res.data.forEach((t: TraceItem) => appendLiveTrace(t));
      }
    } catch {}
  };

  // Delete past log session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    await deleteSession(sessionId);
    const res = await getSessions();
    setSessions(res.data);
    if (activeSessionId === sessionId) {
      setActiveSession(null);
      clearLiveTraces();
    }
  };

  // Execute request payload
  const handleExecuteRequest = async () => {
    if (!input.trim() || isLoading) return;
    const promptContent = input.trim();
    setInput("");
    clearLiveTraces();
    setLoading(true);

    // Save prompt to state
    addMessage({
      id: Date.now(),
      role: "user",
      content: promptContent,
      created_at: new Date().toISOString(),
    });

    try {
      const res = await sendMessage(promptContent, activeSessionId || undefined);
      const data = res.data;

      // Set active log session if new
      if (!activeSessionId) {
        setActiveSession(data.session_id);
        const sessRes = await getSessions();
        setSessions(sessRes.data);
        // Sync full message logs from db to prevent Zustand state wipeout
        const msgRes = await getMessages(data.session_id);
        setMessages(msgRes.data);
      } else {
        // Add response message
        addMessage({
          id: data.message_id + 1,
          role: "assistant",
          content: data.response,
          created_at: new Date().toISOString(),
        });
      }

      setSelectedMessageId(data.message_id + 1);

      // Fallback: populate traces if socket missed them
      clearLiveTraces();
      if (data.traces) {
        data.traces.forEach((t: TraceItem) => appendLiveTrace(t));
      }

      setLoading(false);
    } catch {
      addMessage({
        id: Date.now(),
        role: "assistant",
        content: "Error: Middleware execution timeout. Please check backend connection.",
        created_at: new Date().toISOString(),
      });
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleExecuteRequest();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#05070c] text-slate-100 font-sans">
      
      {/* 1. Left Sidebar: Execution Logs History */}
      <div className="w-60 shrink-0 flex flex-col bg-[#070b13] border-r border-slate-800/80">
        
        {/* Console Brand Logo */}
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-slate-800/80 bg-slate-950/20 select-none">
          <div className="w-7 h-7 rounded-lg bg-blue-600/90 shadow-[0_0_10px_rgba(37,99,235,0.45)] flex items-center justify-center text-white font-extrabold text-xs">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-200 tracking-wide leading-tight">
              ContextOS
            </span>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none mt-0.5">
              TELEMETRY CORE
            </span>
          </div>
        </div>

        {/* Sandbox Actions */}
        <div className="p-3">
          <button
            onClick={() => {
              setActiveSession(null);
              clearLiveTraces();
              setMessages([]);
            }}
            className="w-full bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-600/60 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 text-left transition-all duration-150 flex items-center gap-2"
          >
            <span>+</span> New sandbox trace
          </button>
        </div>

        {/* Historical Logs List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 scrollbar-thin">
          <span className="px-2 py-1 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1.5 select-none">
            Recent Debug Traces
          </span>
          {sessions.length === 0 ? (
            <span className="px-2 py-4 text-[10px] text-slate-500 italic block">
              No previous runs recorded
            </span>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 border ${
                  activeSessionId === session.id
                    ? "bg-[#10192e] border-slate-800 text-blue-400"
                    : "border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                }`}
              >
                <span className="text-xs truncate font-mono flex-1">
                  {session.title || "Untitled"}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 text-xs px-1 bg-transparent border-none cursor-pointer transition-opacity duration-150"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Console Operator Profile */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 flex items-center justify-between text-xs">
          <div className="flex flex-col truncate flex-1 pr-2">
            <span className="text-[10px] font-mono text-slate-500">OPERATOR_ID</span>
            <span className="text-[11px] text-slate-400 truncate">{user?.email}</span>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
            className="text-rose-500 hover:text-rose-400 text-[10px] uppercase font-mono tracking-wider font-bold shrink-0"
          >
            Exit
          </button>
        </div>
      </div>

      {/* 2. Middle Panel: Sandbox API Tracer & Request Console */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#05070c]">
        
        {/* Navigation & Telemetry Health */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-[#070b13]/40 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {activeSessionId ? `Telemetry Session: LOG_${activeSessionId}` : "API Request Playground"}
              </h1>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                Target endpoint: POST /api/v1/chat
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-800/30 font-mono text-[9px] text-emerald-400 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API GATEWAY: ONLINE
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0d1322] hover:bg-[#11192e] text-slate-300 hover:border-slate-700 transition-all duration-150"
          >
            CONFIGURE POLICY &rarr;
          </button>
        </div>

        {/* Request Shell Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[260px] border border-dashed border-slate-800/80 rounded-xl px-6 py-10 bg-slate-950/5">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl mb-4 shadow-sm select-none">
                ⚙️
              </div>
              <h3 className="text-xs font-bold text-slate-300 tracking-wide uppercase mb-1">
                Sandbox Playground Ready
              </h3>
              <p className="text-[10px] text-slate-500 text-center max-w-sm mb-4 leading-normal">
                Submit raw prompts to evaluate your intelligent middleware settings. You can track latency, toxicity, and compression dynamically.
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {["PII Shield", "Semantic Context", "Lossless Compressor", "Dynamic Selector", "Toxicity Judge"].map((f) => (
                  <span
                    key={f}
                    className="font-mono text-[9px] px-2.5 py-0.5 rounded border border-slate-800 text-slate-400 bg-slate-900/35"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Render request logs */}
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              
              if (isUser) {
                return (
                  <div key={msg.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 select-none font-mono text-[9px] text-slate-500">
                      <span>POST /api/chat</span>
                      <span>•</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="rounded-lg border border-slate-800/80 bg-[#090e17] px-4 py-3 font-mono text-xs text-sky-200">
                      <span className="text-slate-500 select-none mr-2">payload.prompt:</span>
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Assistant (Middleware telemetry logs)
              const isLastAssistant = msg.id === selectedMessageId;
              const hasBlocked = msg.content.includes("blocked");
              
              return (
                <div key={msg.id} className="space-y-1.5">
                  <div className="flex items-center justify-between select-none font-mono text-[9px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className={hasBlocked ? "text-rose-500 font-bold" : "text-emerald-500 font-bold"}>
                        {hasBlocked ? "403 Forbidden" : "200 OK"}
                      </span>
                      <span>•</span>
                      <span>RESPONSE_BODY</span>
                    </div>
                    {isLastAssistant && (
                      <span className="text-slate-500 uppercase tracking-widest text-[8px] border border-slate-800/80 px-1.5 rounded animate-pulse bg-slate-900/20 select-none">
                        Active Inspect
                      </span>
                    )}
                  </div>
                  <div className={`rounded-lg border font-mono text-xs p-4 leading-relaxed ${
                    hasBlocked 
                      ? "bg-rose-950/10 border-rose-900/35 text-rose-300"
                      : "bg-[#03060c] border-slate-900 text-slate-300"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 select-none font-mono text-[9px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>TRANSACTION IN PROGRESS</span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#03060c] px-4 py-3 font-mono text-xs text-slate-500 italic flex items-center gap-2">
                  <span className="animate-spin text-blue-500">⚙️</span>
                  <span>Executing middleware pipeline checks...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Sandbox Prompt Terminal */}
        <div className="p-6 border-t border-slate-800/80 bg-[#070b13]/40 shrink-0">
          <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-4 transition-all duration-150 focus-within:border-blue-600/40">
            
            {/* Payload Terminal Input */}
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-slate-500 select-none mt-1">&gt;</span>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter prompt request..."
                rows={2}
                className="flex-1 resize-none outline-none bg-transparent text-slate-200 placeholder-slate-600 font-mono text-xs leading-normal border-none focus:ring-0"
              />
            </div>

            {/* Sandbox Inline Policy Constraints */}
            <div className="pt-3 border-t border-slate-850 flex items-center justify-between select-none">
              <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
                <span className="text-slate-600">PROVIDER:</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="bg-[#0b101f] border border-slate-800 text-slate-400 rounded px-1.5 py-0.5 text-[9px] cursor-pointer outline-none focus:border-slate-700 font-mono"
                >
                  <option value="auto">Auto Router</option>
                  <option value="groq">Groq Llama</option>
                  <option value="gemini">Gemini Flash</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">
                  Press Enter to Execute
                </span>
                <button
                  onClick={handleExecuteRequest}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-[10px] font-mono tracking-wider font-extrabold px-3 py-1.5 rounded shadow-[0_0_8px_rgba(37,99,235,0.3)] transition-all duration-150"
                >
                  RUN REQUEST
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-[9px] font-mono text-slate-600 mt-3 select-none">
            TELEMETRY RELEASES ACTIVE SESSIONS SECURELY TO THE MIDDLEWARE DATABASE
          </p>
        </div>
      </div>

      {/* 3. Right Panel: Real-time Pipeline Telemetry Trace Panel */}
      <div className="w-[320px] shrink-0 border-l border-slate-800/80">
        <TracePanel traces={liveTraces} isLoading={isLoading} />
      </div>
    </div>
  );
}