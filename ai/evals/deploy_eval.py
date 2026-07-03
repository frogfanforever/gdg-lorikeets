"""Deployment reachability eval — probes the live Cloud Run services of a deployed
stack and maps the result onto eval ratings (pillar 5, check p5.1 + Criterion Zero).

Built for the Day-5 **gcp-deploy** reference (github.com/mmysior/gdg-mcp-workshop
@gcp-deploy: Angular/Nginx -> NestJS/Prisma -> ADK agent -> TRIZ MCP, all on
Cloud Run + Cloud SQL), but works for any HTTP stack. Pass whichever endpoints you
have; only the ones you pass are checked.

An endpoint is **reachable** if an HTTP response came back with status < 500
(200/404/405 all prove the service is live). The MCP endpoint is additionally
checked with a real `initialize` handshake (proper Accept header). Provide a
`--tls-check` to also require https.

Rating mapping (written with --merge):
  p5.1  Deployed live and reachable on Cloud Run = fraction of passed endpoints
  c0.4  Core business function works end-to-end  = same fraction (only if --set-c0)

Usage:
  python deploy_eval.py --frontend-url https://…run.app \\
                        --backend-url  https://…run.app \\
                        --mcp-url      https://…run.app/mcp \\
                        --agent-url    https://…run.app
  python deploy_eval.py --mcp-url https://…run.app/mcp --merge scores.json --gate

Pure stdlib.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request

PROTOCOL_VERSION = "2025-06-18"


def http_probe(url: str, timeout: float) -> tuple[bool, str]:
    """GET the URL. Reachable = a response with status < 500."""
    req = urllib.request.Request(url, method="GET", headers={"Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status < 500, f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        return e.code < 500, f"HTTP {e.code}"
    except Exception as ex:
        return False, f"unreachable: {ex}"


def mcp_probe(url: str, timeout: float) -> tuple[bool, str]:
    """POST an MCP initialize; reachable = a JSON-RPC reply (or any status < 500)."""
    payload = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {"protocolVersion": PROTOCOL_VERSION, "capabilities": {},
                   "clientInfo": {"name": "deploy-eval", "version": "0.1.0"}},
    }).encode()
    req = urllib.request.Request(url, data=payload, method="POST", headers={
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": PROTOCOL_VERSION,
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status < 500, f"MCP HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        return e.code < 500, f"MCP HTTP {e.code}"
    except Exception as ex:
        return False, f"unreachable: {ex}"


def main() -> None:
    ap = argparse.ArgumentParser(description="Probe deployed Cloud Run endpoints -> eval ratings.")
    ap.add_argument("--frontend-url")
    ap.add_argument("--backend-url")
    ap.add_argument("--mcp-url", help="…/mcp endpoint (checked with an MCP initialize).")
    ap.add_argument("--agent-url", help="ADK agent base URL.")
    ap.add_argument("--tls-check", action="store_true", help="Also require the URL to be https.")
    ap.add_argument("--timeout", type=float, default=10.0)
    ap.add_argument("--merge", metavar="SCORES", help="Write the p5.1 rating into this scores JSON.")
    ap.add_argument("--set-c0", action="store_true", help="Also write c0.4 (end-to-end) from the same fraction.")
    ap.add_argument("--gate", action="store_true", help="Exit non-zero if any provided endpoint is unreachable.")
    args = ap.parse_args()

    targets = [
        ("frontend", args.frontend_url, http_probe),
        ("backend", args.backend_url, http_probe),
        ("agent", args.agent_url, http_probe),
        ("mcp", args.mcp_url, mcp_probe),
    ]
    targets = [(n, u, p) for (n, u, p) in targets if u]
    if not targets:
        raise SystemExit("Pass at least one of --frontend-url/--backend-url/--mcp-url/--agent-url.")

    results = []
    for name, url, probe in targets:
        if args.tls_check and not url.startswith("https://"):
            ok, msg = False, "not https (--tls-check)"
        else:
            ok, msg = probe(url, args.timeout)
        results.append((name, ok))
        print(f"  {'✅' if ok else '❌'} {name}: {msg}  ({url})")

    passed = sum(1 for _, ok in results if ok)
    frac = round(passed / len(results), 3)
    print(f"\n{passed}/{len(results)} endpoints reachable")
    ratings = {"p5.1": frac}
    if args.set_c0:
        ratings["c0.4"] = frac
    print("ratings:", json.dumps(ratings))

    if args.merge:
        data = {}
        if os.path.exists(args.merge):
            with open(args.merge, encoding="utf-8") as fh:
                data = json.load(fh)
        data.update(ratings)
        with open(args.merge, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        print(f"Merged p5.1{'/c0.4' if args.set_c0 else ''} rating into {args.merge}")

    if args.gate and passed < len(results):
        raise SystemExit(f"GATE FAILED: {len(results) - passed}/{len(results)} endpoint(s) unreachable")


if __name__ == "__main__":
    main()
