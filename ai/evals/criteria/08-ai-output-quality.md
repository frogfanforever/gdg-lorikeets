# Eval 08 — AI Output Quality / deep Criterion Zero (ADDITIONAL)

**Rubric id:** `x3` · **Type:** advisory, but it is the *measurement* behind gate
check `c0.3` ("outputs are substantively correct and sensible") and scored check
`p4.5`. **Scored with WCS (web-codegen-scorer)** — deterministic, reproducible,
0–100, not a hand-wave.

## Why WCS
`web-codegen-scorer` generates a web app from a task prompt with a chosen model
(e.g. `gemini-2.5-flash`) and scores the result **0–100** using deterministic
ratings. It writes a `summary.json` per run. That score *is* our AI-output-quality
measurement — it directly evidences that the AI produces correct, high-quality
code for the domain.

## Score against `fullRatings` (the full bar)
Run WCS with the repo's **`fullRatings`** set, not the baseline
`getBuiltInRatings()`. `fullRatings` (`env/ratings/index.mjs`) =
all 13 custom Angular ratings (angular-eslint, input/output, no-mutate-on-signals,
pure-state-transformations, reactive, no-route-snapshot, formatting,
change-detection, standalone, model-declaration-kind, model-purity, forms,
service-decorator) **+ `axeRating` (accessibility) + `successfulBuildRating`**.
It's wired into **stage 9/10** (`config.s9.mjs` / `config.s10.mjs`).

Bonus: because `fullRatings` includes **axe**, the same run also yields an
accessibility signal that informs pillar 2 (`p2.3`/`p2.4`).

## Checks (scored from a WCS run)
| id | check | WCS source |
|----|-------|------------|
| x3.1 | A representative **test set** with acceptance criteria exists | the WCS tasks (`tasks/*.md`) + ratings config define it |
| x3.2 | **Automated pass-rate** measured | aggregate `Σ totalPoints / Σ maxOverallPoints` across tasks |
| x3.3 | **Failure modes** documented & mitigated | build-success rate + the per-assessment failures WCS lists |

## Run it (fullRatings)
The WCS harness is vendored into this repo at `ai/evals/wcs/` (see its README).
```bash
cd ai/evals/wcs
npm install                                        # first time (installs web-codegen-scorer)
export GOOGLE_GENERATIVE_AI_API_KEY=your_key       # aistudio.google.com/apikey
./run-task.sh 9                                     # stage 9 = fullRatings, axe ON
# under the hood: npx wcs eval --env env/config.s9.mjs \
#   --runner ai-sdk --model gemini-2.5-flash --skip-screenshots --skip-ai-summary --skip-lighthouse
```
WCS writes the run to `ai/evals/wcs/.web-codegen-scorer/reports/stage-9/<timestamp>/summary.json`.
(Stage 10 is the same bar with a local-Ollama fixer; needs `ollama` running.)

## Turn the WCS score into eval ratings
`wcs_to_scores.py` reads a WCS report and emits/merges the `x3.*` ratings:

```bash
cd ai/evals
# point at the fullRatings run (stage-9); it finds the newest summary.json there:
python wcs_to_scores.py wcs/.web-codegen-scorer/reports/stage-9
# write x3.* straight into your scores file, then score the board:
python wcs_to_scores.py wcs/.web-codegen-scorer/reports/stage-9 --merge scores.json
python scoreboard.py scores.json
```
> Pass the specific `stage-9` dir so a leftover baseline run isn't picked instead.
> `wcs_to_scores.py` is rating-agnostic — it aggregates whatever ratings the run
> used, so `fullRatings` (incl. axe) flows through automatically.

Mapping used:
- **x3.1 = 1.0** if the run has ≥1 task (a test set was defined and executed).
- **x3.2 = Σ totalPoints / Σ maxOverallPoints** (the deterministic 0–100 score, as
  a fraction) — the headline AI-output-quality number.
- **x3.3 = build-success rate**, and the script lists every assessment with
  `successPercentage < 1` so you can document and fix the specific failure modes.

## Example (real WCS run, `gemini-2.5-flash`)
Illustrative run (earlier stage; a `fullRatings` stage-9 run also folds in axe):
```
tasks 5 · score 479/500 = 96% · build success 100%
failing assessments: Angular ESLint (full standard) on 4/5 tasks (70–90%)
=> x3.1=1.0  x3.2=0.958  x3.3=1.0
```
The 96% is the evidence to the "Client": the AI reliably produces correct,
lint-clean Angular. Under `fullRatings` the same run also reports the **axe (a11y)**
gate, so `x3.2` reflects accessibility too. Remaining gaps are the documented,
fixable failure modes (x3.3).

## Why it wins
Criterion Zero is a **gate** — the biggest risk to the whole score. A WCS-measured
pass-rate is the strongest possible evidence that the product actually works, it's
reproducible in front of judges, and it doubles as the Day-4 evaluation-scoreboard
deliverable (`p4.5`). Show the WCS 0–100 on stage.
