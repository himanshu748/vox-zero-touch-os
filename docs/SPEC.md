# Implementation contracts

## Data and execution

A cookie resolves to one opaque guest owner. Each owner has a persisted JSON workspace in SQLite containing tickets, plans, runs, preferences, receipts and an idempotency ledger. Mutations use `BEGIN IMMEDIATE` and commit the full workspace atomically.

The executable plan is server-built. Model output can contain only `actions` and `objective`; action values are restricted to `triage`, `research`, `draft`, and `tag`. The server adds inspection and briefing steps, enforces ticket scope and a maximum of six drafts, and stores a fresh preview id. Only a saved unexpired preview can start a run. A preview is single-use.

The engine persists its activity cursor with every transaction. A write key combines run id, action kind and ticket id. Running work resumes at process startup. Default fault injection interrupts the tag activity before its transaction and retries once. The local implementation assumes a single Node process.

Reply drafts are pending by default. Each has an expiration and a unique approval id. Approve/reject resolves only inside the current owner workspace. A decision is single-use. Approving records a synthetic send, never an external delivery. Rejecting preserves the draft body.

## API

| Endpoint                    | Contract                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /api/state`            | Current owner's tickets, saved runs, provider readiness and capabilities                               |
| `POST /api/plans`           | Validated command/scope to a saved read-only preview                                                   |
| `POST /api/plans/stream`    | Command, scope and UUID request id to streamed structured intent; saves only a complete validated plan |
| `GET /api/plans/:id`        | Retrieve an owner-bound validated preview                                                              |
| `POST /api/runs`            | Start exactly one saved fresh preview by id                                                            |
| `POST /api/runs/:id/cancel` | Stop future activity; preserve saved effects                                                           |
| `POST /api/runs/:id/resume` | Resume a stopped/failed run from the saved cursor                                                      |
| `POST /api/approvals/:id`   | Single `approve` or `reject` decision in the owner session                                             |
| `POST /api/preferences`     | Save local reply style and injected-failure choice                                                     |
| `POST /api/reset`           | Clear current workspace records and reseed synthetic tickets; denied during an active run              |
| `POST /api/transcribe`      | Bounded audio to configured ElevenLabs STT, in memory                                                  |
| `POST /api/speech`          | Saved briefing by run id to configured ElevenLabs speech                                               |
| `GET /api/evidence`         | Export current owner's actual runs, ledger, receipts and readiness                                     |
| `GET /healthz`              | Process health, storage and synthetic mode                                                             |

## UI boundary

The AI SDK streams intent data, not HTML. `PlanCards` maps only known kinds to fixed components. Partial output is an inert preview. Plan execution requires a second deliberate approval after full server validation. Landing-page examples and motion never call execution tools.

## Cloud boundary

SQLite, local rules, direct helpdesk writes and cookie sessions do not fulfill MongoDB Atlas, Gemma, Browserbase, Temporal, Mastra or Auth0 sponsor requirements. The readiness UI claims none of these categories without independent evidence. Public deployment and real customer automation remain outside this verified local build.
