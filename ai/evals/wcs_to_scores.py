"""Bridge: web-codegen-scorer (WCS) report -> eval 08 (AI Output Quality) ratings.

WCS (`web-codegen-scorer`) generates web code from a task and scores it 0-100
with deterministic ratings. This reads a WCS `summary.json` and maps the result
onto eval 08's checks (`x3.*`) so the AI-output-quality score in our scoreboard
is measured, not guessed.

Mapping:
    x3.1  a representative test set exists      -> 1.0 if the run has >=1 task
    x3.2  automated pass-rate measured          -> aggregate totalPoints / maxOverallPoints
    x3.3  failure modes documented & mitigated  -> build-success rate (+ findings listed)

Usage:
    # point at a summary.json, or any dir to search for the newest one
    python wcs_to_scores.py /path/to/wcs-edd/.web-codegen-scorer/reports
    python wcs_to_scores.py <summary.json>
    python wcs_to_scores.py <path> --merge scores.json   # write x3.* into scores.json

Pure stdlib.
"""

from __future__ import annotations

import argparse
import json
import os
import sys


def find_summary(path: str) -> str:
    """Accept a summary.json directly, or search a directory for the newest one."""
    if os.path.isfile(path):
        return path
    if os.path.isdir(path):
        found = []
        for root, _dirs, files in os.walk(path):
            if "summary.json" in files:
                p = os.path.join(root, "summary.json")
                found.append((os.path.getmtime(p), p))
        if not found:
            sys.exit(f"No summary.json found under {path}")
        return max(found)[1]
    sys.exit(f"Path not found: {path}")


def analyze(summary_path: str) -> dict:
    with open(summary_path, encoding="utf-8") as fh:
        data = json.load(fh)
    results = data.get("results", [])
    if not results:
        sys.exit(f"No results in {summary_path}")

    total = sum(r["score"]["totalPoints"] for r in results)
    max_total = sum(r["score"]["maxOverallPoints"] for r in results) or 1
    aggregate = total / max_total

    per_task = []
    builds_ok = 0
    findings: list[tuple] = []  # (task, assessment_name, success_pct)
    for r in results:
        name = r.get("promptDef", {}).get("name", "?")
        sc = r["score"]
        pts, mx = sc["totalPoints"], sc["maxOverallPoints"]
        per_task.append((name, pts, mx))
        build_ok = (
            r.get("finalAttempt", {}).get("buildResult", {}).get("status") == "success"
        )
        builds_ok += 1 if build_ok else 0
        for cat in sc.get("categories", []):
            for a in cat.get("assessments", []):
                if a.get("successPercentage", 1) < 1:
                    findings.append((name, a.get("name", a.get("id", "?")),
                                     a.get("successPercentage", 0)))

    build_rate = builds_ok / len(results)

    x3 = {
        "x3.1": 1.0,
        "x3.2": round(aggregate, 3),
        "x3.3": round(build_rate, 3),
    }
    return {
        "summary_path": summary_path,
        "model": data.get("details", {}).get("summary", {}).get("model", "?"),
        "n_tasks": len(results),
        "aggregate": aggregate,
        "total": total,
        "max_total": max_total,
        "per_task": per_task,
        "build_rate": build_rate,
        "findings": findings,
        "x3": x3,
    }


def render(a: dict) -> str:
    out = []
    w = out.append
    w("=" * 60)
    w("  WCS -> eval 08 (AI Output Quality)")
    w("=" * 60)
    w(f"  report : {a['summary_path']}")
    w(f"  model  : {a['model']}")
    w(f"  tasks  : {a['n_tasks']}")
    w(f"  score  : {a['total']}/{a['max_total']}  = {a['aggregate']:.0%}")
    w("")
    w("  per-task:")
    for name, pts, mx in a["per_task"]:
        w(f"    {name:<22} {pts:>3}/{mx}")
    w("")
    w(f"  build success rate: {a['build_rate']:.0%}")
    if a["findings"]:
        w(f"\n  failing assessments to document (x3.3): {len(a['findings'])}")
        for task, name, pct in a["findings"][:15]:
            w(f"    - [{task}] {name} ({pct:.0%})")
        if len(a["findings"]) > 15:
            w(f"    ... and {len(a['findings']) - 15} more")
    w("")
    w("  eval-08 ratings:")
    for k, v in a["x3"].items():
        w(f"    {k} = {v}")
    w("")
    return "\n".join(out)


def merge_into(scores_path: str, x3: dict) -> None:
    data = {}
    if os.path.exists(scores_path):
        with open(scores_path, encoding="utf-8") as fh:
            data = json.load(fh)
    data.update(x3)
    with open(scores_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
    print(f"Merged x3.* into {scores_path}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Map a WCS report onto eval-08 ratings.")
    ap.add_argument("path", help="Path to a WCS summary.json or a directory to search.")
    ap.add_argument("--merge", metavar="SCORES", help="Write x3.* into this scores JSON.")
    args = ap.parse_args()

    a = analyze(find_summary(args.path))
    print(render(a))
    if args.merge:
        merge_into(args.merge, a["x3"])


if __name__ == "__main__":
    main()
