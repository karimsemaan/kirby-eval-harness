# Bastion golden-eval harness

A plain-Node eval harness that exercises Bastion's evidence-analysis stage against a pinned golden set, then publishes an honest artifact to `public/data/bastion-evals.json` for the portfolio.

## What it measures

Bastion's core AI step turns an evidence document (a policy, a scan report, an audit excerpt) into structured assessment findings against NIST CSF 2.0 subcategories. This harness replays that exact step on canned synthetic scenarios about a fictional company and scores the findings against expectations written in advance.

## Read-only mirror provenance

The harness never modifies the Bastion repo (`C:/Users/semaa/Documents/GitHub/Bastion`). It reads files and runs `git rev-parse HEAD` for provenance, nothing else. The mirror is faithful in these ways:

- The system and user prompts are a verbatim port of `src/lib/llm/prompts/analyze-evidence.ts` (`buildEvidenceAnalysisPrompt`, prompt key `analyze-evidence`), including `FULL_WRITING_STANDARDS` from `src/lib/llm/prompts/writing-standards.ts` and the NIST CSF 2.0 `promptContext` from `src/lib/frameworks/registry.ts`.
- The expected JSON output shape mirrors `evidenceAnalysisSchema` in `src/lib/llm/parsers.ts`.
- The model id is parsed at runtime from `src/lib/llm/client.ts`. Bastion resolves the analysis model as BYOK, then `ANTHROPIC_API_KEY` env, then AI Gateway. Since the harness authenticates with `ANTHROPIC_API_KEY` (the env path), it uses `DIRECT_MODELS.analysis`, the same id Bastion's direct-SDK path uses. The id is never hardcoded or guessed.
- Per-case control definitions come from Bastion's framework data: descriptions from `supabase/migrations/003_seed_nist_csf.sql` and assessment guidance from `src/lib/frameworks/assessment-meta.ts`, the same enrichment `src/app/api/analyze/evidence/route.ts` performs via `getAssessmentMeta`. Only the controls a case names are embedded in its prompt.
- Timeout (90s) and retry policy (2 retries, exponential backoff starting at 2s, transient errors only) mirror `src/lib/llm/client.ts`.

One deliberate substitution: Bastion sends this prompt through the Vercel AI SDK's `Output.object` wrapper. The harness reproduces the prompt text verbatim and appends an explicit JSON schema instruction in place of that wrapper, then calls the Anthropic Messages API directly (`https://api.anthropic.com/v1/messages`, `anthropic-version: 2023-06-01`) with global `fetch`. The published artifact records the Bastion HEAD sha and every mirrored file path in `_provenance`.

What is NOT exercised: RAG retrieval, Haiku bottom-up discovery, smart filtering, batching and dedup, and the multi-stage Haiku verification pass. This is a single Sonnet evidence-to-findings call. Note also that production post-filters findings for controls outside the assigned batch; this eval reports them as violations instead of silently stripping them.

## Case format (pinned contract)

Each case lives in `cases/<caseId>/` with two files:

- `evidence.md`: the synthetic evidence document (fictional company; never real client material).
- `expected.json`: the golden expectations. All authors and the harness MUST conform exactly:

```json
{
  "caseId": "pr-03-vendor-access",
  "csfFunction": "PR",
  "controlIds": ["PR.AA-01", "PR.AA-05"],
  "mustFind": [
    {
      "id": "mf-1",
      "findingType": "gap",
      "severityAtLeast": "high",
      "anyKeywords": ["vendor", "privileged"],
      "controlIdHint": "PR.AA-05"
    }
  ],
  "shouldFind": [],
  "mustNot": { "fabricateControls": true, "missCitations": true }
}
```

Rules:

- `caseId` is `<function>-<nn>-<slug>` (lowercase), and must equal the directory name.
- `csfFunction` is one of `ID|PR|DE|RS|RC|GV`.
- `controlIds` are real NIST CSF 2.0 subcategory IDs; the harness validates each against Bastion's framework data and refuses cases that name unknown controls.
- `mustFind` entries are critical findings the pipeline must surface. `shouldFind` uses the same shape for important-but-not-critical findings. `controlIdHint` is a preference used to pick among multiple matching findings; it is not required for a match.
- `mustNot` flags are global failure criteria for the case.

