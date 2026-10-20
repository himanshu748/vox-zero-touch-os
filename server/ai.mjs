// @ts-check
import { generateText, streamText, Output } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * The endpoint is server-configured. Model output can never choose a URL or tool.
 * @returns {import('ai').LanguageModel}
 */
export function configuredModel() {
  if (!process.env.GEMMA_BASE_URL || !process.env.GEMMA_MODEL) {
    throw new Error("Connect a Gemma endpoint to enable AI generation.");
  }
  const provider = createOpenAICompatible({
    name: "vox-gemma",
    baseURL: process.env.GEMMA_BASE_URL,
    apiKey: process.env.GEMMA_API_KEY,
    // vLLM structured output is opt-in because support varies by endpoint.
    supportsStructuredOutputs: process.env.GEMMA_STRUCTURED_OUTPUTS === "true",
  });
  return provider(process.env.GEMMA_MODEL);
}

/**
 * AI SDK validates the response before the executor receives it.
 * Retries stay disabled here so the visible workflow owns retry and cost policy.
 * @template T
 * @param {{schema:import('zod').ZodType<T>,messages:import('ai').ModelMessage[],model?:import('ai').LanguageModel}} options
 */
export async function generateStructured({ schema, messages, model }) {
  const result = await generateText({
    model: model ?? configuredModel(),
    messages,
    output: Output.object({ schema }),
    temperature: 0.1,
    maxOutputTokens: 900,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(45000),
  });
  return {
    output: schema.parse(result.output),
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

/**
 * @template T
 * @param {{schema:import('zod').ZodType<T>,messages:import('ai').ModelMessage[],signal:AbortSignal,model?:import('ai').LanguageModel}} options
 */
export function streamStructured({ schema, messages, signal, model }) {
  return streamText({
    model: model ?? configuredModel(),
    messages,
    output: Output.object({ schema }),
    temperature: 0.1,
    maxOutputTokens: 900,
    maxRetries: 0,
    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
  });
}
