# Eval 05 — Deployment, Scale & Optimization (Day 5)

**Rubric id:** `p5` · **Type:** scored · **Max:** 20 pts · **Judge:** Marek Mysior

## Checks
| id | check | pts |
|----|-------|-----|
| p5.1 | Deployed live and reachable on **Google Cloud Run** | 6 |
| p5.2 | **CI/CD** pipeline (Cloud Build / Artifact Registry) | 4 |
| p5.3 | **MCP server** built and/or integrated | 4 |
| p5.4 | Scalability: stateless services, managed **Cloud SQL** | 3 |
| p5.5 | Performance optimization (bundle, caching, cold-start) | 3 |

## Evidence to collect
- **p5.1** — the public Cloud Run URLs, live during judging. Measure
  deterministically: `python deploy_eval.py --frontend-url … --backend-url …
  --mcp-url …/mcp --merge scores.json` (probes reachability; add `--gate` as a
  post-deploy check). Reference topology: 4 Cloud Run services (Angular/Nginx →
  NestJS/Prisma → ADK agent → MCP) — see the wiki `GCP Deployment` note.
- **p5.2** — CI/CD config: `cloudbuild.yaml` (builds+pushes all 4 images to
  Artifact Registry with BuildKit) and the `Makefile` `build-*` / `deploy-*`
  targets (`gcloud builds submit` / `gcloud run deploy`). Not manual `docker push`.
- **p5.3** — the MCP server (repo + a call to one of its tools). Measure
  deterministically: `python mcp_eval.py --url <…/mcp> --merge scores.json`
  (dataset `datasets/triz-mcp/`; reference server = TRIZ MCP / pytriz).
- **p5.4** — Cloud SQL (Postgres 15) via `--add-cloudsql-instances` socket / Auth
  Proxy; note statelessness (services carry no local state; Prisma `db push` on boot).
- **p5.5** — `--min-instances=1` (warm) + MCP 2Gi for cold-start; Cloud Logging
  for observability; before/after perf numbers (bundle size, TTFB, cold-start).

## LLM-judge prompt
```
Act as a cloud/DevOps judge. Score p5.1–p5.5 from 0..1. p5.1 is binary-ish: a
working public Cloud Run URL or near-zero. Require real CI/CD config, not manual
deploys. EVIDENCE: <paste URL, config, metrics>. Return JSON {"p5.1":0..1, ...}.
```

## Highest-leverage single check in the whole rubric
p5.1 alone is **6 pts** — the biggest single check. A live deployed URL beats a
localhost demo every time, and it also props up Criterion Zero ("genuinely
working"). **Deploy on Day 4/5, not in the last hour**, then redeploy often via
CI/CD. Marek Mysior owns this pillar.
