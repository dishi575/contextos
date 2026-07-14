"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useStatsStore } from "@/lib/store";
import { getStats, updatePolicy } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#2563eb", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: "#0d1526",
      border: "1px solid #1e3a5f",
      borderRadius: "12px",
      padding: "20px",
    }}>
      <p style={{ color: "#6b8cba", fontSize: "11px", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ color: color || "#f0f4ff", fontSize: "28px", fontWeight: "700", margin: "0 0 4px" }}>
        {value}
      </p>
      {sub && <p style={{ color: "#6b8cba", fontSize: "11px", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#6b8cba" }}>{label}</span>
        <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: "700", color: "#3b82f6" }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: "4px", borderRadius: "2px", appearance: "none",
          cursor: "pointer", outline: "none",
          background: `linear-gradient(to right, #2563eb ${pct}%, #1e3a5f ${pct}%)`,
          accentColor: "#2563eb",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", color: "#2d4a6e" }}>{min}</span>
        <span style={{ fontSize: "10px", color: "#2d4a6e" }}>{max}</span>
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
    <div style={{ minHeight: "100vh", background: "#0a0f1e" }}>

      {/* Nav */}
      <div style={{
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0d1526",
        borderBottom: "1px solid #1e3a5f",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "#2563eb", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "12px",
          }}>C</div>
          <span style={{ color: "#f0f4ff", fontWeight: "600", fontSize: "14px" }}>ContextOS</span>
          <span style={{
            fontSize: "11px", padding: "2px 8px", borderRadius: "4px",
            background: "#111d35", border: "1px solid #1e3a5f", color: "#6b8cba",
          }}>Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.push("/demo")}
            style={{
              fontSize: "12px", padding: "6px 14px", borderRadius: "8px",
              background: "#2563eb", border: "none", color: "#fff", cursor: "pointer",
            }}
          >Open demo →</button>
          <button
            onClick={() => { logout(); router.push("/auth/login"); }}
            style={{ fontSize: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
          >Sign out</button>
        </div>
      </div>

      <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* Stats */}
        <div>
          <p style={{ color: "#6b8cba", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>
            Pipeline stats
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <StatCard label="Tokens saved" value={tokensSaved.toLocaleString()} sub="via context compression" color="#10b981" />
            <StatCard label="Total requests" value={totalRequests.toLocaleString()} sub="through pipeline" />
            <StatCard label="Avg latency" value={`${avgLatencyMs}ms`} sub="per LLM stage" color="#3b82f6" />
          </div>
        </div>

        {/* Chart + Policy */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

          {/* Model chart */}
          <div style={{ background: "#0d1526", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ color: "#f0f4ff", fontSize: "13px", fontWeight: "600", margin: "0 0 20px" }}>
              Model routing breakdown
            </h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{
                      background: "#0d1526", border: "1px solid #1e3a5f",
                      borderRadius: "8px", color: "#f0f4ff", fontSize: "12px",
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                  {pieData.map((entry, i) => (
                    <div key={entry.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b8cba" }}>{entry.name}</span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#f0f4ff" }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px", color: "#2d4a6e", fontSize: "13px" }}>
                No requests yet
              </div>
            )}
          </div>

          {/* Policy */}
          <div style={{ background: "#0d1526", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ color: "#f0f4ff", fontSize: "13px", fontWeight: "600", margin: "0 0 20px" }}>
              Pipeline policy
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <Slider label="Token budget" value={policy.token_budget} min={500} max={8000} step={100}
                onChange={(v) => setPolicy((p) => ({ ...p, token_budget: v }))}
                format={(v) => `${v} tokens`} />
              <Slider label="Temperature" value={policy.temperature} min={0} max={1} step={0.1}
                onChange={(v) => setPolicy((p) => ({ ...p, temperature: v }))}
                format={(v) => v.toFixed(1)} />
              <Slider label="Toxicity threshold" value={policy.toxicity_threshold} min={0} max={1} step={0.1}
                onChange={(v) => setPolicy((p) => ({ ...p, toxicity_threshold: v }))}
                format={(v) => v.toFixed(1)} />
              <Slider label="Memory chunks" value={policy.max_memory_chunks} min={1} max={10} step={1}
                onChange={(v) => setPolicy((p) => ({ ...p, max_memory_chunks: v }))} />

              {/* PII toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "#6b8cba" }}>PII masking</span>
                <button
                  onClick={() => setPolicy((p) => ({ ...p, pii_masking_enabled: !p.pii_masking_enabled }))}
                  style={{
                    width: "40px", height: "22px", borderRadius: "11px", border: "none",
                    background: policy.pii_masking_enabled ? "#2563eb" : "#1e3a5f",
                    cursor: "pointer", position: "relative", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                    position: "absolute", top: "3px",
                    left: policy.pii_masking_enabled ? "21px" : "3px",
                    transition: "left 0.2s",
                  }} />
                </button>
              </div>

              {/* Provider */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "#6b8cba" }}>Preferred provider</span>
                <select
                  value={policy.preferred_provider}
                  onChange={(e) => setPolicy((p) => ({ ...p, preferred_provider: e.target.value }))}
                  style={{
                    fontSize: "12px", padding: "5px 10px", borderRadius: "6px", outline: "none",
                    background: "#111d35", border: "1px solid #1e3a5f", color: "#f0f4ff", cursor: "pointer",
                  }}
                >
                  <option value="auto">Auto</option>
                  <option value="groq">Groq</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>

              <button
                onClick={handleSavePolicy}
                disabled={saving}
                style={{
                  width: "100%", padding: "10px", borderRadius: "8px", border: "none",
                  background: saved ? "#10b981" : "#2563eb",
                  color: "#fff", fontSize: "13px", fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  transition: "background 0.2s",
                }}
              >
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save policy"}
              </button>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div style={{ background: "#0d1526", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ color: "#f0f4ff", fontSize: "13px", fontWeight: "600", margin: "0 0 12px" }}>API key</h3>
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "#111d35", border: "1px solid #1e3a5f", borderRadius: "8px", padding: "12px 16px",
          }}>
            <code style={{ fontSize: "12px", fontFamily: "monospace", color: "#6b8cba", flex: 1 }}>
              {user?.api_key || "—"}
            </code>
            <button
              onClick={() => user?.api_key && navigator.clipboard.writeText(user.api_key)}
              style={{
                fontSize: "11px", padding: "5px 12px", borderRadius: "6px",
                background: "#1e3a5f", border: "none", color: "#6b8cba", cursor: "pointer",
              }}
            >Copy</button>
          </div>
          <p style={{ color: "#2d4a6e", fontSize: "11px", margin: "8px 0 0" }}>
            Use this key to access the ContextOS API programmatically
          </p>
        </div>

      </div>
    </div>
  );
}