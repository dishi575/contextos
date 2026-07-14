"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      router.push("/demo");
    } else {
      router.push("/auth/login");
    }
  }, [token, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0a0f1e" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm animate-pulse"
          style={{ background: "#2563eb" }}
        >
          C
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: "#6b8cba" }}
        >
          Loading ContextOS...
        </span>
      </div>
    </div>
  );
}