"""Discord scraper.

Connects to Discord via a bot token and scrapes message information from
guilds/channels the bot has access to. Results are written to newline-delimited
JSON so they can be fed into downstream AI pipelines.

Usage:
    export DISCORD_BOT_TOKEN="your-token"
    python scraper.py --guild 123456789 --limit 500 --out messages.jsonl

Requires a bot with the "Message Content Intent" enabled in the Discord
Developer Portal (https://discord.com/developers/applications).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Optional

try:
    import discord
except ImportError:  # pragma: no cover
    sys.exit("Missing dependency. Run: pip install -r requirements.txt")


@dataclass
class ScrapedMessage:
    message_id: int
    channel_id: int
    channel_name: str
    guild_id: Optional[int]
    author_id: int
    author_name: str
    is_bot: bool
    content: str
    created_at: str
    attachments: list[str]
    reactions: list[str]


class ScraperClient(discord.Client):
    def __init__(
        self,
        *,
        target_guild: Optional[int],
        limit: int,
        out_path: str,
        **kwargs,
    ) -> None:
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        super().__init__(intents=intents, **kwargs)
        self.target_guild = target_guild
        self.limit = limit
        self.out_path = out_path
        self.scraped = 0

    async def on_ready(self) -> None:
        print(f"Connected as {self.user} (id={self.user.id})", file=sys.stderr)
        guilds = [g for g in self.guilds if not self.target_guild or g.id == self.target_guild]
        if not guilds:
            print("No matching guilds. Is the bot invited to the server?", file=sys.stderr)
            await self.close()
            return

        with open(self.out_path, "w", encoding="utf-8") as fh:
            for guild in guilds:
                print(f"Scraping guild: {guild.name} ({guild.id})", file=sys.stderr)
                for channel in guild.text_channels:
                    if not channel.permissions_for(guild.me).read_message_history:
                        continue
                    try:
                        async for msg in channel.history(limit=self.limit):
                            record = ScrapedMessage(
                                message_id=msg.id,
                                channel_id=channel.id,
                                channel_name=channel.name,
                                guild_id=guild.id,
                                author_id=msg.author.id,
                                author_name=str(msg.author),
                                is_bot=msg.author.bot,
                                content=msg.content,
                                created_at=msg.created_at.astimezone(timezone.utc).isoformat(),
                                attachments=[a.url for a in msg.attachments],
                                reactions=[str(r.emoji) for r in msg.reactions],
                            )
                            fh.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")
                            self.scraped += 1
                    except discord.Forbidden:
                        print(f"  Skipped #{channel.name}: missing permissions", file=sys.stderr)

        print(f"Done. Scraped {self.scraped} messages -> {self.out_path}", file=sys.stderr)
        await self.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Discord messages into JSONL.")
    parser.add_argument("--guild", type=int, default=None, help="Restrict to a single guild ID.")
    parser.add_argument("--limit", type=int, default=1000, help="Max messages per channel.")
    parser.add_argument("--out", default="messages.jsonl", help="Output JSONL file path.")
    args = parser.parse_args()

    token = os.environ.get("DISCORD_BOT_TOKEN")
    if not token:
        sys.exit("Set DISCORD_BOT_TOKEN in your environment.")

    client = ScraperClient(target_guild=args.guild, limit=args.limit, out_path=args.out)
    client.run(token)


if __name__ == "__main__":
    main()
