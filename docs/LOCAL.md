# Run VOX with local open-weight AI

Local mode uses **Gemma for intent normalization, validated planning and reply drafting**. It is separate from the rules-only/template demo. SLA priorities still use deterministic rules; the model does not control permissions or sending.

Tested on **MacBook Air M4, 16 GB**, with an already-installed `gemma3:4b`. The observed CPU, RAM, machine identifier, Ollama version and timings are in [the benchmark receipt](evidence/lazy-payoff.json). This is a local development mode, not a deployment change to getvox.tech.

## Setup

Prerequisites: Node 22.18+, dependencies installed with `npm ci`, [Ollama](https://ollama.com/download) running locally, and [Temporal CLI](https://docs.temporal.io/cli#install) on PATH (`brew install temporal` on macOS). No cloud account or API key is needed. Temporal's dev server is intended for local development only.

Pull the default model:

```sh
ollama pull gemma3:4b
```

Run VOX from the repository root:

```sh
VOX_MODEL_MODE=local npm run dev
```

Open **http://127.0.0.1:4320/app**. Type “Triage all tickets, research fixes, tag urgent ones and draft two replies. Ask before sending anything.” Review the streamed plan, approve it, then approve or reject each saved draft. Evidence identifies local model calls and skipped external providers.

VOX starts its own loopback-only Temporal dev server on port 17233, namespace `vox-local`, with SQLite history under ignored `data/local/`. Application and Mastra data use that same separate directory. Ctrl-C shuts down the worker and its owned dev server. Existing hosted data, the normal `data/vox.sqlite`, and `.env` are not loaded by this entry path. Runtime downloads do not occur; install the prerequisites first.

## What stays local

- Model requests use `http://127.0.0.1:11434/v1` through Vercel AI SDK. Only loopback endpoints are accepted; redirects, remote destinations and cloud-tagged model names are rejected.
- SerpApi, ElevenLabs and Browserbase have explicit **“skipped in local mode”** receipts. Research selects the checked-in playbooks. Recording, upload, provider speech and browser speech are disabled in this mode; use text commands and the saved text briefing.
- Backboard, TabPFN, Tiger retrieval, Ultramarine and hosted Tinker inference are also skipped. Auth0, Atlas and Sentry are not contacted, even if corresponding environment settings are inherited. Session ownership, the approval gate, request reservations, Mastra and Temporal still apply.
- No API keys are sent to the local endpoint. This policy constrains VOX application requests; it is not an operating-system firewall or a packet-capture claim. Do not configure a local proxy that forwards model requests to a cloud service.
- Geist font files are bundled with the app; the page no longer requests Google Fonts.

Local inference uses a schema adapted for Ollama's grammar compiler: string-length hints are omitted from inference because the tested server rejected the long reply grammar. **The complete original Zod schema validates the final output**, including reply length, before a plan or draft is committed. A model failure never silently becomes a template.

## Qwen3-8B intent fallback

If Gemma cannot normalize an instruction, VOX tries **`qwen3:8b` on the same loopback endpoint once**, within the existing saved normalization reservation. It never switches to a cloud endpoint. Completed intent results are reused.

Optionally install that fallback with `ollama pull qwen3:8b`. This adds roughly 5.2 GB of model storage; ensure space is available. **Real Qwen fallback inference is unverified in this change**: the fallback transport and schema path pass automated tests, while the measured run used Gemma throughout. The available disk space did not justify downloading another large model.

## Other compatible local servers

For an already-running llama.cpp OpenAI-compatible server serving a Gemma GGUF:

```sh
VOX_MODEL_MODE=local VOX_LOCAL_BASE_URL=http://127.0.0.1:8080/v1 VOX_LOCAL_MODEL=gemma-local npm run dev
```

`VOX_LOCAL_INTENT_FALLBACK` defaults to `qwen3:8b`; that model must also be served at the selected endpoint for fallback to work. Set it to the primary model name to use only one model. **llama.cpp execution is unverified**; Ollama is the tested runtime. No authentication header, remote base URL or cloud tag is accepted in local mode.

Optional local settings: `VOX_LOCAL_PORT` (4320), `VOX_LOCAL_TEMPORAL_PORT` (17233), `VOX_LOCAL_DATA_DIR` (`data/local`), and `VOX_TEMPORAL_CLI` (explicit CLI executable). The runtime ignores hosted `DATA_DIR`/Temporal routing and chooses its isolated local settings.

## Reproduce the numbers

```sh
node scripts/lazy-payoff.mjs
```

The script starts an isolated loopback Temporal server on 17333, creates a fresh synthetic database, runs the real Gemma/Temporal/Mastra pipeline, verifies two pending drafts, then scripts one approval and one rejection. It cleans up only its temporary data and owned processes. It overwrites `docs/evidence/lazy-payoff.json` and `lazy-payoff-queue.json` with that run's measurements and frozen input. Human timing remains empty. See [the comparison protocol](LAZY_PAYOFF.md).

Run the fixed 30-command schema/action evaluation with `npm run evaluate:planning`. Run ten isolated 24-ticket workflows with `npm run benchmark:local`. The latter preserves the original single-run/manual-baseline input and writes each run under `docs/evidence/performance-runs/`, plus [aggregate percentiles](evidence/local-performance.json). These sequential real local calls consume compute time, not cloud credits. Do not simultaneously run other model workloads when reproducing latency.

For development accessibility checks, open `/app?qa`; the opt-in audit control runs axe-core locally and includes the current reduced-motion preference and viewport. It is excluded from production bundles. [PRD status and limits](PRD_STATUS.md).

Local startup replaces inherited hosted origin/secure-cookie settings with its loopback HTTP origin. Session cookies remain HttpOnly and SameSite=Strict, with Secure reserved for hosted HTTPS. Foreign origins stay blocked. `npm run verify:startup` uses the installed Temporal CLI and a temporary synthetic directory to force an occupied HTTP port, then verifies unsuccessful startup and cleanup of the owned Temporal process; it makes no model request. [Actual startup receipt](evidence/local-startup.json).
