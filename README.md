# Kirby eval harness — reproduce the numbers at [karimnsemaan.me/measured](https://karimnsemaan.me/measured)

This is the **actual** evaluation suite for **Kirby**, the grounded chatbot on
[karimnsemaan.me](https://karimnsemaan.me). It is published so anyone can
reproduce the eval numbers shown at
[karimnsemaan.me/measured](https://karimnsemaan.me/measured) **without trusting
the site** — you run the same cases against the same live endpoint and get the
same results.

Kirby is a retrieval-grounded assistant (LangGraph guard → answer over an
NVIDIA NIM model) that answers only from the portfolio's typed content. These
suites measure whether it stays grounded, refuses fabrication, resists prompt
injection, and generalizes.

## What's here

| File | What it runs |
| --- | --- |
| `eval-chat.mjs` | The **golden** suite — the tuned cases (grounded / refusal / persona). Published result: 30/30. |
| `eval-chat-holdout.mjs` | The **held-out** suite — cases frozen *after* the prompt + corpus were finalized and never tuned against, so it measures generalization, not memorization. |

Every case here is also rendered, with its verbatim transcript, on
`/measured` — so the questions and replies are already public; this repo just
makes the harness runnable.

## Run it

Requires Node 18+ (uses the built-in `fetch`). No install, no secrets — these
scripts POST to the public `/api/chat` endpoint.

```bash
# Golden suite against the live site
BASE_URL=https://karimnsemaan.me EVAL_SLOW=1 node eval-chat.mjs

# Held-out suite
BASE_URL=https://karimnsemaan.me EVAL_SLOW=1 node eval-chat-holdout.mjs

# Held-out as a reliability DISTRIBUTION over N runs (pass-rate mean +
# percentile-bootstrap CI + per-case pass frequency)
BASE_URL=https://karimnsemaan.me EVAL_RUNS=20 EVAL_PACE_MS=3000 \
  EVAL_REPORT=holdout-reliability.json node eval-chat-holdout.mjs
```

`EVAL_SLOW=1` paces requests ~35s apart to stay under the endpoint's per-IP
rate limit (~10 requests / 5 minutes). A full sweep is slow by design; that
limit is a real production control, not a stall.

## Honesty notes (read these)

- **The held-out score is non-deterministic.** It runs against a live model at
  temperature 0.5, so it varies run to run (13/16–16/16 observed across runs).
  The swing case is an entity-recall probe. `/measured` publishes the latest
  run **with this variance stated**, not a cherry-picked best run — and
  `EVAL_RUNS` here lets you measure the distribution yourself.
- **Scoring is substring matching** on stable facts: cheap, deterministic,
  re-checkable, but brittle. It can mark a defensibly-correct answer as a miss.
  The cases document where that happens.
- **The golden suite is "passing my own homework"** by construction (the prompt
  was iterated until those cases passed). That is exactly why the held-out
  suite exists and is published alongside it.

## Why this repo exists

A self-reported eval is only as good as its reproducibility. This harness lets a
skeptic verify the `/measured` numbers independently. The portfolio's source is
private; the eval harness and its frozen cases are not.

## License

MIT — see [LICENSE](./LICENSE).
