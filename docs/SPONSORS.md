# Core sponsor integration ledger

Verified October 20, 2026. [Hosted VOX](https://vox-zero-touch-os.onrender.com/app) uses real providers against a fictional helpdesk. Live provider calls and decisions require the configured Auth0 owner. Twelve core integrations have observed hosted runtime or approved development proof. Temporal has local execution proof but no Cloud connection; DigitalOcean remains off by owner choice. This is not a 14/14 completion or prize-eligibility claim.

| Sponsor | Implementation and observed proof | Boundary |
|---|---|---|
| Gemma | Google-hosted Gemma 4, AI SDK streamed plans and schema-validated reply generation; real request IDs and token receipts | Google endpoint, not DigitalOcean inference |
| ElevenLabs | Live Scribe v2 transcription of a 7.791-second synthetic spoken file and multilingual v2 briefing; saved audio replay | Physical microphone check deferred by owner |
| Mastra | Named activities, one pre-write failure/retry, cursor recovery and individual approval suspension/resume | libSQL snapshots are local to the process filesystem; Atlas preserves application checkpoints |
| Render | Public Node web/API/worker deployment, HTTPS and health check | One free service; provider actions restricted to the owner |
| MongoDB Atlas | Acknowledged workspace, session and speech-cache snapshots; hosted transcript and reply preference survived a deployment; Data Explorer confirmed stored documents | Restricted database user; only the service's two outbound ranges are allowlisted; one writer |
| Auth0 | Hosted Google login, stable issuer/subject-bound owner, verified-email allowlist, anonymous provider calls denied | Different-owner and unverified-account denial also covered by automated tests; no second live account walkthrough |
| Browserbase | Stagehand 4.3, scoped three-minute cookie grant, two explicit approved UI actions, actual Browserbase session recording | Exact note saved through the hosted UI and verified against the ledger; operational identifiers retained in private QA; no external customer system |
| Temporal | Real local Temporal workflow completed after retry, worker restart and approval resume; 21 history events and 26 ledger writes remained stable | Cloud account recovery required; not enabled on Render |
| SerpApi | Two bounded live searches per approved research plan; retrieved references supplied to Gemma and cited in saved drafts | Search snippets are untrusted guidance, not verified resolutions |
| Backboard | Actual preference save and semantic recall, with returned memory IDs attached to later plans | Account-wide dedicated key; stores reply-style preference, not tickets or raw audio |
| Sentry | Actual correlated tool spans and AI SDK model spans; Gemma tokens and latency visible in Agent Activity | Input/output recording disabled; displayed cost estimates are not a billed provider receipt |
| DigitalOcean | Compatible inference adapter exists; existing account inspected | Owner declined funding; no resource, inference key or paid credit purchased; disconnected |
| GitHub Copilot | Actual review of `server/research.mjs`; response/input validation and response-size corrections applied | Development evidence, not a runtime provider |
| Entire | Actual Copilot-only checkpoint and session export from the authorized new review | Prior Codex history excluded; automatic session pushing disabled |

## Development evidence

- [Copilot review](evidence/copilot-research-review.txt), session `93041358-8a15-446f-b6a7-051549f9f954`.
- [Actual CLI usage](evidence/copilot-research-usage.json): 16,946 input tokens, 1,592 output tokens, approximately 0.55 AI credits.
- [Entire checkpoint](evidence/entire-checkpoint.json): `01M5C30E624VW1TZKB3QJG05NT`, recorded in commit `9f5c7317c6cd83c01b0159d323a28522361bf35c`.
- [Authorized new review session](evidence/entire-review-session.jsonl); no environment files, credentials or prior chat history included.
- [Real local Temporal history proof](evidence/temporal-local-proof.json), workflow `vox-fb81e51a-908d-4122-b416-452af18f0513`.

## Existing MLH benefits

The ElevenLabs benefit was already claimed. Existing Backboard $5 and Render $50 hackathon balances were verified in their provider dashboards; no duplicate promotion was claimed. The Render credit showed an August 1, 2027 expiry. Browserbase uses its free plan; its card-required Developer offer was not redeemed. DigitalOcean funding was declined.

The other six PRD categories are outside the requested fourteen. Integration flags report configuration, while actual runtime receipts and development evidence remain separate. Every automatic category claim remains disabled. See [remaining requirements](REMAINING.md) for account, hardware, scale and release limits.

## Hosted walkthrough

The voice-linked workflow completed with 24 triages, eight labels, one Browserbase note, two sourced drafts, one rejection and one approved simulated send. Mastra resumed its individual approval gate and completed successfully. The exported run ledger contained no duplicate keys. ElevenLabs generated a real briefing; replay created no additional speech receipt. Browserbase uses explicit selectors for this approved fixed form, with model self-healing disabled. Earlier failed attempts remain in the private audit history.

Detailed hosted run/session/trace identifiers, provider usage and portal screenshots are retained in the owner's local QA bundle. They are excluded from the public source.
