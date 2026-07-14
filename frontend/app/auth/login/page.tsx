"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, getMe } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      setToken(data.access_token);
      const meRes = await getMe();
      setUser(meRes.data);
      router.push("/demo");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0a0f1e" }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "#2563eb" }}
            >
              C
            </div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "#f0f4ff" }}
            >
              ContextOS
            </h1>
          </div>
          <p style={{ color: "#6b8cba" }} className="text-sm">
            Intelligent middleware for LLM applications
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "#0d1526",
            border: "1px solid #1e3a5f",
          }}
        >
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "#f0f4ff" }}
          >
            Sign in to your account
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="text-sm block mb-1.5"
                style={{ color: "#6b8cba" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "#111d35",
                  border: "1px solid #1e3a5f",
                  color: "#f0f4ff",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#2563eb")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#1e3a5f")
                }
              />
            </div>

            <div>
              <label
                className="text-sm block mb-1.5"
                style={{ color: "#6b8cba" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "#111d35",
                  border: "1px solid #1e3a5f",
                  color: "#f0f4ff",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#2563eb")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#1e3a5f")
                }
              />
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-2.5 text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-medium rounded-lg py-2.5 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "#2563eb",
                color: "#fff",
              }}
              onMouseEnter={(e) =>
                !loading && ((e.target as HTMLElement).style.background = "#1d4ed8")
              }
              onMouseLeave={(e) =>
                !loading && ((e.target as HTMLElement).style.background = "#2563eb")
              }
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "#6b8cba" }}>
            No account?{" "}
            <Link
              href="/auth/register"
              className="transition-colors"
              style={{ color: "#3b82f6" }}
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Bottom tag */}
        <p className="text-center text-xs mt-6" style={{ color: "#1e3a5f" }}>
          7-stage AI middleware pipeline
        </p>

      </div>
    </div>
  );
}