import type { AgentId } from "./agents";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent`;

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

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
  let resp: Response;
  try {
    resp = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ agent, messages, matterContext }),
      signal,
    });
  } catch (e) {
    onError(e instanceof Error ? e.message : "Network error");
    return;
  }

  if (!resp.ok) {
    let msg = `Error ${resp.status}`;
    try {
      const j = await resp.json();
      if (j.error) msg = j.error;
    } catch {}
    onError(msg);
    return;
  }
  if (!resp.body) {
    onError("No response body");
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
      if (payload === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(payload);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  // flush
  if (buf.trim()) {
    for (let raw of buf.split("\n")) {
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
      const payload = raw.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {}
    }
  }

  onDone();
}
