// @ts-check
import { generateText, Output, jsonSchema } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/** @typedef {import('@browserbasehq/stagehand').ClientLLM} ClientLLM */
/** @typedef {Parameters<ClientLLM['generate']>[0]} BrowserParams */
/** @typedef {Extract<Awaited<ReturnType<ClientLLM['generate']>>, {outputFormat:'json_schema'}>['structuredContent']} BrowserJSON */
/** @typedef {{inputTokens:number|null,outputTokens:number|null,totalTokens:number|null,model:string,requestId?:string}} Usage */

export const browserModelName = () =>
  process.env.STAGEHAND_MODEL || "google/gemma-4-26b-a4b-it";

/** @param {BrowserParams['messages']} messages @returns {import('ai').ModelMessage[]} */
function messagesForAI(messages) {
  return messages.map((message) => {
    const blocks = Array.isArray(message.content)
      ? message.content
      : [message.content];
    if (blocks.some((block) => !["text", "image"].includes(block.type)))
      throw new Error(
        "Browser model tool calls are outside the approved flow.",
      );
    if (message.role === "assistant") {
      if (blocks.some((block) => block.type !== "text"))
        throw new Error("Unsupported browser assistant content.");
      return {
        role: "assistant",
        content: blocks
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("\n"),
      };
    }
    return {
      role: "user",
      content: blocks.map((block) => {
        if (block.type === "text") return { type: "text", text: block.text };
        if (block.type === "image")
          return {
            type: "image",
            image: Buffer.from(block.data, "base64"),
            mediaType: block.mimeType,
          };
        throw new Error("Unsupported browser model content.");
      }),
    };
  });
}

/**
 * Stagehand executes this callback in our server process. Only model output
 * returns to the browser runtime; the Google credential stays on Render.
 * @param {{model?:import('ai').LanguageModel,modelName?:string,maxCalls?:number,beforeCall?:()=>Promise<void>,onUsage?:(usage:Usage)=>Promise<void>}} [options]
 * @returns {ClientLLM}
 */
export function createBrowserModel({
  model,
  modelName = browserModelName(),
  maxCalls = 2,
  beforeCall,
  onUsage,
} = {}) {
  let calls = 0;
  return {
    async generate(params) {
      if (params.responseFormat?.type !== "json_schema" || "tools" in params)
        throw new Error(
          "The browser flow only permits structured action planning.",
        );
      const messages = messagesForAI(params.messages);
      if (calls >= maxCalls)
        throw new Error("The approved browser model budget is exhausted.");
      calls++;
      await beforeCall?.();
      const name = modelName;
      const promptJSON = /^google\/gemma/i.test(name);
      if (!name.startsWith("google/"))
        throw new Error(
          "The browser model must use the configured Google provider.",
        );
      const result = await generateText({
        model:
          model ??
          createGoogleGenerativeAI({
            apiKey:
              process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
              process.env.GOOGLE_API_KEY,
          })(name.slice("google/".length)),
        instructions:
          (params.systemPrompt || "") +
          (promptJSON
            ? `\nReturn only JSON matching this schema, without Markdown: ${JSON.stringify(params.responseFormat.schema)}`
            : ""),
        messages,
        output: promptJSON
          ? Output.text()
          : Output.object({
              schema: jsonSchema(
                /** @type {import('ai').JSONSchema7} */ (
                  params.responseFormat.schema
                ),
              ),
              name: params.responseFormat.name,
              description: params.responseFormat.description,
            }),
        temperature: params.temperature ?? 0,
        stopSequences: params.stopSequences,
        maxOutputTokens: 1600,
        maxRetries: 0,
        timeout: 45000,
        telemetry: {
          isEnabled: Boolean(process.env.SENTRY_DSN),
          functionId: "vox-browser-action",
          recordInputs: false,
          recordOutputs: false,
        },
      });
      const usage = {
        inputTokens: result.usage.inputTokens ?? null,
        outputTokens: result.usage.outputTokens ?? null,
        totalTokens: result.usage.totalTokens ?? null,
        model: result.response.modelId,
        requestId: result.response.id,
      };
      await onUsage?.(usage);
      const completeUsage = [
        usage.inputTokens,
        usage.outputTokens,
        usage.totalTokens,
      ].every((value) => Number.isInteger(value) && Number(value) >= 0);
      return {
        role: "assistant",
        content: { type: "text", text: result.text },
        outputFormat: "json_schema",
        structuredContent: /** @type {BrowserJSON} */ (
          promptJSON
            ? JSON.parse(
                result.text
                  .trim()
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/\s*```$/, ""),
              )
            : result.output
        ),
        stopReason: result.finishReason,
        ...(completeUsage
          ? {
              usage: {
                inputTokens: /** @type {number} */ (usage.inputTokens),
                outputTokens: /** @type {number} */ (usage.outputTokens),
                totalTokens: /** @type {number} */ (usage.totalTokens),
              },
            }
          : {}),
      };
    },
  };
}
