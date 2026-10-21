# Asset provenance

## Current hero

- File: `public/images/voice-sculpture-v2.jpg`.
- Source: built-in ImageGen, generated October 20, 2026, then converted to JPEG at quality 87 using macOS `sips`.
- Subject: abstract rounded-bar voice waveform in brushed silver, polished chrome and cobalt blue metal on a pale studio background.
- The image is brand artwork. It is not a photograph of a VOX device and is not customer or provider evidence.
- Original generated PNG remains in the tool's generated-images directory. The production asset is packaged locally.

Final edit prompt:

> Preserve the exact sculptural vertical rounded-bar waveform shape, camera angle, composition and complete object. Change warm copper and orange materials to brushed silver aluminum, polished platinum chrome, and cobalt blue anodized metal (#3657ff). Replace the black backdrop with a very pale cool white studio background (#f7f8fb), a soft gray contact shadow and bright neutral studio daylight. Remove warm copper, brown and amber. Keep physical material realism. No text, symbols, UI, logos or watermark. Landscape 3:2.

The first copper artwork is retained as a superseded iteration in `public/images/voice-sculpture.jpg`. It is not referenced by the current landing page.

## Typography and icons

- Geist Variable, bundled from `@fontsource-variable/geist` 5.3.0, with local WOFF2 assets. The former Google Fonts links/preconnects were removed for local operation. License: `public/fonts/geist-LICENSE.txt`. Code uses system monospace fallbacks.
- Lucide icons, rendered as SVG components.
- The VOX waveform logo is a code-rendered icon and wordmark.

## UI reference

The current VOX preview was scraped locally through the browser for its layout, typography, palette and controls. A scratch receipt is saved in `work/vox-ui-scrape.json` outside the application. The subsequent light/cobalt direction follows the user's feedback on the earlier typography and palette.

## Public provider proof

- `docs/evidence/sentry-judge-trace.png` is an unedited browser screenshot captured October 21 from Sentry Agent Activity for the completed anonymous hosted judge run. It shows actual model/tool spans, token usage and latency. Prompt/output capture is disabled. The selected tool-root view omits client IP and authentication information. Sentry cost is estimated, not billed. This image is provider evidence, separate from generated brand artwork.
- `docs/evidence/judge-workflow-clarity.png` is an unedited October 21 screenshot of that saved hosted run after the product wording update. It shows the existing instruction and saved result, not a newly repeated set of provider calls.
- `docs/evidence/local-open-weight.png` is an unedited October 21 screenshot of a separate local Gemma browser verification run on MacBook Air M4/16 GB. It shows 24 triages, seven labels and two pending replies with the local-mode banner. It is not the timed benchmark run; timing claims come only from `lazy-payoff.json`.
- `docs/evidence/completion-workspace.png` is an unedited screenshot of the completed local walkthrough run `2e9aec8b-01bf-4b4d-a4e5-46f6b58fdfe9`. Its [receipt](evidence/local-demo.json) records 24 triages, seven labels, two drafts, one simulated send and one rejection, plus Temporal completion.
- `docs/evidence/local-demo.mp4` assembles ten actual UI screenshots from that same local run into a silent 110-second, 1280×960, 60 fps walkthrough. English captions and a constructed pointer are editorial overlays; timing is edited and the video is explicitly labelled. It does not represent continuous screen recording, physical microphone use or hosted/cloud-provider execution. The unedited frame hashes, output hash and ffprobe metadata are in `local-demo.json`; caption source is `local-demo-captions.ass`. Raw captures and the render configuration remain in the task QA directory. Rendering used the installed browser-video-recording skill, Pillow and workspace-local static ffmpeg/ffprobe tools; the system ffmpeg installation was not modified.
