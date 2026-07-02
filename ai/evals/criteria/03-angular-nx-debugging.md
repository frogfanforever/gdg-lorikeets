# Eval 03 — Angular, NX, Debugging (Day 3)

**Rubric id:** `p3` · **Type:** scored · **Max:** 20 pts · **Judge:** Adrian Romański

## Checks
| id | check | pts |
|----|-------|-----|
| p3.1 | Modern **Angular** with signals and current patterns | 5 |
| p3.2 | **Nx monorepo** structure (apps + libs, clear boundaries) | 5 |
| p3.3 | Clean component architecture, smart/dumb split, state mgmt | 4 |
| p3.4 | Effective **debugging/observability** (e.g. Chrome DevTools MCP) | 3 |
| p3.5 | **ng-diagram** (or equivalent) used meaningfully, not decoratively | 3 |

## Evidence to collect
- `nx graph` output showing app/lib boundaries.
- Code excerpts: signal usage, component structure, dependency boundaries.
- A debugging story (a bug found/fixed via Chrome DevTools MCP).
- The ng-diagram feature in action solving a real user need.

## LLM-judge prompt
```
Act as a senior Angular/Nx architect judge. Score p3.1–p3.5 from 0..1. Reward
idiomatic modern Angular (signals), real Nx boundaries, and meaningful use of
ng-diagram; penalize a single-app-in-a-monorepo or decorative diagrams.
EVIDENCE: <paste nx graph, code, screenshots>. Return JSON {"p3.1":0..1, ...}.
```

## Note
Adrian Romański owns this pillar and appears in our team channel — build the
frontend the way he taught it on Day 3. ng-diagram (p3.5) is the check most
teams will score 0 on; using it purposefully is a clean differentiator.
