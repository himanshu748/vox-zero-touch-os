import { createHash } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
if (process.env.VOX_MODEL_MODE !== "local") {
  try {
    process.loadEnvFile(process.env.VOX_ENV_FILE || ".env");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (
  process.env.VOX_MODEL_MODE !== "local" &&
  process.env.TEMPORAL_SELF_HOSTED === "true"
) {
  if (process.platform !== "linux" || process.arch !== "x64")
    throw new Error(
      "The hosted installer supports Linux x64. Use the verified vendor binary for local profiling.",
    );
  const version = "1.32.1",
    expected =
      "4260448d650c1ba7ee7683ff0c93d5c6a1709260e3a7ef543bfa34e06cff6051";
  const response = await fetch(
    `https://github.com/temporalio/temporal/releases/download/v${version}/temporal_${version}_linux_amd64.tar.gz`,
    { signal: AbortSignal.timeout(120000) },
  );
  if (!response.ok) throw new Error("Temporal binary download failed.");
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 150000000) {
      await reader.cancel();
      throw new Error("Temporal release exceeds its size bound.");
    }
    chunks.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(chunks);
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error("Temporal release checksum does not match.");
  await mkdir(".temporal-bin", { recursive: true });
  await writeFile(".temporal-bin/release.tar.gz", bytes);
  const result = spawnSync("tar", [
    "-xzf",
    ".temporal-bin/release.tar.gz",
    "-C",
    ".temporal-bin",
    "temporal-server",
  ]);
  await rm(".temporal-bin/release.tar.gz");
  if (result.status !== 0)
    throw new Error("Temporal binary extraction failed.");
  console.log(`Installed verified Temporal Server ${version}.`);
}
