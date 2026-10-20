# Verification receipt

Date: October 20, 2026 (India time).

## Automated

- `npm test`: 13 tests passed.
- `npm run typecheck`: passed, AI SDK adapter checked against installed package types.
- `npm run build`: passed; landing and workspace load in separate JS chunks.
- `node:sqlite`: database state is persisted locally; its experimental status is disclosed.

AI SDK tests use `MockLanguageModelV4` from `ai/test`. They verify the installed SDK generation, streaming and validation paths. They are not live model inference receipts.

## Browser

Verified with the local in-app browser:

- Created a plan from the queue workflow; the preview made no ticket mutation.
- Approved the run: 24 tickets triaged, 7 internal labels saved, 6 reply drafts, one injected pre-write failure recovered, zero external sends.
- Rejected one proposed reply and approved one simulated sandbox send. Pending count fell from 6 to 4. Backend tests separately verify that a foreign session is denied and a repeated decision is rejected.
- After AI SDK integration, created a plan through `useObject` and the structured preview endpoint; all six fixed action cards rendered from the saved plan.
- Desktop landing and workspace checked at 1440 px; mobile checked at 360 px and 390 px. The observed document width matched the viewport, without horizontal page scroll.
- Hero image loaded. Navigation, workflow examples and mobile menu worked.
- Workflow motion preview played and paused, with Resume visible and the active step preserved.
- Replaced the original copper palette after user feedback. Current design is Geist with soft white/cobalt landing and a cool neutral workspace.

Live microphone transcription, paid model inference, ElevenLabs playback, physical hardware, cloud infrastructure, public hosting, contest eligibility and submission were not verified.

Screenshots in this folder are local browser observations, not vendor integration evidence. Earlier screenshots with copper artwork document a superseded design. Current deliverable screenshots use the silver/cobalt artwork.
