"""Solver-BE acceptance eval — runs a JSONL case set against the running solver BE
(ai.solver.service) and maps the pass-rate onto eval ratings (Criterion Zero + p4).

Exercises endpoint 1: define a problem -> a contradiction per available method.

Each JSONL line is a case:
  {"id","evals":["c0","p4"],"desc","method","path","body"?,"capture"?:{ctxKey:dotted},
   "expect":{"status", json_has?, equals?, methods_include?, per_method_contradictions?}}

`path`/`body` are formatted with a running context, so a POST can `capture` the new
run_id and a later GET can use `/runs/{run_id}`.

Expectations:
  status                    HTTP status == value
  json_has                  each dotted path resolves to a non-empty value
  equals                    dotted path -> expected value
  methods_include           response.methods contains each listed method
  per_method_contradictions response.contradictions has one non-empty {improving,
                            preserving,summary} per entry in response.methods

Rating mapping (written with --merge):
  c0.3  outputs correct       = pass-rate of positive (2xx-expected) cases
  c0.4  works end-to-end      = overall pass-rate
  p4.1  backend wired/working = overall pass-rate

Usage:
  python be_eval.py --dry-run
  python be_eval.py --base-url http://localhost:8080
  python be_eval.py --merge scores.json
  python be_eval.py --gate

Pure stdlib.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(HERE, "datasets", "solver-be", "cases.jsonl")
EXPECT_KEYS = {"status", "json_has", "equals", "methods_include", "per_method_contradictions"}


def load_cases(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def validate(cases: list[dict]) -> list[str]:
    errors, seen = [], set()
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
        if c.get("method") == "POST" and "body" not in c:
            errors.append(f"{tag}: POST case has no body")
    return errors


def resolve(obj, dotted: str):
    cur = obj
    for part in dotted.split("."):
        if isinstance(cur, list):
            try:
                cur = cur[int(part)]
            except (ValueError, IndexError):
                return None
        elif isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def check(expect: dict, status: int, body) -> tuple[bool, str]:
    if status != expect["status"]:
        return False, f"status {status} != {expect['status']}"
    for path in expect.get("json_has", []):
        val = resolve(body, path)
        if val in (None, "", [], {}):
            return False, f"json_has: {path} missing/empty"
    for path, want in expect.get("equals", {}).items():
        got = resolve(body, path)
        if got != want:
            return False, f"equals: {path}={got!r} != {want!r}"
    if "methods_include" in expect:
        methods = body.get("methods", []) if isinstance(body, dict) else []
        for m in expect["methods_include"]:
            if m not in methods:
                return False, f"methods_include: {m} not in {methods}"
    if expect.get("per_method_contradictions"):
        if not isinstance(body, dict):
            return False, "per_method_contradictions: body not an object"
        methods = body.get("methods", [])
        cons = body.get("contradictions", [])
        by_method = {c.get("method"): c for c in cons if isinstance(c, dict)}
        for m in methods:
            c = by_method.get(m)
            if not c:
                return False, f"per_method_contradictions: no contradiction for {m}"
            for field in ("improving", "preserving", "summary"):
                if not (c.get(field) or "").strip():
                    return False, f"per_method_contradictions: {m}.{field} empty"
    return True, "ok"


def do_request(base_url: str, method: str, path: str, body, timeout: float):
    url = base_url.rstrip("/") + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw, status = resp.read().decode(errors="replace"), resp.status
    except urllib.error.HTTPError as e:
        raw, status = e.read().decode(errors="replace"), e.code
    try:
        return status, json.loads(raw)
    except ValueError:
        return status, raw


def rate(cases: list[dict], results: list[dict]) -> dict:
    def pr(subset):
        return round(sum(1 for r in subset if r["ok"]) / len(subset), 3) if subset else 0.0
    positive = [r for r in results if r["case"]["expect"]["status"] < 400]
    return {"c0.3": pr(positive), "c0.4": pr(results), "p4.1": pr(results)}


def main() -> None:
    ap = argparse.ArgumentParser(description="Run solver-BE acceptance cases -> ratings.")
    ap.add_argument("--dataset", default=DEFAULT_DATASET)
    ap.add_argument("--base-url", default="http://localhost:8080")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--timeout", type=float, default=10.0)
    ap.add_argument("--merge", metavar="SCORES")
    ap.add_argument("--gate", action="store_true", help="Non-zero exit if any case fails.")
    args = ap.parse_args()

    cases = load_cases(args.dataset)
    errors = validate(cases)

    if args.dry_run:
        print(f"Dataset: {args.dataset}\nCases: {len(cases)}")
        if errors:
            print(f"\n❌ {len(errors)} validation error(s):")
            for e in errors:
                print("   -", e)
            raise SystemExit(1)
        print("✅ dataset valid")
        return

    if errors:
        raise SystemExit("Dataset invalid; run --dry-run to see errors.")

    ctx: dict = {}
    results = []
    print(f"Running {len(cases)} cases against {args.base_url}\n")
    for c in cases:
        try:
            path = c["path"].format(**ctx)   # only the path is templated (e.g. /runs/{run_id})
            body = c.get("body")
        except KeyError as e:
            results.append({"case": c, "ok": False, "msg": f"missing ctx {e}"})
            print(f"  ❌ {c['id']}: missing ctx {e}")
            continue
        try:
            status, resp = do_request(args.base_url, c["method"], path, body, args.timeout)
            ok, msg = check(c["expect"], status, resp)
            if ok and c.get("capture") and isinstance(resp, dict):
                for k, dotted in c["capture"].items():
                    ctx[k] = resolve(resp, dotted)
        except Exception as ex:
            ok, msg = False, f"request failed: {ex}"
        results.append({"case": c, "ok": ok, "msg": msg})
        print(f"  {'✅' if ok else '❌'} {c['id']}: {msg}")

    passed = sum(1 for r in results if r["ok"])
    print(f"\n{passed}/{len(results)} passed")
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

    if args.gate and passed < len(results):
        raise SystemExit(f"GATE FAILED: {len(results) - passed}/{len(results)} case(s) failed")


if __name__ == "__main__":
    main()
