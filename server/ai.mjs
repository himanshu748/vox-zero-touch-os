// @ts-check
import { generateText, streamText, Output } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function modelConnection() {
  const provider =
    process.env.GEMMA_PROVIDER ||
    (process.env.GEMMA_BASE_URL ? "compatible" : "google");
  const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  return {
    provider,
    model,
    ready:
      provider === "google"
        ? Boolean(key)
        : Boolean(process.env.GEMMA_BASE_URL && process.env.GEMMA_MODEL),
  };
}
/** @returns {import('ai').LanguageModel} */
export function configuredModel() {
  const config = modelConnection();
  if (!config.ready)
    throw new Error(
      "Connect a Gemma endpoint or Google AI key to enable generation.",
    );
  if (!/gemma/i.test(config.model))
    throw new Error("GEMMA_MODEL must identify a Gemma model.");
  if (config.provider === "google") {
    const google = createGoogleGenerativeAI({
      apiKey:
        process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
    });
    return google(config.model);
  }
  const provider = createOpenAICompatible({
    name: "vox-gemma",
    baseURL: /** @type {string} */ (process.env.GEMMA_BASE_URL),
    apiKey: process.env.GEMMA_API_KEY,
    supportsStructuredOutputs: process.env.GEMMA_STRUCTURED_OUTPUTS === "true",
  });
  return provider(config.model);
}
/** @param {import('ai').ModelMessage[]} messages */
function modelPrompt(messages) {
  return {
    instructions:
      messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n") +
      "\nRespond with only the requested JSON object, without Markdown or explanations.",
    messages: messages.filter((message) => message.role !== "system"),
  };
}
/** @template T @param {string} text @param {import('zod').ZodType<T>} schema */
function parseJSON(text, schema) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return schema.parse(JSON.parse(clean));
}
/**
 * Google Gemma uses prompt-constrained JSON because not every Gemma deployment
 * supports Google's native response schema. Validation is mandatory in both modes.
 * @template T
 * @param {{schema:import('zod').ZodType<T>,messages:import('ai').ModelMessage[],model?:import('ai').LanguageModel,signal?:AbortSignal}} options
 */
export async function generateStructured({ schema, messages, model, signal }) {
  const promptJSON = !model && modelConnection().provider === "google";
  const result = await generateText({
    model: model ?? configuredModel(),
    ...modelPrompt(messages),
    output: promptJSON ? Output.text() : Output.object({ schema }),
    temperature: 0.1,
    maxOutputTokens: 1200,
    maxRetries: 0,
    abortSignal: AbortSignal.any([
      AbortSignal.timeout(60000),
      ...(signal ? [signal] : []),
    ]),
  });
  return {
    output: promptJSON
      ? parseJSON(result.text, schema)
      : schema.parse(result.output),
    usage: {
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
      totalTokens: result.usage.totalTokens ?? null,
    },
    model: result.response.modelId,
    requestId: result.response.id,
    sdk: "Vercel AI SDK",
  };
}
/** @template T @param {{schema:import('zod').ZodType<T>,messages:import('ai').ModelMessage[],signal:AbortSignal,model?:import('ai').LanguageModel}} options */
export function streamStructured({ schema, messages, signal, model }) {
  const promptJSON = !model && modelConnection().provider === "google";
  const result = streamText({
    model: model ?? configuredModel(),
    ...modelPrompt(messages),
    output: promptJSON ? Output.text() : Output.object({ schema }),
    temperature: 0.1,
    maxOutputTokens: 1200,
    maxRetries: 0,
    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
  });
  // The route exposes only raw JSON text. Partial data never becomes an executable plan.
  return promptJSON
    ? {
        ...result,
        stream: result.stream,
        usage: result.usage,
        response: result.response,
        output: result.text.then((text) => parseJSON(text, schema)),
      }
    : result;
}
