# 🦜 Hackathon Context Corpus

Structured, categorized intelligence for winning **Build with AI Wrocław:
Architecting the Future of Products** (GDG Wrocław, 29 Jun – 4 Jul 2026).

Assembled 2026-07-02 (Day 4 of the event). Two source types:

1. **Web** — GDG Wrocław agenda pages on `gdg.community.dev`.
2. **Discord** — the official `Built with AI - Hackathon` server (invite
   `discord.gg/ntJnE5xhw`). Public server metadata captured; full message
   history requires the bot token — see `discord/SCRAPING.md`.

## 📂 Layout

```
ai/context/
  README.md                        ← you are here (index)
  hackathon/
    build-with-ai-2026.md          ← THE focus event: full 6-day agenda
    judging-criteria.md            ← OFFICIAL rubric (100 pts, scraped Discord)
    competitors.md                 ← competing teams + rosters (scraped Discord)
    tech-stack.md                  ← required stack, cheat-sheet form
    people.md                      ← trainers, judges, facilitators, sponsors
    winning-playbook.md            ← strategy (confirmed against the rubric)
  discord/
    server-metadata.json           ← captured server info
    SCRAPING.md                    ← how to pull full message history
  data/
    events.jsonl                   ← one record per scraped GDG event
    items.jsonl                    ← every scraped fact, individually categorized
```

## 🏷️ Category taxonomy (used in `data/items.jsonl`)

| category      | meaning                                             |
|---------------|-----------------------------------------------------|
| `event`       | a whole event / meetup                              |
| `schedule`    | a day or time-block within an event                 |
| `session`     | a talk / workshop topic                             |
| `person`      | trainer, judge, organizer, facilitator, speaker     |
| `tech`        | framework, tool, language, cloud service            |
| `venue`       | physical location                                   |
| `sponsor`     | partner / sponsor / co-host                         |
| `challenge`   | hackathon problem statement / deliverable           |
| `community`   | Discord / social channel                            |
| `resource`    | external link / material                            |

## 🎯 Bottom line for the team

Today (2 Jul) is **Day 4 — Fullstack, Architecture & LLM Engineering**. The
Grand Hackathon is **4 Jul**. The winning build must visibly exercise the taught
stack — **Angular (Nx) + NestJS + SQL + MCP servers + Gemini on Google Cloud
Run** — because **the judges are the trainers** (see `winning-playbook.md`).
