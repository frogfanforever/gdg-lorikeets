# 🦜 GDG Lorikeets

> Built to win. Let's take this hackathon. 🏆

An AI-powered platform that turns scattered community chatter into actionable
insight. We ingest signals from where people actually talk — starting with
Discord — and feed them into AI pipelines that surface what matters.

## 🚀 Why We Win

- **Real data, real fast.** Our Discord integration scrapes live community
  signal in minutes, not hours.
- **AI-first architecture.** Clean `.jsonl` output plugs straight into any
  model or agent pipeline.
- **Ship-ready.** Modular integrations under `ai/integrations/` mean we add new
  data sources without touching the core.

## 🗺️ Hackathon Agenda

Let's move with intent. Here's the plan to the podium:

| Phase | Goal | Win Condition |
|-------|------|---------------|
| **1. Connect** | Wire up data sources (Discord ✅) | Live data flowing into `.jsonl` |
| **2. Enrich** | Run AI over scraped signal | Summaries, sentiment, trends |
| **3. Demo** | Build a jaw-dropping demo | Judges lean forward |
| **4. Pitch** | Tell the story that lands | Standing ovation, first place |

## 📁 Structure

```
ai/
  integrations/
    discord/      # Discord scraper — see its README
```

## ⚡ Quick Start

```bash
cd ai/integrations/discord
pip install -r requirements.txt
export DISCORD_BOT_TOKEN="your-token"
python scraper.py --out messages.jsonl
```

## 💪 Team Lorikeets — Let's Fly

Heads down, ship fast, demo loud. We didn't come here to participate.
**We came here to win.** 🥇
