import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const register = (email: string, password: string) =>
  api.post("/api/auth/register", { email, password });

export const login = async (email: string, password: string) => {
  const form = new FormData();
  form.append("username", email);
  form.append("password", password);
  const res = await api.post("/api/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
};

export const getMe = () => api.get("/api/auth/me");

export const updatePolicy = (data: {
  token_budget?: number;
  temperature?: number;
  toxicity_threshold?: number;
  max_memory_chunks?: number;
  pii_masking_enabled?: boolean;
  preferred_provider?: string;
}) => api.patch("/api/auth/policy", data);

// --- Chat ---
export const sendMessage = (message: string, session_id?: number) =>
  api.post("/api/chat/", { message, session_id });

export const getSessions = () => api.get("/api/chat/sessions");

export const getMessages = (session_id: number) =>
  api.get(`/api/chat/sessions/${session_id}/messages`);

export const deleteSession = (session_id: number) =>
  api.delete(`/api/chat/sessions/${session_id}`);

// --- Traces ---
export const getTraces = (message_id: number) =>
  api.get(`/api/traces/${message_id}`);

export const getStats = () => api.get("/api/traces/stats/summary");

// --- WebSocket ---
export const createTraceSocket = (
  token: string,
  onTrace: (trace: object) => void,
  onClose?: () => void,
) => {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  const ws = new WebSocket(`${WS_URL}/ws/traces?token=${token}`);

  ws.onmessage = (event) => {
    if (event.data === "pong") return;
    try {
      const trace = JSON.parse(event.data);
      onTrace(trace);
    } catch {}
  };

  ws.onclose = () => onClose?.();

  // Ping every 20 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 20000);

  ws.addEventListener("close", () => clearInterval(pingInterval));

  return ws;
};