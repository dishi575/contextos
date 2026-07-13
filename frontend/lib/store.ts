import { create } from "zustand";
import { persist } from "zustand/middleware";

// --- Types ---
export interface User {
  id: number;
  email: string;
  api_key: string | null;
  token_budget: number;
  temperature: number;
  toxicity_threshold: number;
  max_memory_chunks: number;
  pii_masking_enabled: boolean;
  preferred_provider: string;
}

export interface TraceItem {
  stage: string;
  status: "pass" | "warn" | "block";
  latency_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  model_used: string | null;
  detail: Record<string, unknown> | null;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Session {
  id: number;
  title: string;
  created_at: string;
}

// --- Auth Store ---
interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        localStorage.setItem("access_token", token);
        set({ token });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// --- Chat Store ---
interface ChatState {
  sessions: Session[];
  activeSessionId: number | null;
  messages: Message[];
  liveTraces: TraceItem[];
  isLoading: boolean;
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (id: number | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  appendLiveTrace: (trace: TraceItem) => void;
  clearLiveTraces: () => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  liveTraces: [],
  isLoading: false,
  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (id) => set({ activeSessionId: id, messages: [], liveTraces: [] }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  appendLiveTrace: (trace) =>
    set((state) => ({ liveTraces: [...state.liveTraces, trace] })),
  clearLiveTraces: () => set({ liveTraces: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// --- Stats Store ---
interface StatsState {
  tokensSaved: number;
  totalRequests: number;
  avgLatencyMs: number;
  modelBreakdown: Record<string, number>;
  setStats: (stats: {
    tokens_saved: number;
    total_requests: number;
    avg_latency_ms: number;
    model_breakdown: Record<string, number>;
  }) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  tokensSaved: 0,
  totalRequests: 0,
  avgLatencyMs: 0,
  modelBreakdown: {},
  setStats: (stats) =>
    set({
      tokensSaved: stats.tokens_saved,
      totalRequests: stats.total_requests,
      avgLatencyMs: stats.avg_latency_ms,
      modelBreakdown: stats.model_breakdown,
    }),
}));