# nan-stack — API acceptance eval dataset

Eval **data** derived from the `nan-stack` reference app (an Nx workspace with a
**NestJS + Sequelize + Postgres** API and an Angular Material frontend). It's the
best-matched data for **eval 04 (Fullstack/NestJS)** and the **Criterion Zero**
gate — it measures whether the fullstack app actually returns correct, sensible
results end-to-end.

**Source:** `~/nan-stack` (github.com/kowalskia02/nan-stack), read 2026-07-02.
Cases are pinned to its seed data (`docker/init/02-seed.sql`): 4 users, 10 orders.

## The domain
```
users(id, name, surname, birth_year, email)          # 4 seeded
orders(id, user_id, product_name, quantity, amount)  # 10 seeded, FK user_id -> users
```
API base `http://localhost:3000/api` — `/user` and `/order` (CRUD + `/user/search`,
Swagger at `/api`, global ValidationPipe).

## Files
- `api-cases.jsonl` — 16 acceptance cases (list/by-id/404/search/validation/
  relational-integrity/create). 5 are `mutating` (POST) and skipped by default.

Each line:
```json
{"id","evals":["c0","p4"],"desc","method","path","body"?,"mutating"?,
 "expect":{"status",count?,where?,where_count?,contains?,equals?}}
```

## Run it
```bash
cd ai/evals
python api_eval.py --dry-run                 # validate offline (no API needed)

# with the API up (in ~/nan-stack: npm run start:db && npm run start:api):
python api_eval.py --base-url http://localhost:3000
python api_eval.py --include-mutating        # also exercise POST cases
python api_eval.py --merge scores.json       # write c0/p4 ratings, then:
python scoreboard.py scores.json
```

## How it maps to evals
| Rating | Meaning | Derived from |
|--------|---------|--------------|
| `c0.3` | outputs substantively correct | pass-rate of positive (non-4xx) cases |
| `c0.4` | works end-to-end | overall pass-rate |
| `p4.2` | SQL/Sequelize data layer correct | pass-rate of p4-tagged cases |

Relational-integrity cases (`o-for-user-1`, `o-for-user-3`) and validation cases
(`u-create-bad-email`, `o-create-bad-quantity`) are the highest-signal: they prove
the FK wiring and the DTO/ValidationPipe actually work — direct Criterion Zero
evidence for a fullstack submission.
