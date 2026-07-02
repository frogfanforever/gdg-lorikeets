# Eval 02 — UI/UX & A11Y (Day 2)

**Rubric id:** `p2` · **Type:** scored · **Max:** 20 pts

## Checks
| id | check | pts |
|----|-------|-----|
| p2.1 | Coherent, usable UI; clear information hierarchy | 5 |
| p2.2 | Design-system consistency (tokens, components, spacing) | 4 |
| p2.3 | **Accessibility**: keyboard nav, focus states, semantic HTML/ARIA | 5 |
| p2.4 | Color contrast meets **WCAG AA** | 3 |
| p2.5 | Responsive across breakpoints | 3 |

## Evidence to collect
- The live UI + a short usability walkthrough.
- Design tokens / component library reference.
- Keyboard-only navigation demo; screen-reader spot check.
- A Lighthouse/axe accessibility report (the `chrome-devtools` MCP
  `lighthouse_audit` tool can generate this against the live URL).

## LLM-judge prompt
```
Act as a UX + accessibility judge. Score p2.1–p2.5 from 0..1. For a11y, require
concrete evidence (audit report, keyboard demo), not claims. EVIDENCE: <paste>.
Return JSON {"p2.1":0..1, ..., "notes":"..."}.
```

## Why this is our edge
A11Y (p2.3+p2.4 = **8 pts**) is a full slice most teams skip. A deliberate
accessibility pass — semantic markup, focus management, AA contrast — is cheap and
high-yield. Run `lighthouse_audit` and fix the top flags before the finale.
