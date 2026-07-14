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
  },
  warn: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    label: "WARN",
  },
  block: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    label: "BLOCK",
  },
};

interface TracePanelProps {
  traces: TraceItem[];
  isLoading: boolean;
}

function StageRow({ trace }: { trace: TraceItem }) {
  const config = STATUS_CONFIG[trace.status] || STATUS_CONFIG.pass;

  return (
    <div style={{
      borderRadius: "10px",
      padding: "12px 14px",
      background: config.bg,
      border: `1px solid ${config.border}`,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "6px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "7px", height: "7px",
            borderRadius: "50%",
            background: config.color,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "13px", fontWeight: "500", color: "#f0f4ff" }}>
            {STAGE_LABELS[trace.stage] || trace.stage}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {trace.latency_ms !== null && (
            <span style={{ fontSize: "11px", color: "#6b8cba" }}>
              {trace.latency_ms}ms
            </span>
          )}
          <span style={{
            fontSize: "10px",
            fontFamily: "monospace",
            fontWeight: "700",
            padding: "2px 6px",
            borderRadius: "4px",
            color: config.color,
            background: config.bg,
            border: `1px solid ${config.border}`,
          }}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {trace.model_used && (
          <span style={{ fontSize: "11px", color: "#6b8cba" }}>
            <span style={{ color: "#2d4a6e" }}>model </span>
            {trace.model_used}
          </span>
        )}
        {trace.tokens_in !== null && trace.tokens_out !== null && trace.tokens_in > 0 && (
          <span style={{ fontSize: "11px", color: "#6b8cba" }}>
            <span style={{ color: "#2d4a6e" }}>tokens </span>
            {trace.tokens_in} → {trace.tokens_out}
            {trace.tokens_in > trace.tokens_out && (
              <span style={{ color: "#10b981" }}> (-{trace.tokens_in - trace.tokens_out} saved)</span>
            )}
          </span>
        )}
        {(() => {
          const d = trace.detail as Record<string, unknown> | null;
          if (!d) return null;
          return (
            <>
              {d.category && (
                <span style={{ fontSize: "11px", color: "#6b8cba" }}>
                  <span style={{ color: "#2d4a6e" }}>type </span>
                  {String(d.category)}
                </span>
              )}
              {Number(d.chunks_retrieved) > 0 && (
                <span style={{ fontSize: "11px", color: "#6b8cba" }}>
                  <span style={{ color: "#2d4a6e" }}>chunks </span>
                  {Number(d.chunks_retrieved)}
                  <span style={{ color: "#3b82f6" }}>
                    {" "}({(Number(d.top_similarity || 0) * 100).toFixed(0)}% match)
                  </span>
                </span>
              )}
              {Array.isArray(d.pii_found) && d.pii_found.length > 0 && (
                <span style={{ fontSize: "11px", color: "#f59e0b" }}>
                  PII detected: {(d.pii_found as string[]).join(", ")}
                </span>
              )}
              {d.injection_detected && (
                <span style={{ fontSize: "11px", color: "#ef4444" }}>
                  ⚠ Injection attempt detected
                </span>
              )}
              {Number(d.toxicity_score) > 0 && (
                <span style={{ fontSize: "11px", color: "#f59e0b" }}>
                  <span style={{ color: "#2d4a6e" }}>toxicity </span>
                  {(Number(d.toxicity_score) * 100).toFixed(0)}%
                </span>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function PendingStage({ stage }: { stage: string }) {
  return (
    <div style={{
      borderRadius: "10px",
      padding: "12px 14px",
      background: "rgba(30,58,95,0.15)",
      border: "1px solid #1e3a5f",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}>
      <div style={{
        width: "7px", height: "7px",
        borderRadius: "50%",
        background: "#1e3a5f",
        flexShrink: 0,
        animation: "pulse 2s ease-in-out infinite",
      }} />
      <span style={{ fontSize: "13px", color: "#2d4a6e" }}>
        {STAGE_LABELS[stage] || stage}
      </span>
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

  const compressor = traces.find((t) => t.stage === "compressor");
  const tokensSaved = compressor?.tokens_in && compressor?.tokens_out
    ? compressor.tokens_in - compressor.tokens_out : 0;
  const totalLatency = traces.reduce((sum, t) => sum + (t.latency_ms || 0), 0);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #1e3a5f",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "8px", height: "8px",
            borderRadius: "50%",
            background: isLoading ? "#f59e0b" : traces.length > 0 ? "#10b981" : "#1e3a5f",
            boxShadow: isLoading ? "0 0 6px #f59e0b" : "none",
          }} />
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#f0f4ff" }}>
            Pipeline Trace
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#6b8cba" }}>
          {traces.length}/7 stages
        </span>
      </div>

      {/* Stages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}>
        {traces.length === 0 && !isLoading && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: "12px",
          }}>
            <div style={{
              width: "44px", height: "44px",
              borderRadius: "12px",
              background: "#0d1526",
              border: "1px solid #1e3a5f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}>⚡</div>
            <p style={{
              fontSize: "12px",
              color: "#6b8cba",
              textAlign: "center",
              margin: 0,
              lineHeight: "1.6",
            }}>
              Send a message to watch<br />the pipeline execute
            </p>
          </div>
        )}

        {traces.map((trace, i) => (
          <StageRow key={`${trace.stage}-${i}`} trace={trace} />
        ))}

        {pendingStages.map((stage) => (
          <PendingStage key={stage} stage={stage} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      {traces.length > 0 && (
        <div style={{
          padding: "10px 16px",
          borderTop: "1px solid #1e3a5f",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "11px", color: tokensSaved > 0 ? "#10b981" : "#6b8cba" }}>
            {tokensSaved > 0 ? `${tokensSaved} tokens saved` : "no compression needed"}
          </span>
          <span style={{ fontSize: "11px", color: "#6b8cba" }}>
            {totalLatency.toFixed(0)}ms total
          </span>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}