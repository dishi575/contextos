"use client";

import { useEffect, useRef } from "react";
import { TraceItem } from "@/lib/store";

const STAGE_LABELS: Record<string, string> = {
  guard: "PII & Injection Guard",
  memory: "Vector Memory Retriever",
  compressor: "Context Compressor",
  router: "Model Intelligent Router",
  llm: "LLM Execution Call",
  validator: "Output Safety Judge",
  tracer: "Trace Logger Writer",
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
    color: "text-emerald-400",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    bg: "bg-emerald-950/20",
    border: "border-emerald-800/30",
    label: "PASS",
  },
  warn: {
    color: "text-amber-400",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    bg: "bg-amber-950/20",
    border: "border-amber-800/30",
    label: "WARN",
  },
  block: {
    color: "text-rose-400",
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
    bg: "bg-rose-950/25",
    border: "border-rose-900/40",
    label: "BLOCK",
  },
};

interface TracePanelProps {
  traces: TraceItem[];
  isLoading: boolean;
}

function StageRow({ trace, index }: { trace: TraceItem; index: number }) {
  const config = STATUS_CONFIG[trace.status] || STATUS_CONFIG.pass;

  return (
    <div className={`group relative rounded-lg p-3 border transition-all duration-200 hover:border-slate-700/80 ${config.bg} ${config.border}`}>
      
      {/* Connector line dot */}
      <div className="absolute -left-[17px] top-[18px] z-10 flex h-3 h-3 w-3 items-center justify-center">
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 font-bold">0{index + 1}</span>
          <span className="text-xs font-semibold text-slate-200 tracking-tight">
            {STAGE_LABELS[trace.stage] || trace.stage}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {trace.latency_ms !== null && (
            <span className="text-[10px] font-mono text-slate-400">
              {trace.latency_ms}ms
            </span>
          )}
          <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${config.border} ${config.color} bg-black/35`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Details Box */}
      <div className="font-mono text-[10px] text-slate-400 flex flex-col gap-1 pl-3 border-l border-slate-800/60 mt-1.5">
        {trace.model_used && (
          <div>
            <span className="text-slate-500 font-bold">model:</span>{" "}
            <span className="text-indigo-300">{trace.model_used}</span>
          </div>
        )}
        {trace.tokens_in !== null && trace.tokens_out !== null && trace.tokens_in > 0 && (
          <div>
            <span className="text-slate-500 font-bold">tokens:</span>{" "}
            <span className="text-slate-300">{trace.tokens_in}</span> &rarr;{" "}
            <span className="text-slate-300">{trace.tokens_out}</span>
            {trace.tokens_in > trace.tokens_out && (
              <span className="text-emerald-400 font-bold"> (-{trace.tokens_in - trace.tokens_out} saved)</span>
            )}
          </div>
        )}
        {(() => {
          const d = trace.detail as Record<string, unknown> | null;
          if (!d) return null;
          return (
            <>
              {d.category && (
                <div>
                  <span className="text-slate-500 font-bold">route_class:</span>{" "}
                  <span className="text-teal-300">{String(d.category)}</span>
                </div>
              )}
              {Number(d.chunks_retrieved) > 0 && (
                <div>
                  <span className="text-slate-500 font-bold">vector_match:</span>{" "}
                  <span className="text-sky-300">{Number(d.chunks_retrieved)} chunks</span>
                  <span className="text-blue-400 font-semibold">
                    {" "}({(Number(d.top_similarity || 0) * 100).toFixed(0)}% sim)
                  </span>
                </div>
              )}
              {Array.isArray(d.pii_found) && d.pii_found.length > 0 && (
                <div className="text-amber-400 font-semibold animate-pulse">
                  <span className="text-slate-500 font-bold">pii_redacted:</span>{" "}
                  {(d.pii_found as string[]).join(", ")}
                </div>
              )}
              {d.injection_detected && (
                <div className="text-rose-400 font-bold border-l-2 border-rose-500 pl-1.5 py-0.5 my-0.5 bg-rose-500/5">
                  ⚠️ INJECTION SHIELD ACTIVATED
                </div>
              )}
              {Number(d.toxicity_score) > 0 && (
                <div>
                  <span className="text-slate-500 font-bold">toxicity:</span>{" "}
                  <span className={Number(d.toxicity_score) > 0.5 ? "text-rose-400 font-semibold" : "text-amber-300"}>
                    {(Number(d.toxicity_score) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {d.explanation && (
                <div className="text-[9px] text-slate-500 italic mt-0.5 max-w-full leading-normal">
                  &ldquo;{String(d.explanation)}&rdquo;
                </div>
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
    <div className="relative rounded-lg p-3 border border-slate-800/40 bg-slate-900/10 flex items-center justify-between transition-all duration-150">
      
      {/* Connector line dot */}
      <div className="absolute -left-[17px] top-[18px] z-10 flex h-3 h-3 w-3 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-slate-800 animate-pulse border border-slate-700" />
      </div>

      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-700 animate-ping" />
        <span className="text-xs font-medium text-slate-600">
          {STAGE_LABELS[stage] || stage}
        </span>
      </div>
      <span className="text-[8px] font-mono text-slate-700 uppercase tracking-widest animate-pulse">
        AWAITING...
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
    <div className="flex flex-col h-full bg-[#070b13] select-none">
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full transition-all duration-300 ${
            isLoading ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse" : 
            traces.length > 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-700"
          }`} />
          <span className="text-xs font-bold text-slate-200 tracking-wider uppercase">
            Middleware Tracer
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 font-semibold bg-slate-900/40 px-2 py-0.5 rounded-full border border-slate-800/60">
          {traces.length}/7 completed
        </span>
      </div>

      {/* Stages List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 relative">
        
        {/* Timeline connecting vertical track */}
        <div className="absolute left-[13px] top-6 bottom-6 w-[1px] bg-slate-800/80 z-0" />

        <div className="flex flex-col gap-4 relative z-10 pl-3">
          {traces.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-[350px] gap-3 text-center pr-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center text-lg shadow-sm">
                🔍
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-1">
                  Trace Analyzer Idle
                </p>
                <p className="text-[10px] text-slate-500 leading-normal max-w-[200px]">
                  Submit an API request in the playground to begin real-time telemetry tracing.
                </p>
              </div>
            </div>
          )}

          {traces.map((trace, i) => (
            <StageRow key={`${trace.stage}-${i}`} trace={trace} index={i} />
          ))}

          {pendingStages.map((stage) => (
            <PendingStage key={stage} stage={stage} />
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Summary Footer */}
      {traces.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between shrink-0 font-mono text-[10px]">
          <span className={`font-semibold ${tokensSaved > 0 ? "text-emerald-400" : "text-slate-500"}`}>
            {tokensSaved > 0 ? `+${tokensSaved} tokens saved` : "0% compression"}
          </span>
          <span className="text-slate-400 font-bold">
            {totalLatency.toFixed(0)}ms latency
          </span>
        </div>
      )}
    </div>
  );
}