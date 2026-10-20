import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from 'node:crypto';
import { searchGuidance } from "../server/research.mjs";
test("live research validates upstream shape, bounds results and preserves real source provenance", async (t) => {
  const previous = process.env.SERPAPI_API_KEY;
  process.env.SERPAPI_API_KEY = randomUUID();
  t.after(() => {
    if (previous === undefined) delete process.env.SERPAPI_API_KEY;
    else process.env.SERPAPI_API_KEY = previous;
  });
  const ticket = { id: "VX-1", title: "A".repeat(300) };
  const result = await searchGuidance(ticket, {
    fetchImpl: async (url) => {
      assert.equal(url.origin, "https://serpapi.com");
      assert(url.searchParams.get("q").length < 220);
      return Response.json({
        search_metadata: { id: "real-shape-id", status: "Success" },
        organic_results: [
          {
            title: "Official documentation",
            link: "https://docs.example.com/error",
            snippet: "A source excerpt",
          },
          { title: "Blocked scheme", link: "javascript:alert(1)" },
          {
            title: "Credential URL",
            link: "https://user:password@example.com",
          },
        ],
      });
    },
  });
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].ticketId, "VX-1");
  assert.equal(result.receipt.requestId, "real-shape-id");
  await assert.rejects(
    searchGuidance(
      {},
      {
        fetchImpl: async () => {
          throw new Error("must not call");
        },
      },
    ),
  );
  for (const payload of [
    { organic_results: {} },
    { search_metadata: { id: 123, status: "Success" }, organic_results: [] },
    { search_metadata: { id: "x", status: "Error" } },
  ])
    await assert.rejects(
      searchGuidance(ticket, { fetchImpl: async () => Response.json(payload) }),
      /did not return a successful search/,
    );
  await assert.rejects(
    searchGuidance(ticket, {
      fetchImpl: async () => new Response("x".repeat(1024 * 1024 + 1)),
    }),
    /size limit/,
  );
});
