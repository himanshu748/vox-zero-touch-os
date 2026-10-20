// Never expose an upstream message, URL, response body, prompt or header.
export function activityFailure(error) {
  const seen = new Set();
  let current = error;
  for (let depth = 0; current && depth < 5 && !seen.has(current); depth++) {
    seen.add(current);
    const status = Number(current.statusCode ?? current.status);
    if (status === 429)
      return {
        code: "provider_rate_limit",
        status,
        message:
          "A provider is rate limited. Saved work is preserved. Wait before resuming from this checkpoint.",
      };
    if (status === 401 || status === 403)
      return {
        code: "provider_access",
        status,
        message:
          "A provider rejected access. Check its server configuration before resuming. Saved work is preserved.",
      };
    if (status >= 500 && status <= 599)
      return {
        code: "provider_unavailable",
        status,
        message:
          "A provider is temporarily unavailable. Saved work is preserved. Resume after it recovers.",
      };
    if (status === 400 || status === 422)
      return {
        code: "provider_request",
        status,
        message:
          "A provider rejected this request. Saved work is preserved; check the integration before resuming.",
      };
    if (
      [
        "SyntaxError",
        "ZodError",
        "AI_TypeValidationError",
        "AI_NoObjectGeneratedError",
      ].includes(current.name)
    )
      return {
        code: "invalid_model_output",
        message:
          "A model response failed validation. Saved work is preserved; a new response is required before execution can continue.",
      };
    if (["AbortError", "TimeoutError"].includes(current.name))
      return {
        code: "provider_timeout",
        message:
          "An activity timed out. Saved work is preserved; inspect its receipt before resuming.",
      };
    current = current.cause;
  }
  return {
    code: "activity_failed",
    message:
      "An activity failed. Saved work is preserved; inspect the timeline before resuming.",
  };
}
