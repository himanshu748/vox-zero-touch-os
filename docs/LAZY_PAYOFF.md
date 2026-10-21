# The lazy payoff: measure the work, then measure the review

VOX's job is to prepare the queue while you do something else, then leave **two reply decisions**. There is also **one initial plan approval**. The benchmark scripts those gates; it does not measure a human's review time or prove that the drafts are correct.

The machine-side receipt is [evidence/lazy-payoff.json](evidence/lazy-payoff.json). The exact 24 fictional tickets, frozen response windows and authored playbooks are [evidence/lazy-payoff-queue.json](evidence/lazy-payoff-queue.json). The receipt hashes that JSON object for reproducibility.

## Measured VOX preparation

<!-- AUTO-RESULTS-START -->

| Measurement                            | Observed                            |
| -------------------------------------- | ----------------------------------- |
| Model runtime                          | Ollama 0.31.1                       |
| Model                                  | gemma3:4b                           |
| Model already loaded at start          | False                               |
| Local server/worker startup            | 1.42 s                              |
| Intent + planning                      | 20.99 s                             |
| Queue inspection                       | 2.14 ms                             |
| SLA-rule triage                        | 2.43 ms                             |
| Checked-in guidance                    | 1.85 ms                             |
| Internal labels                        | 2.04 ms                             |
| Two model drafts                       | 3.86 s                              |
| Text briefing                          | 2.33 ms                             |
| Total preparation until two decisions  | 25.09 s                             |
| Tickets triaged / labels / drafts      | 24 / 7 / 2                          |
| Human gates                            | 1 plan approval + 2 reply decisions |
| Application external HTTP destinations | 0                                   |
| Temporal / Mastra                      | COMPLETED / success                 |

<!-- AUTO-RESULTS-END -->

These are wall-clock measurements from one run, not averages. Stage totals need not equal elapsed preparation: planning, queue scheduling, persistence and polling contribute overhead. Deliberate fault injection and cosmetic per-step delays are disabled in the benchmark. Model loading and local Temporal/worker startup are reported separately. The preparation timer begins immediately before the planning request and ends when Mastra is suspended with two pending replies.

## Ten-run local follow-up

The subsequent [ten-run local benchmark](evidence/local-performance.json) completed 10/10 workflows with a resident model: preparation p50 **17.19 s**, p95 **31.97 s**; text-to-plan p50 **9.44 s**, p95 **23.42 s**. Startup is separate. Each raw receipt includes its own frozen queue. These results neither replace the original cold-run input above nor measure hosted voice latency or human review. At n=10, nearest-rank p95 is the slowest observed run.

## Manual baseline: do this yourself

1. Open only the frozen queue JSON and its included playbooks. Do not read VOX's resulting drafts before doing the manual attempt. Use the supplied `slaHoursAtStart`, not today's clock; the cases must remain identical across attempts.
2. Use a blank sheet below. Start a stopwatch, read all 24 tickets, mark a priority and brief reason for each, flag internal attention labels, and draft replies for the same two ticket IDs named in the receipt's `draftTicketIds`. Use only the included guidance. Do not add web research or voice transcription to either side.
3. Match the deterministic priority policy: base 15; add 45 when due within 4 hours, otherwise 25 within 8 hours or 5; add 22 when `category` is `incident`, and 18 when the body contains `production`, `entire team`, `locked out` or `cannot access` (case-insensitive). Cap at 99. Scores 75+ are urgent, 50–74 high, otherwise normal. Flag urgent/high tickets. Use the same policy on both sides.
4. Stop the preparation timer only when all 24 priorities/reasons and two replies are complete. Record the raw elapsed time; do not estimate a number of minutes saved.
5. Separately time reading the two replies and deciding approve/reject. Review for relevance, unsupported claims and source quality. Both sends are hypothetical; send nothing externally. Record corrections and quality problems as well as time.
6. In a separate fresh local VOX run, time your **plan review** and **two reply reviews**. The benchmark's scripted decision duration cannot replace either measurement. Record whether you corrected the command, plan or drafts, and include those corrections in the human time.
7. Prefer three paired attempts on equivalent queues, with order alternated, before making a general claim. This first frozen queue is a reproducible pilot, not a population study. Familiarity and unblinded review can bias the result.

## Empty timing sheet

All human fields are deliberately blank.

| Attempt | Manual prep start / finish | Manual preparation (s) | Manual reply review (s) | VOX plan review (s) | VOX reply review / corrections (s) | Quality notes |
| ------- | -------------------------- | ---------------------- | ----------------------- | ------------------- | ---------------------------------- | ------------- |
| 1       |                            |                        |                         |                     |                                    |               |
| 2       |                            |                        |                         |                     |                                    |               |
| 3       |                            |                        |                         |                     |                                    |               |

| Ticket  | Manual priority / score | Reason | Attention label? |
| ------- | ----------------------- | ------ | ---------------- |
| VX-1042 |                         |        |                  |
| VX-1043 |                         |        |                  |
| VX-1044 |                         |        |                  |
| VX-1045 |                         |        |                  |
| VX-1046 |                         |        |                  |
| VX-1047 |                         |        |                  |
| VX-1048 |                         |        |                  |
| VX-1049 |                         |        |                  |
| VX-1050 |                         |        |                  |
| VX-1051 |                         |        |                  |
| VX-1052 |                         |        |                  |
| VX-1053 |                         |        |                  |
| VX-1054 |                         |        |                  |
| VX-1055 |                         |        |                  |
| VX-1056 |                         |        |                  |
| VX-1057 |                         |        |                  |
| VX-1058 |                         |        |                  |
| VX-1059 |                         |        |                  |
| VX-1060 |                         |        |                  |
| VX-1061 |                         |        |                  |
| VX-1062 |                         |        |                  |
| VX-1063 |                         |        |                  |
| VX-1064 |                         |        |                  |
| VX-1065 |                         |        |                  |

| Reply | Frozen ticket ID         | Draft text | Proposed decision | Corrections / concerns |
| ----- | ------------------------ | ---------- | ----------------- | ---------------------- |
| 1     | Copy `draftTicketIds[0]` |            |                   |                        |
| 2     | Copy `draftTicketIds[1]` |            |                   |                        |

## Empty comparison table

| Measurement                | VOX                                   | Manual | Evidence                                           |
| -------------------------- | ------------------------------------- | ------ | -------------------------------------------------- |
| Automated preparation      | See receipt                           | N/A    | `lazy-payoff.json`                                 |
| Human preparation          | Initial instruction/edit time: ____ s | ____ s | Owner stopwatch; unverified until filled           |
| Initial plan review        | ____ s                                | N/A    | Owner stopwatch; unverified until filled           |
| Reply review + corrections | ____ s                                | ____ s | Owner stopwatch; unverified until filled           |
| Total elapsed time         | ____ s                                | ____ s | Sum the corresponding measured parts               |
| Difference                 | ____ s                                |        | No claim until both sides and quality checks exist |

Compare both **human attention time** and **elapsed time**. If the automated work happens while you are away, its elapsed duration is still real, but it is not human effort. Avoid converting two final decisions into a claim that VOX removes every other decision: plan approval and reading/correcting replies still take attention.
