import { initializeTelemetry } from "./telemetry.mjs";
import { isLocalModelMode } from "./model-mode.mjs";
import { configureLocalRuntime, startLocalTemporal } from "./local-runtime.mjs";
let localTemporal;
if (isLocalModelMode()) configureLocalRuntime();
else {
  try {
    process.loadEnvFile(process.env.VOX_ENV_FILE || ".env");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (
  !isLocalModelMode() &&
  process.env.NODE_ENV === "production" &&
  [
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GEMMA_BASE_URL",
    "ELEVENLABS_API_KEY",
    "SERPAPI_API_KEY",
    "BACKBOARD_API_KEY",
    "BROWSERBASE_API_KEY",
    "TINKER_API_KEY",
    "TABPFN_API_KEY",
    "PAPERINSTRUMENTS_API_KEY",
    "TIGER_DATABASE_URL",
    "TEMPORAL_POSTGRES_URI",
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
const { startSelfHostedTemporal } = await import("./temporal-self-host.mjs");
if (isLocalModelMode()) localTemporal = await startLocalTemporal();
else await startSelfHostedTemporal();
const { verifySelfHostedTemporal } =
  await import("./temporal-startup-check.mjs");
if (!isLocalModelMode()) await verifySelfHostedTemporal();
try {
  await import("./index.mjs");
} catch (error) {
  await localTemporal?.close();
  throw error;
}
