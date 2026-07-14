"use client";

import { useEffect, useRef } from "react";
import { TraceItem } from "@/lib/store";

const STAGE_LABELS: Record<string, string> = {
  guard: "PII Guard",
  memory: "Memory Retrieval",
  compressor: "Context Compressor",
  router: "Model Router",
  llm: "LLM Call",
  validator: "Output Validator",
  tracer: "Trace Logger",
};

const STAGE_ORDER = [
  "guard",
  "memory",
  "compressor",
  "router",
  "llm",
  "validator",
  "tracer",
];

const STATUS_CONFIG = {
  pass: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    label: "PASS",
    dot: "#10b981",
  },
  warn: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    label: "WARN",
    dot: "#f59e0b",
  },
  block: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    label: "BLOCK",
    dot: "#ef4444",
  },
};

interface TracePanelProps {
  traces: TraceItem[];
  isLoading: boolean;
}

function StageRow({ trace, index }: { trace: TraceItem; index: number }) {
  const config = STATUS_CONFIG[trace.status] || STATUS_CONFIG.pass;

  return (
    <div
      className="rounded-xl p-4 animate-fadeIn"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Pulsing dot */}
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: config.dot }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "#f0f4ff" }}
          >
            {STAGE_LABELS[trace.stage] || trace.stage}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Latency */}
          {trace.latency_ms !== null && (
            <span className="text-xs" style={{ color: "#6b8cba" }}>
              {trace.latency_ms}ms
            </span>
          )}
          {/* Status badge */}
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{
              color: config.color,
              background: config.bg,
              border: `1px solid ${config.border}`,
            }}
          >
            {config.label}
          </span>
        </div>
      </div>

      {/* Detail row */}
      <div className="flex flex-wrap gap-3 mt-1">
        {/* Model used */}
        {trace.model_used && (
          <span className="text-xs" style={{ color: "#6b8cba" }}>
            <span style={{ color: "#2d4a6e" }}>model </span>
            {trace.model_used}
          </span>
        )}

        {/* Token compression */}
        {trace.tokens_in !== null &&
          trace.tokens_out !== null &&
          trace.tokens_in > 0 && (
            <span className="text-xs" style={{ color: "#6b8cba" }}>
              <span style={{ color: "#2d4a6e" }}>tokens </span>
              {trace.tokens_in} → {trace.tokens_out}
              {trace.tokens_in > trace.tokens_out && (
                <span style={{ color: "#10b981" }}>
                  {" "}
                  (-{trace.tokens_in - trace.tokens_out} saved)
                </span>
              )}
            </span>
          )}

        {/* Detail snippets */}
        {trace.detail && (
          <>
            {(trace.detail.category as string) && (
              <span className="text-xs" style={{ color: "#6b8cba" }}>
                <span style={{ color: "#2d4a6e" }}>type </span>
                {trace.detail.category as string}
              </span>
            )}
            {(trace.detail.chunks_retrieved as number) > 0 && (
              <span className="text-xs" style={{ color: "#6b8cba" }}>
                <span style={{ color: "#2d4a6e" }}>chunks </span>
                {trace.detail.chunks_retrieved as number}
                {" "}
                <span style={{ color: "#3b82f6" }}>
                  ({((trace.detail.top_similarity as number) * 100).toFixed(0)}% match)
                </span>
              </span>
            )}
            {(trace.detail.pii_found as string[])?.length > 0 && (
              <span className="text-xs" style={{ color: "#f59e0b" }}>
                PII: {(trace.detail.pii_found as string[]).join(", ")}
              </span>
            )}
            {trace.detail.injection_detected && (
              <span className="text-xs" style={{ color: "#ef4444" }}>
                ⚠ Injection detected
              </span>
            )}
            {(trace.detail.toxicity_score as number) > 0 && (
              <span className="text-xs" style={{ color: "#f59e0b" }}>
                <span style={{ color: "#2d4a6e" }}>toxicity </span>
                {((trace.detail.toxicity_score as number) * 100).toFixed(0)}%
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PendingStage({ stage }: { stage: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(30,58,95,0.2)",
        border: "1px solid #1e3a5f",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: "#1e3a5f" }}
        />
        <span className="text-sm" style={{ color: "#2d4a6e" }}>
          {STAGE_LABELS[stage] || stage}
        </span>
      </div>
    </div>
  );
}

export default function TracePanel({ traces, isLoading }: TracePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [traces]);

  const completedStages = traces.map((t) => t.stage);
  const pendingStages = isLoading
    ? STAGE_ORDER.filter((s) => !completedStages.includes(s))
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid #1e3a5f" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isLoading ? "#f59e0b" : traces.length > 0 ? "#10b981" : "#1e3a5f",
              boxShadow: isLoading ? "0 0 6px #f59e0b" : "none",
            }}
          />
          <span className="text-sm font-medium" style={{ color: "#f0f4ff" }}>
            Pipeline Trace
          </span>
        </div>
        <span className="text-xs" style={{ color: "#6b8cba" }}>
          {traces.length}/7 stages
        </span>
      </div>

      {/* Stage list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {traces.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#0d1526", border: "1px solid #1e3a5f" }}
            >
              <span className="text-xl">⚡</span>
            </div>
            <p className="text-sm text-center" style={{ color: "#6b8cba" }}>
              Send a message to watch the
              <br />
              pipeline execute in real time
            </p>
          </div>
        )}

        {/* Completed stages */}
        {traces.map((trace, i) => (
          <StageRow key={`${trace.stage}-${i}`} trace={trace} index={i} />
        ))}

        {/* Pending stages */}
        {pendingStages.map((stage) => (
          <PendingStage key={stage} stage={stage} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Footer — token savings */}
      {traces.length > 0 && (
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid #1e3a5f" }}
        >
          {(() => {
            const compressor = traces.find((t) => t.stage === "compressor");
            const saved =
              compressor && compressor.tokens_in && compressor.tokens_out
                ? compressor.tokens_in - compressor.tokens_out
                : 0;
            const totalLatency = traces.reduce(
              (sum, t) => sum + (t.latency_ms || 0),
              0
            );
            return (
              <>
                <span className="text-xs" style={{ color: "#6b8cba" }}>
                  {saved > 0 ? (
                    <span style={{ color: "#10b981" }}>
                      {saved} tokens saved
                    </span>
                  ) : (
                    "no compression needed"
                  )}
                </span>
                <span className="text-xs" style={{ color: "#6b8cba" }}>
                  {totalLatency.toFixed(0)}ms total
                </span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}