"""Persistence for the solver BE — the StepResult store from the architecture.

MVP uses stdlib **sqlite3** (zero deps, real persistence) as a stand-in for the
Cloud SQL Postgres in `wiki/design/Backend Architecture`. Same shape — swap the
driver later. Every reasoning step writes one `steps` row = the "Step Result
Recorded" event: inputs, output, method, model+params, tokens/cost, timing, version.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    statement  TEXT NOT NULL,
    sdg        TEXT,
    methods    TEXT NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS steps (
    id          TEXT PRIMARY KEY,
    run_id      TEXT NOT NULL REFERENCES runs(id),
    step        TEXT NOT NULL,
    method      TEXT,
    inputs      TEXT,
    output      TEXT,
    model       TEXT,
    params      TEXT,
    tokens      INTEGER,
    cost        REAL,
    duration_ms REAL,
    status      TEXT NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    created_at  REAL NOT NULL
);
"""


class Store:
    def __init__(self, path: str = ":memory:") -> None:
        # one shared connection guarded by a lock (ThreadingHTTPServer → thread/req)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self.db.executescript(SCHEMA)
            self.db.commit()

    def create_run(self, title: str, statement: str, sdg: str | None, methods: list[str]) -> str:
        run_id = uuid.uuid4().hex[:12]
        with self._lock:
            self.db.execute(
                "INSERT INTO runs(id,title,statement,sdg,methods,version,created_at) "
                "VALUES(?,?,?,?,?,1,?)",
                (run_id, title, statement, sdg, json.dumps(methods), time.time()),
            )
            self.db.commit()
        return run_id

    def record_step(
        self, run_id: str, step: str, method: str | None, inputs: dict, output: dict,
        model: str, params: dict, tokens: int, cost: float, duration_ms: float,
        status: str = "ok", version: int = 1,
    ) -> str:
        step_id = uuid.uuid4().hex[:12]
        with self._lock:
            self.db.execute(
                "INSERT INTO steps(id,run_id,step,method,inputs,output,model,params,"
                "tokens,cost,duration_ms,status,version,created_at) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (step_id, run_id, step, method, json.dumps(inputs), json.dumps(output),
                 model, json.dumps(params), tokens, cost, duration_ms, status, version,
                 time.time()),
            )
            self.db.commit()
        return step_id

    def get_run(self, run_id: str) -> dict | None:
        with self._lock:
            row = self.db.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        if row is None:
            return None
        run = dict(row)
        run["methods"] = json.loads(run["methods"])
        return run

    def list_steps(self, run_id: str) -> list[dict]:
        with self._lock:
            rows = self.db.execute(
                "SELECT * FROM steps WHERE run_id=? ORDER BY created_at", (run_id,)
            ).fetchall()
        steps = []
        for r in rows:
            s = dict(r)
            for k in ("inputs", "output", "params"):
                s[k] = json.loads(s[k]) if s[k] else None
            steps.append(s)
        return steps
