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
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        background: "#0a0f1e",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: "700",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              C
            </div>
            <h1
              style={{
                color: "#f0f4ff",
                fontSize: "22px",
                fontWeight: "700",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              ContextOS
            </h1>
          </div>
          <p style={{ color: "#6b8cba", fontSize: "13px", margin: 0 }}>
            Intelligent middleware for LLM applications
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#0d1526",
            border: "1px solid #1e3a5f",
            borderRadius: "16px",
            padding: "32px",
          }}
        >
          <h2
            style={{
              color: "#f0f4ff",
              fontSize: "17px",
              fontWeight: "600",
              margin: "0 0 24px",
            }}
          >
            Sign in to your