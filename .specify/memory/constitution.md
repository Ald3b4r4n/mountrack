<!--
Sync Impact Report
===================
- Version change: 0.0.0 → 1.0.0
- Bump rationale: MAJOR — initial constitution ratification
- Added principles:
  - I. Clean Code
  - II. Test-Driven Development (TDD)
  - III. Technical Documentation
- Added sections:
  - Code Quality Standards
  - Development Workflow
  - Governance
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ compatible (Constitution Check section already generic)
  - .specify/templates/spec-template.md — ✅ compatible (no constitution-specific references)
  - .specify/templates/tasks-template.md — ✅ compatible (test-first guidance aligns with TDD principle)
- Follow-up TODOs: none
-->

# MounTrack Constitution

## Core Principles

### I. Clean Code

Code MUST be written for humans first, machines second.
Every module, function, and variable MUST communicate its intent
clearly through naming and structure alone.

- Functions MUST do one thing, do it well, and do it only.
- Functions MUST NOT exceed 20 lines unless justified in a
  complexity tracking record.
- Names MUST be descriptive and unambiguous: prefer
  `calculateDailyCalories` over `calc` or `process`.
- Magic numbers and hardcoded strings MUST be extracted into
  named constants.
- Dead code, commented-out code, and unused imports MUST be
  removed — version control is the archive.
- Code duplication MUST be eliminated when the same logic
  appears three or more times; fewer than three occurrences
  SHOULD remain inline to avoid premature abstraction.
- Files MUST have a single, clear responsibility. When a file
  grows beyond 300 lines, evaluate whether it can be split.
- Nesting depth MUST NOT exceed 3 levels; use early returns,
  guard clauses, or extraction to reduce complexity.
- Side effects MUST be explicit and isolated — pure functions
  are preferred wherever possible.

**Rationale**: Clean code reduces onboarding time, minimizes
bugs introduced during maintenance, and ensures the codebase
remains sustainable as the team and product grow.

### II. Test-Driven Development (TDD)

All new functionality MUST follow the Red-Green-Refactor cycle.
No production code may be written without a failing test that
justifies its existence.

- **Red**: Write a test that describes the expected behavior.
  The test MUST fail before any implementation begins.
- **Green**: Write the minimum code necessary to make the test
  pass. No more, no less.
- **Refactor**: Improve the code while keeping all tests green.
  Refactoring without test coverage is prohibited.
- Tests MUST be independent — no test may depend on the
  execution order or state of another test.
- Test names MUST describe the scenario and expected outcome
  (e.g., `should return zero when no meals are logged`).
- Unit tests MUST cover edge cases: null/undefined inputs,
  empty collections, boundary values.
- Integration tests MUST be written for: database operations,
  API endpoint contracts, and cross-module interactions.
- Test coverage MUST NOT be gamed — writing tests after
  implementation to inflate coverage numbers violates this
  principle.
- Mocks SHOULD be used sparingly; prefer real implementations
  when feasible (especially for database interactions).

**Rationale**: TDD produces code that is correct by
construction, provides living documentation of behavior, and
enables fearless refactoring. Writing tests first forces
better API design and prevents over-engineering.

### III. Technical Documentation

Documentation MUST be treated as a first-class deliverable,
maintained in the `Documentation/` folder at the project root.
Documentation MUST be written before or alongside
implementation — never deferred as an afterthought.

- All documentation MUST reside in `Documentation/` using
  Markdown format, organized by topic.
- Documentation MUST cover these areas:
  1. **Project objective** — technical description with links
     to business context.
  2. **Architecture and stack** — brief descriptions of
     patterns, dependencies, languages, and frameworks.
  3. **Setup and execution** — environment configuration,
     build tools, and local setup commands.
  4. **Changes and testing** — Git workflows, automated
     testing procedures, quality validation.
  5. **Deployment and monitoring** — deployment processes and
     observability procedures.
- Documentation MUST be updated whenever the code it describes
  changes. A PR that changes documented behavior without
  updating the corresponding documentation MUST NOT be merged.
- Avoid documenting volatile implementation details (class
  diagrams, internal method signatures) — these become stale
  quickly. Focus on decisions, contracts, and usage.
- Link to existing sources instead of duplicating information.
  Reference dependency files (package.json, configs) rather
  than listing versions manually.
- README.md at the project root serves as the entry point and
  MUST link to relevant documentation in `Documentation/`.

**Rationale**: Documentation preserves institutional knowledge,
reduces repeated questions, and ensures that information held
by individuals becomes accessible to the entire team. Treating
documentation like code (write first, keep current, review in
PRs) prevents knowledge silos and documentation rot.

## Code Quality Standards

- TypeScript strict mode MUST be enabled; `any` type usage
  MUST be justified and minimized.
- ESLint MUST pass with zero warnings before merge.
- Consistent formatting MUST be enforced via automated tools
  (Prettier or equivalent).
- Dependencies MUST be kept up to date; security
  vulnerabilities flagged by audit tools MUST be addressed
  within one sprint.
- Error handling MUST be explicit — silent catches (`catch {}`)
  are prohibited. Errors MUST be logged or propagated.
- API responses MUST follow consistent patterns for success
  and error states.

## Development Workflow

- Every feature MUST be developed in a dedicated branch.
- Commits MUST be atomic and descriptive — each commit
  represents a single logical change.
- Pull requests MUST include:
  1. A clear description of what changed and why.
  2. Evidence that tests pass (CI green).
  3. Documentation updates if applicable.
- Code review MUST verify compliance with this constitution
  before approval.
- The `main`/`master` branch MUST always be deployable.

## Governance

This constitution is the authoritative reference for all
development practices in MounTrack. It supersedes informal
conventions, tribal knowledge, and ad-hoc decisions.

- **Amendments**: Any change to this constitution MUST be
  documented with rationale, reviewed by the team, and
  accompanied by a version bump and migration plan for
  affected code.
- **Versioning**: This constitution follows semantic versioning:
  - MAJOR: Principle removed, redefined, or made incompatible.
  - MINOR: New principle or section added, material expansion.
  - PATCH: Wording clarification, typo fix, non-semantic change.
- **Compliance**: All pull requests and code reviews MUST
  verify adherence to these principles. Violations MUST be
  flagged and resolved before merge.
- **Guidance**: For runtime development guidance and
  agent-specific instructions, refer to `CLAUDE.md` or
  equivalent configuration files.

**Version**: 1.0.0 | **Ratified**: 2026-04-06 | **Last Amended**: 2026-04-06
