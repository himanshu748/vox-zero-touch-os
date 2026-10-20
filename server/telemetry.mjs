import * as Sentry from "@sentry/node";
let enabled = false;
function redact(event) {
  let serialized = JSON.stringify(event);
  for (const [key, value] of Object.entries(process.env))
    if (
      /API_KEY|SECRET|TOKEN|PASSWORD|MONGODB_URI/.test(key) &&
      value?.length > 6
    )
      serialized = serialized.split(value).join("[redacted]");
  return JSON.parse(serialized);
}
export function initializeTelemetry() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampler: (context) =>
      /^GET\b/.test(context.name) ? 0 : context.inheritOrSampleWith(1),
    sendDefaultPii: false,
    enableLogs: false,
    integrations: [
      Sentry.vercelAIIntegration({ recordInputs: false, recordOutputs: false }),
    ],
    beforeSend(event) {
      delete event.request;
      delete event.user;
      return redact(event);
    },
    beforeSendSpan: redact,
  });
  enabled = true;
}
export async function traceActivity(runId, name, fn, onTrace) {
  if (!enabled) return fn();
  return Sentry.startSpan(
    {
      name: `VOX ${name}`,
      op: "gen_ai.execute_tool",
      attributes: {
        "gen_ai.operation.name": "execute_tool",
        "gen_ai.tool.name": name,
        "vox.run_id": runId,
      },
    },
    async (span) => {
      onTrace?.(span.spanContext().traceId);
      try {
        const result = await fn();
        span.setStatus({ code: 1 });
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: "activity_failed" });
        Sentry.captureException(new Error(`VOX activity ${name} failed`));
        throw error;
      }
    },
  );
}
export const flushTelemetry = () =>
  enabled ? Sentry.flush(5000) : Promise.resolve(true);
