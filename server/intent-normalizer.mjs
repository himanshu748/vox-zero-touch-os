import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { providerJSON } from "./provider-http.mjs";
import { generateStructured } from "./ai.mjs";
import { isLocalModelMode, localModelConfig } from "./model-mode.mjs";

export const normalizationSchema = z
  .object({
    research: z.boolean(),
    drafts: z.number().int().min(0).max(6),
    tag: z.boolean(),
  })
  .strict();
// Identical to the prompt used for the checked-in training and held-out fixtures.
export const normalizationPrompt =
  'Normalize a synthetic support command into JSON with exactly research (boolean), drafts (integer 0 to 6), tag (boolean). Triage is always implicit. Drafting needs research. Draft zero if no replies are requested; default to two if a count is not stated. "A reply" or "one reply" means one. Research means looking up fixes or sources. Do not interpret "no drafts" as a drafting request. Tags mean internal labels only. Sending is never authorized. Return only the JSON object, with no prose.';
export const normalizationEnabled = () =>
  isLocalModelMode() ||
  Boolean(
    process.env.TINKER_API_KEY &&
    /^tinker:\/\/[^\s]+\/sampler_weights\/[^\s]+$/.test(
      process.env.TINKER_MODEL || "",
    ) &&
    Date.parse(process.env.TINKER_MODEL_EXPIRES_AT || "") > Date.now(),
  );
export function normalizedIntent(intent, normalization) {
  if (!normalization) return intent;
  const value = normalizationSchema.parse(normalization);
  return {
    objective: intent.objective,
    actions: [
      "triage",
      ...(value.research || value.drafts ? ["research"] : []),
      ...(value.tag ? ["tag"] : []),
      ...(value.drafts ? ["draft"] : []),
    ],
    ...(value.drafts ? { draftLimit: value.drafts } : {}),
  };
}
export async function normalizeCommand(
  command,
  { fetchImpl = fetch, signal } = {},
) {
  if (!normalizationEnabled()) return null;
  z.string().min(8).max(2000).parse(command);
  const start = Date.now();
  if (isLocalModelMode()) {
    const config = localModelConfig();
    const messages = [
      { role: "system", content: normalizationPrompt },
      { role: "user", content: command },
    ];
    let result,
      fallbackUsed = false;
    try {
      result = await generateStructured({
        schema: normalizationSchema,
        messages,
        signal,
      });
    } catch (error) {
      if (signal?.aborted || config.model === config.intentFallback)
        throw error;
      fallbackUsed = true;
      result = await generateStructured({
        schema: normalizationSchema,
        messages,
        localModel: config.intentFallback,
        signal,
      });
    }
    return {
      value: normalizationSchema.parse(result.output),
      receipt: {
        provider: "Local intent model",
        operation: "intent normalization",
        execution: "local",
        model: result.model,
        fallbackUsed,
        requestId: result.requestId,
        latencyMs: Date.now() - start,
        usage: result.usage,
        cost: null,
        createdAt: new Date().toISOString(),
      },
    };
  }
  const { data } = await providerJSON(
    "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1/chat/completions",
    {
      fetchImpl,
      signal,
      timeout: 60000,
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINKER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.TINKER_MODEL,
        temperature: 0,
        max_tokens: 96,
        // Qwen3-8B's live endpoint requires a boolean to match enable_thinking=False.
        reasoning_effort: false,
        stream: false,
        messages: [
          { role: "system", content: normalizationPrompt },
          { role: "user", content: command },
        ],
      }),
    },
  );
  const output = z
    .object({
      id: z.string().min(1),
      choices: z
        .array(
          z.object({
            finish_reason: z.literal("stop"),
            message: z.object({ content: z.string().min(1).max(2000) }),
          }),
        )
        .length(1),
      usage: z.object({
        prompt_tokens: z.number().int().nonnegative(),
        completion_tokens: z.number().int().min(1).max(96),
      }),
    })
    .parse(data);
  const value = normalizationSchema.parse(
    JSON.parse(output.choices[0].message.content),
  );
  return {
    value,
    receipt: {
      provider: "Tinker",
      operation: "fine-tuned intent normalization",
      model: "VOX intent v1 / Qwen3-8B LoRA",
      requestId: output.id,
      latencyMs: Date.now() - start,
      usage: {
        inputTokens: output.usage.prompt_tokens,
        outputTokens: output.usage.completion_tokens,
      },
      cost:
        (output.usage.prompt_tokens * 0.195 +
          output.usage.completion_tokens * 0.6) /
        1e6,
      costBasis:
        "Published USD token rates, 2026-10-20; estimate, not an invoice",
      createdAt: new Date().toISOString(),
    },
  };
}
// Persist a reservation before inference. A timeout or restart cannot silently bill it twice.
export async function normalizePlan(
  store,
  owner,
  planId,
  command,
  { normalize = normalizeCommand, signal } = {},
) {
  if (!normalizationEnabled()) return null;
  const hash = createHash("sha256").update(command).digest("hex");
  const prior = store.get(owner).normalizations?.[planId];
  if (prior?.hash !== undefined && prior.hash !== hash)
    throw Object.assign(
      new Error("This plan request belongs to a different command."),
      { status: 409 },
    );
  if (prior?.status === "completed") return prior.result;
  if (prior)
    throw Object.assign(
      new Error(
        "Intent normalization already started without a saved result. Automatic replay is blocked.",
      ),
      { status: 409 },
    );
  store.mutate(owner, (s) => {
    if (Object.keys(s.normalizations || {}).length >= 100)
      throw Object.assign(new Error("Planning request limit reached."), {
        status: 429,
      });
    (s.normalizations ||= {})[planId] = {
      hash,
      status: "started",
      at: new Date().toISOString(),
    };
  });
  await store.flush?.();
  try {
    const result = await normalize(command, { signal });
    if (!result)
      throw new Error("The approved intent normalizer is unavailable.");
    normalizationSchema.parse(result.value);
    store.mutate(owner, (s) => {
      s.normalizations[planId] = {
        hash,
        status: "completed",
        result,
        at: new Date().toISOString(),
      };
      s.receipts.push({ id: randomUUID(), planId, ...result.receipt });
    });
    await store.flush?.();
    return result;
  } catch (error) {
    store.mutate(owner, (s) => {
      if (s.normalizations[planId]?.status === "started")
        s.normalizations[planId].status = "uncertain";
    });
    await store.flush?.();
    throw error;
  }
}
