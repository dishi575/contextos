"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, getMe } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { PixelTrail } from "@/components/ui/pixel-trail";

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
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-[#05070c] overflow-hidden select-none">
      
      {/* Interactive Pixel Trail Background */}
      <div className="absolute inset-0 z-0">
        <PixelTrail
          pixelSize={44}
          fadeDuration={850}
          delay={0}
          pixelClassName="bg-blue-500/30 rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.45)] border border-blue-500/15"
        />
      </div>

      {/* Login Card (Elevated above background) */}
      <div className="relative z-10 w-full max-w-[400px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/90 shadow-[0_0_10px_rgba(37,99,235,0.45)] flex items-center justify-center text-white font-extrabold text-xs">
              C
            </div>
            <h1 className="text-xl font-extrabold text-slate-200 tracking-wide">
              ContextOS
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">
            OBSERVABILITY MIDDLEWARE
          </p>
        </div>

        {/* Card Form container */}
        <div className="rounded-xl border border-slate-800/80 bg-[#070b13]/85 backdrop-blur p-8 shadow-2xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6">
            Sign In to Terminal
          </h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                operator_email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operator@contextos.ai"
                className="w-full bg-[#111d35]/40 border border-slate-800 focus:border-blue-600/50 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 outline-none font-mono transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                access_password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#111d35]/40 border border-slate-800 focus:border-blue-600/50 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 outline-none font-mono transition-all duration-150"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-900/35 bg-rose-950/10 px-3.5 py-2.5 text-rose-400 font-mono text-[11px] leading-tight">
                ⚠️ ACCESS_DENIED: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-45 text-white text-xs font-mono font-bold tracking-wider py-3 rounded-lg shadow-[0_0_8px_rgba(37,99,235,0.3)] transition-all duration-150 mt-2 uppercase"
            >
              {loading ? "Decrypting credentials..." : "Initialize Session"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            New operator?{" "}
            <Link
              href="/auth/register"
              className="text-blue-500 hover:text-blue-400 font-semibold"
            >
              Register endpoint
            </Link>
          </p>
        </div>

        <p className="text-center font-mono text-[9px] text-slate-600 mt-6 tracking-widest uppercase">
          SECURE MIDDLEWARE OBSERVABILITY GATEWAY
        </p>
      </div>
    </div>
  );
}