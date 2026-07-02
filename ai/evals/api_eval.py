"""API acceptance eval — runs a JSONL case set against a running API and maps the
pass-rate onto eval ratings (Criterion Zero + pillar 4).

Built for the nan-stack NestJS API (users/orders), but the format is generic.
Each JSONL line is a case:
  {"id","evals":["c0","p4"],"method","path","body"?,"mutating"?,
   "expect":{"status",count?,where?,where_count?,contains?,equals?}}

Expectations:
  status       response HTTP status == value
  count        JSON body is a list of this length
  where+where_count   items matching the `where` subset number `where_count`
  contains     each listed subset must match some item (list) or the body (object)
  equals       dotted-path -> expected value (e.g. "0.email", "productName")

Rating mapping (written with --merge):
  c0.3  substantive correctness  = pass-rate of positive (non-4xx) cases
  c0.4  works end-to-end         = overall pass-rate
  p4.2  data layer correctness   = pass-rate of p4-tagged cases

Usage:
  python api_eval.py --dry-run                       # validate the dataset offline
  python api_eval.py --base-url http://localhost:3000
  python api_eval.py --include-mutating              # also run POST cases
  python api_eval.py --merge scores.json             # write c0/p4 ratings

Pure stdlib.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(HERE, "datasets", "nan-stack", "api-cases.jsonl")
EXPECT_KEYS = {"status", "count", "where", "where_count", "contains", "equals"}


def load_cases(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def validate(cases: list[dict]) -> list[str]:
    errors = []
    seen = set()
    for i, c in enumerate(cases):
        tag = c.get("id", f"#{i}")
        if c.get("id") in seen:
            errors.append(f"{tag}: duplicate id")
        seen.add(c.get("id"))
        for req in ("id", "method", "path", "expect"):
            if req not in c:
                errors.append(f"{tag}: missing '{req}'")
        exp = c.get("expect", {})
        if "status" not in exp:
            errors.append(f"{tag}: expect.status is required")
        for k in exp:
            if k not in EXPECT_KEYS:
                errors.append(f"{tag}: unknown expect key '{k}'")
        if ("where" in exp) != ("where_count" in exp):
            errors.append(f"{tag}: 'where' and 'where_count' must be used together")
        if c.get("method") == "POST" and "body" not in c:
            errors.append(f"{tag}: POST case has no body")
    return errors


def resolve(obj, dotted: str):
    cur = obj
    for part in dotted.split("."):
        if isinstance(cur, list):
            cur = cur[int(part)]
        elif isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def is_superset(item, subset: dict) -> bool:
    return isinstance(item, dict) and all(item.get(k) == v for k, v in subset.items())


def check(expect: dict, status: int, body) -> tuple[bool, str]:
    if status != expect["status"]:
        return False, f"status {status} != {expect['status']}"
    if "count" in expect:
        if not isinstance(body, list) or len(body) != expect["count"]:
            got = len(body) if isinstance(body, list) else "not-a-list"
            return False, f"count {got} != {expect['count']}"
    if "where" in expect:
        if not isinstance(body, list):
            return False, "where: body is not a list"
        n = sum(1 for it in body if is_superset(it, expect["where"]))
        if n != expect["where_count"]:
            return False, f"where_count {n} != {expect['where_count']}"
    if "contains" in expect:
        for sub in expect["contains"]:
            if isinstance(body, list):
                if not any(is_superset(it, sub) for it in body):
                    return False, f"contains: no item matches {sub}"
            elif not is_superset(body, sub):
                return False, f"contains: body does not match {sub}"
    if "equals" in expect:
        for path, val in expect["equals"].items():
            got = resolve(body, path)
            if got != val:
                return False, f"equals: {path}={got!r} != {val!r}"
    return True, "ok"


def do_request(base_url: str, case: dict, timeout: float):
    url = base_url.rstrip("/") + case["path"]
    data = None
    headers = {"Accept": "application/json"}
    if "body" in case:
        data = json.dumps(case["body"]).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=case["method"], headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode(errors="replace")
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        status = e.code
    try:
        body = json.loads(raw)
    except (ValueError, TypeError):
        body = raw
    return status, body


def rate(cases: list[dict], results: list[dict]) -> dict:
    def pr(subset):
        subset = [r for r in subset]
        return round(sum(1 for r in subset if r["ok"]) / len(subset), 3) if subset else 0.0

    executed = [r for r in results if not r["skipped"]]
    positive = [r for r in executed if r["case"]["expect"]["status"] < 400]
    p4 = [r for r in executed if "p4" in r["case"].get("evals", [])]
    return {
        "c0.3": pr(positive),
        "c0.4": pr(executed),
        "p4.2": pr(p4),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Run API acceptance cases -> eval ratings.")
    ap.add_argument("--dataset", default=DEFAULT_DATASET)
    ap.add_argument("--base-url", default="http://localhost:3000")
    ap.add_argument("--dry-run", action="store_true", help="Validate the dataset, no requests.")
    ap.add_argument("--include-mutating", action="store_true", help="Also run POST/PUT/DELETE cases.")
    ap.add_argument("--timeout", type=float, default=5.0)
    ap.add_argument("--merge", metavar="SCORES", help="Write c0/p4 ratings into this scores JSON.")
    args = ap.parse_args()

    cases = load_cases(args.dataset)
    errors = validate(cases)

    if args.dry_run:
        print(f"Dataset: {args.dataset}")
        print(f"Cases: {len(cases)}  "
              f"(mutating: {sum(1 for c in cases if c.get('mutating'))})")
        by_eval = {}
        for c in cases:
            for e in c.get("evals", []):
                by_eval[e] = by_eval.get(e, 0) + 1
        print("By eval:", ", ".join(f"{k}={v}" for k, v in sorted(by_eval.items())))
        if errors:
            print(f"\n❌ {len(errors)} validation error(s):")
            for e in errors:
                print("   -", e)
            raise SystemExit(1)
        print("✅ dataset valid")
        return

    if errors:
        raise SystemExit("Dataset invalid; run --dry-run to see errors.")

    results = []
    print(f"Running {len(cases)} cases against {args.base_url}\n")
    for c in cases:
        if c.get("mutating") and not args.include_mutating:
            results.append({"case": c, "ok": False, "skipped": True, "msg": "skipped (mutating)"})
            print(f"  ⏭  {c['id']}: skipped (mutating; use --include-mutating)")
            continue
        try:
            status, body = do_request(args.base_url, c, args.timeout)
            ok, msg = check(c["expect"], status, body)
        except Exception as ex:  # network/timeout
            ok, msg = False, f"request failed: {ex}"
        results.append({"case": c, "ok": ok, "skipped": False, "msg": msg})
        print(f"  {'✅' if ok else '❌'} {c['id']}: {msg}")

    executed = [r for r in results if not r["skipped"]]
    passed = sum(1 for r in executed if r["ok"])
    print(f"\n{passed}/{len(executed)} passed")
    ratings = rate(cases, results)
    print("ratings:", json.dumps(ratings))

    if args.merge:
        data = {}
        if os.path.exists(args.merge):
            with open(args.merge, encoding="utf-8") as fh:
                data = json.load(fh)
        data.update(ratings)
        with open(args.merge, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        print(f"Merged c0/p4 ratings into {args.merge}")


if __name__ == "__main__":
    main()
