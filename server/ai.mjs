// @ts-check
import { generateText, streamText, Output, jsonSchema, zodSchema } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  isLocalModelMode,
  localModelConfig,
  loopbackFetch,
} from "./model-mode.mjs";

export function modelConnection() {
  if (isLocalModelMode())
    return { provider: "local", model: localModelConfig().model, ready: true };
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
/** @param {string} [localModel] @returns {import('ai').LanguageModel} */
export function configuredModel(localModel) {
  const config = modelConnection();
  if (isLocalModelMode()) {
    const local = localModelConfig();
    return createOpenAICompatible({
      name: "vox-local",
      baseURL: local.baseURL,
      supportsStructuredOutputs: true,
      fetch: loopbackFetch(),
    })(localModel || local.model);
  }
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
 * Ollama's grammar compiler rejects some large bounded-string grammars.
 * Remove string-length hints only from inference; final Zod validation is unchanged.
 * @template T @param {import('zod').ZodType<T>} schema
 */
function inferenceSchema(schema) {
  if (!isLocalModelMode()) return schema;
  return jsonSchema(
    JSON.parse(JSON.stringify(zodSchema(schema).jsonSchema), (key, value) =>
      key === "minLength" || key === "maxLength" ? undefined : value,
    ),
  );
}
/**
 * Google Gemma uses prompt-constrained JSON because not every Gemma deployment
 * supports Google's native response schema. Validation is mandatory in both modes.
 * @template T
 * @param {{schema:import('zod').ZodType<T>,messages:import('ai').ModelMessage[],model?:import('ai').LanguageModel,localModel?:string,signal?:AbortSignal}} options
 */
export async function generateStructured({
  schema,
  messages,
  model,
  localModel,
  signal,
}) {
  const promptJSON = !model && modelConnection().provider === "google";
  const result = await generateText({
    model: model ?? configuredModel(localModel),
    ...modelPrompt(messages),
    output: promptJSON
      ? Output.text()
      : Output.object({ schema: inferenceSchema(schema) }),
    temperature: 0.1,
    maxOutputTokens: 1200,
    maxRetries: 0,
    telemetry: {
      isEnabled: !isLocalModelMode() && Boolean(process.env.SENTRY_DSN),
      functionId: "vox-gemma-structured",
      recordInputs: false,
      recordOutputs: false,
    },
    abortSignal: AbortSignal.any([
      AbortSignal.timeout(isLocalModelMode() ? 180000 : 60000),
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
    output: promptJSON
      ? Output.text()
      : Output.object({ schema: inferenceSchema(schema) }),
    temperature: 0.1,
    maxOutputTokens: 1200,
    maxRetries: 0,
    telemetry: {
      isEnabled: !isLocalModelMode() && Boolean(process.env.SENTRY_DSN),
      functionId: "vox-gemma-plan",
      recordInputs: false,
      recordOutputs: false,
    },
    abortSignal: AbortSignal.any([
      signal,
      AbortSignal.timeout(isLocalModelMode() ? 180000 : 60000),
    ]),
  });
  // The route exposes only raw JSON text. Partial data never becomes an executable plan.
  return promptJSON || isLocalModelMode()
    ? {
        ...result,
        stream: result.stream,
        usage: result.usage,
        response: result.response,
        output: promptJSON
          ? result.text.then((text) => parseJSON(text, schema))
          : result.output.then((value) => schema.parse(value)),
      }
    : result;
}
