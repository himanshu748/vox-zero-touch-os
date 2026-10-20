# Verification receipt

Date: October 20, 2026 (India time).

## Automated

- `npm test`: 29 tests passed.
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

Current evidence is in [the live QA report](../../qa/LIVE-VOICE-QA.md), [provider receipts and Mastra snapshot](../../qa/live-voice-proof.json) and [generated briefing](../../qa/live-briefing.mp3).

## Limits

The user deferred physical microphone testing. Browser speech hardware, Safari/Firefox and public hosting were not assessed. All helpdesk identities and sends remain synthetic. Temporal, Auth0, Browserbase, MongoDB Atlas and the other cloud PRD integrations remain separate requirements.

The npm audit reports an unpatched transitive `sprintf-js` formatter DoS advisory through Mastra's frontmatter chain; five package entries are affected. VOX does not expose frontmatter parsing or user-controlled format strings.

An initial Google key-detail tool response was not fully redacted because Google used a newer credential format. The key was not committed or packaged, and subsequent handling was redacted. Rotating that existing Google key in AI Studio is recommended; it was not disabled automatically because it may be shared by other projects.

Earlier dark/copper screenshots show superseded designs. Current workspace and voice-flow screenshots use the Geist/white/cobalt system.
