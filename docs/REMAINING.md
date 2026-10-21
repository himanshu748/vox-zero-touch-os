# Remaining requirements

The [judge workspace](https://getvox.tech/judge) uses real providers against a fictional helpdesk. The requested expansion targets 18 categories; see [SPONSORS.md](SPONSORS.md) for the actual proof level of each.

The expanded hosted journey passed on free Render Virginia, including full Temporal/Tiger persistence across a service stop/resume, individual approvals and real speech playback. [Observed results](evidence/hosted-expansion.json).

- **Adapter expiry:** the approved private Tinker checkpoint expires October 27, 2026. Expired checkpoints are reported disconnected. Extending storage or retraining requires a new approved budget; no automatic top-up exists.
- **Physical microphone:** deferred by the owner. Recorded-WAV STT does not verify microphone hardware or browser recording permissions.
- **Authorization breadth:** allowed-owner login and guest provider denial were checked on the hosted baseline. Other-owner and unverified-email denial have automated coverage, not a second live-account walkthrough.
- **Scale:** one application writer is supported. Free Render can sleep or restart; no uptime or multi-worker production SLA is claimed. Mastra snapshots are local; Atlas persists application checkpoints and Temporal's database must persist workflow history.
- **Customer actions:** tickets and recipients are fictional. Browserbase uses the hosted synthetic form. Approvals perform simulated sends; no external customer delivery is enabled.
- **Generated content:** search results can be irrelevant, and Ultramarine review remains advisory. One such draft was rejected during the hosted pass. Human review remains required.
- **Measurement:** tokens and latency come from actual receipts. Small authored evaluations are not customer accuracy or calibration claims. Token-based cost estimates are not invoices; production p50/p95 and time saved have not been established.
- **Excluded categories:** DigitalOcean remains off by owner choice; no Arduino hardware integration is claimed.
- **Release:** a judge-facing video, public project article, eligibility review and final competition submission remain separate work. No entry has been submitted.

The dependency audit includes an unpatched transitive formatter DoS advisory through Mastra's frontmatter chain. VOX does not expose that parsing path. Previously exposed Google and SerpApi keys were rotated, their old values rejected with HTTP 401, and their replacements passed the earlier hosted voice journey. Credentials remain excluded from source and packages.

Judges have a separate explicitly authorized public allowance: eight live sessions total, one plan/two drafts/one voice upload/two speech generations each, with server-side persistent counters. The owner workspace retains Auth0 restrictions. See [JUDGES.md](JUDGES.md) for the live and provider-free paths and their limits.
