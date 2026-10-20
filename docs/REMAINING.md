# Remaining product requirements

The hosted app uses real providers against a synthetic helpdesk. See [SPONSORS.md](SPONSORS.md) for integration evidence; configuring a provider alone is not a qualification claim.

- **Temporal Cloud:** real local Temporal retry, worker restart and approval recovery passed. Hosted Cloud configuration remains unavailable because the owner could not sign in. Render currently uses Mastra plus acknowledged Atlas application checkpoints.
- **DigitalOcean:** the existing account has no inference balance. The owner declined the proposed $5 top-up, so DigitalOcean remains disconnected. Gemma runs through Google's API.
- **Physical microphone:** deferred by the owner. Live STT was exercised with a synthetic spoken WAV; this does not verify the user's microphone, browser permissions or audio hardware.
- **Authorization breadth:** the hosted allowed-owner login and anonymous provider denial were checked. Different-owner and unverified-email denial are automated tests, not a second live account walkthrough.
- **Production scale:** one web/worker process is supported. Atlas revisions reject conflicting writers. Mastra snapshots use local libSQL; this is not a multi-worker scheduler or a substitute for Temporal Cloud.
- **Customer integrations:** tickets and recipients are fictional. Browserbase operates the hosted synthetic helpdesk form. Approvals produce simulated sends; no external customer delivery is enabled.
- **Measurement:** latency and tokens come from actual receipts where returned. Provider cost, time saved, p50/p95 and comparative model quality have not been measured.
- **Release:** a judge-facing film, public project article, eligibility review and final competition submission remain separate work. No entry has been submitted.
- **Additional categories:** TabPFN, Tinker, Ultramarine, Tiger Data, a .tech domain and Arduino hardware are outside the requested fourteen core sponsors.

The known dependency audit includes an unpatched transitive formatter DoS advisory through Mastra's frontmatter chain. The application does not expose that parsing path. The exposed Google and SerpApi keys were rotated on October 20, 2026; both old keys return HTTP 401, and the hosted recorded-voice flow passed with their replacements in Render's private configuration. Neither credential was committed or packaged.
