# Dependency Audit Notes

## 2026-03-15

- `npm audit --audit-level=high` is green.
- The previous `high` severity finding was removed by refreshing the lockfile to use `flatted@3.4.1`.
- The repository still has `8 low` severity findings in the `firebase-admin` transitive chain:
  - `@google-cloud/firestore`
  - `@google-cloud/storage`
  - `@tootallnate/once`
  - `google-gax`
  - `http-proxy-agent`
  - `retry-request`
  - `teeny-request`
- Do not run `npm audit fix --force` blindly here. The suggested path attempts to move to `firebase-admin@10.3.0`, which is a breaking and likely incorrect downgrade for this project.
- Re-evaluate this note on the next intentional `firebase-admin` upgrade or lockfile refresh.
