# Sponsor integration ledger

VOX targets 18 categories: 15 runtime integrations, two development integrations and the .tech domain. DigitalOcean and Arduino are excluded by the current scope. Configuration, observed provider requests and prize eligibility are separate claims.

The existing [hosted workspace](https://getvox.tech/app) remains on the previously verified baseline. Tinker, TabPFN, Ultramarine and Tiger each have individual live proof, but their combined hosted journey is pending. Full self-hosted Temporal has not yet passed hosted execution. Do not describe the expansion as 18/18 hosted completion.

| Category       | Implementation and observed proof                                                                         | Current boundary                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemma          | Real Google-hosted Gemma 4 streamed plans and schema-validated replies through Vercel AI SDK              | Hosted baseline verified; no DigitalOcean inference                                                                                         |
| ElevenLabs     | Real Scribe v2 transcription of recorded speech and multilingual v2 briefing with cached replay           | Hosted baseline verified; physical microphone test deferred                                                                                 |
| Temporal       | Pinned full Server 1.32.1, private RPCs, restricted PostgreSQL schemas, retry and human-decision workflow | CLI dev-server retry/restart proof exists; full hosted Tiger workflow still fails its startup gate                                          |
| MongoDB Atlas  | Acknowledged workspace/session/audio persistence and revision checks; records survived redeployment       | Hosted baseline verified; one application writer; only restricted service outbound ranges                                                   |
| Browserbase    | Two bounded Stagehand actions saved one approved internal note through the real hosted synthetic UI       | Hosted baseline verified; fixed selectors, short signed grant, no external customer system                                                  |
| Auth0          | Verified-email owner login, stable issuer/subject identity, guest provider calls rejected                 | Hosted baseline verified; same owner-only policy for the replacement                                                                        |
| Mastra         | Named workflow steps, safe label retry, saved cursor and individual approval suspension/resume            | Hosted baseline verified; process-local libSQL snapshots backed by Atlas application checkpoints                                            |
| Render         | Existing free web/API/worker service and managed HTTPS                                                    | Free US replacement approved; creation blocked by the workspace's 25-service limit                                                          |
| SerpApi        | Two bounded live searches supplied references to Gemma replies                                            | Hosted baseline verified; search snippets remain untrusted guidance                                                                         |
| Backboard      | Real preference save and semantic recall with returned memory provenance                                  | Hosted baseline verified; preference only, no ticket bodies or raw recordings                                                               |
| Sentry         | Correlated tool/model spans and actual token/latency fields                                               | Hosted baseline verified; prompt/response recording off; estimates are not provider invoices                                                |
| TabPFN         | Actual REST fit/predict against authored synthetic cases; 15/16 held-out labels correct                   | Individual live proof; hosted batch pending; token estimate checked before upload                                                           |
| Tinker         | Real Qwen3-8B rank-8 LoRA training and successful private-checkpoint HTTP normalization                   | Individual live proof; 12/16 baseline versus 16/16 trained exact matches; hosted normalization pending; checkpoint expires October 27, 2026 |
| Ultramarine    | Actual bounded Paper Instruments review identified three concerns in a synthetic reply                    | Individual live proof; hosted review pending; advice never authorizes a send                                                                |
| Tiger Data     | Five authored playbooks with real 768-dimensional vectors, full-text search and reciprocal rank fusion    | Individual live proof; hybrid top-1 6/6 versus keyword 5/6; hosted retrieval pending                                                        |
| GitHub Copilot | Actual authorized review of server/research.mjs with validation corrections applied                       | Development evidence, not a runtime API                                                                                                     |
| Entire         | Actual checkpoint/session export of that authorized new review                                            | Development evidence; prior Codex history excluded; automatic pushing disabled                                                              |
| .tech          | getvox.tech registered with the MLH benefit, apex/www routing and managed HTTPS                           | Domain is live; automatic renewal disabled; registration expires October 20, 2027                                                           |

## Development and evaluation evidence

- [Copilot review](evidence/copilot-research-review.txt) and [actual CLI usage](evidence/copilot-research-usage.json).
- [Entire checkpoint](evidence/entire-checkpoint.json) and [authorized review session](evidence/entire-review-session.jsonl).
- [Earlier local Temporal history proof](evidence/temporal-local-proof.json). This is not hosted durability proof.
- [Tinker evaluation](evidence/tinker-evaluation.json): 53 authored training pairs and 16 held-out cases. Output tokens fell from 320 to 240, while median latency increased from 2,385 ms to 7,870 ms. No latency improvement is claimed.
- [Tiger evaluation](evidence/tiger-retrieval-evaluation.json): six fixed synthetic questions, including a paraphrase with no lexical match. Reference links point to authored summaries, not fetched source documents.
- [Advanced implementation and reproduction instructions](ADVANCED-INTEGRATIONS.md).

## Hosting diagnosis

The existing Render service is in Singapore; Tiger's free service is in us-east-1. Read-only direct driver probes passed queries, transactions, bytea payloads and concurrent reads with verified TLS. The full workflow nevertheless repeatedly exceeded Temporal's three-second task-dispatch budget across sequential database calls. Cross-region latency is the likely cause; a US deployment must demonstrate the fix rather than assume it.

A provider-free startup workflow must retry an activity, persist its approval wait, accept a decision signal and complete before HTTP starts. It passed on the official CLI dev server and failed on the Singapore replacement attempt, keeping the existing working site live. The owner approved moving free Render hosting beside Tiger. No Supabase project, paid Temporal Cloud service or new database was created.

## MLH benefits and excluded categories

The ElevenLabs benefit was already claimed. Existing Backboard $5, Render $50 and Tinker $10 offers were reused; the Paper Instruments $5 and .tech offers were claimed with approval. No duplicate promotion, paid plan or card was added. Browserbase uses its free plan; the card-required offer was not redeemed.

DigitalOcean remains disconnected by owner choice. Arduino has no hardware proof and is outside these 18 categories. All automatic eligibility/category claims remain disabled. No final competition entry has been submitted.
