import { Linter } from 'eslint';
import { RatingState } from 'web-codegen-scorer';

/**
 * Shared scoring helpers for the lint-backed ratings — the "eval half".
 *
 * Each rating imports a flat-config fragment from ../../eslint-rules (the "detection
 * half"), runs it here, and turns the findings into a coefficient. Two score policies are
 * provided: penalty-per-violation and tier-average. This is the only place that touches
 * eslint's `Linter`.
 *
 * The Linter is SYNCHRONOUS on purpose: WCS reads a PER_BUILD rating's `.coefficient`
 * WITHOUT awaiting it, so `rate()` must not be async (an async rate → Promise →
 * `.coefficient` undefined → NaN total → run aborts). See wcs-ratings docs.
 */
const linter = new Linter({ configType: 'flat' });

/** Run a flat config over the files matching `fileRe`; return matched files + flat findings. */
export function collectFindings(generatedFiles, fileRe, config) {
  const targets = generatedFiles.filter((f) => fileRe.test(f.filePath));
  const findings = [];
  for (const { filePath, code } of targets) {
    for (const m of linter.verify(code, config, { filename: filePath })) {
      findings.push({ filePath, ...m });
    }
  }
  return { targets, findings };
}

function formatLines(findings) {
  return findings
    .map((m) => `  - ${m.filePath}  ${m.ruleId ?? 'parse-error'} (${m.line}:${m.column}): ${m.message}`)
    .join('\n');
}

/**
 * Penalty policy: coefficient = max(1 − violations·penalty, 0); 1.0 when clean.
 * SKIPPED when there are no files to lint.
 */
export function penaltyScore({ targets, findings }, { penalty = 0.1, noun, emptyFilesMessage }) {
  if (targets.length === 0) {
    return { state: RatingState.SKIPPED, message: emptyFilesMessage };
  }
  if (findings.length === 0) {
    return { state: RatingState.EXECUTED, coefficient: 1, message: `Pass — no ${noun} found.` };
  }
  const coefficient = Math.max(1 - findings.length * penalty, 0);
  const pct = Math.round(coefficient * 100);
  return {
    state: RatingState.EXECUTED,
    coefficient,
    message: `${findings.length} ${noun} across ${targets.length} file(s) (${pct}%):\n${formatLines(findings)}`,
  };
}

/**
 * Tier-average policy: coefficient = average of scoreByMessageId[messageId] across findings.
 * SKIPPED when no files OR no classified findings.
 */
export function tierAverageScore(
  { targets, findings },
  scoreByMessageId,
  tierLabel,
  { emptyFilesMessage, emptyFindingsMessage, label = 'Score' },
) {
  if (targets.length === 0) {
    return { state: RatingState.SKIPPED, message: emptyFilesMessage };
  }
  const scored = findings.filter((m) => scoreByMessageId[m.messageId] !== undefined);
  if (scored.length === 0) {
    return { state: RatingState.SKIPPED, message: emptyFindingsMessage };
  }
  const total = scored.reduce((sum, m) => sum + scoreByMessageId[m.messageId], 0);
  const coefficient = total / scored.length;
  const pct = Math.round(coefficient * 100);

  const counts = scored.reduce((acc, m) => ((acc[m.messageId] = (acc[m.messageId] || 0) + 1), acc), {});
  const tally = Object.entries(counts)
    .map(([id, n]) => `${tierLabel[id]}×${n} (${Math.round(scoreByMessageId[id] * 100)}%)`)
    .join(', ');
  const lines = scored.map((m) => `  - ${m.filePath} (${m.line}:${m.column}): ${tierLabel[m.messageId]}`);

  return {
    state: RatingState.EXECUTED,
    coefficient,
    message: `${label} ${pct}% — ${tally}\n${lines.join('\n')}`,
  };
}
