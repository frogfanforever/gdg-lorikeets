# Structured data

Machine-readable facts backing the [[Home|wiki]] — the categorized form of the
hackathon intel scraped from GDG web pages + the hackathon Discord (2026-07-02).

## Files
- `events.jsonl` — one record per scraped GDG Wrocław event.
- `items.jsonl` — every scraped fact, individually categorized.

## Category taxonomy (`items.jsonl`)
| category | meaning |
|----------|---------|
| `event` | a whole event / meetup |
| `schedule` | a day or time-block within an event |
| `session` | a talk / workshop topic |
| `person` | trainer, judge, organizer, facilitator, speaker |
| `tech` | framework, tool, language, cloud service |
| `venue` | physical location |
| `sponsor` | partner / sponsor / co-host |
| `challenge` | hackathon problem statement / deliverable |
| `community` | Discord / social channel |
| `resource` | external link / material |

Prose lives in the wiki notes ([[Build with AI 2026]], [[Judging Criteria]],
[[People]], [[Competitors]], …); these files are the structured mirror.
Discord capture details: `../discord/`.
