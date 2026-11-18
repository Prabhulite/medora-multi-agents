 # Dependency audit record

 ## 2026-11-18 baseline

 Commands run from the repository packages:

 ```text
 npm audit --omit=dev --json
 ```

 | Package | Result | Action |
 | --- | --- | --- |
 | `frontend` | No production dependency vulnerabilities reported. | Continue auditing in CI. |
 | `backend` | Three moderate transitive findings: `typeorm` 0.3.31 pulls `glob` and `minimatch` versions affected by denial-of-service advisories. No high or critical production findings were reported. | Do not use the offered automated major upgrade to TypeORM without compatibility testing. Reassess TypeORM and its transitive dependency chain during the independent security review. |

 This is an automated dependency check, not an independent security review or a declaration that the application is secure. CI fails for high-or-higher production dependency findings; review this record whenever dependencies change.

## 2026-11-18 remediation check

Ran `npm audit --omit=dev --json` and `npm run build` in each package. Both builds passed. The frontend production audit passed with zero findings. The backend audit exited with code 1 and reported three moderate findings, with zero high or critical findings.

The installed backend chain matches the lockfile: `typeorm@0.3.31 ? glob@10.5.0 ? minimatch@9.0.9`. Two advisories account for all three findings. npm flags TypeORM through its dependency on glob.

- TypeORM requires `glob@^10.5.0`. The glob cancellation advisory covers every version in that range. [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
- glob requires `minimatch@^9.0.4`. The minimatch denial-of-service advisory covers that entire range, with a fix in 11.0.1. [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)

npm proposes TypeORM 1.1.3, outside the backend's declared `^0.3.28` range. Neither transitive dependency has a compatible fix under its parent's constraint. No manifest or lockfile changes were warranted. Recheck for a compatible TypeORM release or validate the major upgrade against database initialization, migrations, and integration tests before adopting it.
