# 🧪 Evaluation Suite — Build with AI 2026

Evals that mirror the **official judging rubric** (see
`../context/hackathon/judging-criteria.md`): the **Criterion Zero** gate + **5
pillars × 20 pts = 100**, plus advisory evals for pitch, demo reliability, and AI
output quality. This is our own "evaluation scoreboard" (the Day-4 skill) turned
on ourselves — score the project the way the judges will, find the gaps, fix them
before the finale.

## Layout

```
ai/evals/
  README.md                 ← this file
  rubric.jsonl              ← machine-readable criteria + checks + points
  scoreboard.py             ← runnable scoreboard (stdlib only)
  wcs_to_scores.py          ← bridge: WCS report → eval-08 (x3.*) ratings
  scores.example.json       ← sample self-assessment (copy to scores.json)
  api_eval.py               ← runs an API acceptance dataset → c0/p4 ratings
  mcp_eval.py               ← runs an MCP tool acceptance dataset → p5.3 rating
  deploy_eval.py            ← probes live Cloud Run endpoints → p5.1 rating
  be_eval.py                ← runs the solver-BE acceptance dataset → c0/p4.1 ratings
  wcs/                      ← vendored web-codegen-scorer harness (powers eval 08)
  datasets/
    nan-stack/              ← API acceptance data (users/orders) for eval 04 + c0
    triz-mcp/               ← MCP tool acceptance data (TRIZ server) for eval 05 (p5.3)
    solver-be/              ← solver BE acceptance data (define problem → contradictions)
  criteria/
    00-criterion-zero.md    ← the gate
    01-product-design-mvp.md
    02-uiux-a11y.md
    03-angular-nx-debugging.md
    04-fullstack-architecture-llm.md
    05-deployment-scale-optimization.md
    06-pitch-client-investor.md      (additional)
    07-demo-reliability.md           (additional)
    08-ai-output-quality.md          (additional — deep Criterion Zero)
```

## How to use

```bash
cd ai/evals
python scoreboard.py --template > scores.json   # blank sheet of every check
# edit scores.json: rate each check 0..1 (gate checks must be 1 to pass)
python scoreboard.py scores.json                # print the scoreboard
python scoreboard.py scores.json --md report.md # also emit a markdown report
```

Ratings are `0..1` per check id. For scored checks, earned = `points × rating`.
For the **gate**, every `c0.*` must be `1` or the total is **void** (Criterion
Zero: a great-looking app that doesn't solve the assigned task is disqualified).

## Scoring model

| Kind       | Counts toward 100? | Meaning                                      |
|------------|--------------------|----------------------------------------------|
| `gate`     | no (pass/fail)     | Must pass or score is void                    |
| `scored`   | yes                | 5 pillars, 20 pts each                         |
| `advisory` | no                 | Tie-breakers & framing (pitch, demo, AI eval) |

## Three ways to fill scores
- **Self-assessment** — the team rates honestly. Fast, subjective.
- **LLM-judge** — feed each criterion's judge prompt (in `criteria/*.md`) plus
  evidence (repo, screenshots, live URL) to a model and have it return the
  rating. Repeatable and closer to how the panel will reason. The `criteria/`
  files contain ready-to-paste judge prompts.
- **WCS (deterministic)** — eval 08 (`x3.*`) is scored by
  [web-codegen-scorer](https://www.npmjs.com/package/web-codegen-scorer), which
  generates and grades AI web code 0–100. Use the repo's **`fullRatings`** bar
  (all custom Angular ratings + axe a11y + build) via **stage 9**:
  ```bash
  ( cd wcs && npm install && ./run-task.sh 9 )   # GOOGLE_GENERATIVE_AI_API_KEY required
  python wcs_to_scores.py wcs/.web-codegen-scorer/reports/stage-9 --merge scores.json
  python scoreboard.py scores.json
  ```
  The WCS harness is vendored at `wcs/` (see `wcs/README.md`).
  See `criteria/08-ai-output-quality.md` for the full loop.
- **API acceptance (deterministic)** — eval 04 (`p4.2`) and the Criterion Zero
  gate (`c0.3`, `c0.4`) can be measured against a running NestJS/Sequelize API
  with `api_eval.py` + `datasets/nan-stack/`:
  ```bash
  python api_eval.py --base-url http://localhost:3000 --merge scores.json
  python scoreboard.py scores.json
  ```
- **MCP acceptance (deterministic)** — eval 05 (`p5.3`, MCP server) can be
  measured against a running TRIZ MCP server (FastMCP + pytriz) with `mcp_eval.py`
  + `datasets/triz-mcp/`. Point `--url` at the local or Cloud Run `/mcp` endpoint:
  ```bash
  python mcp_eval.py --url http://localhost:8123/mcp --merge scores.json
  python mcp_eval.py --include-embeddings   # also run the semantic-search tools
  python scoreboard.py scores.json
  ```
- **Deploy reachability (deterministic)** — eval 05 (`p5.1`, live on Cloud Run)
  can be measured against the deployed stack (Cloud Build CI/CD → Cloud Run, per
  the workshop's `gcp-deploy` branch) with `deploy_eval.py`. Pass whichever
  service URLs you have:
  ```bash
  python deploy_eval.py --frontend-url https://…run.app \
    --backend-url https://…run.app --mcp-url https://…run.app/mcp \
    --merge scores.json --gate
  python scoreboard.py scores.json
  ```

> These evals are our internal preparation instrument. The real scores come from
> the panel (Perdek, Romański, Mysior) acting as Client + Investor.
