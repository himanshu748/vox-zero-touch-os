// Read-only billing snapshot. This script never creates an inference request.
// node --env-file=.env scripts/ultramarine-usage.mjs /path/to/snapshot.json
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { providerJSON } from "../server/provider-http.mjs";

const path = process.argv[2];
if (!path || !process.env.PAPERINSTRUMENTS_API_KEY)
  throw new Error("An output path and PAPERINSTRUMENTS_API_KEY are required.");
const { data } = await providerJSON(
  "https://api.paperinstruments.com/v1/usage",
  {
    headers: {
      Authorization: `Bearer ${process.env.PAPERINSTRUMENTS_API_KEY}`,
    },
  },
);
// Explicit allowlist excludes the account identifier and every credential.
const usage = z
  .object({
    billing_status: z.string(),
    available_nanodollars: z.number().int().nonnegative().safe(),
    reserved_nanodollars: z.number().int().nonnegative().safe(),
    period_start: z.number().int(),
    period_end: z.number().int(),
    requests: z.number().int().nonnegative(),
    prompt_tokens: z.number().int().nonnegative(),
    cached_prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    reasoning_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
  })
  .strip()
  .parse(data);
await writeFile(
  path,
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      source: "https://api.paperinstruments.com/v1/usage",
      unit: "nanodollars; 1 USD = 1000000000 nanodollars",
      usage,
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    saved: path,
    requests: usage.requests,
    outstandingReservations: usage.reserved_nanodollars,
  }),
);
