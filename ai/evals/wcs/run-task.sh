#!/usr/bin/env bash
# run-task.sh <stage> [task] — run the entry tasks through a stage config, hiding the boilerplate.
#
# Fixed (always the same, so not worth seeing): runner=ai-sdk, model=gemini-2.5-flash, and the
# --skip-* flags. Variable (the only thing you choose): the config = the stage.
#
# ── PROMPT ENGINEERING (stages 0–4): the ai-sdk runner generates, prompts/ratings change ──
#   ./run-task.sh 0              baseline prompt, scored by the off-the-shelf eval (all tasks)
#   ./run-task.sh 1              + "follow angular-eslint"
#   ./run-task.sh 2              + your custom rules
#   ./run-task.sh 3              + graded ratings
#   ./run-task.sh 4              + Signal Forms example
# ── CONTEXT / HARNESS ENGINEERING (stages 5–9): SAME slim-core prompt + SAME scoreboard, the
#    config wires its OWN executor (a custom agent runner) — so the only thing changing is the
#    generation STRATEGY. --runner/--model below are inert here (the config's executor wins). ──
#   ./run-task.sh 5              context: RAG — slim core + wiki retrieval (single shot)
#   ./run-task.sh 6              harness: agentic RAG — the agent fetches wiki via tools
#   ./run-task.sh 7              harness: verify loop — write → verify → fix
#   ./run-task.sh 8              harness: verify + validate loop — agent runs build + axe, fixes both
#   ./run-task.sh 9              harness: orchestrated workflow — planner → writer → (verify → build)*, isolated fix-until-green
#   ./run-task.sh 10             harness: orchestration tuned — per-agent models, one-rule fixer
#
# Optional 2nd arg filters to a single task (--prompt-filter), e.g.:
#   ./run-task.sh 0 login-form  just the login-form task
set -euo pipefail
stage="${1:?usage: ./run-task.sh <0-10> [task]}"
task="${2:-}"
cd "$(dirname "$0")"

# Load local secrets (API keys) if present. Copy .env.example → .env and fill in your key.
# .env is gitignored, so it never gets committed.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Most numbered stages run white-box — skip the hard black-box checks. (0–4 use the ai-sdk runner;
# 5–10 ignore --runner because their config sets an `executor`.) Stages 8 & 9 turn axe back ON
# (drop --skip-axe-testing) and score the built-in build rating, via their agentic runners (config.s8/s9).
case "$stage" in
  8|9)
    env="env/config.s${stage}.mjs"
    skips="--skip-screenshots --skip-ai-summary --skip-lighthouse"
    ;;
  *)
    env="env/config.s${stage}.mjs"
    skips="--skip-screenshots --skip-ai-summary --skip-axe-testing --skip-lighthouse"
    ;;
esac

exec npx wcs eval \
  --env "$env" \
  --runner ai-sdk --model gemini-2.5-flash \
  ${task:+--prompt-filter "$task"} \
  $skips
