import type { AgentId } from "./agents";
import { API_BASE } from "./api";

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Streams a response from the Express `/api/chat/stream` endpoint.
 * Calls onDelta with each text chunk, onDone when complete, onError on failure.
 */
export async function streamAgent({
  agent,
  messages,
  matterContext,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  agent: AgentId;
  messages: ChatMsg[];
  matterContext?: string;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
}) {
  const url = `${API_BASE}/api/chat/stream`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, messages, matterContext }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    onError(e instanceof Error ? e.message : "Network error");
    return;
  }

  if (!resp.ok) {
    let msg = `Error ${resp.status}`;
    try {
      const j = (await resp.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    onError(msg);
    return;
  }

  if (!resp.body) {
    onError("No response body from server");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") {
        done = true;
        break;
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  /* flush remaining buffer */
  if (buf.trim()) {
    for (let raw of buf.split("\n")) {
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
      const payload = raw.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        /* ignore */
      }
    }
  }

  onDone();
}
