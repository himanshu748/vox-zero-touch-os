# Live voice flow

```mermaid
flowchart LR
  A[Record or upload audio] --> B[Duration and size validation]
  B --> C[ElevenLabs Scribe]
  C --> D[Editable transcript]
  D --> E[Gemma via Vercel AI SDK]
  E --> F[Validated plan cards]
  F --> G[Owner approves plan]
  G --> H[Mastra named activities]
  H --> I[Saved priorities, labels and Gemma drafts]
  I --> J[Mastra approval suspension]
  J --> K[Individual owner decisions]
  K --> L[Completed Mastra run]
  L --> M[ElevenLabs spoken briefing]
  M --> N[Persisted replay cache]
```

The helpdesk is fictional. Model inference and voice processing are real provider operations. Playbooks are checked-in references, not live web research. Priority scoring uses transparent deterministic rules. Sending records a local simulated outcome only.

Mastra owns the stage graph, the safe label retry and the human approval suspension. VOX's SQLite cursor and idempotency ledger protect application writes across attempts. Committed model responses are cached to avoid repeating successful provider work when a later draft fails. Mastra snapshots persist in local libSQL.

Voice transcripts, previews, runs and decisions stay bound to the initiating guest session. A complete saved plan is required to execute. Partial streamed data, unknown actions and foreign transcript ids are rejected. Audio is limited to 60 seconds and 8 MB before provider processing. Recorded audio is never stored by VOX; generated briefing audio is cached separately for replay.

The live browser proof used a macOS-generated 7.791-second voice file, not a physical microphone capture. It produced a 24-ticket plan with two drafts. The run performed 24 triage writes, preserved existing labels without duplicates, saved two Gemma replies, recovered one pre-write label interruption and finished after one rejection and one simulated-send approval.

The five successful provider receipts in that flow are one Scribe request, one Gemma plan request, two Gemma draft requests and one ElevenLabs speech request. The three Gemma calls used 3,080 total tokens as reported by the provider. A separate bounded connection probe preceded the browser flow. Provider cost was not returned and is not estimated here.

[Mastra workflow documentation](https://mastra.ai/docs/workflows/overview), [suspension and resume](https://mastra.ai/docs/workflows/suspend-and-resume), [Google-hosted Gemma](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) and [ElevenLabs transcription](https://elevenlabs.io/docs/api-reference/speech-to-text/convert) informed this implementation.
