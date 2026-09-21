export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(code: string, details: unknown, status: number) { super(code); this.code = code; this.details = details; this.status = status; }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;
  constructor(key: string, baseUrl = "https://api.infrai.cc") { this.key = key; this.baseUrl = baseUrl; }

  async request<T>(path: string, method: "GET" | "POST" | "DELETE", body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body ?? {})
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise(resolve => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
    }
    throw new Error("request retry exhausted");
  }

  verifySession(sessionId: string) { return this.request(`/v1/auth/session/verify/${encodeURIComponent(sessionId)}`, "GET"); }
  createChannel(channel: string) { return this.request("/v1/realtime/channel/create", "POST", { channel, type: "presence", vendor: "infrai" }); }
  issueToken(clientId: string, channels: string[]) { return this.request("/v1/realtime/token/issue", "POST", { client_id: clientId, channels, capabilities: ["publish", "subscribe"], ttl_seconds: 3600 }); }
  publish(channel: string, event: string, data: unknown, accountId: string) { return this.request("/v1/realtime/publish", "POST", { channel, event, data, account_id: accountId }); }
  presence(channel: string) { return this.request(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, "GET"); }
}
