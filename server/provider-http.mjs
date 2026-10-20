// Server-only HTTP boundary. Provider errors never echo upstream bodies or secrets.
export async function providerJSON(
  url,
  {
    fetchImpl = fetch,
    signal,
    timeout = 60000,
    maxBytes = 1048576,
    ...options
  } = {},
) {
  let response;
  try {
    response = await fetchImpl(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.any([
        AbortSignal.timeout(timeout),
        ...(signal ? [signal] : []),
      ]),
    });
  } catch {
    throw new Error(
      "The provider request could not be completed. No automatic retry was made.",
    );
  }
  if (!response.ok)
    throw new Error(`Provider request failed (HTTP ${response.status}).`);
  if (!response.body)
    throw new Error("The provider returned an empty response.");
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("The provider response exceeded its size limit.");
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return {
      data: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      response,
    };
  } catch {
    throw new Error("The provider returned invalid JSON.");
  }
}
