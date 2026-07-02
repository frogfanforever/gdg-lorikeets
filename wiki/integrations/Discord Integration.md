---
tags: [integration, tool]
---

# Discord Integration

Scrapes message data from the hackathon Discord into newline-delimited JSON
(`.jsonl`) for downstream AI pipelines. Lives in `ai/integrations/discord/`.

- `scraper.py` — connects via a **bot token**, walks accessible guilds/channels,
  writes one JSON object per message (author, content, timestamps, reactions…).
- Requires the **Message Content Intent** and the bot invited with *Read Message
  History*.

## How the hackathon intel was gathered
The [[Judging Criteria]] rubric and [[Competitors]] roster were read live from the
**Built with AI - Hackathon** server via the Chrome DevTools MCP driving a
logged-in session (DOM snapshots). Full history export still needs the bot-token
scraper — see `wiki/discord/SCRAPING.md`. Captured server metadata:
`wiki/discord/server-metadata.json`.

## Usage
```bash
cd ai/integrations/discord
pip install -r requirements.txt
export DISCORD_BOT_TOKEN="your-token"
python scraper.py --guild 1511768442070499399 --limit 1000 --out messages.jsonl
```

## Why it matters for the win
It's a ready-made **data source + eval substrate** for the LLM-engineering pillar:
community signal → `.jsonl` → Gemini agent → evaluation scoreboard. See
[[Winning Playbook]].

See also: [[Project Overview]] · [[Home]]

#integration #tool
