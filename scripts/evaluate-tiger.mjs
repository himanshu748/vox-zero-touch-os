import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
import {
  retrieveKnowledge,
  knowledgeKeywords,
  tigerConfig,
  closeKnowledge,
} from "../server/knowledge-retrieval.mjs";
const raw = readFileSync(
    new URL("./knowledge-retrieval-fixture.json", import.meta.url),
  ),
  fixture = JSON.parse(raw);
const pool = new pg.Pool(tigerConfig()),
  rows = [];
try {
  for (const [index, item] of fixture.cases.entries()) {
    const lexical = await pool.query(
      "SELECT id FROM vox_knowledge.passages WHERE search @@ websearch_to_tsquery('english',$1) ORDER BY ts_rank_cd(search,websearch_to_tsquery('english',$1)) DESC,id LIMIT 1",
      [knowledgeKeywords(item.query)],
    );
    const hybrid = await retrieveKnowledge({
      id: `synthetic-eval-${index}`,
      title: item.query,
      body: "",
    });
    rows.push({
      ...item,
      lexicalTop1: lexical.rows[0]?.id || null,
      hybridTop1: hybrid.sources[0].id,
      lexicalCorrect: lexical.rows[0]?.id === item.expected,
      hybridCorrect: hybrid.sources[0].id === item.expected,
    });
  }
  console.log(
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        fixture: fixture.version,
        fixtureSha256: createHash("sha256").update(raw).digest("hex"),
        provenance: fixture.provenance,
        total: rows.length,
        lexicalCorrect: rows.filter((r) => r.lexicalCorrect).length,
        hybridCorrect: rows.filter((r) => r.hybridCorrect).length,
        rows,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
  await closeKnowledge();
}
