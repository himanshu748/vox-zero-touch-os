# VOX motion direction

Applied the installed motion-design and motion-graphics guidance to the existing React website. The requested deliverable is a website; no standalone video render or HyperFrames export was requested or created.

Personality: premium, precise, calm. Emotional target: the user sees a busy request become an orderly reviewable plan.

- Shared easing: `[0.22, 1, 0.36, 1]`.
- Duration palette: 140 ms feedback, 300 ms state changes, 580 ms expressive entrances.
- Hero: staged line entrances, sculpture reveal, then supporting input and approval callouts. Spatial displacement stays small and the stagger stays below 500 ms.
- Functional feedback: fast button press response, small directional arrow motion, card entry and drawn-in decision checks.
- Signature graphic: “Play the workflow” illustrates four fixed steps across 6.4 seconds. Primary motion is the active card; secondary motion is the saved check state; ambient motion is one finite microphone ring. It is explicitly an illustration and never executes tools.
- Controls: play, pause, resume and replay. A paused sequence retains its elapsed position. Switching examples clears the prior timers. Unmount clears all timers.
- Reduced motion: no spatial entrance, parallax, decorative loop or microphone ring. Starting the preview shows the completed illustration directly. Critical copy is preserved.
- Mobile: restrained displacement, immediate touch feedback and fewer simultaneous motion elements.

The motion-graphics vocabulary informed the short input-to-plan-to-review narrative. Its separate video installation and render workflow was not used for this React UI edit.

## Workspace continuity

The workspace shares the same easing and duration tokens. Routes enter with a 12px movement and opacity change. Dialogs use the standard 300ms transition. The same fixed plan cards become execution cards with queued, active, paused and completed states derived from the persisted cursor. The voice control has an immediate hover response; its ring only repeats during active recording. Reduced-motion preferences disable spatial transitions and decorative loops.
