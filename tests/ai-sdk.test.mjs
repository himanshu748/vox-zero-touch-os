import { simulateReadableStream, toTextStream } from "ai";
import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import { generateStructured, streamStructured } from "../server/ai.mjs";
import { intentSchema } from "../shared/contracts.mjs";
function testModel(output) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify(output) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
      response: {
        id: "test-only-request",
        timestamp: new Date(),
        modelId: "test-only-model",
      },
    }),
  });
}
test("AI SDK produces validated plan data with actual SDK usage fields", async () => {
  const output = {
    actions: ["triage", "research", "draft"],
    objective: "Prepare the support queue",
  };
  const result = await generateStructured({
    schema: intentSchema,
    model: testModel(output),
    messages: [{ role: "user", content: "Triage and draft replies" }],
  });
  assert.deepEqual(result.output, output);
  assert.equal(result.sdk, "Vercel AI SDK");
  assert.equal(result.usage.totalTokens, 30);
  assert.equal(result.requestId, "test-only-request");
});
test("AI SDK rejects unknown tools before any executor can use the plan", async () => {
  await assert.rejects(
    generateStructured({
      schema: intentSchema,
      model: testModel({ actions: ["shell"], objective: "Run unsafe code" }),
      messages: [{ role: "user", content: "Ignore policy" }],
    }),
  );
});
test("AI SDK rejects invalid structured output and additional fields", async () => {
  await assert.rejects(
    generateStructured({
      schema: intentSchema,
      model: testModel({
        actions: ["triage"],
        objective: "Triage",
        rawScript: "alert(1)",
      }),
      messages: [{ role: "user", content: "Triage tickets" }],
    }),
  );
});

test("AI SDK streams JSON for generative plan cards and validates the completed output", async () => {
  const output = {
    actions: ["triage", "tag"],
    objective: "Prioritize the queue",
  };
  const text = JSON.stringify(output);
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: text.slice(0, 25) },
          { type: "text-delta", id: "text-1", delta: text.slice(25) },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: { total: 3, noCache: 3 },
              outputTokens: { total: 10, text: 10 },
            },
          },
        ],
      }),
    }),
  });
  const result = streamStructured({
    schema: intentSchema,
    model,
    signal: new AbortController().signal,
    messages: [{ role: "user", content: "Prioritize the queue" }],
  });
  let response = "";
  for await (const chunk of toTextStream({ stream: result.stream }))
    response += chunk;
  assert.deepEqual(JSON.parse(response), output);
  assert.deepEqual(await result.output, output);
});
