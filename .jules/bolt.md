
## 2026-08-08 - Ignoring Out-of-Scope CI Failures
**Learning:** The GitHub Actions CI check "Playwright smoke" failed due to a missing `playwright` dependency. However, as the 'Bolt' agent optimizing performance, modifying `package.json` to fix unrelated CI workflows is strictly forbidden by the system boundaries ("Never modify package.json or tsconfig.json without instruction.").
**Action:** When working on targeted PRs like performance improvements, never bundle out-of-scope configuration fixes (like fixing CI dependencies in package.json), even if they resolve pre-existing CI failures, as this violates strict constraints and will cause the PR to be rejected.
