# Scraping the Hackathon Discord

Target server: **Built with AI - Hackathon** (`guild_id 1511768442070499399`),
invite `https://discord.gg/ntJnE5xhw`. 76 members, day-organized channels
(e.g. `dzien-4-rozmowy`).

## What we already have
Public server metadata (name, member/online counts, landing channel) via the
unauthenticated invite API — see `server-metadata.json`. That endpoint returns
**no messages**.

```bash
curl -s "https://discord.com/api/v10/invites/ntJnE5xhw?with_counts=true&with_expiration=true"
```

## What's needed for full message history
An invite link ≠ credentials. The existing scraper
(`ai/integrations/discord/scraper.py`) needs a **bot** in the server:

1. Create a bot at https://discord.com/developers/applications.
2. Enable **Message Content Intent** (Bot → Privileged Gateway Intents).
3. Invite the bot to the server with **View Channels** + **Read Message History**.
   > Requires a server admin to authorize the invite. Coordinate with the
   > organizers (Luka Malakhau / Karol Wrótniak) or an admin on the server.
4. Run:

```bash
cd ai/integrations/discord
pip install -r requirements.txt
export DISCORD_BOT_TOKEN="your-bot-token"
python scraper.py --guild 1511768442070499399 --limit 1000 \
  --out ../../context/discord/messages.jsonl
```

Output is one JSON object per line: `message_id`, `channel_id`, `channel_name`,
`guild_id`, `author_id`, `author_name`, `is_bot`, `content`, `created_at`,
`attachments`, `reactions`.

## Highest-value channels to read once scraped
- `dzien-4-rozmowy` and other `dzien-N-*` channels — live Q&A per day.
- Any `#rules`, `#announcements`, `#ogłoszenia`, `#challenge`, `#jury` channel —
  most likely to hold the unknowns (challenge statement, judging criteria,
  prizes, deliverables) flagged in `../hackathon/build-with-ai-2026.md`.

## After scraping
Feed `messages.jsonl` into the same categorization schema as
`../data/items.jsonl` (categories: challenge, schedule, resource, community, …)
so Discord facts merge cleanly with the web-scraped corpus.
