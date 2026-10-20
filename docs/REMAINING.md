# Remaining product requirements

The original PRD is substantially broader than this local implementation. No sponsor category is claimed. The in-app Evidence view uses the same boundary.

| Area                   | Implemented here                                                                           | Still required for the PRD                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Voice                  | Consent and microphone UI, bounded recording, ElevenLabs server adapters, text fallback    | Live STT/TTS request receipts and microphone/provider walkthrough                                        |
| Open model             | Vercel AI SDK Gemma adapter, schema validation, structured streaming, SDK tests with mocks | Real open-weight inference endpoint and measured behavior on varied commands                             |
| Agents                 | Explicit planner/executor boundary and fixed action allowlist                              | Real Mastra agent/tools and execution evidence                                                           |
| Helpdesk               | 24 synthetic tickets, filters, priorities, notes, labels, saved drafts and reset           | Browserbase/Stagehand control of the real helpdesk UI and recorded field change                          |
| Durability             | Local SQLite checkpoints, atomic writes, injected retry, database reopen/resume test       | Real Temporal workflow, worker kill/restart demonstration and Temporal history                           |
| Storage                | Local SQLite                                                                               | MongoDB Atlas operational persistence and evidence                                                       |
| Approval               | Session-bound, single-use decisions; no external sends                                     | Auth0 identity and user-bound authorization proof                                                        |
| Research               | Checked-in category playbooks and reference links, labeled as not fetched live             | Live SerpApi retrieval used in actual drafts                                                             |
| Memory                 | Local reply preference changes subsequent templates                                        | Backboard memory/RAG evidence                                                                            |
| Monitoring             | Local activity records, SDK receipt fields, latency, tokens where returned                 | Sentry agent traces and linked production run evidence                                                   |
| Hosting                | Production build and local server                                                          | Public repository, Render deployment, persistent infrastructure and optional controlled domain           |
| Advanced integrations  | Not implemented                                                                            | DigitalOcean hosting, TabPFN, Tinker, Ultramarine, Tiger Data, Entire and Copilot evidence as applicable |
| Conditional categories | Not implemented                                                                            | Claimed .tech domain proof; physical Arduino UNO Q proof                                                 |
| Metrics                | Real local counts; time saved explicitly unmeasured                                        | Model evaluation, 10+ measured live runs, p50/p95, manual baseline and actual cost measurement           |
| Release                | MIT license, setup, seed/reset, tests, architecture and honest evidence UI                 | Judge-facing film, public write-up, eligibility check and saved submission proof                         |

No cloud account, API key, DNS change, infrastructure provisioning, external message or submission was performed. Supply credentials through server environment configuration, not chat or browser inputs. The current local executor is single-process and is not a production multi-tenant worker.
