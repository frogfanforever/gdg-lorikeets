# 🏆 Winning Playbook — Build with AI 2026

Derived from the agenda, the tech stack, the judge roster, and — now — the
**official rubric scraped from Discord** (`judging-criteria.md`). The core bet
below is no longer a hypothesis: the rubric confirms it.

## ✅ Confirmed rubric (see judging-criteria.md)
100 pts = **5 pillars × 20**, one per workshop day (Product/MVP · UI/UX+A11Y ·
Angular/Nx/Debug · Fullstack/LLM · Deployment). Plus **Criterion Zero**: the app
must actually solve its assigned domain task or it's disqualified before scoring.
Panel judges as **Client + Investor**.

## The core bet — CONFIRMED
**The judges are the trainers, and points are split evenly across their days.**
Reward a product that demonstrably uses what they each taught. Balance across all
5 pillars beats specialization — a frontend-only team caps at ~80 and risks
Criterion Zero.

- **Dawid Perdek (Day 1 — Product):** open with a crisp persona + problem
  statement + scoped MVP. Show the BPMN / Event Storming artifact.
- **Adrian Romański (Day 3 — Frontend):** ship a clean Nx monorepo, signal-based
  Angular, and use ng-diagram for something real (not decorative).
- **Marek Mysior (Day 5 — Deploy):** deploy live to Cloud Run via CI/CD. A
  working public URL beats a localhost demo every time.

## The demo must show all three pillars
1. **Product thinking** — one real user, one real problem, tight scope.
2. **AI-native build** — Gemini + MCP server + an autonomous agentic loop, with
   an **evaluation scoreboard** proving output quality. This is the "Build with
   AI" thesis; skipping it is disqualifying in spirit.
3. **Real deployment** — Angular (Nx) + NestJS + Cloud SQL, live on Cloud Run.

## Differentiators that map to taught material
- **Evaluation scoreboard** (Day 4): most teams will hand-wave AI quality. A
  visible eval harness scoring your agent's output is a rare, judge-pleasing
  proof point — and it's literally what Lorikeets already build (`.jsonl`
  pipelines fit this perfectly).
- **MCP server** (Day 2 & 5): expose your own tool via MCP rather than just
  calling an API. It's the throughline of the whole week.
- **Accessibility** (Day 2): a quick a11y pass is cheap and few will bother.

## Time-boxed plan for 4 Jul (Grand Hackathon)
1. **First 30 min:** lock persona + problem + MVP scope (Day 1 method).
2. Scaffold Nx workspace; Angular app + NestJS API + Sequelize/Cloud SQL.
3. Stand up the MCP server + Gemini agent loop early; wire eval scoreboard.
4. Deploy to Cloud Run on CI/CD *by mid-afternoon* — deploy once, redeploy often.
5. **Last hour:** rehearse a 3-pillar pitch (Product → AI → Deploy), name-drop
   the methods and tools each judge taught.

## Open questions to resolve NOW (via Discord `dzien-4-rozmowy`)
- What is the actual challenge / theme for Day 6?
- Judging criteria + weights? Demo length? Required deliverables (repo, URL)?
- Team size cap? Are teams fixed from Day 1 or re-formed for the hackathon?

## Our edge (Team Lorikeets)
The repo already ships a modular ingestion pipeline to `.jsonl`
(`ai/integrations/`). That is a ready-made **data source + eval substrate**:
Discord/community signal → `.jsonl` → Gemini agent → evaluation scoreboard.
Lead the pitch with a working data pipeline, not a slideware idea.
