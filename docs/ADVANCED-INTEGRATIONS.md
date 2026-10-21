# Advanced integrations

VOX keeps operational records in Atlas. Tiger contains only five authored support playbooks and Temporal's separate workflow/visibility schemas. The helpdesk, prediction labels, training pairs and retrieval questions are synthetic.

## Intent normalization with Tinker

`TINKER_API_KEY`, private `TINKER_MODEL` sampler path and `TINKER_MODEL_EXPIRES_AT` enable the trained Qwen3-8B LoRA adapter. A command first passes VOX's allowlist. Tinker returns only research, draft-count and internal-tag fields. Gemma still produces the human-readable objective and reply drafts. The final normalized plan requires human approval before execution. Partial streamed cards cannot execute.

The 53 training and 16 held-out pairs are checked in under `scripts/tinker-intent-data.json`. `scripts/train-tinker-intent.py` requires an explicit `--run`, verifies the selected model is available, enforces its token budget and saves a private sampler checkpoint with a seven-day TTL. It never publishes the checkpoint. Training is an offline action and never runs at server startup.

On October 21 the owner requested enough retention for judging. The same private 92,405,297-byte checkpoint was extended through November 5 at 23:59 UTC, with no new training or checkpoint. Estimated storage through that expiry is $0.004852 at the published $0.10/GB/month rate, within the existing $0.25 promotional budget. No purchase or top-up was made. [Verified retention metadata](evidence/tinker-retention.json).

The observed exact intent match was 12/16 for the base model and 16/16 for the adapter. Output tokens fell from 320 to 240; median latency increased from 2,385 ms to 7,870 ms. These small synthetic results are not a production accuracy or latency claim. [Evaluation](evidence/tinker-evaluation.json).

VOX persists an inference reservation before Tinker is called. It caches validated results and receipts before Gemma planning continues. An uncertain request cannot be automatically replayed. Expired checkpoints are reported as disconnected.

## TabPFN predictions

`TABPFN_API_KEY` enables a single bounded batch per approved triage plan. The REST client checks the token estimate before uploading, refuses estimates above 50,000 tokens, and never forwards provider authorization to signed storage URLs. It fits 48 authored scenarios and predicts escalation probabilities for the selected synthetic queue. It does not claim training on customer history.

Predictions may raise the deterministic SLA/impact score but cannot lower its attention floor. Both the rule score and illustrative probability are retained. The 16-case held-out evaluation returned 15 correct labels. This is not calibration on real support outcomes.

## Tiger hybrid retrieval

`TIGER_DATABASE_URL` must use the read-only `vox_app` login. `TIGER_CA_PEM` supplies the provider CA; the client verifies the certificate and hostname. Do not disable TLS verification. The free Tiger service's private CA was pinned during provisioning; no system-wide trust store was changed.

`vox_knowledge.passages` stores authored text, source links, a generated English `tsvector`, and 768-dimensional real Gemini Embedding 2 vectors. Reciprocal rank fusion combines cosine-nearest passages with keyword matches. Research retrieves at most two tickets' guidance per approved plan. Retrieved passages enter Gemma's draft context and Ultramarine's review context, with provenance retained in evidence. The reference links are not represented as fetched source documents.

Google project billing was verified disabled before the free-tier embedding calls were enabled. Set `GOOGLE_EMBEDDING_FREE_TIER_CONFIRMED=true` only after checking that condition in your own project. No automatic paid-tier migration exists.

`node --env-file=.env scripts/evaluate-tiger.mjs` compares six predeclared synthetic queries. Hybrid top-1 retrieval matched 6/6 expected playbooks; keyword-only retrieval matched 5/6. The single-sign-on paraphrase had no keyword match and retrieved the authentication playbook semantically. [Evaluation and limitations](evidence/tiger-retrieval-evaluation.json).

## Ultramarine review

Ultramarine is included in the 18-category target. The official OpenAI Node SDK targets Paper Instruments, sends the same strict JSON schema validated by the server, and disables SDK retries. [Hosted SDK/cost proof](evidence/ultramarine-hosted-cost.json): two reviews consumed **$0.00034095** in existing promotional credit.

