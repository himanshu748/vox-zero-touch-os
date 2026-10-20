# Verification receipt

Date: October 20, 2026 (India time).

## Automated

- `npm test`: 19 tests passed.
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

## Limits

Gemma inference and ElevenLabs transcription/playback remain unverified with live credentials. The disconnected voice state correctly offers a text command. Browser speech controls were exercised, but microphone hardware and audible output were not assessed. Reduced-motion behavior is implemented in code; OS-level reduced-motion preferences were not changed during this pass. No Safari/Firefox, public deployment, Temporal, Auth0, Browserbase or other cloud integration proof is claimed.

Current screenshots and the detailed QA matrix are in the separate [QA output folder](../../qa/WORKSPACE-QA.md).
