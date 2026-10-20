# Core sponsor integration ledger

This file distinguishes code, configuration and observed execution. No prize category is claimed automatically. Current verification is from October 20, 2026; external state may change.

| Sponsor | Implementation | Observed proof / remaining gate |
|---|---|---|
| Gemma | AI SDK structured plan and sourced reply generation | Real Google-hosted Gemma voice-flow receipts; hosted rerun pending |
| ElevenLabs | Validated STT and cached spoken briefing | Real Scribe v2 and multilingual v2 requests, generated MP3; physical microphone deferred by owner |
| Mastra | Named activity graph and persisted approval suspension | Execution, retry, suspension/resume and restart tests pass |
| Render | Node web/API/worker service | Service created; corrected build and expanded hosted deployment pending |
| MongoDB Atlas | Revision-checked workspace/session/audio persistence | Isolated free cluster, restricted database user and Render-only network ranges configured; hosted write/restart proof pending |
| Auth0 | Code flow, verified allowed owner and owner-bound decisions | VOX application and exact callback/origin settings saved; hosted login/denial proof pending |
| Browserbase | Stagehand UI note update, signed narrow grant, session receipt | Grant/replay tests pass; account/key and live hosted UI action pending |
| Temporal | Actual workflow, retry, heartbeat and approval signal | Local Temporal retry/restart completed, workflow `vox-fb81e51a-908d-4122-b416-452af18f0513`, 21 history events, 26 ledger writes unchanged after restart; hosted Cloud login pending |
| SerpApi | Validated, bounded live guidance search with source provenance | Protocol and malformed-response tests pass; hosted source-in-draft proof pending |
| Backboard | Per-workspace preference memory and semantic recall | Signed-in account has $5 balance; new dedicated API key awaiting owner activation approval; live recall pending |
| Sentry | AI SDK model spans and correlated tool spans | VOX project and private DSN configured; hosted trace receipt pending |
| DigitalOcean | Compatible Gemma endpoint adapter already supported | No active inference endpoint or credits verified; not connected |
| GitHub Copilot | Actual review of `server/research.mjs` | Session `93041358-8a15-446f-b6a7-051549f9f954`; input/response validation and response-size fixes applied; evidence below |
| Entire | Tracks the new Copilot review only | Copilot hooks enabled, transcript retained privately, automatic session pushing off; committed checkpoint pending |

The other six PRD categories are outside the requested fourteen. Installing an SDK or configuring a key does not prove successful provider use. Development evidence is separate from product runtime receipts.