`PAPERINSTRUMENTS_API_KEY` enables one advisory `ultramarine-1-flash` review per generated draft, bounded by the plan's draft count. Sources, ticket text and draft content are untrusted reference data. Strict output validation requires a summary and bounded issues. A blocking issue cannot accompany a ready-for-human verdict. Review advice never authorizes sending.

The first real review identified three concerns in a synthetic draft. Its observed token usage was 279 input and 311 output tokens, an estimated $0.00019735 at published rates. Costs are token estimates, not invoices. Hosted requests have durable reservations and no automatic uncertain replay.

## Full self-hosted Temporal

`TEMPORAL_SELF_HOSTED=true`, `TEMPORAL_POSTGRES_URI` and `TIGER_CA_PEM` select the full pinned Temporal Server 1.32.1. The build installer checks the official Linux release's SHA-256 before extraction. All RPC and membership ports bind to loopback; Node remains the only public HTTP service. This mode uses no paid Temporal Cloud account.

Before startup, initialize the official PostgreSQL v12 Temporal and visibility migrations into `vox_temporal` and `vox_visibility`, respectively, using the schema-restricted `vox_temporal` login and `search_path`. The admin creates `btree_gin` in public first. Both stores use database `tsdb`, distinct schemas, TLS and hostname verification. Keep the admin connection off Render.

The server uses one history shard and bounded caches. The SDK runs one activity/workflow task at a time without a sticky workflow cache. Unused scheduled workflows, parent-close workers and background scanners are disabled for this bounded sandbox. Temporal persists scheduling/history and approval signals; Atlas persists application writes, provider reservations and the ledger. A configured orchestration outage fails closed.

A provider-free startup workflow must complete an activity retry, persist an approval gate, accept its decision signal and finish before HTTP starts. An unhealthy replacement therefore cannot pass Render's health check. The gate passed on free Render Virginia against Tiger: three activity attempts, 21 history events and zero provider calls. The combined recorded-voice run then survived a full service stop/resume at its approval gate with the same Temporal execution and unchanged provider receipts. After the owner decisions, its history reached 21 events and COMPLETED. The earlier macOS/Singapore profiles exceeded the task-dispatch budget; the successful US driver measured a one-millisecond median for three TLS-verified probes. [Hosted receipt](evidence/hosted-expansion.json).

Free Render instances can sleep; no uptime or multi-worker production SLA is claimed. No Supabase project or paid Temporal Cloud service is used.

## Domain and remaining boundaries

`getvox.tech` uses Render-managed HTTPS. Auth0's approved callback is `https://getvox.tech/auth/callback`; logout and web origins use the same apex. The www alias redirects to the apex. Registration used the claimed MLH benefit; automatic renewal is disabled.

DigitalOcean remains disconnected by the owner's choice. No Arduino hardware proof exists. Copilot and Entire are development integrations with captured evidence, not runtime APIs. The physical microphone test remains deferred; recorded speech is tested separately. Integration configuration does not itself prove contest eligibility.

### Reproduce actual credit measurement

The following tools make no inference calls and buy no credits. Snapshot usage before and after a separately approved hosted run; export its saved state. The reconciler strips account identity and refuses mismatched request/token counts, outstanding reservations and different billing periods.

```sh
node --env-file=.env scripts/ultramarine-usage.mjs /tmp/usage-before.json
# Complete a separately approved bounded run and save state.json.
node --env-file=.env scripts/ultramarine-usage.mjs /tmp/usage-after.json
node scripts/ultramarine-cost-proof.mjs /tmp/usage-before.json /tmp/usage-after.json /tmp/state.json RUN_ID DEPLOYED_SHA /tmp/cost-proof.json
```

Per-request UI costs remain estimates. The measured balance debit covers Ultramarine only. An earlier rejected review separately consumed $0.00020585; it stopped before approvals and was never automatically replayed.
