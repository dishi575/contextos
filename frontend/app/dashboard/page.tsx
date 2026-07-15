"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useStatsStore } from "@/lib/store";
import { getStats, updatePolicy } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { MeshGradient } from "@paper-design/shaders-react";

const COLORS = ["#2563eb", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#070b13]/85 backdrop-blur p-5 select-none transition-all duration-200 hover:border-slate-700">
      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2.5">
        {label}
      </p>
      <p 
        className="text-3xl font-extrabold tracking-tight mb-1"
        style={{ color: color || "#f0f4ff" }}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] font-mono text-slate-500">{sub}</p>}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2 font-mono">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">{label}</span>
        <span className="font-extrabold text-blue-500">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none bg-slate-800 accent-blue-600 transition-all duration-150"
        style={{
          background: `linear-gradient(to right, #2563eb ${pct}%, #1e293b ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[9px] text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser, token, logout } = useAuthStore();
  const { tokensSaved, totalRequests, avgLatencyMs, modelBreakdown, setStats } = useStatsStore();

  const [policy, setPolicy] = useState({
    token_budget: user?.token_budget || 2000,
    temperature: user?.temperature || 0.7,
    toxicity_threshold: user?.toxicity_threshold || 0.7,
    max_memory_chunks: user?.max_memory_chunks || 5,
    pii_masking_enabled: user?.pii_masking_enabled ?? true,
    preferred_provider: user?.preferred_provider || "auto",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!token) { router.push("/auth/login"); return; }
    getStats().then((res) => setStats(res.data));
  }, [token, router, setStats]);

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      const res = await updatePolicy(policy);
      setUser(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const pieData = Object.entries(modelBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="relative min-h-screen bg-[#05070c] text-slate-200 overflow-x-hidden select-none">
      
      {/* Animated Dark Nebula Mesh Gradient Background */}
      {mounted && (
        <div className="fixed inset-0 w-screen h-screen z-0 overflow-hidden pointer-events-none">
          <MeshGradient
            width={dimensions.width}
            height={dimensions.height}
            colors={["#1e40af", "#3b82f6", "#4f46e5", "#7c3aed", "#06b6d4", "#020617"]}
            distortion={1.1}
            swirl={0.6}
            grainMixer={0}
            grainOverlay={0}
            speed={0.35}
            offsetX={0.08}
          />
          <div className="absolute inset-0 bg-[#05070c]/75 pointer-events-none" />
        </div>
      )}

      {/* Nav */}
      <div className="relative z-10 px-8 py-3.5 flex items-center justify-between border-b border-slate-900 bg-[#070b13]/85 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] flex items-center justify-center text-white font-extrabold text-[11px]">
            C
          </div>
          <span className="font-extrabold text-sm text-slate-200 tracking-wide">ContextOS</span>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-slate-800 text-slate-400 bg-slate-900/35">
            DASHBOARD
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/demo")}
            className="text-[10px] font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg shadow-[0_0_8px_rgba(37,99,235,0.3)] transition-all duration-150 cursor-pointer"
          >
            Open demo &rarr;
          </button>
          <button
            onClick={() => { logout(); router.push("/auth/login"); }}
            className="text-[10px] font-mono font-bold text-rose-500 hover:text-rose-400 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="relative z-10 px-8 py-10 max-w-[1100px] mx-auto flex flex-col gap-8">

        {/* Stats */}
        <div>
          <p className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Pipeline Statistics
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Tokens saved" value={tokensSaved.toLocaleString()} sub="via context compression" color="#10b981" />
            <StatCard label="Total requests" value={totalRequests.toLocaleString()} sub="through pipeline" />
            <StatCard label="Avg latency" value={`${avgLatencyMs}ms`} sub="per LLM stage" color="#3b82f6" />
          </div>
        </div>

        {/* Chart + Policy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Model chart */}
          <div className="rounded-xl border border-slate-800/80 bg-[#070b13]/85 backdrop-blur p-6">
            <h3 className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              Model Routing Breakdown
            </h3>
            {pieData.length > 0 ? (
              <>
                <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{
                        background: "#070b13", border: "1px solid #1e293b",
                        borderRadius: "8px", color: "#f0f4ff", fontSize: "11px", fontFamily: "monospace"
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 mt-4">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[11px] font-mono text-slate-500">{entry.name}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-200">{entry.value} requests</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-slate-600 text-xs font-mono">
                No requests processed yet
              </div>
            )}
          </div>

          {/* Policy */}
          <div className="rounded-xl border border-slate-800/80 bg-[#070b13]/85 backdrop-blur p-6">
            <h3 className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              Active Pipeline Policy
            </h3>
            <div className="flex flex-col gap-5">
              <Slider label="Token Budget" value={policy.token_budget} min={500} max={8000} step={100}
                onChange={(v) => setPolicy((p) => ({ ...p, token_budget: v }))}
                format={(v) => `${v} tokens`} />
              <Slider label="Temperature" value={policy.temperature} min={0} max={1} step={0.1}
                onChange={(v) => setPolicy((p) => ({ ...p, temperature: v }))}
                format={(v) => v.toFixed(1)} />
              <Slider label="Toxicity Threshold" value={policy.toxicity_threshold} min={0} max={1} step={0.1}
                onChange={(v) => setPolicy((p) => ({ ...p, toxicity_threshold: v }))}
                format={(v) => v.toFixed(1)} />
              <Slider label="Memory Chunks" value={policy.max_memory_chunks} min={1} max={10} step={1}
                onChange={(v) => setPolicy((p) => ({ ...p, max_memory_chunks: v }))} />

              {/* PII toggle */}
              <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span className="uppercase tracking-wider text-[10px]">PII Masking Shield</span>
                <button
                  onClick={() => setPolicy((p) => ({ ...p, pii_masking_enabled: !p.pii_masking_enabled }))}
                  className="w-10 h-[22px] rounded-full border-none relative transition-colors duration-200 cursor-pointer"
                  style={{
                    background: policy.pii_masking_enabled ? "#2563eb" : "#1e293b",
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all duration-200"
                    style={{
                      left: policy.pii_masking_enabled ? "21px" : "3px",
                    }} />
                </button>
              </div>

              {/* Provider */}
              <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span className="uppercase tracking-wider text-[10px]">Preferred LLM Provider</span>
                <select
                  value={policy.preferred_provider}
                  onChange={(e) => setPolicy((p) => ({ ...p, preferred_provider: e.target.value }))}
                  className="text-xs px-2.5 py-1.5 rounded-lg outline-none bg-[#111d35]/50 border border-slate-800 text-slate-200 font-mono cursor-pointer transition-all duration-150 focus:border-slate-700"
                >
                  <option value="auto">Auto Router</option>
                  <option value="groq">Groq Llama</option>
                  <option value="gemini">Gemini Flash</option>
                </select>
              </div>

              <button
                onClick={handleSavePolicy}
                disabled={saving}
                className="w-full font-mono text-xs font-bold py-3 px-4 rounded-lg border-none shadow-[0_0_8px_rgba(37,99,235,0.25)] tracking-wider uppercase transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:hover:opacity-40"
                style={{
                  background: saved ? "#10b981" : "#2563eb",
                  color: "#fff",
                }}
              >
                {saved ? "Saved ✓" : saving ? "Saving parameters..." : "Save Policy Config"}
              </button>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="rounded-xl border border-slate-800/80 bg-[#070b13]/85 backdrop-blur p-6">
          <h3 className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Bearer Authorization API Key
          </h3>
          <div className="flex items-center gap-3 bg-[#111d35]/40 border border-slate-800 rounded-lg p-3">
            <code className="text-xs font-mono text-blue-400 flex-1 truncate select-all">
              {user?.api_key || "—"}
            </code>
            <button
              onClick={() => user?.api_key && navigator.clipboard.writeText(user.api_key)}
              className="text-[10px] font-mono font-bold px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all duration-150 cursor-pointer"
            >
              Copy
            </button>
          </div>
          <p className="font-mono text-[9px] text-slate-600 mt-2 tracking-wide">
            USE THIS BEARER TOKEN TO QUERY THE CONTEXTOS TELEMETRY GATEWAY API PROGRAMMATICALLY
          </p>
        </div>

      </div>
    </div>
  );
}