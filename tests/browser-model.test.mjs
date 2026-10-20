import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import { ClientLLMSchema } from "@browserbasehq/stagehand";
import { createBrowserModel } from "../server/browser-model.mjs";

const params = {
  messages: [
    {
      role: "user",
      content: { type: "text", text: "Choose the save button." },
    },
  ],
  responseFormat: {
    type: "json_schema",
    name: "browser_action",
    schema: {
      type: "object",
      properties: { selector: { type: "string" } },
      required: ["selector"],
    },
  },
};
function mockModel({
  text = '{"selector":"button"}',
  tokens = true,
  onCall = () => {},
} = {}) {
  return new MockLanguageModelV4({
    doGenerate: async (options) => {
      onCall(options);
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: tokens ? 10 : undefined },
          outputTokens: { total: tokens ? 20 : undefined },
        },
        warnings: [],
        response: {
          id: "test-request",
          timestamp: new Date(),
          modelId: "test-model",
        },
      };
    },
  });
}
test("local AI SDK callback satisfies Stagehand's structured protocol and reports actual usage", async () => {
  let savedUsage;
  const model = createBrowserModel({
    model: mockModel({
      onCall(options) {
        assert.equal(options.responseFormat.type, "json");
        assert.equal(options.responseFormat.schema.required[0], "selector");
      },
    }),
    onUsage: async (usage) => {
      savedUsage = usage;
    },
  });
  const result = await ClientLLMSchema.parse(model).generate(params);
  assert.deepEqual(result.structuredContent, { selector: "button" });
  assert.deepEqual(result.usage, {
    inputTokens: 10,
    outputTokens: 20,
    totalTokens: 30,
  });
  assert.equal(savedUsage.requestId, "test-request");
  assert.equal(savedUsage.model, "test-model");
  assert.deepEqual(Object.keys(model), ["generate"]);
});
test("browser callback enforces the approved model budget without an extra provider request", async () => {
  let providerCalls = 0,
    reservedCalls = 0;
  const model = createBrowserModel({
    model: mockModel({
      onCall() {
        providerCalls++;
      },
    }),
    maxCalls: 2,
    beforeCall: async () => {
      reservedCalls++;
    },
  });
  await model.generate(params);
  await model.generate(params);
  await assert.rejects(model.generate(params), /budget is exhausted/);
  assert.equal(providerCalls, 2);
  assert.equal(reservedCalls, 2);
});
test("unsupported tool requests and invalid output cannot become browser actions", async () => {
  let providerCalls = 0;
  const model = createBrowserModel({
    model: mockModel({
      text: "not JSON",
      onCall() {
        providerCalls++;
      },
    }),
  });
  await assert.rejects(
    model.generate({ ...params, tools: [] }),
    /only permits structured/,
  );
  await assert.rejects(
    model.generate({
      ...params,
      messages: [
        {
          role: "assistant",
          content: { type: "tool_use", id: "x", name: "shell", input: {} },
        },
      ],
    }),
    /outside the approved/,
  );
  assert.equal(providerCalls, 0);
  await assert.rejects(model.generate(params));
  assert.equal(providerCalls, 1);
});
test("missing provider token counts remain unknown", async () => {
  const model = createBrowserModel({ model: mockModel({ tokens: false }) });
  const result = await model.generate(params);
  assert.equal(result.usage, undefined);
});
