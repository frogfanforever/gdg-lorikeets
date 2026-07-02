"""Hackathon evaluation scoreboard.

Reads the judging rubric (`rubric.jsonl`) and a set of per-check ratings
(`scores.json`) and prints a scoreboard: the Criterion Zero gate, each of the
five scored pillars (out of 20), the total out of 100, and advisory readiness
checks. Mirrors the Day-4 "evaluation scoreboard" concept from the marathon.

Ratings are floats in [0, 1] keyed by check id (e.g. {"p1.1": 0.75}). For
scored checks the earned points are `points * rating`. For the gate, every
check must reach the pass threshold or the whole score is voided.

Usage:
    python scoreboard.py                     # uses scores.example.json
    python scoreboard.py my-scores.json
    python scoreboard.py my-scores.json --md report.md
    python scoreboard.py --template          # print a blank scores template

Pure stdlib; no dependencies.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RUBRIC_PATH = os.path.join(HERE, "rubric.jsonl")
GATE_PASS_THRESHOLD = 1.0  # gate checks are pass/fail; must be fully met


def load_rubric(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def load_scores(path: str) -> dict[str, float]:
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    # Keys starting with "_" are comments/metadata, not check ratings.
    return {k: max(0.0, min(1.0, float(v))) for k, v in raw.items() if not k.startswith("_")}


def all_check_ids(rubric: list[dict]) -> list[str]:
    return [c["id"] for section in rubric for c in section["checks"]]


def bar(fraction: float, width: int = 20) -> str:
    filled = round(fraction * width)
    return "█" * filled + "░" * (width - filled)


def evaluate(rubric: list[dict], scores: dict[str, float]) -> dict:
    missing = [cid for cid in all_check_ids(rubric) if cid not in scores]
    gate_ok = True
    gate_detail: list[tuple] = []
    scored: list[dict] = []
    advisory: list[dict] = []
    total = 0.0

    for section in rubric:
        kind = section["kind"]
        if kind == "gate":
            for c in section["checks"]:
                r = scores.get(c["id"], 0.0)
                passed = r >= GATE_PASS_THRESHOLD
                gate_ok = gate_ok and passed
                gate_detail.append((c["id"], c["desc"], r, passed))
        elif kind == "scored":
            earned = 0.0
            rows = []
            for c in section["checks"]:
                r = scores.get(c["id"], 0.0)
                pts = c["points"] * r
                earned += pts
                rows.append((c["id"], c["desc"], c["points"], r, pts))
            total += earned
            scored.append({"section": section, "earned": earned, "rows": rows})
        elif kind == "advisory":
            done = 0
            rows = []
            for c in section["checks"]:
                r = scores.get(c["id"], 0.0)
                done += r
                rows.append((c["id"], c["desc"], r))
            n = len(section["checks"])
            advisory.append({"section": section, "ratio": done / n if n else 0, "rows": rows})

    return {
        "gate_ok": gate_ok,
        "gate_detail": gate_detail,
        "scored": scored,
        "advisory": advisory,
        "total": total,
        "missing": missing,
    }


def render(result: dict) -> str:
    out: list[str] = []
    w = out.append
    w("=" * 64)
    w("  BUILD WITH AI 2026 — EVALUATION SCOREBOARD")
    w("=" * 64)

    # Gate
    w("")
    status = "✅ PASS" if result["gate_ok"] else "❌ FAIL  (score is VOID until fixed)"
    w(f"CRITERION ZERO (gate): {status}")
    for cid, desc, r, passed in result["gate_detail"]:
        mark = "✓" if passed else "✗"
        w(f"   {mark} [{cid}] {desc}  ({r:.0%})")

    # Scored pillars
    w("")
    w("SCORED PILLARS")
    for s in result["scored"]:
        sec = s["section"]
        earned, mx = s["earned"], sec["max_points"]
        w(f"\n  {sec['pillar']}  (Day {sec['day']})")
        w(f"    {bar(earned / mx)}  {earned:5.1f} / {mx}")
        for cid, desc, pts, r, got in s["rows"]:
            w(f"      [{cid}] {got:4.1f}/{pts}  {desc}")

    # Total
    total = result["total"]
    w("")
    w("-" * 64)
    shown = total if result["gate_ok"] else 0.0
    note = "" if result["gate_ok"] else "   (VOID: Criterion Zero failed)"
    w(f"  TOTAL: {shown:5.1f} / 100   {bar(shown / 100)}{note}")
    w("-" * 64)

    # Advisory
    if result["advisory"]:
        w("")
        w("ADVISORY (not in the 100 pts — tie-breakers & framing)")
        for a in result["advisory"]:
            sec = a["section"]
            w(f"\n  {sec['pillar']}: {a['ratio']:.0%}  {bar(a['ratio'])}")
            for cid, desc, r in a["rows"]:
                mark = "✓" if r >= 1.0 else ("~" if r > 0 else "✗")
                w(f"      {mark} [{cid}] {desc}")

    if result["missing"]:
        w("")
        w(f"⚠️  {len(result['missing'])} unscored check(s) treated as 0: "
          + ", ".join(result["missing"]))

    w("")
    return "\n".join(out)


def render_markdown(result: dict) -> str:
    out: list[str] = []
    w = out.append
    w("# Build with AI 2026 — Evaluation Scoreboard\n")
    gate = "✅ **PASS**" if result["gate_ok"] else "❌ **FAIL — score void**"
    w(f"**Criterion Zero (gate):** {gate}\n")
    for cid, desc, r, passed in result["gate_detail"]:
        w(f"- {'✓' if passed else '✗'} `{cid}` {desc} ({r:.0%})")
    w("\n## Pillars\n")
    w("| Pillar | Day | Score |")
    w("|--------|-----|-------|")
    for s in result["scored"]:
        sec = s["section"]
        w(f"| {sec['pillar']} | {sec['day']} | {s['earned']:.1f} / {sec['max_points']} |")
    total = result["total"] if result["gate_ok"] else 0.0
    w(f"| **TOTAL** | | **{total:.1f} / 100** |")
    return "\n".join(out) + "\n"


def make_template(rubric: list[dict]) -> str:
    return json.dumps({cid: 0 for cid in all_check_ids(rubric)}, indent=2)


def main() -> None:
    ap = argparse.ArgumentParser(description="Hackathon evaluation scoreboard.")
    ap.add_argument("scores", nargs="?", default=os.path.join(HERE, "scores.example.json"),
                    help="Path to scores JSON ({check_id: 0..1}).")
    ap.add_argument("--md", metavar="OUT", help="Also write a markdown report to OUT.")
    ap.add_argument("--template", action="store_true", help="Print a blank scores template and exit.")
    args = ap.parse_args()

    rubric = load_rubric(RUBRIC_PATH)

    if args.template:
        print(make_template(rubric))
        return

    if not os.path.exists(args.scores):
        sys.exit(f"Scores file not found: {args.scores}\n"
                 f"Generate one with: python {os.path.basename(__file__)} --template > scores.json")

    scores = load_scores(args.scores)
    result = evaluate(rubric, scores)
    print(render(result))

    if args.md:
        with open(args.md, "w", encoding="utf-8") as fh:
            fh.write(render_markdown(result))
        print(f"Markdown report written to {args.md}")


if __name__ == "__main__":
    main()
