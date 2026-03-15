# Agent Instructions

## Package Manager
- Use `npm`: `npm install`, `npm run dev`, `npm run build`, `npm test`

## File-Scoped Commands
| Task | Command |
|------|---------|
| Lint file | `npx eslint path/to/file.tsx` |
| Test file | `npx jest path/to/file.test.tsx --runInBand` |
| Typecheck | `npx tsc --noEmit --pretty false` |
| Dependency audit | `npm audit --audit-level=high` |
| Persistence check | `npm run nutrition:validate-persistence` |

## Commit Attribution
- AI commits MUST include:
```text
Co-Authored-By: Claude <noreply@anthropic.com>
```

## MirrorXP Loop
- Work in 10-30 minute micro-features.
- Keep every change small, understandable, testable, and reversible.
- `feature + tests = commit`; never defer tests.
- Refactor as soon as duplication or confusion appears.
- Document API limits, odd behavior, bugs, and workarounds in project docs while they are fresh.

## Commit Gates
- Every commit must be releasable: compile, pass relevant tests, and be safe to ship.
- Never leave known breakage behind with "fix later".
- Verification order:
  - lint
  - security scan when available for the touched surface
  - dependency audit
  - tests
  - build when the change affects runtime or release output
- If any gate fails, stop and fix it before continuing.

## Project Conventions
- Use `apply_patch` for manual code edits.
- Prefer targeted verification for touched files, but leave the touched surface green before moving on.
- Keep changes and commits small; avoid giant refactors and stacked unrelated edits.
- Update `AGENTS.md`, `README.md`, or the relevant project doc when workflow or architectural knowledge changes.