## Scoring rules

A finding matches an expectation when all of these hold:

1. `findingType` matches, where a `risk` finding also satisfies a `gap` expectation. Bastion's prompt and analyze route rank risk as strictly worse than gap (identical downstream handling, higher fallback severity), so escalating a seeded gap to a risk is correct behavior. The reverse does not hold: a `gap` finding never satisfies a `risk` expectation, and `strength` always requires an exact match. When a match used the escalation, the artifact records it in `matchedFindingType`.
2. For gaps and risks, the finding's `severity` is at or above `severityAtLeast` (rank: low < medium < high < critical). Strength expectations skip this check (strengths carry null severity).
3. At least one `anyKeywords` term appears, case-insensitively, in the finding's `observation` plus `gaps` text.

Per-case pass: every `mustFind` matched AND no `mustNot` rule violated.

- `fabricateControls` is violated when any finding names a control outside the case's `controlIds` (whether a real but unassigned control, or a nonexistent id).
- `missCitations` is violated when any finding's `quote` is empty or does not actually appear in `evidence.md`. The comparison normalizes whitespace, smart punctuation, markdown markup (bold/emphasis markers, blockquote `>` prefixes, table pipes, heading/code markers), and quote marks on both sides; the quoted word sequence itself must still appear. A stitched multi-sentence quote passes only if every quoted sentence of 20+ characters appears verbatim in the evidence. Reconstructed content (table rows flattened with invented separators, inserted words) still fails.

Also reported (do not gate pass/fail):

- `shouldFind` recall.
- Citation validity rate: the share of all findings whose quote verifiably appears in the evidence.
- Severity accuracy: among gap/risk expectations the model matched on type plus keywords, the share whose severity met the expected floor. This isolates severity calibration from detection.

The artifact renders whatever happened, including failures, parse errors, and truncations. There is no retry-until-green.

## Scoring review (2026-06-11)

The first run was published raw before the mandated review step ran: 1/20 passed, mustFind recall 52.5%, citation validity 71.9%. The review then audited all 28 unmatched mustFind expectations and all 32 invalid citations against the raw model responses (now committed at `responses/`, see below) and the evidence documents. Verdict: most of the headline failure was the scorer, not the model.

