"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useStatsStore } from "@/lib/store";
import { getStats, updatePolicy } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#2563eb", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#0d1526",
        border: "1px solid #1e3a5f",
      }}
    >
      <p className="text-xs mb-3" style={{ color: "#6b8cba" }}>
        {label}
      </p>
      <p
        className="text-3xl font-bold"
        style={{ color: color || "#f0f4ff" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: "#6b8cba" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: "#6b8cba" }}>
          {label}
        </span>
        <span
          className="text-xs font-mono font-bold"
          style={{ color: "#3b82f6" }}
        >
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #2563eb ${((value - min) / (max - min)) * 100}%, #1e3a5f ${((value - min) / (max - min)) * 100}%)`,
          accentColor: "#2563eb",
        }}
      />
      <div
        className="flex justify-between text-xs"
        style={{ color: "#2d4a6e" }}
      >
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser, token, logout } = useAuthStore();
  const { tokensSaved, totalRequests, avgLatencyMs, modelBreakdown, setStats } =
    useStatsStore();

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
    if (!token) {
      router.push("/auth/login");
      return;
    }
    getStats().then((res) => setStats(res.data));
  }, [token, router, setStats]);

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      const res = await updatePolicy(policy);
      setUser(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const pieData = Object.entries(modelBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0a0f1e" }}
    >
      {/* Nav */}
      <div
        className="px-8 py-4 flex items-center justify-between"
        style={{
          background: "#0d1526",
          borderBottom: "1px solid #1e3a5f",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: "#2563eb" }}
          >
            C
          </div>
          <span className="font-semibold text-sm" style={{ color: "#f0f4ff" }}>
            ContextOS
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: "#111d35",
              border: "1px solid #1e3a5f",
              color: "#6b8cba",
            }}
          >
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/demo")}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: "#2563eb",
              color: "#fff",
            }}
          >
            Open demo →
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
            className="text-xs"
            style={{ color: "#ef4444" }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">

        {/* Stats row */}
        <div>
          <h2
            className="text-sm font-medium mb-4"
            style={{ color: "#6b8cba" }}
          >
            Pipeline stats
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Tokens saved"
              value={tokensSaved.toLocaleString()}
              sub="via context compression"
              color="#10b981"
            />
            <StatCard
              label="Total requests"
              value={totalRequests.toLocaleString()}
              sub="through pipeline"
            />
            <StatCard
              label="Avg latency"
              value={`${avgLatencyMs}ms`}
              sub="per LLM stage"
              color="#3b82f6"
            />
          </div>
        </div>

        {/* Model breakdown + Policy */}
        <div className="grid grid-cols-2 gap-6">

          {/* Model routing chart */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "#0d1526",
              border: "1px solid #1e3a5f",
            }}
          >
            <h3
              className="text-sm font-medium mb-6"
              style={{ color: "#f0f4ff" }}
            >
              Model routing breakdown
            </h3>
            {pieData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0d1526",
                        border: "1px solid #1e3a5f",
                        borderRadius: "8px",
                        color: "#f0f4ff",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {pieData.map((entry, i) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: COLORS[i % COLORS.length],
                          }}
                        />
                        <span
                          className="text-xs font-mono"
                          style={{ color: "#6b8cba" }}
                        >
                          {entry.name}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={{ color: "#f0f4ff" }}
                      >
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center h-40 text-sm"
                style={{ color: "#2d4a6e" }}
              >
                No requests yet
              </div>
            )}
          </div>

          {/* Policy settings */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "#0d1526",
              border: "1px solid #1e3a5f",
            }}
          >
            <h3
              className="text-sm font-medium mb-6"
              style={{ color: "#f0f4ff" }}
            >
              Pipeline policy
            </h3>

            <div className="space-y-6">
              <Slider
                label="Token budget"
                value={policy.token_budget}
                min={500}
                max={8000}
                step={100}
                onChange={(v) =>
                  setPolicy((p) => ({ ...p, token_budget: v }))
                }
                format={(v) => `${v} tokens`}
              />
              <Slider
                label="Temperature"
                value={policy.temperature}
                min={0}
                max={1}
                step={0.1}
                onChange={(v) =>
                  setPolicy((p) => ({ ...p, temperature: v }))
                }
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Toxicity threshold"
                value={policy.toxicity_threshold}
                min={0}
                max={1}
                step={0.1}
                onChange={(v) =>
                  setPolicy((p) => ({ ...p, toxicity_threshold: v }))
                }
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Memory chunks"
                value={policy.max_memory_chunks}
                min={1}
                max={10}
                step={1}
                onChange={(v) =>
                  setPolicy((p) => ({ ...p, max_memory_chunks: v }))
                }
              />

              {/* Toggles */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#6b8cba" }}>
                  PII masking
                </span>
                <button
                  onClick={() =>
                    setPolicy((p) => ({
                      ...p,
                      pii_masking_enabled: !p.pii_masking_enabled,
                    }))
                  }
                  className="w-10 h-5 rounded-full transition-all relative"
                  style={{
                    background: policy.pii_masking_enabled
                      ? "#2563eb"
                      : "#1e3a5f",
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all"
                    style={{
                      left: policy.pii_masking_enabled ? "22px" : "3px",
                    }}
                  />
                </button>
              </div>

              {/* Provider select */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#6b8cba" }}>
                  Preferred provider
                </span>
                <select
                  value={policy.preferred_provider}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      preferred_provider: e.target.value,
                    }))
                  }
                  className="text-xs rounded-lg px-3 py-1.5 outline-none"
                  style={{
                    background: "#111d35",
                    border: "1px solid #1e3a5f",
                    color: "#f0f4ff",
                  }}
                >
                  <option value="auto">Auto (recommended)</option>
                  <option value="groq">Groq</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>

              <button
                onClick={handleSavePolicy}
                disabled={saving}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: saved ? "#10b981" : "#2563eb",
                  color: "#fff",
                }}
              >
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save policy"}
              </button>
            </div>
          </div>
        </div>

        {/* API key */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "#0d1526",
            border: "1px solid #1e3a5f",
          }}
        >
          <h3
            className="text-sm font-medium mb-3"
            style={{ color: "#f0f4ff" }}
          >
            API key
          </h3>
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{
              background: "#111d35",
              border: "1px solid #1e3a5f",
            }}
          >
            <code
              className="text-xs flex-1 font-mono"
              style={{ color: "#6b8cba" }}
            >
              {user?.api_key || "—"}
            </code>
            <button
              onClick={() => {
                if (user?.api_key) {
                  navigator.clipboard.writeText(user.api_key);
                }
              }}
              className="text-xs px-3 py-1 rounded transition-all"
              style={{
                background: "#1e3a5f",
                color: "#6b8cba",
              }}
            >
              Copy
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: "#2d4a6e" }}>
            Use this key to access the ContextOS API programmatically
          </p>
        </div>

      </div>
    </div>
  );
}