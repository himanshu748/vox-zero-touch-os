# Verification receipt

Date: October 21, 2026 (India time).

## Automated

- `npm test`: 44 tests passed.
- `npm run typecheck`: passed; covers the AI SDK adapter against installed package types.
- `npm run build`: passed; landing and workspace load in separate JS chunks.
- SQLite persistence, worker restart/resume, read-only previews, bounded scopes, retries, idempotency, ownership, single-use decisions, expired plans/approvals, saved preferences, reset, route parsing and useful error messages are covered.
- SDK tests use `MockLanguageModelV4` from `ai/test`. They exercise SDK generation, streaming and validation. They are not live provider receipts.

## Browser walkthrough

Used the in-app browser's Playwright locators and viewport control. The main walkthrough used `127.0.0.1:4310/app` to isolate QA records from the existing `localhost:4310` workspace. The existing localhost records were preserved.

- Landing to workspace entry, overview, queue filters, empty results and clearing filters.
- Global search remains independent of the queue's query and draft filter. Ticket detail shows priorities, reasons, internal notes, labels and saved drafts.
- Empty commands and unsafe instructions produce readable errors. An empty untriaged scope returns an explicit explanation.
- Preview and edit instruction, then approve a real saved run. Stop, resume, and reload during execution preserved the run URL and checkpoint.
- First run saved 24 triages, 7 labels and 6 drafts. One injected failure recovered without duplicate writes.
- Rejected one draft and approved one simulated send, then rejected the remaining four. Pending count reached zero and history showed Completed.
- Briefing controls changed between Play and Stop using browser speech. Physical audio output was not assessed.
- Saved friendly reply style and urgent default scope survived reload. A subsequent six-ticket scoped run produced friendly drafts.
- Reset confirmation and cancellation were checked in the UI; destructive reset execution and fresh seed/preferences were verified in the isolated automated API test.
- Export JSON was triggered from Evidence; backend tests checked the exported ledger content. Documentation, evidence navigation and browser Back worked.
- Cmd-K search, Cmd-Enter composer focus, Escape dismissal, dialog focus wrapping, mobile navigation focus and closed-sidebar visibility were checked.
- Stopped the local server to verify the retry banner; restarting recovered the saved workspace. Expected connection errors occurred only during this test. A fresh post-restart browser session reported no console warnings or errors.

## Responsive checks

Landing and workspace were inspected at 360×800, 768×1024 and desktop widths, with extra workspace checks at 1024×800 and 1280×720. Observed document width matched viewport width at the checked breakpoints.

Mobile checks covered stacked approvals, a compact queue, a scrollable plan dialog, preferences, menu navigation and readable error feedback. Tablet checks covered the queue and evidence. Desktop checks covered overview and execution. Opening the mobile menu and resizing to desktop closed it and restored page interaction. The original preview was restored to its normal viewport.

Landing navigation, mobile menu, example switching and workflow pause/resume were rechecked after changing shared styles. The current workspace matches the landing's Geist, soft white and cobalt design. Earlier dark/copper screenshots in this folder show superseded versions.

## Live provider verification

The October 20 connected-provider pass used the in-app browser for a 7.791-second synthetic spoken file. It exercised real ElevenLabs Scribe v2 transcription, real Gemma 4 streamed planning, two real Gemma reply generations, Mastra execution with one safe retry, the persisted approval gate, one rejection and one simulated send. The Mastra snapshot reached `success`.

The run saved 24 triages, zero new labels (the existing labels were preserved), two drafts and two individual decisions. The five provider receipts include one STT, three Gemma and one TTS operation. The Gemma calls reported 3,080 total tokens. The ElevenLabs briefing returned 258,341 bytes of audio. Provider cost was unavailable. Replaying before and after a process restart used the saved audio and created no additional speech receipt.

Additional automated checks cover duration/size validation, voice provenance ownership, aborting transcription, stale briefing invalidation, audio-cache deduplication, real Mastra suspension/resume and reuse of completed Gemma responses after failure. The browser console was clean during the successful live walkthrough.

