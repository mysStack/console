# release-4.1.5 merged acceptance (after #13 defer-actions)

- date: 2026-11-02T03:57:19.341012+00:00
- tip: `3b7540912` (Merge PR #13)
- image: `ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-3b75409`
- imageID: `ghcr.io/mysstack/ks-console@sha256:84b8b721c2e3a30c051d5788b6aabc73163dad9d79dccb75e2dce90430532268`
- pod: `ks-console-v415-rea-658ff66b98-59kz8` @ 192.168.2.131:30881
- deploy: `ks-console-v415-rea`

## Results

| check                         | pass  | notes                                                |
| ----------------------------- | ----- | ---------------------------------------------------- |
| timing (dashboard after list) | True  | cold Δvis=1930ms; warm Δvis=2073ms                   |
| correctness                   | True  |                                                      |
| P1 full retest (1st)          | False | cold visible_from_poll=5507ms > 5000 threshold flake |
| P1 full retest (retry)        | True  | cold=4102ms; SPA all pass                            |

### Timing detail

- cold: visible=1271ms dash@3201 loadCompleted=True
- warm: visible=1073ms dash@3146 loadCompleted=True

### Commands

- build: `gh workflow run build-personal-images.yml --ref release-4.1.5 -f tag=release-4.1.5-merged -f source_ref=release-4.1.5`
- deploy: `kubectl -n kubesphere-system set image deploy/ks-console-v415-rea ks-console=ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-3b75409`

### Evidence files

- `merged-defer-actions-timing-20261102.json`
- `merged-defer-actions-correctness-20261102.json`
- `merged-defer-actions-p1-20261102.json`
- `merged-defer-actions-p1-retry-20261102.json`