| Class          | Count | What it means                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HARNESS_DEFECT | 17    | The model surfaced the seeded gap, usually at or above the expected severity, but typed it `risk`; the scorer's exact-type match rejected the escalation that Bastion's own prompt and route define as strictly worse than a gap.                                                                                                                                                                                    |
| PHRASING       | 1     | The model surfaced the seeded gap with matching type-class and severity, but the keyword net missed its wording (rc-02 mf-1: "ransomware binary" singular vs the model's "scanning for ransomware binaries"). Keywords tuned, documented in the case file's `_tuned` field.                                                                                                                                          |
| REAL_MISS      | 10    | 5 findings surfaced but rated below the expected severity floor (de-02 mf-1, gv-00 mf-2, id-02 mf-2, rc-01 mf-1, rc-03 mf-2); 3 strength expectations with no strength-typed finding produced at all (pr-01/pr-02/pr-03 mf-3); 2 seeded gaps not surfaced in any finding (de-02 mf-2 after-hours coverage, de-03 mf-1 dead Azure Event Hub connector, which appeared only as a side note inside a strength finding). |

Citation review: 27 of the 32 invalid citations were normalization artifacts. The evidence files use markdown bold mid-sentence, blockquote labels, and tables; the model quotes the prose without the markup and renders the evidence's double quotes as single quotes inside JSON. Bastion's production verification pass accepts near-verbatim quotes, so the original exact-substring check was stricter than the system under test. The 5 remaining failures are genuine: 3 light paraphrases in gv-00 (the model inserted "our" into the quote) and 2 flattened table rows in rs-01 presented as quotes (rs-01 still fails the case on them).

Fixes applied (scorer only, model responses untouched): markup/quote-mark normalization with a sentence-level fallback for stitched quotes, and one-way findingType escalation (risk satisfies gap). Expectation tunes: 2, both documented inline via `_tuned`. One loosened keywords (rc-02 mf-1, the PHRASING row); one tightened keywords (id-02 mf-2) to prevent the escalation fix from granting spurious cross-credit, deliberately preserving that REAL miss.

Also verified during the review: every case prompt contained the control definition for each control its expectations reference, no findings were dropped in parsing (raw vs scored counts equal for all 20 cases), and no response was truncated. No case needed a live re-run; the final numbers (10/20 passed, mustFind recall 83.1%, citation validity 95.6%) come from re-scoring the same first-run responses now committed at `responses/`. Full details live in the artifact's `_provenance.scoringReview`.

### Full classification of the 28 unmatched mustFinds

| Case / exp | Class                           | Evidence from the cached response                                                                                  |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| de-01 mf-1 | HARNESS_DEFECT                  | DE.CM-03 risk/critical: CareBridge database-tier audit logging disabled, ePHI access unlogged                      |
| de-01 mf-2 | HARNESS_DEFECT                  | PR.PS-04 risk/high: 30 days searchable vs 365-day/6-year retention requirement, cold archive decommissioned        |
| de-02 mf-1 | REAL_MISS (severity)            | suppressed lateral-movement detections surfaced as gap/medium; floor high                                          |
| de-02 mf-2 | REAL_MISS (not surfaced)        | after-hours alert coverage gap absent from all findings                                                            |
| de-03 mf-1 | REAL_MISS (not surfaced as gap) | dead Azure Event Hub connector appears only as a side note inside a strength finding (null severity)               |
| gv-00 mf-2 | REAL_MISS (severity)            | never-tested IR plan surfaced as gap/medium; floor high                                                            |
| gv-02 mf-3 | HARNESS_DEFECT                  | GV.PO-02 risk/medium: 11 of 14 policies last reviewed 2022 or earlier                                              |
| gv-03 mf-1 | HARNESS_DEFECT                  | GV.SC-10 risk/critical: vendor account active 14 months after contract termination                                 |
| id-01 mf-3 | HARNESS_DEFECT                  | ID.AM-08 risk/critical: decommissioned servers/drives awaiting disposal without sanitization records               |
| id-02 mf-1 | HARNESS_DEFECT                  | ID.RA-05 risk/high: enterprise risk assessment 29 months overdue against annual requirement                        |
| id-02 mf-2 | REAL_MISS (severity)            | 29 of 47 treatment plans past due surfaced as gap/medium; floor high (keywords tightened, see `_tuned`)            |
| id-03 mf-1 | HARNESS_DEFECT                  | ID.AM-07 risk/high: no data inventory for PHI stores                                                               |
| pr-00 mf-1 | HARNESS_DEFECT                  | PR.AA-05 risk/critical: required access reviews lapsed                                                             |
| pr-01 mf-1 | HARNESS_DEFECT                  | PR.AA-03 risk/critical: MedChart Classic internet-reachable password-only under exception EX-2021-014              |
| pr-01 mf-2 | HARNESS_DEFECT                  | PR.AA-05 risk/critical: 38 shared generic accounts, passwords unchanged since 2022                                 |
| pr-01 mf-3 | REAL_MISS (no strength)         | zero strength-typed findings; FIDO2/CyberArk noted only inside risk observations                                   |
| pr-02 mf-3 | REAL_MISS (no strength)         | Workday SCIM 15-minute deprovisioning noted only inside a gap observation                                          |
| pr-03 mf-2 | HARNESS_DEFECT                  | PR.DS-02 risk/critical: 41 HL7 interfaces in cleartext over MLLP port 6661                                         |
| pr-03 mf-3 | REAL_MISS (no strength)         | Key Vault Managed HSM / TDE noted only inside a gap observation                                                    |
| rc-01 mf-1 | REAL_MISS (severity)            | failover exercises lapsed 2+ years surfaced as gap/medium; floor high                                              |
| rc-02 mf-1 | PHRASING                        | RC.RP-03 risk/high: "restored ... without scanning for ransomware binaries"; keyword net missed the wording, tuned |
| rc-02 mf-2 | HARNESS_DEFECT                  | RC.RP-05 risk/high: servers returned to clinical production without integrity checks                               |
| rc-03 mf-1 | HARNESS_DEFECT                  | RC.RP-03 risk/high: RESTORE-VERIFY-EHR failing 4 consecutive months                                                |
| rc-03 mf-2 | REAL_MISS (severity)            | DR replication paused 9 weeks surfaced as gap/medium; floor high                                                   |
| rs-01 mf-3 | HARNESS_DEFECT                  | RS.MA-05 risk/high: no criteria for confirming containment before recovery                                         |
| rs-02 mf-3 | HARNESS_DEFECT                  | RS.CO-04 risk/medium: no public communications process for incidents                                               |
| rs-03 mf-1 | HARNESS_DEFECT                  | RS.AN-07 risk/critical: jump server reimaged, forensic evidence unrecoverable                                      |
| rs-03 mf-2 | HARNESS_DEFECT                  | RS.AN-06 risk/high: no investigation log, actions reconstructed from memory                                        |

## How to run

From the Achievements repo root:

```sh
# Validate cases, build prompts, print per-case token estimates. No API calls.
node scripts/studies/bastion-eval/run-eval.mjs --dry-run

# Full run: calls the Anthropic API, scores, writes public/data/bastion-evals.json
node scripts/studies/bastion-eval/run-eval.mjs

# Re-run a single case (substring match on caseId)
node scripts/studies/bastion-eval/run-eval.mjs --only=pr-03

# Ignore the committed responses and re-spend tokens
node scripts/studies/bastion-eval/run-eval.mjs --force

# Re-score the committed responses only: never loads the API key. With the
# private Bastion checkout present, cached response hashes are validated
# against rebuilt prompts; without it, the script falls back to public offline
# scoring from committed responses and case fixtures.
node scripts/studies/bastion-eval/run-eval.mjs --rescore-only
```

Override the Bastion repo location with the `BASTION_REPO` env var if it is not at the default path.

## Raw model responses (committed)

The raw model responses are committed at `responses/<caseId>.json`; re-run the scorer yourself: `node scripts/studies/bastion-eval/run-eval.mjs --rescore-only`. Each file is the unedited first-run Anthropic API response body (a model output over a synthetic fixture; no client data, no secrets), keyed to a sha256 of model id + system prompt + user prompt. Normal eval runs re-derive the prompt, the case's controls, the evidence text, and Bastion's model id from the private Bastion checkout; if any hash changes, the cache is treated as stale and a non-rescore run must refetch. Re-running the harness in `--rescore-only` mode re-scores from the committed responses without re-spending tokens; `--force` bypasses them.

Two honesty notes:

- These files originally lived in a gitignored `.cache/` directory, which made the published numbers impossible to reproduce from the repo. They are now committed, verbatim and unmodified, as the primary evidence behind the artifact.
- The raw first-run artifact (the 1/20 score) was NOT preserved: the scorer was corrected in place before this repo adopted the practice of keeping versioned score artifacts. The 1/20 figure therefore survives only as the scoring review's recorded starting point, not as a regenerable file. What is reproducible: running `--rescore-only` over the committed responses with the current scorer regenerates `public/data/bastion-evals.json` exactly. Rescore-only preserves the existing `generatedAt` timestamp so a clean run can be byte-compared against the committed artifact.

Reproducibility scope: `--rescore-only` never calls the API and can run without the private Bastion repo. If the private checkout is available, it validates committed response hashes against rebuilt prompts before scoring. If the private checkout is unavailable, it automatically falls back to offline scoring: it does not rebuild prompts or validate prompt hashes, but it does re-parse every committed response and re-run the scorer over the committed case files. Full eval, `--dry-run`, and `--force` still require the private Bastion checkout because they rebuild prompts and model provenance.

## Secrets

`ANTHROPIC_API_KEY` is parsed from the private Bastion checkout's `.env.local` at runtime, and ONLY for full eval runs (never for `--rescore-only`, which calls no API). It is never copied to disk, never logged, and stripped from any error output. The harness refuses to write the artifact if the key somehow appears in it.