Provider receipts, screenshots and generated audio are retained in the owner's local QA bundle. The public source contains reproduction instructions and the approved development evidence.

## Hosted integration walkthrough

The Render app at https://vox-zero-touch-os.onrender.com/app was exercised with the configured Auth0 owner and real providers. The recorded voice transcript remained linked to the Gemma plan. Backboard recalled the reply preference. SerpApi references were supplied to Gemma and included in the saved replies.

The hosted walkthrough completed with 24 tickets triaged, eight labels, one Browserbase UI note, two Gemma drafts, one rejection and one approved simulated send. Rejection preserved the draft and left the send count at zero before the separate approval. Mastra's approval suspension resumed to success. The exported ledger contained no duplicate keys.

Stagehand executes explicit approved selectors against the hosted form, waits for its acknowledged save response, then verifies the persisted note. A same-origin referrer policy preserves the browser's Origin header; foreign and null origins remain rejected. Google credentials are not passed to Browserbase.

ElevenLabs generated a real briefing and its replay created no additional speech receipt. Sentry Agent Activity showed actual model/tool spans with input/output recording disabled. Provider billed cost remains unavailable. Sentry estimates are not billed receipts.

Hosted owner/transcript/preference persistence across a real deployment was verified. Detailed completed-run and audio persistence comparisons are retained in the private QA bundle. The local Temporal dev server was stopped after its retry/restart proof.

## Limits

The user deferred physical microphone testing. Browser speech hardware and Safari/Firefox were not assessed. All helpdesk identities and sends remain synthetic. Hosted integration evidence and the current provider boundaries and excluded DigitalOcean category are tracked in [SPONSORS.md](SPONSORS.md).

The npm audit reports an unpatched transitive `sprintf-js` formatter DoS advisory through Mastra's frontmatter chain; five package entries are affected. VOX does not expose frontmatter parsing or user-controlled format strings.

Earlier Google and SerpApi portal responses exposed their key values. Both keys were rotated on October 20, 2026, and both old keys now return HTTP 401. The Google replacement preserves the existing Gemini API restriction and service-account binding. Both replacements were saved in Render's private server configuration. A fresh hosted recorded-voice flow passed planning, live searches, browser execution, reply approvals and ElevenLabs briefing playback after rotation. No credential values were committed or packaged.

Earlier dark/copper screenshots show superseded designs. Current workspace and voice-flow screenshots use the Geist/white/cobalt system.

## Sponsor expansion verification

The fresh hosted run `089a5cae-9d54-46ca-814a-7adcbf1317ca` at https://getvox.tech/app exercised the 15 runtime integrations together. Copilot and Entire retain separate development evidence; getvox.tech is the eighteenth category. DigitalOcean and Arduino are excluded. [Curated receipt](evidence/hosted-expansion.json).

- Existing 7.791-second synthetic WAV → real ElevenLabs transcript → Tinker intent normalization → Gemma streamed plan. The transcript was not edited.
- TabPFN scored all 24 tickets. Tiger performed two live hybrid retrievals. SerpApi performed two searches returning six references. Browserbase saved one internal note through the hosted form.
- Two real Gemma drafts received two Ultramarine advisory reviews. The run saved 24 triages and two new labels. Both replies remained pending until individual owner decisions.
- Two Gemma attempts failed; Sentry's actual Agent Activity showed `AI_APICallError` and Google's “Internal error encountered.” Explicit resume reused completed activities and cached model responses. No configured-provider fallback was used.
- A full free-service suspend/resume preserved the same Temporal workflow execution and its ten history events, both approvals, every successful provider receipt ID and every completed provider-task result. No provider request was repeated during that restart.
- One reply was rejected and one approved inside the fictional helpdesk. Mastra reached `success`; Temporal reached `COMPLETED` with 21 history events and the recorded owner-decision signal.
- ElevenLabs generated 255,834 bytes of briefing audio. The browser's playing state returned to ready; a replay explicitly reported saved ElevenLabs audio and no new generation request. The run has 15 successful request receipts across nine external API/data providers.
- Sentry displayed the correlated model/tool trace with prompt/output capture disabled. Its cost estimates are not invoices.

