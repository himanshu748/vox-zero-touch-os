import pg from "pg";
import { z } from "zod";
import { providerJSON } from "./provider-http.mjs";
import { isLocalModelMode } from "./model-mode.mjs";

export const EMBEDDING_MODEL = "gemini-embedding-2";
export const knowledgeEnabled = () =>
  !isLocalModelMode() &&
  Boolean(
    process.env.TIGER_DATABASE_URL &&
    process.env.TIGER_CA_PEM &&
    process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    process.env.GOOGLE_EMBEDDING_FREE_TIER_CONFIRMED === "true",
  );
let pool;
export function knowledgeKeywords(text) {
  return [
    ...new Set(
      (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
        (word) =>
          word.length > 2 &&
          !/^(the|and|for|with|this|that|what|should|after|from|have|our|was|are|can|how|not|out|does)$/.test(
            word,
          ),
      ),
    ),
  ]
    .slice(0, 24)
    .join(" OR ");
}
export function tigerConfig(uri = process.env.TIGER_DATABASE_URL) {
  const u = new URL(uri);
  if (
    !u.hostname.endsWith(".tsdb.cloud.timescale.com") ||
    u.username !== "vox_app" ||
    u.pathname !== "/tsdb"
  )
    throw new Error("Tiger retrieval requires the restricted VOX connection.");
  // Do not let URI sslmode override strict certificate and hostname checks.
  u.searchParams.delete("sslmode");
  return {
    connectionString: u.href,
    ssl: { rejectUnauthorized: true, ca: process.env.TIGER_CA_PEM },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
    statement_timeout: 5000,
    query_timeout: 10000,
  };
}
export async function embedText(
  text,
  { document = false, fetchImpl = fetch, signal } = {},
) {
  z.string().min(1).max(6000).parse(text);
  if (process.env.GOOGLE_EMBEDDING_FREE_TIER_CONFIRMED !== "true")
    throw new Error("Free-tier embedding access has not been verified.");
  const { data } = await providerJSON(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
    {
      fetchImpl,
      signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        outputDimensionality: 768,
        content: {
          parts: [
            {
              text: document
                ? `title: none | text: ${text}`
                : `task: search result | query: ${text}`,
            },
          ],
        },
      }),
    },
  );
  return z
    .object({
      embedding: z.object({ values: z.array(z.number().finite()).length(768) }),
    })
    .parse(data).embedding.values;
}
export const HYBRID_SQL = `
WITH semantic AS (
 SELECT id,row_number() OVER (ORDER BY embedding <=> $1::public.vector,id) AS rank
 FROM vox_knowledge.passages ORDER BY embedding <=> $1::public.vector,id LIMIT 3
), lexical AS (
 SELECT id,row_number() OVER (ORDER BY ts_rank_cd(search,websearch_to_tsquery('english',$2)) DESC,id) AS rank
 FROM vox_knowledge.passages WHERE search @@ websearch_to_tsquery('english',$2)
 ORDER BY ts_rank_cd(search,websearch_to_tsquery('english',$2)) DESC,id LIMIT 3
), scores AS (
 SELECT id,1.0/(60+rank) AS score FROM semantic
 UNION ALL SELECT id,1.0/(60+rank) AS score FROM lexical
), fused AS (SELECT id,sum(score) AS score FROM scores GROUP BY id)
SELECT p.id,p.title,p.url,p.content,f.score::float8 AS score,
 s.rank::int AS semantic_rank,l.rank::int AS keyword_rank
FROM fused f JOIN vox_knowledge.passages p USING(id)
LEFT JOIN semantic s USING(id) LEFT JOIN lexical l USING(id)
ORDER BY f.score DESC,p.id LIMIT 3`;

export async function retrieveKnowledge(
  ticket,
  { fetchImpl = fetch, signal, query } = {},
) {
  if (!knowledgeEnabled()) return null;
  const input = z
    .object({
      id: z.string().min(1),
      title: z.string().min(1).max(500),
      body: z.string().max(10000),
    })
    .strip()
    .parse(ticket);
  const text = `${input.title}\n${input.body}`.slice(0, 6000),
    start = Date.now();
  // OR preserves useful lexical matches when a natural-language question contains many terms.
  const keywords = knowledgeKeywords(text);
  const embedding = await embedText(text, { fetchImpl, signal });
  if (signal?.aborted) throw new Error("Knowledge retrieval was cancelled.");
  pool ||= query ? null : new pg.Pool(tigerConfig());
  let rows;
  try {
    ({ rows } = await (query || pool.query.bind(pool))(HYBRID_SQL, [
      JSON.stringify(embedding),
      keywords,
    ]));
  } catch {
    throw new Error(
      "Tiger knowledge retrieval failed. No live retrieval is claimed.",
    );
  }
  const passages = z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(500),
        url: z.string().url(),
        content: z.string().max(5000),
        score: z.number().finite(),
        semantic_rank: z.number().int().nullable(),
        keyword_rank: z.number().int().nullable(),
      }),
    )
    .min(1)
    .max(3)
    .parse(rows);
  return {
    sources: passages.map((p) => ({
      ...p,
      ticketId: input.id,
      kind: "Tiger hybrid retrieval of authored playbook",
      retrievedAt: new Date().toISOString(),
    })),
    receipt: {
      provider: "Tiger Data",
      operation: "pgvector + PostgreSQL full-text reciprocal rank fusion",
      model: EMBEDDING_MODEL,
      latencyMs: Date.now() - start,
      passageCount: passages.length,
      dimensions: 768,
      cost: 0,
      costBasis:
        "Tiger Shared free tier; Google project billing disabled when configured (2026-10-20)",
      createdAt: new Date().toISOString(),
    },
  };
}
export async function closeKnowledge() {
  if (pool) {
    const current = pool;
    pool = null;
    await current.end();
  }
}
