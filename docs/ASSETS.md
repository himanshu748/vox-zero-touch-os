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

- Geist and Geist Mono, served from Google Fonts with preconnects.
- Lucide icons, rendered as SVG components.
- The VOX waveform logo is a code-rendered icon and wordmark.

## UI reference

The current VOX preview was scraped locally through the browser for its layout, typography, palette and controls. A scratch receipt is saved in `work/vox-ui-scrape.json` outside the application. The subsequent light/cobalt direction follows the user's feedback on the earlier typography and palette.

## Public provider proof

- `docs/evidence/sentry-judge-trace.png` is an unedited browser screenshot captured October 21 from Sentry Agent Activity for the completed anonymous hosted judge run. It shows actual model/tool spans, token usage and latency. Prompt/output capture is disabled. The selected tool-root view omits client IP and authentication information. Sentry cost is estimated, not billed. This image is provider evidence, separate from generated brand artwork.