The deployment moved from Singapore to free Render Virginia beside the isolated Tiger database. The full pinned Temporal Server 1.32.1 passed its real provider-free retry/approval startup gate: three activity attempts, 21 events, zero provider calls. The US driver reported a one-millisecond median for three verified-TLS probes. The old Singapore web service is suspended; Atlas now permits only `74.220.49.0/24` and `74.220.57.0/24`. Both apex and www certificates were issued; www redirects to the apex. Auth0 restored the previous four runs under the same owner. Guest provider access returned HTTP 401.

One search returned irrelevant dictionary/general-interest references; that draft was rejected. Retrieval and AI review do not guarantee factual correctness or useful citations. Physical microphone, a second live unauthorized account, production accuracy and high availability remain unverified. No Supabase project, paid Temporal Cloud account, new paid plan or top-up was used. The Tinker checkpoint expires October 27, 2026.

This live journey ran on commit `e4ce349e4d8e6e6dfd39f2b6769149ccfb7559c7`. The subsequent safe failure-label change `02dd26c974e087cfd0573f6984478b00bc0e1e56` is live as deployment `dep-dbbpbaafngtc73a2r7b0`. The completed run, every receipt ID and the cached audio survived that deployment; replay again reported no new generation. Trusted HTTPS health returned 200 and a guest plan request returned 401. Local automated SDK/provider tests use mocks or injected transports where stated; they do not substitute for these live receipts. No GitHub CI run is claimed for this release.

## Bounded judge access

The `/judge` route uses a separate HttpOnly session and owner namespace, ignoring Auth0 owner identity. Automated tests exercise actual HTTP/Mastra execution using explicitly injected test model responses: normal guest denial, unclaimed judge denial, eight-pass hard cap, two-draft clamp, saved preview recovery, cross-session denial, single-use approve/reject, provider-free planning, and quota persistence across reset and reopening the database. Voice tests verify that concurrent/cached speech reserves only once and a denied reservation makes no fetch. These tests are not live provider receipts.

The provider-free local judge journey was exercised in the in-app browser at desktop and 390×844: entry, plan cards, execution with one retry, six template drafts awaiting review, mobile review dialog, keyboard focus and Escape. Document scroll width equalled 390px. Existing reduced-motion handling is retained; the active browser preference was normal motion and reduced-motion OS mode was not toggled in this pass. Hosted live verification is recorded separately after deployment.

The anonymous hosted pass at https://getvox.tech/judge completed recorded-WAV transcription, streamed Gemma planning, Tinker normalization, Backboard memory, TabPFN triage, Tiger retrieval, two SerpApi searches, a Browserbase UI note, two Gemma drafts and two Ultramarine reviews. It saved 24 triages/seven labels/two drafts, approved one simulated send and rejected one draft. Mastra reached `success`; Temporal reached `COMPLETED` with 21 events and two decision signals. Sixteen successful provider receipts include one real ElevenLabs briefing (257,505 bytes, HTTP 200). One live pass was consumed for verification, leaving seven at that observation. The saved preview and counters survived browser reload. A separate hosted provider-free run completed with zero external provider receipts; normal guest planning remained HTTP 401 and cross-session Temporal access returned 404. [Curated judge receipt](evidence/judge-hosted.json).

On October 21, the owner approved raising only the existing VOX ElevenLabs key cap from 1,000 to 5,000 credits per refresh period. Reopening its settings confirmed the saved cap and unchanged endpoint permissions; expiry remained November 19. Auto top-up was verified off, with no purchase or top-up. The hosted completed judge session, cached briefing playback and seven remaining passes were rechecked. This post-change check made no additional billable voice request.
