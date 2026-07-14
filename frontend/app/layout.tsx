import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ContextOS — Intelligent LLM Middleware",
  description:
    "7-stage AI middleware pipeline with real-time observability. PII guard, semantic memory, context compression, multi-model routing, and output validation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={inter.className}
        style={{ background: "#0a0f1e", margin: 0, padding: 0 }}
      >
        {children}
      </body>
    </html>
  );
}