import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDB } from "./db/connection.js";
import { apiRouter } from "./routes/api.js";
import { buildSystemContent, isAgentId, type AgentId } from "./prompts.js";

const PORT = Number(process.env.PORT) || 3001;
const AI_API_KEY = process.env.AI_API_KEY ?? "";
const AI_BASE_URL =
  process.env.AI_BASE_URL ?? "https://ai.gateway.lovable.dev/v1";
const AI_MODEL = process.env.AI_MODEL ?? "google/gemini-3-flash-preview";

const corsOrigin = process.env.CORS_ORIGIN;
const corsOptions: cors.CorsOptions = {
  origin:
    corsOrigin === "*"
      ? true
      : corsOrigin
        ? corsOrigin.split(",").map((s) => s.trim())
        : true,
};

type ChatMessage = { role: string; content: string };

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

/* ─── Health check ─── */
app.get("/health", (_req, res) => {
  res.json({ ok: true, db: "mongodb" });
});

/* ─── MongoDB-backed REST API ─── */
app.use("/api", apiRouter);

/* ─── LLM Streaming endpoint (unchanged) ─── */
app.post("/api/chat/stream", async (req, res) => {
  if (!AI_API_KEY) {
    res.status(500).json({ error: "AI_API_KEY is not configured on the server" });
    return;
  }

  const agentRaw = req.body?.agent;
  const agent: AgentId = isAgentId(agentRaw) ? agentRaw : "research";
  const messages: ChatMessage[] = Array.isArray(req.body?.messages)
    ? req.body.messages
    : [];
  const matterContext: string | undefined =
    typeof req.body?.matterContext === "string"
      ? req.body.matterContext
      : undefined;

  const system = buildSystemContent(agent, matterContext);
  const payload = {
    model: AI_MODEL,
    messages: [{ role: "system", content: system }, ...messages],
    stream: true,
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    res.status(502).json({
      error: e instanceof Error ? e.message : "Upstream request failed",
    });
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    if (upstream.status === 429) {
      res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
      return;
    }
    if (upstream.status === 402) {
      res.status(402).json({
        error: "AI workspace credits exhausted. Add funds or check your API billing.",
      });
      return;
    }
    console.error("AI gateway error:", upstream.status, text);
    res.status(502).json({ error: "AI gateway error" });
    return;
  }

  if (!upstream.body) {
    res.status(502).json({ error: "No response body from AI gateway" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) res.write(Buffer.from(value));
    }
  } catch (e) {
    console.error("stream pipe error:", e);
    if (!res.writableEnded) res.end();
    return;
  }
  res.end();
});

/* ─── Boot ─── */
export async function start() {
  await connectDB();
  // Only listen on a port if we're not being required as a module (e.g. by Vercel)
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL) {
     // On Vercel we don't call .listen()
     if (!process.env.VERCEL) {
        app.listen(PORT, () => {
          console.log(`\n🚀 Legal Assistant API → http://localhost:${PORT}`);
          console.log(`   POST /api/chat/stream  (model: ${AI_MODEL})`);
          console.log(`   GET  /api/matters`);
        });
     }
  }
}

// In standard development/production, we run start()
// But for Vercel, we export the app.
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  start().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}

export { app };
