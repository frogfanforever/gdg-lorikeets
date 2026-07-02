# run-task.ps1 <stage> [task] — PowerShell twin of run-task.sh for Windows.
#
# Same contract as the bash version: pick a STAGE (0–10), optionally filter to one task.
# Fixed: runner=ai-sdk, model=gemini-2.5-flash, and the --skip-* flags. Stages 8 & 9 keep axe on.
#
#   .\run-task.ps1 0              baseline prompt, scored by the off-the-shelf eval (all tasks)
#   .\run-task.ps1 0 login-form  just the login-form task
#
# If you get "running scripts is disabled on this system", allow local scripts for your user once:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# ...or run a single time without changing policy:
#   powershell -ExecutionPolicy Bypass -File .\run-task.ps1 0

param(
  [Parameter(Mandatory = $true)][string]$Stage,
  [string]$Task
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$env = "env/config.s$Stage.mjs"

# Stages 8 & 9 turn axe back on (their agentic configs score the built-in build/axe ratings).
if ($Stage -eq '8' -or $Stage -eq '9') {
  $skips = @('--skip-screenshots', '--skip-ai-summary', '--skip-lighthouse')
} else {
  $skips = @('--skip-screenshots', '--skip-ai-summary', '--skip-axe-testing', '--skip-lighthouse')
}

$cmd = @('wcs', 'eval', '--env', $env, '--runner', 'ai-sdk', '--model', 'gemini-2.5-flash')
if ($Task) { $cmd += @('--prompt-filter', $Task) }
$cmd += $skips

npx @cmd
