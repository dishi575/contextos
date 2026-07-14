"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, login, getMe } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      const data = await login(email, password);
      setToken(data.access_token);
      const meRes = await getMe();
      setUser(meRes.data);
      router.push("/demo");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setError(detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "#111d35",
    border: "1px solid #1e3a5f",
    color: "#f0f4ff",
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
            Create your account
          </h2>

          <form onSubmit={handleRegister} className="space-y-4">
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
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#1e3a5f")}
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
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#1e3a5f")}
              />
            </div>

            <div>
              <label
                className="text-sm block mb-1.5"
                style={{ color: "#6b8cba" }}
              >
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#1e3a5f")}
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
              style={{ background: "#2563eb", color: "#fff" }}
              onMouseEnter={(e) =>
                !loading &&
                ((e.target as HTMLElement).style.background = "#1d4ed8")
              }
              onMouseLeave={(e) =>
                !loading &&
                ((e.target as HTMLElement).style.background = "#2563eb")
              }
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "#6b8cba" }}>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="transition-colors"
              style={{ color: "#3b82f6" }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#1e3a5f" }}>
          7-stage AI middleware pipeline
        </p>

      </div>
    </div>
  );
}