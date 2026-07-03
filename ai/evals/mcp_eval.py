"""MCP acceptance eval — runs a JSONL case set against a running MCP server over
Streamable HTTP and maps the pass-rate onto eval ratings (pillar 5, check p5.3).

Built for the Day-5 **TRIZ MCP server** (github.com/mmysior/gdg-mcp-workshop:
FastMCP + pytriz, Streamable HTTP at /mcp), but the format is generic to any MCP
server that exposes tools returning text.

Each JSONL line is a case:
  {"id","evals":["p5","c0"],"desc","tool","args":{...},"needs_embeddings"?,
   "expect":{"contains"?:[...],"not_contains"?:[...],"is_error"?:bool}}

Expectations (tool responses are plain text blocks):
  contains       every listed substring must appear in the response text
  not_contains   none of the listed substrings may appear
  is_error       the tool call must (true) / must not (false, default) be an error

Before the cases run, the server's tools/list is checked against the expected
TRIZ tool set; a missing tool fails as the synthetic case `tools-registered`.

Rating mapping (written with --merge):
  p5.3  MCP server built and/or integrated = overall pass-rate (tools-registered
        + every executed tool-call case)

Usage:
  python mcp_eval.py --dry-run                          # validate the dataset offline
  python mcp_eval.py --url http://localhost:8123/mcp
  python mcp_eval.py --include-embeddings               # also run semantic-search cases
  python mcp_eval.py --merge scores.json                # write the p5.3 rating
  python mcp_eval.py --gate                             # non-zero exit on any failure

Pure stdlib. Requires the server running (see the dataset README). Semantic-search
tools (search_*) need the embedding backend up; those cases are `needs_embeddings`
and skipped unless --include-embeddings.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(HERE, "datasets", "triz-mcp", "mcp-cases.jsonl")
DEFAULT_URL = "http://localhost:8123/mcp"
PROTOCOL_VERSION = "2025-06-18"
EXPECT_KEYS = {"contains", "not_contains", "is_error"}
EXPECTED_TOOLS = [
    "browse_contradiction_matrix",
    "search_parameter",
    "search_principle",
    "get_random_principles",
    "get_principle_by_id",
    "get_parameter_by_id",
]


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
        for req in ("id", "tool", "expect"):
            if req not in c:
                errors.append(f"{tag}: missing '{req}'")
        if "args" in c and not isinstance(c["args"], dict):
            errors.append(f"{tag}: 'args' must be an object")
        exp = c.get("expect", {})
        if not any(k in exp for k in EXPECT_KEYS):
            errors.append(f"{tag}: expect needs at least one of {sorted(EXPECT_KEYS)}")
        for k in exp:
            if k not in EXPECT_KEYS:
                errors.append(f"{tag}: unknown expect key '{k}'")
        for k in ("contains", "not_contains"):
            if k in exp and not isinstance(exp[k], list):
                errors.append(f"{tag}: expect.{k} must be a list")
    return errors


# ---------------------------------------------------------------------------
# Minimal MCP Streamable HTTP client (stdlib only). Handles both plain JSON and
# SSE-framed responses; forwards Mcp-Session-Id when the server issues one.
# ---------------------------------------------------------------------------


def _parse_rpc(raw: str, content_type: str):
    ct = (content_type or "").lower()
    looks_sse = "text/event-stream" in ct or raw.lstrip().startswith(("event:", "data:"))
    if looks_sse:
        payloads = [
            line[len("data:"):].strip()
            for line in raw.splitlines()
            if line.strip().startswith("data:")
        ]
        raw = payloads[-1] if payloads else raw
    return json.loads(raw)


class MCPClient:
    def __init__(self, url: str, timeout: float):
        self.url = url
        self.timeout = timeout
        self.session_id = None
        self._id = 0

    def _post(self, payload: dict, expect_response: bool = True):
        data = json.dumps(payload).encode()
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "MCP-Protocol-Version": PROTOCOL_VERSION,
        }
        if self.session_id:
            headers["Mcp-Session-Id"] = self.session_id
        req = urllib.request.Request(self.url, data=data, method="POST", headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                sid = resp.headers.get("Mcp-Session-Id")
                if sid:
                    self.session_id = sid
                raw = resp.read().decode(errors="replace")
                ct = resp.headers.get("Content-Type", "")
        except urllib.error.HTTPError as e:
            raw = e.read().decode(errors="replace")
            ct = e.headers.get("Content-Type", "") if e.headers else ""
        if not expect_response or not raw.strip():
            return None
        return _parse_rpc(raw, ct)

    def initialize(self) -> None:
        self._id += 1
        self._post({
            "jsonrpc": "2.0", "id": self._id, "method": "initialize",
            "params": {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "mcp-eval", "version": "0.1.0"},
            },
        })
        try:  # notifications/initialized has no response (202 in stateless mode)
            self._post({"jsonrpc": "2.0", "method": "notifications/initialized"},
                       expect_response=False)
        except Exception:
            pass

    def list_tools(self) -> list[str]:
        self._id += 1
        resp = self._post({"jsonrpc": "2.0", "id": self._id, "method": "tools/list"})
        return [t["name"] for t in (resp or {}).get("result", {}).get("tools", [])]

    def call_tool(self, name: str, arguments: dict) -> tuple[bool, str]:
        self._id += 1
        resp = self._post({
            "jsonrpc": "2.0", "id": self._id, "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }) or {}
        if "error" in resp:
            return True, json.dumps(resp["error"])
        result = resp.get("result", {})
        texts = [b.get("text", "") for b in result.get("content", []) if b.get("type") == "text"]
        return bool(result.get("isError")), "\n".join(texts)


def check(expect: dict, is_error: bool, text: str) -> tuple[bool, str]:
    want_error = expect.get("is_error", False)
    if want_error != is_error:
        return False, f"is_error={is_error} != {want_error}"
    for sub in expect.get("contains", []):
        if sub not in text:
            return False, f"missing substring {sub!r}"
    for sub in expect.get("not_contains", []):
        if sub in text:
            return False, f"unexpected substring {sub!r}"
    return True, "ok"


def rate(results: list[dict]) -> dict:
    executed = [r for r in results if not r["skipped"]]
    pr = round(sum(1 for r in executed if r["ok"]) / len(executed), 3) if executed else 0.0
    return {"p5.3": pr}


def main() -> None:
    ap = argparse.ArgumentParser(description="Run MCP tool acceptance cases -> eval ratings.")
    ap.add_argument("--dataset", default=DEFAULT_DATASET)
    ap.add_argument("--url", default=DEFAULT_URL, help="MCP Streamable HTTP endpoint (…/mcp).")
    ap.add_argument("--dry-run", action="store_true", help="Validate the dataset, no requests.")
    ap.add_argument("--include-embeddings", action="store_true",
                    help="Also run semantic-search cases (need the embedding backend up).")
    ap.add_argument("--timeout", type=float, default=30.0)
    ap.add_argument("--merge", metavar="SCORES", help="Write the p5.3 rating into this scores JSON.")
    ap.add_argument("--gate", action="store_true",
                    help="Exit non-zero if any executed case fails (for CI / pre-commit gating).")
    args = ap.parse_args()

    cases = load_cases(args.dataset)
    errors = validate(cases)

    if args.dry_run:
        print(f"Dataset: {args.dataset}")
        print(f"Cases: {len(cases)}  "
              f"(needs_embeddings: {sum(1 for c in cases if c.get('needs_embeddings'))})")
        tools = sorted({c["tool"] for c in cases if "tool" in c})
        print("Tools exercised:", ", ".join(tools))
        if errors:
            print(f"\n❌ {len(errors)} validation error(s):")
            for e in errors:
                print("   -", e)
            raise SystemExit(1)
        print("✅ dataset valid")
        return

    if errors:
        raise SystemExit("Dataset invalid; run --dry-run to see errors.")

    client = MCPClient(args.url, args.timeout)
    results = []
    print(f"Connecting to {args.url}\n")
    try:
        client.initialize()
        registered = client.list_tools()
    except Exception as ex:
        raise SystemExit(f"Could not reach MCP server at {args.url}: {ex}")

    missing = [t for t in EXPECTED_TOOLS if t not in registered]
    ok = not missing
    msg = "all 6 TRIZ tools registered" if ok else f"missing tools: {missing}"
    results.append({"case": {"id": "tools-registered"}, "ok": ok, "skipped": False, "msg": msg})
    print(f"  {'✅' if ok else '❌'} tools-registered: {msg}")

    for c in cases:
        if c.get("needs_embeddings") and not args.include_embeddings:
            results.append({"case": c, "ok": False, "skipped": True, "msg": "skipped (needs_embeddings)"})
            print(f"  ⏭  {c['id']}: skipped (needs_embeddings; use --include-embeddings)")
            continue
        try:
            is_error, text = client.call_tool(c["tool"], c.get("args", {}))
            ok, msg = check(c["expect"], is_error, text)
        except Exception as ex:
            ok, msg = False, f"call failed: {ex}"
        results.append({"case": c, "ok": ok, "skipped": False, "msg": msg})
        print(f"  {'✅' if ok else '❌'} {c['id']}: {msg}")

    executed = [r for r in results if not r["skipped"]]
    passed = sum(1 for r in executed if r["ok"])
    print(f"\n{passed}/{len(executed)} passed")
    ratings = rate(results)
    print("ratings:", json.dumps(ratings))

    if args.merge:
        data = {}
        if os.path.exists(args.merge):
            with open(args.merge, encoding="utf-8") as fh:
                data = json.load(fh)
        data.update(ratings)
        with open(args.merge, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        print(f"Merged p5.3 rating into {args.merge}")

    if args.gate and passed < len(executed):
        raise SystemExit(f"GATE FAILED: {len(executed) - passed}/{len(executed)} case(s) failed")


if __name__ == "__main__":
    main()
