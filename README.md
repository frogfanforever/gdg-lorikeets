# 🦜 GDG Lorikeets

> Built to win. Let's take this hackathon. 🏆

Team Lorikeets' toolkit for **Build with AI Wrocław 2026** (GDG Wrocław,
29 Jun – 4 Jul 2026). Two things live here: **intel** about the event (in the
`wiki/` knowledge base) and a clean **eval system** (`ai/evals/`) that scores our
build the way the judges will — so we can evaluate produced code before shipping.

## 🚀 Why we win

- **We know the rubric.** The official judging criteria are scraped and codified in
  the [wiki](wiki/hackathon/Judging%20Criteria.md): 100 pts = 5 pillars × 20 + a
  Criterion Zero gate.
- **We measure, not guess.** A runnable [eval scoreboard](ai/evals/) grades the
  project deterministically (WCS for AI-code quality, API acceptance tests for the
  backend).
- **AI-first, ship-ready.** Clean `.jsonl` pipelines plug straight into model/agent
  workflows; modular integrations under `ai/integrations/`.

## 📁 Structure

```
ai/
  evals/              the eval system (mirrors the judging rubric) — clean, run-ready
    rubric.jsonl      machine-readable criteria + points
    scoreboard.py     runnable 0–100 scorer (Criterion Zero gate + 5 pillars)
    criteria/*.md     one doc per criterion (checks, evidence, LLM-judge prompt)
    wcs/              vendored web-codegen-scorer harness (AI-code quality)
    wcs_to_scores.py  WCS report → eval ratings
    datasets/         API acceptance data (nan-stack users/orders)
    api_eval.py       runs the API dataset → eval ratings
  integrations/
    discord/          community-signal scraper → .jsonl
wiki/                 knowledge base (Obsidian vault) — the single source of context
  Home.md             start here: map of the hackathon intel + eval system
  hackathon/          event, rubric, tech stack, people, competitors, playbook
  evals/              navigation notes for the eval system
  data/*.jsonl        categorized structured facts
  discord/            Discord server metadata + how to pull full history
```

## 🏗️ Architecture

`solvermaster/` is the app itself — an Nx monorepo. The browser talks to the
backend over a single Socket.io channel; the backend runs a LangGraph "Deep
Agent" in-process, which drives the UI via `show_*` tools and looks up TRIZ data
from a stateless pytriz engine over HTTP.

```
          +--------------------------------------------------+
          | Browser: Angular 19 SPA (frontend)               |
          |                                                  |
          |  Problem -> Metody -> Analiza -> Shortlist       |
          |                         -> Wynik                 |
          |                                                  |
          |  SessionStore (signals) + SocketService          |
          +-------------------------+------------------------+
                                    |
                                    | WebSocket (Socket.io)
                 solve:start ------>|<------ ui:show / solve:done/error
                                    v
          +--------------------------------------------------+
          | solver-api: NestJS (port 8080)                   |
          |                                                  |
          |  +----------------+     +----------------------+ |
          |  | SolverGateway  |---->| AgentRunnerService   | |
          |  | websocket API  |     | fire-and-forget run  | |
          |  +-------+--------+     +----------+-----------+ |
          |          ^                         |             |
          |          | show_* tools emit       | builds + invokes
          |          | ui:show events          v             |
          |  REST: /runs /sessions /reference                |
          +----------+-------------------------+-------------+
                     |                         |
                     |                         v
                     |      +----------------------------------+
                     |      | solver-agent: LangGraph          |
                     |      | Deep Agent orchestrator          |
                     |      |                                  |
                     |      |  - parameter-mapper              |
                     |      |  - principle-finder              |
                     |      |  - solution-synthesizer          |
                     |      +------------+---------------------+
                     |                   |
                     |                   +------------------+
                     |                   |                  |
                     |                   | TRIZ tools       | LLM calls
                     |                   | HTTP             |
                     |                   v                  v
                     |      +----------------------------+   +----------------------+
                     |      | pytriz engine              |   | Google Gemini API    |
                     |      | /analyze                   |   | @langchain/          |
                     |      | /matrix/cell               |   | google-genai         |
                     |      | /recommend                 |   +----------------------+
                     |      | /parameters                |
                     |      | /principles                |
                     |      | 39 params, 40 principles   |
                     |      +----------------------------+
                     |
                     +------> frontend stepper updates
```

**Flow.** The FE emits `solve:start` once (first "Dalej"). The gateway kicks off
the agent fire-and-forget and acks the `sessionId`. As the agent runs, its
`show_*` UI tools stream `ui:show` directives back over the socket — the FE
navigates the stepper and renders each screen. TRIZ tools (`search_parameter`,
`browse_contradiction_matrix`, …) call the pytriz engine; if it's unavailable
the agent falls back to its own TRIZ knowledge. On completion the backend emits
`solve:done` with the final session snapshot.

## ⚡ Quick start

**Score the project against the rubric**
```bash
cd ai/evals
python scoreboard.py --template > scores.json   # blank sheet of every check
python scoreboard.py scores.json                # print the scoreboard
```

**Measure AI-code quality (WCS)** — needs a Gemini API key
```bash
cd ai/evals/wcs && npm install
export GOOGLE_GENERATIVE_AI_API_KEY=your_key
./run-task.sh 9                                  # fullRatings bar
cd .. && python wcs_to_scores.py wcs/.web-codegen-scorer/reports/stage-9 --merge scores.json
```

**Measure the fullstack backend (API acceptance)**
```bash
cd ai/evals
python api_eval.py --dry-run                     # validate offline
python api_eval.py --base-url http://localhost:3000 --merge scores.json
```

**Scrape community signal (Discord)**
```bash
cd ai/integrations/discord
pip install -r requirements.txt
export DISCORD_BOT_TOKEN="your-token"
python scraper.py --out messages.jsonl
```

## 📚 Learn the repo

Open `wiki/` as an [Obsidian](https://obsidian.md) vault and start at **`Home.md`** —
the single, interlinked source of context for the hackathon. The eval tooling lives
in `ai/evals/` (each criterion documented under `ai/evals/criteria/`).

## 💪 Team Lorikeets — let's fly

Heads down, ship fast, demo loud. We didn't come here to participate.
**We came here to win.** 🥇
