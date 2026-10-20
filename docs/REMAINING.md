# Remaining requirements

The [hosted workspace](https://getvox.tech/app) uses real providers against a fictional helpdesk. The requested expansion targets 18 categories; see [SPONSORS.md](SPONSORS.md) for the actual proof level of each.

- **US migration:** the owner approved a free Virginia Render replacement, VOX-only private configuration, revised Atlas outbound ranges, domain cutover after checks, and suspension of the old service. Render rejected creation because the workspace is at its 25-service limit. Any deletion of another service requires the exact cleanup approval currently requested.
- **Hosted Temporal:** the full self-hosted server starts against Tiger, but the Singapore workflow failed its startup guard. The US replacement must pass retry, persisted approval wait, decision signal, completion and restart verification before being described as durable. No paid Temporal Cloud service is used.
- **Expanded hosted journey:** Tinker, TabPFN, Ultramarine and Tiger each passed individual live requests. A fresh recorded-voice run must exercise their combined hosted path with Gemma, ElevenLabs, Mastra, Browserbase, SerpApi, Auth0, Atlas and Sentry after migration.
- **Adapter expiry:** the approved private Tinker checkpoint expires October 27, 2026. Expired checkpoints are reported disconnected. Extending storage or retraining requires a new approved budget; no automatic top-up exists.
- **Physical microphone:** deferred by the owner. Recorded-WAV STT does not verify microphone hardware or browser recording permissions.
- **Authorization breadth:** allowed-owner login and guest provider denial were checked on the hosted baseline. Other-owner and unverified-email denial have automated coverage, not a second live-account walkthrough.
- **Scale:** one application writer is supported. Free Render can sleep or restart; no uptime or multi-worker production SLA is claimed. Mastra snapshots are local; Atlas persists application checkpoints and Temporal's database must persist workflow history.
- **Customer actions:** tickets and recipients are fictional. Browserbase uses the hosted synthetic form. Approvals perform simulated sends; no external customer delivery is enabled.
- **Measurement:** tokens and latency come from actual receipts. Small authored evaluations are not customer accuracy or calibration claims. Token-based cost estimates are not invoices; production p50/p95 and time saved have not been established.
- **Excluded categories:** DigitalOcean remains off by owner choice; no Arduino hardware integration is claimed.
- **Release:** a judge-facing video, public project article, eligibility review and final competition submission remain separate work. No entry has been submitted.

The dependency audit includes an unpatched transitive formatter DoS advisory through Mastra's frontmatter chain. VOX does not expose that parsing path. Previously exposed Google and SerpApi keys were rotated, their old values rejected with HTTP 401, and their replacements passed the earlier hosted voice journey. Credentials remain excluded from source and packages.
