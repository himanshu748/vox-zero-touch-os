// Local inference is distinct from the existing rules/template demo (provider=local).
export const isLocalModelMode = () => {
  if (
    process.env.VOX_MODEL_MODE &&
    !["local", "hosted"].includes(process.env.VOX_MODEL_MODE)
  )
    throw new Error("VOX_MODEL_MODE must be local or hosted.");
  return process.env.VOX_MODEL_MODE === "local";
};

/** @param {string} value */
export function assertLoopbackURL(value) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error(
      "Local mode accepts only a loopback endpoint without credentials.",
    );
  return url;
}

export function localModelConfig() {
  const baseURL = assertLoopbackURL(
    process.env.VOX_LOCAL_BASE_URL || "http://127.0.0.1:11434/v1",
  ).href.replace(/\/$/, "");
  const model = process.env.VOX_LOCAL_MODEL || "gemma3:4b";
  const intentFallback = process.env.VOX_LOCAL_INTENT_FALLBACK || "qwen3:8b";
  // Ollama can proxy cloud models even on localhost. Never select those tags.
  if ([model, intentFallback].some((name) => /cloud|https?:|\s/i.test(name)))
    throw new Error("Local mode cannot select a cloud model tag.");
  return { baseURL, model, intentFallback };
}

/** @param {typeof globalThis.fetch} [fetchImpl] @returns {typeof globalThis.fetch} */
export const loopbackFetch =
  (fetchImpl = globalThis.fetch) =>
  (input, init) => {
    assertLoopbackURL(input instanceof Request ? input.url : String(input));
    // A loopback service cannot redirect the application to a remote provider.
    return fetchImpl(input, { ...init, redirect: "error" });
  };

/** @param {string} planId */
export function skippedLocalReceipts(planId) {
  return [
    "SerpApi",
    "ElevenLabs",
    "Browserbase",
    "Backboard",
    "TabPFN",
    "Tiger Data",
    "Ultramarine",
    "Tinker",
  ].map((provider) => ({
    provider,
    planId,
    status: "skipped",
    operation: "skipped in local mode",
    reason:
      provider === "Tinker"
        ? "Local Gemma/Qwen intent inference replaces the hosted LoRA."
        : "No external provider request is permitted in local mode.",
    createdAt: new Date().toISOString(),
  }));
}
