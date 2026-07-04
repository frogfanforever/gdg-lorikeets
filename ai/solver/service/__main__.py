"""Host the solver BE:  python -m ai.solver.service [--host H] [--port P] [--db PATH]

Uses the offline stub LLM by default (no keys). Wire a Gemini/Vertex callable by
importing serve() and passing llm=<callable>.
"""

from __future__ import annotations

import argparse
import os

from .app import serve


def main() -> None:
    ap = argparse.ArgumentParser(description="Run the solver BE (MVP).")
    ap.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8080")))
    ap.add_argument("--db", default=os.environ.get("SOLVER_DB", ":memory:"),
                    help="sqlite path (':memory:' or a file).")
    args = ap.parse_args()
    serve(host=args.host, port=args.port, db_path=args.db)


if __name__ == "__main__":
    main()
