---
tags: [project]
---

# Project Overview

**gdg-lorikeets** turns scattered community chatter into actionable insight and
scores our hackathon build the way the judges will. Built by **Team Lorikeets**
for [[Build with AI 2026]].

## Repo map
```
ai/
  context/        scraped hackathon intel → see [[Build with AI 2026]], [[Judging Criteria]]
  evals/          the eval system → see [[Eval Suite]]
    criteria/     one doc per rubric criterion
    wcs/          vendored web-codegen-scorer → [[WCS]]
    datasets/     API acceptance data → [[API Acceptance Eval]]
  integrations/
    discord/      community scraper → [[Discord Integration]]
wiki/             this Obsidian vault
```

## The three moving parts
1. **Intel** — everything about the event, scraped from GDG web pages + the
   hackathon Discord. Start at [[Build with AI 2026]].
2. **Evals** — a scoreboard mirroring the [[Judging Criteria]] so we can measure,
   not guess. Start at [[Eval Suite]].
3. **Integrations** — data sources feeding the AI pipeline. See
   [[Discord Integration]].

## Ethos
Real data, AI-first, ship-ready. Clean `.jsonl` output plugs straight into model
pipelines — which is also our edge on the [[Tech Stack|LLM-engineering pillar]].

See also: [[Winning Playbook]] · [[Home]]

#project
