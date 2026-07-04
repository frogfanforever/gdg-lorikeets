"""Solver BE (MVP) — HTTP service for the first pipeline slice.

Endpoint 1 (this MVP): **define a problem, reframe it as a contradiction per available
method, present them to the user.** Each reframing is persisted as a StepResult
(inputs/output/model/params/tokens/cost/timing/version) so it is inspectable — the
Criterion-Zero "real, inspectable logic" requirement.

Routes:
  GET  /health                 -> {"status":"ok", ...}
  GET  /methods                -> {"methods":[...]}
  POST /runs                   -> create run + a contradiction per method
  GET  /runs/{id}              -> run + contradictions + recorded steps

Built on stdlib http.server (zero deps, instantly hostable) reusing ai.solver domain
logic. In production this is the NestJS API + Python Solver split (see
wiki/design/Backend Architecture); the contract stays the same.
"""

from __future__ import annotations

import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from ai.solver import available, base, get, stub_llm
from ai.solver.base import Problem, parse_json_object

from .store import Store

# module state (set by serve())
STORE: Store
LLM = stub_llm


def _reframe(problem: Problem, method: str, llm) -> tuple[dict, dict]:
    """Reframe the problem as a contradiction *through a method's lens*.
    Returns (contradiction dict, metadata dict). Method-aware prompt so a real LLM
    differentiates per method; the offline stub tags the summary with the method."""
    prompt = (
        f"Reframe this problem as a technical CONTRADICTION using the {method} method's lens.\n"
        f"PROBLEM: {problem.title}\nSTATEMENT: {problem.statement}\n"
        "Return JSON: {\"improving\": <parameter to improve>, "
        "\"preserving\": <parameter that must not worsen>, \"summary\": <one line>}."
    )
    t0 = time.perf_counter()
    reply = llm(prompt)
    duration_ms = (time.perf_counter() - t0) * 1000
    obj = parse_json_object(reply)
    contradiction = {
        "method": method,
        "improving": obj.get("improving", "the objective"),
        "preserving": obj.get("preserving", "the key constraint"),
        "summary": f"via {method}: " + obj.get("summary", f"improve {problem.title}"),
    }
    meta = {
        "model": getattr(llm, "__name__", "stub"),
        "params": {"temperature": 0.0},
        "tokens": (len(prompt) + len(reply)) // 4,   # rough estimate
        "cost": 0.0,
        "duration_ms": round(duration_ms, 2),
    }
    return contradiction, meta


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):  # quiet
        pass

    # --- helpers ---
    def _send(self, code: int, body: dict, allow: str | None = None) -> None:
        payload = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        if allow:
            self.send_header("Allow", allow)   # required on 405
        self.end_headers()
        self.wfile.write(payload)

    def _read_json(self) -> dict:
        n = int(self.headers.get("Content-Length", 0))
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n))
        except ValueError:
            return {}

    # --- routes ---
    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path == "/":
            return self._send(200, {
                "service": "solver-be",
                "endpoints": ["GET /health", "GET /methods", "POST /runs", "GET /runs/{id}"],
            })
        if path == "/health":
            return self._send(200, {"status": "ok", "methods": available()})
        if path == "/methods":
            return self._send(200, {"methods": available()})
        if path.startswith("/runs/"):
            run_id = path.split("/runs/", 1)[1]
            if not run_id:
                return self._send(404, {"error": "run id required: GET /runs/{id}"})
            run = STORE.get_run(run_id)
            if not run:
                return self._send(404, {"error": f"run {run_id} not found"})
            steps = STORE.list_steps(run_id)
            return self._send(200, {
                "run_id": run_id, "problem": _problem_view(run), "methods": run["methods"],
                "contradictions": [s["output"] for s in steps if s["step"] == "reframe"],
                "steps": steps,
            })
        if path == "/runs":  # known collection, wrong method
            return self._send(405, {"error": "method not allowed; use POST /runs"}, allow="POST")
        return self._send(404, {"error": f"not found: {path}"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path in ("/", "/health", "/methods") or path.startswith("/runs/"):
            return self._send(405, {"error": f"method not allowed for {path}; POST is only on /runs"},
                              allow="GET")
        if path != "/runs":
            return self._send(404, {"error": f"not found: {path}"})

        body = self._read_json()
        problem_in = body.get("problem", {})
        title = (problem_in.get("title") or "").strip()
        statement = (problem_in.get("statement") or "").strip()
        if not title or not statement:
            return self._send(400, {"error": "problem.title and problem.statement are required"})

        methods = body.get("methods") or available()
        unknown = [m for m in methods if m not in available()]
        if unknown:
            return self._send(422, {"error": f"unknown methods: {unknown}",
                                    "available": available()})
        if "triz" not in methods:
            return self._send(422, {"error": "TRIZ is mandatory: include 'triz' in methods"})

        problem = Problem(id="", title=title, statement=statement, sdg=problem_in.get("sdg"))
        run_id = STORE.create_run(title, statement, problem.sdg, methods)

        contradictions = []
        for m in methods:
            contradiction, meta = _reframe(problem, m, LLM)
            STORE.record_step(
                run_id=run_id, step="reframe", method=m,
                inputs={"problem": _problem_view_from(problem)}, output=contradiction,
                model=meta["model"], params=meta["params"], tokens=meta["tokens"],
                cost=meta["cost"], duration_ms=meta["duration_ms"], status="ok", version=1,
            )
            contradictions.append(contradiction)

        return self._send(201, {
            "run_id": run_id,
            "problem": _problem_view_from(problem),
            "methods": methods,
            "contradictions": contradictions,
        })


def _problem_view(run: dict) -> dict:
    return {"title": run["title"], "statement": run["statement"], "sdg": run["sdg"]}


def _problem_view_from(p: Problem) -> dict:
    return {"title": p.title, "statement": p.statement, "sdg": p.sdg}


def serve(host: str = "127.0.0.1", port: int = 8080, db_path: str = ":memory:", llm=stub_llm):
    global STORE, LLM
    STORE = Store(db_path)
    LLM = llm
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"solver-be listening on http://{host}:{port}  (methods={available()}, db={db_path})")
    httpd.serve_forever()
