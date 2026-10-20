import { createHash } from "node:crypto";
import { z } from "zod";
import { escalationData, ticketFeatures } from "./escalation-data.mjs";
import { providerJSON } from "./provider-http.mjs";

const BASE = "https://api.priorlabs.ai";
export const escalationEnabled = () => Boolean(process.env.TABPFN_API_KEY);
const idSchema = z.string().min(1).max(500);
const uploadSchema = z.object({
  signed_urls: z.array(z.string().url()).length(1),
  required_headers: z.record(z.string()).default({}),
});
const csv = (rows) => rows.map((row) => row.join(",")).join("\n") + "\n";

export async function predictEscalation(
  tickets,
  { fetchImpl = fetch, signal, rows, maxTokens = 50000 } = {},
) {
  if (!escalationEnabled()) return null;
  const features = rows || tickets.map((ticket) => ticketFeatures(ticket));
  z.array(z.array(z.number().finite()).length(4))
    .min(1)
    .max(24)
    .parse(features);
  const start = Date.now();
  const request = async (path, body) =>
    (
      await providerJSON(`${BASE}/tabpfn/${path}`, {
        fetchImpl,
        signal,
        timeout: 120000,
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${process.env.TABPFN_API_KEY}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    ).data;
  const estimate = z
    .object({ estimated_cost: z.number().nonnegative().finite() })
    .parse(
      await request("estimate_cost", {
        model_version: "v3.5",
        operation: "predict",
        train_rows: escalationData.train.length,
        test_rows: features.length,
        raw_columns: 4,
        n_estimators: 8,
      }),
    );
  if (estimate.estimated_cost > maxTokens)
    throw new Error(
      "TabPFN estimate exceeds the approved token ceiling. No data was uploaded.",
    );
  const upload = async (rawInfo, contents) => {
    const info = uploadSchema.parse(rawInfo),
      url = new URL(info.signed_urls[0]);
    // Credentials are sent only to Prior Labs. Signed storage uploads receive only their own required headers.
    const allowedHost =
      url.hostname === "storage.googleapis.com" ||
      url.hostname.endsWith(".storage.googleapis.com") ||
      url.hostname.endsWith(".s3.amazonaws.com") ||
      /^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(url.hostname) ||
      /^[a-z0-9.-]+\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(url.hostname);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !allowedHost ||
      Object.keys(info.required_headers).some((key) =>
        /^(authorization|cookie)$/i.test(key),
      ) ||
      Object.entries(info.required_headers).some(
        ([key, value]) => /^host$/i.test(key) && value !== url.host,
      )
    )
      throw new Error("TabPFN returned an unsafe upload destination.");
    const headers = Object.fromEntries(
      Object.entries(info.required_headers).filter(
        ([key]) => !/^host$/i.test(key),
      ),
    );
    const response = await fetchImpl(url, {
      method: "PUT",
      body: contents,
      headers,
      redirect: "error",
      signal: AbortSignal.any([
        AbortSignal.timeout(60000),
        ...(signal ? [signal] : []),
      ]),
    });
    if (!response.ok)
      throw new Error(`TabPFN upload failed (HTTP ${response.status}).`);
    await response.arrayBuffer();
  };
  const train = z
    .object({
      train_set_upload_id: idSchema,
      x_train_info: uploadSchema,
      y_train_info: uploadSchema,
    })
    .parse(
      await request("prepare_train_set_upload", {
        x_train_info: { format: "csv" },
        y_train_info: { format: "csv" },
      }),
    );
  await upload(
    train.x_train_info,
    csv([
      escalationData.featureNames,
      ...escalationData.train.map((row) => row.slice(0, 4)),
    ]),
  );
  await upload(
    train.y_train_info,
    csv([["escalated"], ...escalationData.train.map((row) => [row[4]])]),
  );
  const fitted = z
    .object({ fitted_train_set_id: idSchema })
    .parse(
      await request("fit", {
        train_set_upload_id: train.train_set_upload_id,
        task_config: {
          task: "classification",
          tabpfn_config: { model_path: "v3.5_default", n_estimators: 8 },
        },
      }),
    );
  const test = z
    .object({ test_set_upload_id: idSchema, x_test_info: uploadSchema })
    .parse(
      await request("prepare_test_set_upload", {
        fitted_train_set_id: fitted.fitted_train_set_id,
        x_test_info: { format: "csv" },
      }),
    );
  await upload(
    test.x_test_info,
    csv([escalationData.featureNames, ...features]),
  );
  const prediction = z
    .object({
      prediction: z.array(z.array(z.number().finite().min(0).max(1)).length(2)),
      metadata: z.unknown(),
    })
    .parse(
      await request("predict", {
        test_set_upload_id: test.test_set_upload_id,
        fitted_train_set_id: fitted.fitted_train_set_id,
        task_config: {
          task: "classification",
          predict_params: { output_type: "probas" },
        },
      }),
    );
  if (
    prediction.prediction.length !== features.length ||
    prediction.prediction.some((pair) => Math.abs(pair[0] + pair[1] - 1) > 0.01)
  )
    throw new Error("TabPFN returned mismatched prediction rows.");
  // Binary numeric training labels are ordered 0, 1. Reject any response that cannot match the request's rows.
  return {
    probabilities: prediction.prediction.map((pair) => pair[1]),
    dataset: {
      version: escalationData.version,
      sha256: createHash("sha256")
        .update(JSON.stringify(escalationData.train))
        .digest("hex"),
      trainRows: escalationData.train.length,
      provenance: escalationData.provenance,
    },
    receipt: {
      provider: "TabPFN",
      operation: "escalation prediction",
      model: "TabPFN-3.5-Plus",
      requestId: test.test_set_upload_id,
      latencyMs: Date.now() - start,
      usage: {
        estimatedTokens: estimate.estimated_cost,
        rows: features.length,
      },
      cost: null,
      createdAt: new Date().toISOString(),
    },
  };
}
