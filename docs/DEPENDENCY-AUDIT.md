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
