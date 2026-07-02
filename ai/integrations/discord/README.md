# Discord Integration

Connects to Discord via a bot token and scrapes message data from accessible
guilds and channels into newline-delimited JSON (`.jsonl`) for downstream AI
processing.

## Setup

1. Create a bot at the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **Bot → Privileged Gateway Intents**, enable **Message Content Intent**.
3. Invite the bot to your server with the `Read Messages/View Channels` and
   `Read Message History` permissions.
4. Install dependencies and configure the token:

```bash
pip install -r requirements.txt
cp .env.example .env   # then edit .env, or just export the var
export DISCORD_BOT_TOKEN="your-token"
```

## Usage

```bash
# Scrape all accessible guilds (up to 1000 msgs/channel)
python scraper.py --out messages.jsonl

# Restrict to one guild, cap messages per channel
python scraper.py --guild 123456789012345678 --limit 500 --out messages.jsonl
```

## Output

Each line is a JSON object with: `message_id`, `channel_id`, `channel_name`,
`guild_id`, `author_id`, `author_name`, `is_bot`, `content`, `created_at`
(UTC ISO-8601), `attachments`, and `reactions`.
