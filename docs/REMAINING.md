# Remaining requirements

The [judge workspace](https://getvox.tech/judge) prioritizes fictional support tickets and prepares replies for individual review. It has 18 integrations and targets 17 prize categories; Ultramarine is excluded from prize claims. See [SPONSORS.md](SPONSORS.md) for the actual proof level of each.

The expanded hosted journey passed on free Render Virginia, including full Temporal/Tiger persistence across a service stop/resume, individual approvals and real speech playback. [Observed results](evidence/hosted-expansion.json).

- **Adapter retention:** the existing private Tinker checkpoint was extended through November 5, 2026 at 23:59 UTC, covering the announced judging week with a buffer. Estimated remaining storage is $0.004852 within the existing $0.25 promotional budget. No retraining, purchase or top-up was made. [Receipt](evidence/tinker-retention.json). Expired checkpoints are reported disconnected; there is no automatic renewal.
- **Physical microphone:** deferred by the owner. Recorded-WAV STT does not verify microphone hardware or browser recording permissions.
- **Authorization breadth:** allowed-owner login and guest provider denial were checked on the hosted baseline. Other-owner and unverified-email denial have automated coverage, not a second live-account walkthrough.
- **Scale:** one application writer is supported. Free Render can sleep or restart; no uptime or multi-worker production SLA is claimed. Mastra snapshots are local; Atlas persists application checkpoints and Temporal's database must persist workflow history.
- **Customer actions:** tickets and recipients are fictional. Browserbase uses the hosted synthetic form. Approvals perform simulated sends; no external customer delivery is enabled.
- **Generated content:** search results can be irrelevant, and Ultramarine review remains advisory. One such draft was rejected during the hosted pass. Human review remains required.
- **Measurement:** the local planner produced 30/30 schema-valid outputs, with 19/30 exact requested-action matches; the latter remains a limitation. Ten real local workflows completed with preparation p50 17.19 s and p95 31.97 s. These are warm-model text-mode results, not hosted voice latency. Manual time saved and production accuracy remain unmeasured. See [PRD status](PRD_STATUS.md).
- **Excluded categories:** no Ultramarine prize claim is made; DigitalOcean remains off by owner choice and Arduino has no hardware proof.
- **Submission:** the existing article was published on October 21, as recorded in [the publication receipt](evidence/dev-publication.json). The updated [file-only revision](DEV_POST_DRAFT.md) is not published. Local-mode and follow-up changes remain on PR #2; no merge, deployment or live DEV edit is part of this verification.

The dependency audit includes an unpatched transitive formatter DoS advisory through Mastra's frontmatter chain. VOX does not expose that parsing path. Previously exposed Google and SerpApi keys were rotated, their old values rejected with HTTP 401, and their replacements passed the earlier hosted voice journey. Credentials remain excluded from source and packages.

Judges have a separate explicitly authorized public allowance: eight live sessions total, one plan/two drafts/one voice upload/two speech generations each, with server-side persistent counters. The owner workspace retains Auth0 restrictions. See [JUDGES.md](JUDGES.md) for the live and provider-free paths and their limits.
