import { spawn } from "node:child_process";
import { mkdtempSync, cpSync, symlinkSync, rmSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ServeHarness — the "serve once, rebuild on save" backbone for the Stage-8 validation gate.
 *
 * Instead of building + serving on every tool call (slow, fragile), we boot ONE `ng serve --watch`
 * against a throwaway copy of the starter project at the start of the run. Every write_file lands on
 * disk in that copy, the dev server INCREMENTALLY rebuilds (~1–3s) and streams the result to stdout,
 * which we capture. The agent's tools then just:
 *   - `build`   → read the latest settled build status from the stream (await the pending rebuild).
 *   - `run_axe` → point puppeteer at the already-served URL (no serve boot per call).
 *
 * Lifecycle: `await h.start()` → (write files to h.appDir, call h.awaitBuild()) → `await h.dispose()`.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_PROJECT = resolve(here, "../../env/project"); // the starter (has node_modules + angular.json)

const PORT_RE = /(?:localhost|127\.0\.0\.1):(\d+)/;
const BUILD_OK_RE = /Application bundle generation complete|Compiled successfully|watch mode enabled/i;
const BUILD_FAIL_RE = /Application bundle generation failed|✘ \[ERROR\]|error TS\d+/i;
const REBUILD_START_RE = /Building\.\.\.|Rebuilding\.\.\./i; // a fresh (re)build began → open a new window
const SETTLE_GRACE_MS = 350; // esbuild prints the ✘ [ERROR] detail JUST AFTER the failed/complete marker

export class ServeHarness {
  constructor({ onLog } = {}) {
    this.onLog = onLog;
    this.appDir = null;
    this.proc = null;
    this.url = null;
    this.log = ""; // rolling combined stdout+stderr (capped)
    this.sinceRebuild = ""; // buffer since the current rebuild started (for error extraction)
    this.lastBuild = { ok: true, errors: "" }; // most recent settled status
    this.settleCount = 0; // increments on each complete/failed marker
    this.markAtWrite = 0; // settleCount snapshot at the last write
    this._settleWaiters = [];
    this._pendingOk = null; // debounced settle: the ok/fail seen, not yet finalized
    this._settleTimer = null;
  }

  /** Create the throwaway working copy of the starter (source files copied, node_modules symlinked). */
  #setupWorkdir() {
    const tmp = mkdtempSync(join(tmpdir(), "wcs-stage8-"));
    this.appDir = tmp;
    // copy everything except the heavy/rebuildable dirs; symlink node_modules instead of copying.
    cpSync(SOURCE_PROJECT, tmp, {
      recursive: true,
      filter: (src) => !/(?:^|\/)(?:node_modules|dist|\.angular|\.git)(?:\/|$)/.test(src),
    });
    const nm = join(tmp, "node_modules");
    if (!existsSync(nm)) symlinkSync(join(SOURCE_PROJECT, "node_modules"), nm, "dir");
    return tmp;
  }

  #record(chunk) {
    const s = chunk.toString();
    this.log = (this.log + s).slice(-65536);
    this.sinceRebuild += s;
    this.onLog?.(s);
    if (!this.url) {
      const m = s.match(PORT_RE);
      if (m) this.url = `http://localhost:${m[1]}`;
    }
    // A new (re)build starting → flush any pending result, then open a fresh capture window so the
    // previous build's error text doesn't bleed into this one.
    if (REBUILD_START_RE.test(s)) { this.#flushPending(); this.sinceRebuild = s; return; }
    // Build settled (ok or failed). DEBOUNCE: esbuild/Angular print the ✘ [ERROR] detail a beat AFTER
    // the "failed" marker, so extracting on the marker gives an EMPTY error string (the bug that left
    // the fixer blind). Wait for quiet, then finalize with the full window. Any trailing ✘/error line
    // also matches BUILD_FAIL_RE and re-arms the timer, so we always capture the complete block.
    if (BUILD_FAIL_RE.test(s)) this.#scheduleSettle(false);
    else if (BUILD_OK_RE.test(s)) this.#scheduleSettle(true);
  }

  #scheduleSettle(ok) {
    this._pendingOk = ok;
    clearTimeout(this._settleTimer);
    this._settleTimer = setTimeout(() => this.#flushPending(), SETTLE_GRACE_MS);
  }

  #flushPending() {
    clearTimeout(this._settleTimer);
    this._settleTimer = null;
    if (this._pendingOk == null) return;
    const ok = this._pendingOk;
    this._pendingOk = null;
    this.#settle(ok);
  }

  #settle(ok) {
    const errors = ok
      ? ""
      : this.sinceRebuild
          .split("\n")
          .filter((l) => /error|✘|TS\d{3,}/i.test(l))
          .join("\n")
          .slice(-4000);
    this.lastBuild = { ok, errors };
    this.sinceRebuild = "";
    this.settleCount++;
    const waiters = this._settleWaiters;
    this._settleWaiters = [];
    for (const w of waiters) w(this.lastBuild);
  }

  /** Boot `ng serve` and resolve once the app is up (port seen). Fails FAST (with the captured log)
   * if the initial build fails or the process exits — never a blind wait. */
  async start(bootTimeoutMs = 120_000) {
    this.#setupWorkdir();
    // detached → the child is a process-group leader, so dispose() can kill the whole tree (npm → ng →
    // esbuild) with one signal instead of leaking child servers. --port 0 → OS picks a free port.
    this.proc = spawn("npm", ["run", "start", "--", "--port", "0"], {
      cwd: this.appDir,
      env: { ...process.env, NG_CLI_ANALYTICS: "false", CI: "1" },
      detached: true,
    });
    this.proc.stdout.on("data", (d) => this.#record(d));
    this.proc.stderr.on("data", (d) => this.#record(d));

    await new Promise((res, rej) => {
      const done = () => { clearTimeout(t); clearInterval(tick); };
      const t = setTimeout(
        () => { done(); rej(new Error(`ng serve did not come up within ${bootTimeoutMs / 1000}s.\n${this.log.slice(-1500)}`)); },
        bootTimeoutMs,
      );
      const tick = setInterval(() => {
        if (this.url) { done(); res(); return; }
        // The dev server only binds a port after a SUCCESSFUL build. If the FIRST build fails, no port
        // will ever come — fail fast with the compile errors instead of waiting out the timeout.
        if (this.settleCount > 0 && !this.lastBuild.ok) {
          done();
          rej(new Error(`ng serve failed to build on boot — the starter/generated code does not compile:\n${this.lastBuild.errors || this.log.slice(-1500)}`));
        }
      }, 250);
      this.proc.on("exit", (code) => {
        if (!this.url) { done(); rej(new Error(`ng serve exited (code ${code}) before serving.\n${this.log.slice(-1500)}`)); }
      });
    });
    return this.url;
  }

  /** Write a file into the served workdir (triggers an incremental rebuild). */
  writeFile(relPath, code) {
    const abs = join(this.appDir, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, code);
    // Invalidate any build result that predates this write: a not-yet-finalized settle from before
    // this write must NOT fire later and be mistaken for this write's rebuild (that stale settle would
    // let awaitBuild return the OLD status). Drop it; only a settle AFTER here counts.
    clearTimeout(this._settleTimer);
    this._settleTimer = null;
    this._pendingOk = null;
    this.markAtWrite = this.settleCount; // a rebuild for this write must push settleCount past here
  }

  /**
   * Wait for the pending rebuild (if any) to settle, then return the latest build status. If no
   * rebuild is in flight (settleCount already advanced past the last write) returns immediately.
   */
  async awaitBuild(timeoutMs = 20_000) {
    if (this.settleCount > this.markAtWrite) return this.lastBuild;
    return await new Promise((res) => {
      const t = setTimeout(() => {
        this._settleWaiters = this._settleWaiters.filter((w) => w !== onSettle);
        res(this.lastBuild); // no fresh settle in time — report the last known status
      }, timeoutMs);
      const onSettle = (state) => {
        clearTimeout(t);
        res(state);
      };
      this._settleWaiters.push(onSettle);
    });
  }

  async dispose() {
    clearTimeout(this._settleTimer);
    // Kill the whole process GROUP (negative pid) — SIGTERM-ing just the npm parent leaves the ng/esbuild
    // children alive as zombies that pile up and starve later boots. detached:true made proc the leader.
    try {
      if (this.proc?.pid) {
        try { process.kill(-this.proc.pid, "SIGKILL"); } catch { this.proc.kill("SIGKILL"); }
      }
    } catch {}
    try {
      if (this.appDir) rmSync(this.appDir, { recursive: true, force: true });
    } catch {}
  }
}
