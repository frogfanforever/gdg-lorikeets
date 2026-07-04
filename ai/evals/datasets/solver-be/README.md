# solver-be — BE acceptance eval dataset

Cases for the **solver BE MVP** (`ai/solver/service`) — endpoint 1: define a problem →
a contradiction per available method. Best-matched to **Criterion Zero** (`c0.3`,
`c0.4`) and **pillar 4** (`p4.1`, backend wired/working).

## Files
- `cases.jsonl` — 9 acceptance cases: health, methods list, create-run (per-method
  contradictions), get-run (recorded steps + metadata), TRIZ-only, and the negative
  cases (missing statement `400`, unknown method `422`, TRIZ omitted `422`, unknown
  run `404`).

Each line:
```json
{"id","evals":["c0","p4"],"method","path","body"?,"capture"?:{ctxKey:dottedPath},
 "expect":{"status", json_has?, equals?, methods_include?, per_method_contradictions?}}
```
`path` is templated with a running context, so `create-run` captures the new `run_id`
and `get-run` uses `/runs/{run_id}`.

## Run it
```bash
cd ai/evals
python be_eval.py --dry-run                         # validate offline
# with the service up (python -m ai.solver.service):
python be_eval.py --base-url http://localhost:8080 --gate
python be_eval.py --merge scores.json && python scoreboard.py scores.json
```

## How it maps to evals
| Rating | Meaning | Derived from |
|--------|---------|--------------|
| `c0.3` | outputs substantively correct | pass-rate of positive (2xx) cases |
| `c0.4` | works end-to-end | overall pass-rate |
| `p4.1` | backend wired & working | overall pass-rate |

The highest-signal case is `create-run` + `get-run`: they prove the contradiction is
produced **per method** *and* persisted as an inspectable `StepResult` (with timing/
metadata) — direct Criterion-Zero evidence that the reasoning is real logic, not a
single prompt.
