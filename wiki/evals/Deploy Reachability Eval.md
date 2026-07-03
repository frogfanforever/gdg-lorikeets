---
tags: [eval, tool, cloud]
aliases: [deploy_eval, deploy reachability]
---

# Deploy Reachability Eval

Measures **live deployment** (pillar 5, check `p5.1` — "deployed live and reachable
on Cloud Run", the single biggest check at **6 pts**) by probing the deployed
endpoints of the [[GCP Deployment|gcp-deploy stack]].

> 📄 **Canonical:** runner `ai/evals/deploy_eval.py` (pure stdlib, no dataset —
> endpoints are per-deploy, passed as flags).

- Pass any subset of `--frontend-url` / `--backend-url` / `--mcp-url` /
  `--agent-url`; only those are checked. An endpoint is **reachable** if it
  answers with HTTP `< 500` (200/404/405 all prove the service is live). The MCP
  URL additionally gets a real `initialize` handshake.
- `--tls-check` also requires https; `--merge` writes `p5.1` (add `--set-c0` to
  also set `c0.4`); `--gate` exits non-zero if any endpoint is down (drop-in
  post-deploy CI check).

```bash
python deploy_eval.py \
  --frontend-url https://buildwithai-frontend-xxxx.a.run.app \
  --backend-url  https://buildwithai-backend-xxxx.a.run.app \
  --mcp-url      https://triz-mcp-server-xxxx.a.run.app/mcp \
  --merge scores.json --gate
python scoreboard.py scores.json
```

Pair it with the [[MCP Acceptance Eval]] (`p5.3`) for a two-check deterministic
read on pillar 5.

See also: [[Eval Suite]] · [[MCP Acceptance Eval]] · [[GCP Deployment]] · [[Home]]

#eval #tool #cloud
