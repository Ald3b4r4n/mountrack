# MounTrack Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-18

## Active Technologies
- TypeScript 5 (strict) + Next.js (app router), Zod 4, Postgres `pg`, React, (homologation)
- PostgreSQL via `nutrition_diary_items`; fallback volátil em memória (homologation)

- TypeScript 5 (strict mode enabled) + TailwindCSS 3.4.19, DaisyUI 4.12.24, Framer Motion 12.34.3, Zod 4.3.6 (master)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5 (strict mode enabled): Follow standard conventions

## Recent Changes
- homologation: Added TypeScript 5 (strict) + Next.js (app router), Zod 4, Postgres `pg`, React,

- master: Added TypeScript 5 (strict mode enabled) + TailwindCSS 3.4.19, DaisyUI 4.12.24, Framer Motion 12.34.3, Zod 4.3.6

<!-- MANUAL ADDITIONS START -->
## Constitution Compliance

- Follow `.specify/memory/constitution.md` as the authoritative engineering
  process for MounTrack.
- New feature work must start with failing automated tests before production
  code changes.
- Keep `docs/` or `specs/` updated with technical impact.
- Update `README.md` for every feature impact, or record why no README change is
  needed.
- Before closing relevant work, run `npm test`, `npm run lint`, `npm run build`
  when applicable, and `npm audit --audit-level=high` when dependencies change.

<!-- MANUAL ADDITIONS END -->
