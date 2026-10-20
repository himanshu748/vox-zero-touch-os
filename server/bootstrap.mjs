import { initializeTelemetry } from "./telemetry.mjs";
try {
  process.loadEnvFile(process.env.VOX_ENV_FILE || ".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (
  process.env.NODE_ENV === "production" &&
  [
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GEMMA_BASE_URL",
    "ELEVENLABS_API_KEY",
    "SERPAPI_API_KEY",
    "BACKBOARD_API_KEY",
    "BROWSERBASE_API_KEY",
  ].some((key) => process.env[key])
) {
  if (
    ![
      "AUTH0_ISSUER_BASE_URL",
      "AUTH0_CLIENT_ID",
      "AUTH0_CLIENT_SECRET",
      "AUTH0_SESSION_SECRET",
      "AUTH0_ALLOWED_EMAIL",
    ].every((key) => process.env[key]) ||
    !process.env.PUBLIC_ORIGIN?.startsWith("https://")
  )
    throw new Error(
      "Hosted live providers require HTTPS and a configured, restricted Auth0 identity.",
    );
  process.env.AUTH0_REQUIRE_APPROVAL_LOGIN = "true";
  process.env.VOX_REQUIRE_PROVIDER_LOGIN = "true";
}
initializeTelemetry();
await import("./index.mjs");
