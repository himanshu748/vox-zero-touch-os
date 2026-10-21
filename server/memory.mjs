import { z } from "zod";
import { randomUUID } from "node:crypto";
import { isLocalModelMode } from "./model-mode.mjs";
export function createMemory({ fetchImpl = fetch } = {}) {
  async function request(path, body) {
    const start = Date.now();
    const response = await fetchImpl(`https://app.backboard.io/api${path}`, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.BACKBOARD_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(`Backboard memory failed (HTTP ${response.status}).`);
    return {
      data: await response.json(),
      receipt: {
        id: randomUUID(),
        provider: "Backboard",
        operation: path.endsWith("/search")
          ? "memory retrieval"
          : "memory save",
        requestId: response.headers.get("x-request-id"),
        latencyMs: Date.now() - start,
        cost: null,
        createdAt: new Date().toISOString(),
      },
    };
  }
  async function assistant(store, owner) {
    let id = store.get(owner).memory?.assistantId;
    if (!id) {
      const { data } = await request("/assistants", {
        name: `VOX ${owner.slice(-12)}`,
        system_prompt: "Store only this workspace support reply preferences.",
      });
      id = z.string().uuid().parse(data.assistant_id);
      store.mutate(owner, (s) => {
        s.memory = { assistantId: id };
      });
      await store.flush?.();
    }
    return id;
  }
  return {
    async saveStyle(store, owner, style) {
      if (isLocalModelMode() || !process.env.BACKBOARD_API_KEY) return null;
      if (store.get(owner).memory?.savedStyle === style) return null;
      const id = await assistant(store, owner);
      const result = await request(`/assistants/${id}/memories`, {
        content: `Support reply style preference: ${style}.`,
        metadata: { kind: "reply-style" },
      });
      store.mutate(owner, (s) => {
        s.receipts.push(result.receipt);
        s.memory.savedStyle = style;
      });
      return result.receipt;
    },
    async recall(store, owner) {
      if (
        isLocalModelMode() ||
        !process.env.BACKBOARD_API_KEY ||
        !store.get(owner).memory?.assistantId
      )
        return null;
      const id = store.get(owner).memory.assistantId;
      const result = await request(`/assistants/${id}/memories/search`, {
        query: "Support reply style preference",
        limit: 3,
      });
      const memories = z
        .array(
          z
            .object({
              id: z.string(),
              content: z.string().max(2000),
              score: z.number().optional(),
            })
            .passthrough(),
        )
        .parse(result.data.memories);
      const target = store.get(owner).memory.savedStyle;
      const match = memories.find((item) =>
        item.content.includes(`preference: ${target}`),
      );
      store.mutate(owner, (s) => {
        s.receipts.push(result.receipt);
      });
      return match
        ? {
            style: target,
            memoryId: match.id,
            assistantId: id,
            receiptId: result.receipt.id,
          }
        : null;
    },
  };
}
